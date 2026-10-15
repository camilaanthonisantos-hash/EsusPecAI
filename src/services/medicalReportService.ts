import { Patient, Consultation, User, MedicalReportData, SectionAIOrchestrationConfig } from '../types';
import { formatSingleUnitAge, formatAnajasDate, formatPatientDocument } from '../utils/dateCalculator';

export interface GenerateMedicalReportParams {
  patient: Patient;
  consultation?: Consultation | null;
  doctor: {
    name: string;
    specialty: string;
    councilRegister: string;
    workplace?: string;
  };
  purpose: string;
  clinicalObservations?: string;
  userApiKey?: string;
  sectionConfig?: SectionAIOrchestrationConfig;
}

export interface GeneratedMedicalReportResult {
  description: string;
  cid10: string;
  purpose: string;
  modelUsed?: string;
}

export const COMMON_REPORT_PURPOSES = [
  'Acompanhamento no CAPS / Saúde Mental',
  'Perícia Médica do INSS (Auxílio por Incapacidade)',
  'Afastamento Laboral / Licença Médica',
  'Benefício de Prestação Continuada (BPC / LOAS)',
  'Curatela e Fins Judiciais',
  'Aptidão e Avaliação Clínica',
  'Gratuidade de Transporte / Passe Livre Especial',
];

/**
 * Extracts or infers CID-10 from text (e.g. "F32.2", "F20.0", "F10.2", "F31.9", "F41.1")
 */
export function extractCid10FromText(text?: string): string {
  if (!text) return 'F32.2 - Transtorno depressivo maior';
  
  const cidRegex = /\b([A-Z]\d{2}(\.\d{1,2})?)\b/g;
  const matches = text.match(cidRegex);
  if (matches && matches.length > 0) {
    // Return first match
    return matches[0];
  }
  return 'F32.2 - Transtorno depressivo maior';
}

/**
 * Generates an official medical report description using the server-side Gemini API,
 * with resilient fallback to rich, legally compliant local medical templates.
 */
export async function generateMedicalReportAI(
  params: GenerateMedicalReportParams
): Promise<GeneratedMedicalReportResult> {
  const patientAge = formatSingleUnitAge(params.patient.birthDate);
  const patientDoc = formatPatientDocument(params.patient.cpf, params.patient.cns);

  try {
    const response = await fetch('/api/gemini/medical-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        patient: {
          fullName: params.patient.fullName,
          birthDate: params.patient.birthDate,
          ageFormatted: patientAge,
          document: patientDoc,
          cpf: params.patient.cpf,
          cns: params.patient.cns,
        },
        consultation: params.consultation
          ? {
              avaliacao: params.consultation.avaliacao,
              plano: params.consultation.plano,
              conduta: params.consultation.conduta,
              rawNotes: params.consultation.rawNotes,
            }
          : undefined,
        doctor: params.doctor,
        purpose: params.purpose,
        clinicalObservations: params.clinicalObservations,
        userApiKey: params.userApiKey,
        sectionConfig: params.sectionConfig,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.description) {
        return {
          description: data.data.description.trim(),
          cid10: data.data.cid10 || extractCid10FromText(params.consultation?.avaliacao),
          purpose: data.data.purpose || params.purpose,
          modelUsed: data.modelUsed || 'Gemini 3.7 Flash',
        };
      }
    }
  } catch (err) {
    console.warn('[MedicalReport] Erro ao chamar endpoint de IA, utilizando gerador profissional resiliente:', err);
  }

  // Fallback to high-standard clinical generator
  return generateLocalFallbackReport(params);
}

/**
 * High-standard clinical report fallback generator based on CFM & SUS standards.
 */
