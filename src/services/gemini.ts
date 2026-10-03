import { ProfessionId, AIModelId, GeneratedPECRecord, AttachmentItem, PatientHistorySummary, SectionAIOrchestrationConfig } from '../types';
import { getFriendlyModelName } from '../utils/aiModelHelper';

export interface GenerationStatusUpdate {
  model: string;
  modelName: string;
  previousModel?: string;
  previousModelName?: string;
  isTransitioning?: boolean;
  reason?: string;
  message?: string;
}

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
  sectionConfig?: SectionAIOrchestrationConfig;
  onStatusUpdate?: (status: GenerationStatusUpdate) => void;
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
  const initialModel = params.sectionConfig?.primaryModelId || params.modelName;
  const initialFriendlyName = getFriendlyModelName(initialModel);
  if (params.onStatusUpdate) {
    params.onStatusUpdate({
      model: initialModel,
      modelName: initialFriendlyName,
      message: `Processando com ${initialFriendlyName}...`,
      isTransitioning: false,
    });
  }

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
    sectionConfig: params.sectionConfig || undefined,
    stream: true,
  };

  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream, application/json',
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

  let data: GenerationResponse | null = null;

  // Handle SSE streaming response
  if (contentType.includes('text/event-stream') && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const event = JSON.parse(trimmed.slice(6));
            if (event.type === 'status' && params.onStatusUpdate) {
              params.onStatusUpdate({
                model: event.model,
                modelName: event.modelName || getFriendlyModelName(event.model),
                message: event.message,
                isTransitioning: false,
              });
            } else if (event.type === 'transition' && params.onStatusUpdate) {
              params.onStatusUpdate({
                model: event.toModel,
                modelName: event.toModelName || getFriendlyModelName(event.toModel),
                previousModel: event.fromModel,
                previousModelName: event.fromModelName || getFriendlyModelName(event.fromModel),
                isTransitioning: true,
                reason: event.reason,
                message: event.message || `Alternando para ${event.toModelName || event.toModel}...`,
              });
            } else if (event.type === 'complete' && event.data) {
              data = event.data as GenerationResponse;
            } else if (event.type === 'error') {
              throw new Error(event.error || 'Erro ao processar requisição com a IA.');
            }
          } catch (err: any) {
            if (err.message && !err.message.includes('Unexpected token')) {
              throw err;
            }
          }
        }
      }
    }

    // Process leftover buffer
    if (buffer.trim().startsWith('data: ')) {
      try {
        const event = JSON.parse(buffer.trim().slice(6));
        if (event.type === 'complete' && event.data) {
          data = event.data as GenerationResponse;
        } else if (event.type === 'error') {
          throw new Error(event.error || 'Erro ao processar requisição com a IA.');
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('Unexpected token')) {
          throw err;
        }
      }
    }
  } else {
    // Non-streaming fallback
    data = (await response.json()) as GenerationResponse;
  }

  if (!data || !data.success) {
    throw new Error('Não foi possível obter os dados do prontuário gerado.');
  }

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
