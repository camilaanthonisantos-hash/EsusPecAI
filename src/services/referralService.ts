import { Patient, ReferralPriority, User } from '../types';

export interface GenerateReferralParams {
  destination?: string;
  reasonDescription: string;
  patient?: Patient | null;
  consultationContext?: {
    avaliacao?: string;
    plano?: string;
    conduta?: string;
  } | null;
  userApiKey?: string;
}

export interface GeneratedReferralResult {
  clinicalIndication: string;
  hypotheses: string;
  proceduresRequested: string;
  destination: string;
  priority: ReferralPriority;
  modelUsed?: string;
}

/**
 * Common referral specialties with suggested default destination titles
 */
export const COMMON_REFERRAL_SPECIALTIES = [
  { id: 'odontologia', label: 'Odontologia / CEO', destination: 'Odontologia / Saúde Bucal' },
  { id: 'psiquiatria', label: 'Psiquiatria / CAPS', destination: 'Psiquiatria Clínica / CAPS' },
  { id: 'neurologia', label: 'Neurologia', destination: 'Neurologia Clínica' },
  { id: 'cardiologia', label: 'Cardiologia', destination: 'Cardiologia Clínica' },
  { id: 'ortopedia', label: 'Ortopedia / Trauma', destination: 'Ortopedia e Traumatologia' },
  { id: 'oftalmologia', label: 'Oftalmologia', destination: 'Oftalmologia' },
  { id: 'ginecologia', label: 'Ginecologia / GO', destination: 'Ginecologia e Obstetrícia' },
  { id: 'cras_creas', label: 'CRAS / Assistência Social', destination: 'CRAS / CREAS (Assistência Social)' },
  { id: 'fisioterapia', label: 'Fisioterapia / Reab.', destination: 'Fisioterapia e Reabilitação' },
  { id: 'dermatologia', label: 'Dermatologia', destination: 'Dermatologia Clínica' },
  { id: 'pediatria', label: 'Pediatria / CAPSi', destination: 'Pediatria Clínica / CAPSi' },
  { id: 'otorrino', label: 'Otorrinolaringologia', destination: 'Otorrinolaringologia' },
  { id: 'endocrinologia', label: 'Endocrinologia', destination: 'Endocrinologia e Metabologia' },
  { id: 'pronto_socorro', label: 'Pronto-Socorro / Hospital', destination: 'Pronto-Socorro Municipal / Hospital Geral' },
];

/**
 * Calls server-side Gemini endpoint to generate a standardized SUS referral justification
 * and suggested diagnostic hypotheses (CID-10 / CIAP-2) from a free-text or transcribed voice input.
 * Strict rule: Does NOT insert patient name or age in the justification body.
 */
export async function generateReferralAI(
  params: GenerateReferralParams
): Promise<GeneratedReferralResult> {
  try {
    const response = await fetch('/api/gemini/referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination: params.destination,
        reasonDescription: params.reasonDescription,
        patient: params.patient
          ? {
              gender: params.patient.gender,
            }
          : undefined,
        consultationContext: params.consultationContext,
        userApiKey: params.userApiKey,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return {
          clinicalIndication: data.data.clinicalIndication?.trim() || '',
          hypotheses: data.data.hypotheses?.trim() || '',
          proceduresRequested: data.data.proceduresRequested?.trim() || '',
          destination: data.data.destination?.trim() || params.destination || 'SERVIÇO ESPECIALIZADO',
          priority: data.data.priority || 'Eletivo',
          modelUsed: data.modelUsed || 'Gemini 3.7 Flash',
        };
      }
    }
  } catch (err) {
    console.warn('[ReferralService] Erro na requisição ao servidor de IA. Utilizando fallback clínico local:', err);
  }

  // Fallback to high-standard local clinical generator
  return generateLocalFallbackReferral(params);
}

/**
 * Intelligent local clinical referral fallback generator.
 * Analyzes keywords in the popular/technical description and produces high-grade SUS justifications and hypotheses.
 */
