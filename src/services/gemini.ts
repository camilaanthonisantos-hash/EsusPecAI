import { ProfessionId, AIModelId, GeneratedPECRecord, AttachmentItem, PatientHistorySummary } from '../types';

export interface GenerateParams {
  professionId: ProfessionId;
  professionName: string;
  modelName: AIModelId;
  rawNotes: string;
  isFirstConsultation?: boolean;
  patientHistory?: PatientHistorySummary[] | string;
  audioAttachment?: AttachmentItem | null;
  images?: AttachmentItem[];
  customContext?: string;
  userApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
}

export interface GenerationResponse {
  success: boolean;
  fullText: string;
  avaliacao: string;
  plano: string;
  conduta?: string;
  clinicalAudit?: string;
  isFirstConsultation?: boolean;
  hasBlock3: boolean;
  modelUsed: AIModelId;
  profession: string;
  timestamp: number;
}

export async function generatePECRecord(params: GenerateParams): Promise<GeneratedPECRecord> {
  const payload = {
    profession: params.professionName,
    modelName: params.modelName,
    isFirstConsultation: params.isFirstConsultation ?? false,
    patientHistory: params.patientHistory,
    rawNotes: params.rawNotes,
    audioData: params.audioAttachment
      ? {
          data: params.audioAttachment.base64,
          mimeType: params.audioAttachment.type,
        }
      : undefined,
    images: params.images?.map((img) => ({
      data: img.base64,
      mimeType: img.type,
      name: img.name,
    })),
    customContext: params.customContext,
    userApiKey: params.userApiKey || undefined,
    openaiApiKey: params.openaiApiKey || undefined,
    openrouterApiKey: params.openrouterApiKey || undefined,
  };

  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorMsg = `Erro no servidor de IA (${response.status}).`;
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
      // fallback to generic message
    }
    throw new Error(errorMsg);
  }

  if (!contentType.includes('application/json')) {
    const rawText = await response.text();
    if (rawText.includes('<!doctype') || rawText.includes('<html')) {
      throw new Error('O servidor retornou uma página inesperada. Por favor, reinicie a solicitação.');
    }
    throw new Error(`Resposta do servidor em formato inválido: ${rawText.slice(0, 100)}`);
  }

  const data: GenerationResponse = await response.json();

  // Perform qualitative and compliance checks
  const fullContent = `${data.avaliacao}\n${data.plano}\n${data.conduta || ''}`;
  
  const hasFixedCiapSigtap =
    data.plano.includes('CIAP-2: -69') ||
    data.plano.includes('-69') ||
    data.plano.includes('0301080445') ||
    data.plano.includes('SIGTAP');

  const hasQualitativeVitals =
    /eutr[óo]fico|sobrepeso|obesidade|normotenso|pr[ée]-hipertenso|hipotenso|normoc[áa]rdico|taquic[áa]rdico|bradic[áa]rdico|eupneico|taquipneico|normot[éè]rmico|febril|normossaturado|dessaturado/i.test(
      fullContent
    );

  const hasNandaNocNic =
    params.professionId === 'enfermeiro'
      ? /nanda|diagn[óo]stico de enfermagem|noc|nic|meta|interven[çc]/i.test(fullContent)
      : undefined;

  return {
    id: `pec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: data.timestamp || Date.now(),
    professionId: params.professionId,
    modelUsed: data.modelUsed,
    isFirstConsultation: data.isFirstConsultation ?? params.isFirstConsultation ?? false,
    clinicalAudit: data.clinicalAudit,
    patientContextPreview:
      params.rawNotes.slice(0, 80) || (params.audioAttachment ? 'Relato por Áudio' : 'Análise de Imagem/Documento'),
    avaliacao: cleanBlockOutput(data.avaliacao),
    plano: cleanBlockOutput(data.plano),
    conduta: data.conduta ? cleanBlockOutput(data.conduta) : undefined,
    fullText: data.fullText,
    rawInputSummary: params.rawNotes || (params.audioAttachment ? '[Áudio Anexado]' : '[Documento/Foto]'),
    qualitativeChecks: {
      hasQualitativeVitals,
      hasFixedCiapSigtap,
      hasNandaNocNic,
    },
  };
}

import { copyPecToClipboard, formatPecText } from '../utils/pecFormatter';

// Clean markdown tags or duplicated headers from individual blocks and format cleanly
function cleanBlockOutput(blockText: string): string {
  if (!blockText) return '';
  const cleaned = blockText
    .replace(/^#+\s*CAMPO:?\s*(AVALIA[ÇC][ÃA]O|PLANO|06[^\n]*)\s*/i, '')
    .trim();
  return formatPecText(cleaned);
}

// Utility to copy text to clipboard with Rich HTML and Plain Text fallback
export async function copyToClipboard(text: string, customHtml?: string): Promise<boolean> {
  return copyPecToClipboard(text, customHtml);
}

// Helper to convert File to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || '';
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}
