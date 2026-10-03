import { Patient, Consultation, SectionAIOrchestrationConfig } from '../types';
import { formatSingleUnitAge, formatPatientDocument } from '../utils/dateCalculator';

export interface GenerateCertificateRecommendationsParams {
  patient: Patient;
  consultation?: Consultation | null;
  doctor: {
    name: string;
    workplace?: string;
  };
  daysOff: number;
  cid10?: string;
  userApiKey?: string;
  sectionConfig?: SectionAIOrchestrationConfig;
}

export interface GeneratedCertificateRecommendationsResult {
  recommendations: string;
  modelUsed?: string;
}

/**
 * Intelligent local fallback when AI call fails or is offline
 */
export function generateLocalCertificateRecommendations(
  consultation?: Consultation | null,
  cid10?: string,
  daysOff?: number
): string {
  const diagnosis =
    cid10 ||
    consultation?.medicalCertificate?.cid10 ||
    consultation?.medicalReport?.cid10 ||
    consultation?.referral?.hypotheses ||
    '';

  const plan = consultation?.plano || consultation?.conduta || '';
  const avaliacao = consultation?.avaliacao || '';

  const days = daysOff && daysOff > 1 ? `${daysOff} dias` : 'período determinado';

  if (diagnosis) {
    return `Necessita de repouso domiciliar por ${days}, cuidados terapêuticos conforme plano de cuidado do CAPS e adesão ao tratamento clínico (${diagnosis}). Retornar para reavaliação em caso de persistência ou agravamento dos sintomas.`;
  }

  if (plan) {
    return `Necessita de repouso domiciliar, seguimento estrito das orientações médicas e terapêuticas instituídas e manutenção dos cuidados em saúde. Retornar ao serviço para reavaliação clínica conforme agendamento ou intercorrência.`;
  }

  if (avaliacao) {
    return `Necessita de repouso domiciliar, hidratação adequada, abstenção de esforço físico/laboral e seguimento do plano terapêutico. Retornar para reavaliação médica se necessário.`;
  }

  return `Necessita de repouso domiciliar, cuidados em saúde e afastamento de atividades laborais e habituais para recuperação clínica. Retornar a este serviço de saúde em caso de intercorrências.`;
}

/**
 * Generates clinical recommendations and guidance for medical certificates via Gemini AI.
 */
export async function generateCertificateRecommendationsAI(
  params: GenerateCertificateRecommendationsParams
): Promise<GeneratedCertificateRecommendationsResult> {
  const patientAge = formatSingleUnitAge(params.patient.birthDate);
  const patientDoc = formatPatientDocument(params.patient.cpf, params.patient.cns);

  try {
    const response = await fetch('/api/gemini/certificate-recommendations', {
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
        },
        consultation: params.consultation
          ? {
              avaliacao: params.consultation.avaliacao,
              plano: params.consultation.plano,
              conduta: params.consultation.conduta,
              rawNotes: params.consultation.rawNotes,
              cid10: params.consultation.medicalCertificate?.cid10 || params.consultation.medicalReport?.cid10 || params.consultation.referral?.hypotheses,
            }
          : undefined,
        doctor: params.doctor,
        daysOff: params.daysOff,
        cid10: params.cid10,
        userApiKey: params.userApiKey,
        sectionConfig: params.sectionConfig,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data?.recommendations) {
        return {
          recommendations: data.data.recommendations.trim(),
          modelUsed: data.modelUsed || 'Gemini 3.7 Flash',
        };
      }
    }
  } catch (err) {
    console.warn('[Certificate AI] Falha na chamada de IA, usando gerador contextual local:', err);
  }

  // Fallback
  return {
    recommendations: generateLocalCertificateRecommendations(
      params.consultation,
      params.cid10,
      params.daysOff
    ),
    modelUsed: 'Modelo Clínico Integrado (Local)',
  };
}