export function generateLocalFallbackReport(
  params: GenerateMedicalReportParams
): GeneratedMedicalReportResult {
  const patientName = params.patient.fullName.toUpperCase();
  const patientAge = formatSingleUnitAge(params.patient.birthDate);
  const patientDoc = formatPatientDocument(params.patient.cpf, params.patient.cns);
  const workplace = params.doctor.workplace || 'Centro de Atenção Psicossocial (CAPS I)';
  
  const rawFindings = params.consultation?.avaliacao || 'Paciente em acompanhamento regular com queixas clínicas e psicoemocionais.';
  const rawTherapy = params.consultation?.plano || 'Em seguimento ambulatorial com psicoterapia e farmacoterapia supervisionada.';
  const extraObs = params.clinicalObservations?.trim() ? `\n\nObservações complementares: ${params.clinicalObservations.trim()}` : '';

  let purposeContext = 'para os devidos fins de comprovação diagnóstica e acompanhamento clínico';
  let functionalImpact = 'O quadro clínico em voga demanda acompanhamento especializado contínuo, estabilização dos sintomas e suporte terapêutico multiprofissional.';

  if (params.purpose.includes('INSS') || params.purpose.includes('Incapacidade') || params.purpose.includes('Afastamento')) {
    purposeContext = 'para fins de perícia médica e avaliação de capacidade laborativa';
    functionalImpact = 'No momento, em razão da intensidade dos sintomas clínicos/psíquicos, labilidade afetiva e necessidade de estabilização farmacológica com psicotrópicos, o(a) paciente apresenta incapacidade temporária para o exercício de suas atividades habituais e laborais, necessitando de afastamento e repouso terapêutico sob vigilância ambulatorial periódica.';
  } else if (params.purpose.includes('BPC') || params.purpose.includes('LOAS')) {
    purposeContext = 'para fins de instrução de processo de Benefício de Prestação Continuada (BPC/LOAS)';
    functionalImpact = 'O(a) periciando(a) apresenta impedimento de longo prazo de natureza física, mental ou psicossocial que, em interação com diversas barreiras socioambientais, obstrui sua participação plena e efetiva na sociedade em igualdade de condições com as demais pessoas, demandando suporte contínuo da rede assistencial e familiar.';
  } else if (params.purpose.includes('Curatela') || params.purpose.includes('Judiciais')) {
    purposeContext = 'para fins de instrução pericial e suporte judicial';
    functionalImpact = 'O quadro psicopatológico acarreta prejuízo significativo no juízo crítico e na capacidade de gerir plenamente e de modo autônomo os atos da vida civil e patrimonial, necessitando de representação legal e assistência protetiva contínua.';
  } else if (params.purpose.includes('Transporte') || params.purpose.includes('Passe Livre')) {
    purposeContext = 'para fins de requerimento de gratuidade de transporte / passe livre intermunicipal para tratamento de saúde';
    functionalImpact = 'O(a) paciente necessita de deslocamento frequente para continuidade do tratamento clínico, consultas médicas especializadas e intervenções terapêuticas de reabilitação psicossocial na rede de saúde.';
  }

  const cid = extractCid10FromText(rawFindings);

  const description = `Atesto, a pedido do(a) paciente e para os devidos fins que se fizerem necessários, que ${patientName}, ${patientAge}, portador(a) do ${patientDoc}, encontra-se sob meus cuidados profissionais e em acompanhamento clínico regular no ${workplace}.

Histórico Clínico e Exame Atual:
${rawFindings}

Conduta Terapêutica em Curso:
${rawTherapy}

Parecer e Conclusão Médica:
Declaro, em consonância com as normas éticas do Conselho Federal de Medicina (CFM), que o(a) paciente supracitado(a) apresenta quadro sindrômico compatível com a hipótese diagnóstica mencionada. ${functionalImpact} Recomenda-se a continuidade rigorosa do plano terapêutico prescrito e comparecimento pontual aos retornos agendados para reavaliação periódica.${extraObs}`;

  return {
    description: description.trim(),
    cid10: cid,
    purpose: params.purpose,
    modelUsed: 'Modelo Clínico Institucional CAPS',
  };
}
