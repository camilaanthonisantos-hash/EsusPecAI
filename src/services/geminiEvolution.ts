import { Patient, Consultation, EvolutionSummary } from '../types';

export interface GenerateEvolutionParams {
  patient: Patient;
  consultations: Consultation[];
  userApiKey?: string;
}

export async function generateClinicalEvolution(
  params: GenerateEvolutionParams
): Promise<EvolutionSummary> {
  const { patient, consultations, userApiKey } = params;

  if (!patient || !consultations || consultations.length === 0) {
    throw new Error('Nenhum atendimento encontrado para este paciente para análise de evolução.');
  }

  const response = await fetch('/api/gemini/evolution', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patient,
      consultations,
      userApiKey: userApiKey || undefined,
    }),
  });

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorMsg = `Falha ao processar análise clínica de evolução no servidor (${response.status}).`;
    try {
      if (contentType.includes('application/json')) {
        const errData = await response.json();
        if (errData?.error) {
          errorMsg = errData.error;
        }
      } else {
        const rawText = await response.text();
        if (rawText.includes('<!doctype') || rawText.includes('<html')) {
          errorMsg = 'O serviço de IA demorou para responder ou encontrou instabilidade temporária. Por favor, tente novamente.';
        } else if (rawText.trim()) {
          errorMsg = rawText.slice(0, 200);
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (!contentType.includes('application/json')) {
    throw new Error('O servidor retornou uma resposta inesperada para a análise clínica.');
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error('Formato inválido retornado pelo motor de IA.');
  }

  return result.data as EvolutionSummary;
}
