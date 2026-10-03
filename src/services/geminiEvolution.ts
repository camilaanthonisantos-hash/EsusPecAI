import { Patient, Consultation, EvolutionSummary } from '../types';

export interface GenerateEvolutionParams {
  patient: Patient;
  consultations: Consultation[];
  userApiKey?: string;
  forceRegenerate?: boolean;
  forceFullReanalysis?: boolean;
}

// Sanitize payload to send only relevant clinical data, preventing oversized JSON payloads
function sanitizeEvolutionPayload(patient: Patient, consultations: Consultation[]) {
  const safePatient = {
    id: patient.id,
    fullName: patient.fullName,
    cns: patient.cns || '',
    cpf: patient.cpf || '',
    birthDate: patient.birthDate || '',
    gender: patient.gender,
    legalGuardianName: patient.legalGuardianName,
    guardianKinship: patient.guardianKinship,
  };

  const safeConsultations = consultations.map((c) => ({
    id: c.id,
    patientId: c.patientId,
    timestamp: c.timestamp,
    authorName: c.authorName || 'Profissional',
    authorProfession: c.authorProfession || 'Multi',
    avaliacao: (c.avaliacao || '').slice(0, 3000),
    plano: (c.plano || '').slice(0, 3000),
    conduta: (c.conduta || '').slice(0, 3000),
    prescription: c.prescription ? {
      items: (c.prescription.items || []).map((it) => ({
        medicationName: it.medicationName,
        posology: it.posology,
        duration: it.duration,
      })),
    } : undefined,
    examRequest: c.examRequest ? {
      items: (c.examRequest.items || []).map((it) => ({
        name: it.name,
        clinicalIndication: it.clinicalIndication,
      })),
    } : undefined,
    referral: c.referral ? {
      destination: c.referral.destination,
      clinicalIndication: c.referral.clinicalIndication,
    } : undefined,
    medicalReport: c.medicalReport ? {
      purpose: c.medicalReport.purpose,
      cid10: c.medicalReport.cid10,
    } : undefined,
  }));

  return { safePatient, safeConsultations };
}

export async function generateClinicalEvolution(
  params: GenerateEvolutionParams
): Promise<EvolutionSummary> {
  const { patient, consultations, userApiKey, forceRegenerate, forceFullReanalysis } = params;

  if (!patient || !consultations || consultations.length === 0) {
    throw new Error('Nenhum atendimento encontrado para este paciente para análise de evolução.');
  }

  const { safePatient, safeConsultations } = sanitizeEvolutionPayload(patient, consultations);

  const requestBody = JSON.stringify({
    patient: safePatient,
    consultations: safeConsultations,
    userApiKey: userApiKey || undefined,
    forceRegenerate: Boolean(forceRegenerate),
    forceFullReanalysis: Boolean(forceFullReanalysis),
  });

  // Execute with 1 automatic retry on network disconnect/server restart
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000); // 65s timeout for thorough AI analysis

      const response = await fetch('/api/gemini/evolution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
    } catch (err: any) {
      const isNetworkError =
        err?.name === 'TypeError' ||
        String(err?.message || '').toLowerCase().includes('failed to fetch') ||
        String(err?.message || '').toLowerCase().includes('networkerror') ||
        String(err?.message || '').toLowerCase().includes('abort');

      if (isNetworkError && attempt < maxAttempts) {
        console.warn(`[Evolução Clínica] Falha de conexão na tentativa ${attempt}. Aguardando 1.5s para nova tentativa...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }

      if (isNetworkError) {
        throw new Error('Não foi possível estabelecer conexão com o serviço de IA. Verifique sua conexão com a internet ou tente novamente em instantes.');
      }

      throw err;
    }
  }

  throw new Error('Falha ao processar evolução clínica após tentativas de conexão.');
}

export async function getStoredClinicalEvolution(
  patientId: string
): Promise<EvolutionSummary | null> {
  if (!patientId) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`/api/gemini/evolution/${encodeURIComponent(patientId)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const result = await response.json();
    if (result.success && result.data) {
      return result.data as EvolutionSummary;
    }
    return null;
  } catch {
    return null;
  }
}