export function generateLocalFallbackReferral(
  params: GenerateReferralParams
): GeneratedReferralResult {
  const reason = (params.reasonDescription || '').toLowerCase();
  const destInput = (params.destination || '').toLowerCase();

  // 1. Odontologia / Dor de dente
  if (
    reason.includes('dent') ||
    reason.includes('cári') ||
    reason.includes('gengiv') ||
    reason.includes('molar') ||
    reason.includes('mastig') ||
    reason.includes('boca') ||
    reason.includes('odonto') ||
    destInput.includes('odont')
  ) {
    return {
      destination: params.destination || 'Odontologia / Saúde Bucal',
      priority: reason.includes('urg') || reason.includes('sever') || reason.includes('intensa') ? 'Prioritário' : 'Eletivo',
      clinicalIndication:
        'Solicito avaliação odontológica especializada para o paciente, com base no seguinte quadro:\n' +
        'Paciente compareceu à unidade referindo quadro de dor dentária e desconforto oral de evolução recente, associado a prejuízo na mastigação e sensibilidade local. Ao acolhimento clínico, identificou-se necessidade de exame intraoral detalhado, intervenção odontológica diagnóstica/restauradora e manejo adequado para alívio dos sintomas.',
      hypotheses: 'K02.9 (Cárie dentária não especificada) / K08.8 (Outros transtornos dos dentes e das estruturas de sustentação) / CIAP-2: D19 (Dor de dente / Queixas dentárias)',
      proceduresRequested: 'Avaliação clínica odontológica completa, exame físico intraoral, radiografia periapical se pertinente e conduta curativa/restauradora para alívio da dor.',
      modelUsed: 'Motor Clínico Local SUS',
    };
  }

  // 2. Oftalmologia / Visão / Olhos
  if (
    reason.includes('visão') ||
    reason.includes('olho') ||
    reason.includes('enxergar') ||
    reason.includes('embaç') ||
    reason.includes('óculos') ||
    reason.includes('oftalm') ||
    destInput.includes('oftalm')
  ) {
    return {
      destination: params.destination || 'Oftalmologia',
      priority: 'Eletivo',
      clinicalIndication:
        'Solicito avaliação oftalmológica especializada para o paciente, com base no seguinte quadro:\n' +
        'Paciente atendido na unidade apresentando queixas de redução da acuidade visual, cefaleia associada ao esforço visual e dificuldade de foco. Encaminhado para propedêutica oftalmológica especializada, refração completa e avaliação de segmento anterior e posterior.',
      hypotheses: 'H52.2 (Astigmatismo) / H52.1 (Miopia) / H52.4 (Presbiopia) / CIAP-2: F91 (Transtorno de refração)',
      proceduresRequested: 'Consulta oftalmológica especializada, exame de refração com acuidade visual, tonometria e fundoscopia.',
      modelUsed: 'Motor Clínico Local SUS',
    };
  }

  // 3. Ortopedia / Coluna / Dor articular
  if (
    reason.includes('coluna') ||
    reason.includes('lombar') ||
    reason.includes('joelho') ||
    reason.includes('articular') ||
    reason.includes('osso') ||
    reason.includes('fratur') ||
    reason.includes('ortoped') ||
    destInput.includes('ortoped')
  ) {
    return {
      destination: params.destination || 'Ortopedia e Traumatologia',
      priority: reason.includes('fratur') || reason.includes('trauma') ? 'Prioritário' : 'Eletivo',
      clinicalIndication:
        'Solicito avaliação ortopédica especializada para o paciente, com base no seguinte quadro:\n' +
        'Paciente compareceu com queixas de dor musculoesquelética persistente, limitação funcional para atividades de vida diária e dor à palpação/movimentação. Necessita de avaliação ortopédica pormenorizada, estudo de imagem e planejamento terapêutico direcionado.',
      hypotheses: 'M54.5 (Dor lombar baixa / Lombalgia) / M25.5 (Dor articular) / CIAP-2: L03 (Sintomas/queixas lombares)',
      proceduresRequested: 'Avaliação ortopédica especializada, exames radiológicos pertinentes e orientação terapêutica/reabilitadora.',
      modelUsed: 'Motor Clínico Local SUS',
    };
  }

  // 4. Cardiologia / Hipertensão / Palpitação
  if (
    reason.includes('coraç') ||
    reason.includes('pressão') ||
    reason.includes('palpita') ||
    reason.includes('cardio') ||
    destInput.includes('cardio')
  ) {
    return {
      destination: params.destination || 'Cardiologia Clínica',
      priority: reason.includes('falta de ar') || reason.includes('dor no peito') ? 'Prioritário' : 'Eletivo',
      clinicalIndication:
        'Solicito avaliação cardiológica especializada para o paciente, com base no seguinte quadro:\n' +
        'Paciente em acompanhamento na atenção primária referindo queixas cardiovasculares e necessidade de estratificação de risco cardíaco, ajuste terapêutico e avaliação propedêutica complementar (ECG/Ecocardiograma).',
      hypotheses: 'I10 (Hipertensão essencial) / I25.9 (Doença isquêmica crônica do coração) / CIAP-2: K86 (Hipertensão sem complicações)',
      proceduresRequested: 'Consulta cardiológica especializada, ECG de 12 derivações, teste ergométrico/ecocardiograma conforme critério clínico.',
      modelUsed: 'Motor Clínico Local SUS',
    };
  }

  // 5. Psiquiatria / Saúde Mental / CAPS
  if (
    reason.includes('psico') ||
    reason.includes('ansied') ||
    reason.includes('depress') ||
    reason.includes('humor') ||
    reason.includes('álcool') ||
    reason.includes('droga') ||
    reason.includes('surto') ||
    destInput.includes('psiqui') ||
    destInput.includes('caps')
  ) {
    return {
      destination: params.destination || 'Psiquiatria Clínica / CAPS',
      priority: reason.includes('suicid') || reason.includes('crise') || reason.includes('agita') ? 'Urgência/Emergência' : 'Prioritário',
      clinicalIndication:
        'Solicito avaliação psiquiátrica especializada para o paciente, com base no seguinte quadro:\n' +
        'Paciente acolhido na unidade com manifestações de sofrimento psíquico, labilidade emocional e prejuízo funcional/relacional. Demanda avaliação psiquiátrica formal para refinamento diagnóstico, manejo psicofarmacológico e alinhamento com a rede de atenção psicossocial.',
      hypotheses: 'F41.1 (Transtorno de ansiedade generalizada) / F32.1 (Episódio depressivo moderado) / CIAP-2: P01 (Sensação de ansiedade / nervosismo)',
      proceduresRequested: 'Avaliação psiquiátrica clínica, parecer quanto ao manejo psicofarmacológico e matriciamento com a equipe territorial.',
      modelUsed: 'Motor Clínico Local SUS',
    };
  }

  // 6. Generic Default Referral
  const destinationClean = params.destination?.trim() || 'Serviço Especializado de Saúde';
  const cleanReasonText = params.reasonDescription?.trim() || 'necessidade de propedêutica e acompanhamento com especialista';

  return {
    destination: destinationClean,
    priority: 'Eletivo',
    clinicalIndication:
      `Solicito avaliação especializada em ${destinationClean} para o paciente, com base no seguinte quadro:\n` +
      `Paciente acolhido na unidade de saúde referindo quadro clínico caracterizado por: ${cleanReasonText}. Diante dos achados e da necessidade de propedêutica aprofundada, solicito avaliação e conduta clínica do serviço especializado de destino para continuidade do cuidado integral.`,
    hypotheses: 'Z71.9 (Aconselhamento e orientação em saúde) / CIAP-2: A98 (Manutenção da saúde / Prevenção)',
    proceduresRequested: `Avaliação clínica especializada em ${destinationClean}, solicitação de exames complementares específicos e orientações terapêuticas de seguimento.`,
    modelUsed: 'Motor Clínico Local SUS',
  };
}
