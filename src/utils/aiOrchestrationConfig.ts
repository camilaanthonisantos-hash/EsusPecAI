import { AppAISectionsConfig, SectionAIOrchestrationConfig, AVAILABLE_MODELS, ModelOption } from '../types';
import { getFriendlyModelName, getModelProvider } from './aiModelHelper';

/**
 * Configuração recomendada e padrão de IA com cascata resiliente por seção clínica
 */
export const DEFAULT_SECTIONS_CONFIG: AppAISectionsConfig = {
  soapPec: {
    primaryModelId: 'llama-3.3-70b-versatile',
    fallbackChain: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.7-flash',
      'gemini-2.0-flash',
    ],
    temperature: 0.2,
  },
  timelineLongitudinal: {
    primaryModelId: 'llama-3.3-70b-versatile',
    fallbackChain: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.7-flash',
    ],
    temperature: 0.2,
  },
  officialReports: {
    primaryModelId: 'llama-3.3-70b-versatile',
    fallbackChain: [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-3.7-flash',
    ],
    temperature: 0.2,
  },
  medicalCertificates: {
    primaryModelId: 'llama-3.3-70b-versatile',
    fallbackChain: [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ],
    temperature: 0.3,
  },
  examResults: {
    primaryModelId: 'llama-3.3-70b-versatile',
    fallbackChain: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ],
    temperature: 0.2,
  },
  audioTranscription: {
    primaryModelId: 'groq:whisper-large-v3-turbo',
    fallbackChain: [
      'groq:whisper-large-v3',
      'gemini-2.5-flash',
    ],
    temperature: 0.0,
  },
};

export type ClinicalSectionKey = 'soapPec' | 'timelineLongitudinal' | 'officialReports' | 'medicalCertificates' | 'audioTranscription';

export interface SectionMeta {
  key: ClinicalSectionKey;
  title: string;
  shortTitle: string;
  badge: string;
  description: string;
  iconName: string;
  isAudioOnly?: boolean;
}

export const CLINICAL_SECTIONS_META: SectionMeta[] = [
  {
    key: 'soapPec',
    title: '1. Prontuário PEC (SOAP & SAE)',
    shortTitle: 'Prontuário PEC',
    badge: 'APS / RAPS / eMulti',
    description: 'Estruturação formal dos 3 blocos do PEC (Avaliação, Plano, Conduta 06) com NANDA-I, NIC, NOC, CIAP-2 e SIGTAP.',
    iconName: 'FileText',
  },
  {
    key: 'timelineLongitudinal',
    title: '2. Evolução Clínica Longitudinal',
    shortTitle: 'Evolução Longitudinal',
    badge: 'Auditoria & Trajetória',
    description: 'Comparação cronológica de consultas, análise de farmacoterapia, assiduidade na fila e auditoria de pendências.',
    iconName: 'TrendingUp',
  },
  {
    key: 'officialReports',
    title: '3. Laudos Médicos Oficiais (CFM)',
    shortTitle: 'Laudos Oficiais',
    badge: 'CFM / CID-10',
    description: 'Emissão de laudos periciais e clínicos oficiais para INSS, BPC/LOAS, CAPS, judicial e aptidão com fundamentação legal.',
    iconName: 'Award',
  },
  {
    key: 'medicalCertificates',
    title: '4. Recomendações em Atestados Médicos',
    shortTitle: 'Atestados Médicos',
    badge: 'Afastamento & Condutas',
    description: 'Recomendações terapêuticas e repouso de 1 a 3 frases personalizadas para atestados de afastamento com CID-10.',
    iconName: 'ShieldAlert',
  },
  {
    key: 'audioTranscription',
    title: '5. Transcrição de Áudio Clínico (Voz)',
    shortTitle: 'Transcrição de Áudio',
    badge: 'Voz / SUS',
    description: 'Reconhecimento de fala e ditado clínico de consultas por microfone (Groq Whisper / Gemini Multimodal).',
    iconName: 'Mic',
    isAudioOnly: true,
  },
];

export const DEFUNCT_OR_INVALID_MODELS = new Set([
  'openrouter:inception/mercury-decide:free',
  'openrouter:google/gemini-2.0-flash-exp:free',
  'openrouter:google/gemini-2.0-flash-thinking-exp:free',
  'openrouter:nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'openrouter:inclusionai/ling-3.0-flash-sante:free',
  'openrouter:inclusionai/ling-3.0-flash:free',
  'openrouter:google/gemma-4-31b-it:free',
  'openrouter:google/gemma-4-26b-a4b-it:free',
  'openrouter:google/gemma-3-12b-it:free',
  'openrouter:google/gemma-3-4b-it:free',
  'openrouter:liquid/lfm-2.5-1.2b-instruct:free',
  'openrouter:thinkingmachines/inkling-small:free',
  'inception/mercury-decide:free',
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-2.0-flash-thinking-exp:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'inclusionai/ling-3.0-flash-sante:free',
  'inclusionai/ling-3.0-flash:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'thinkingmachines/inkling-small:free',
]);

/**
 * Validador estrito de modelos permitidos para a clínica:
 * Apenas Groq (Llama 3.3 70B e Whisper para áudio) e Google AI Studio (Família Gemini).
 * Remove qualquer menção a OpenRouter, OpenAI ou Ollama.
 */
export function isAllowedClinicalModel(modelId?: string, isAudio = false): boolean {
  if (!modelId || typeof modelId !== 'string') return false;
  const clean = modelId.trim().toLowerCase();

  if (
    clean.startsWith('openrouter:') ||
    clean.startsWith('openai:') ||
    clean.startsWith('ollama:') ||
    clean.includes('medllama') ||
    clean.includes('med42') ||
    clean.includes('gpt-') ||
    clean.includes('o1') ||
    clean.includes('o3') ||
    clean.includes('claude') ||
    clean.includes('deepseek') ||
    clean.includes('qwen') ||
    clean.includes('mistral') ||
    clean.includes('liquid') ||
    clean.includes('poolside') ||
    clean.includes('nemotron')
  ) {
    return false;
  }

  if (clean.includes('whisper')) {
    return isAudio;
  }

  if (clean.includes('llama-3.3-70b-versatile')) {
    return true;
  }

  if (clean.startsWith('gemini-') || clean.startsWith('gemini:')) {
    return true;
  }

  return false;
}

/**
 * Sanitiza a lista de fallback garantindo:
 * 1. Não conter IDs nulos ou vazios
 * 2. Não conter o modelo primário (evita loop redundante)
 * 3. Não conter itens duplicados
 * 4. Filtrar modelos descontinuados ou incompatíveis com chat
 * 5. Manter estritamente modelos permitidos (Groq e Gemini)
 */
export function sanitizeFallbackChain(primaryModelId: string, fallbackChain?: string[], isAudio = false): string[] {
  const defaultFallback = isAudio ? ['groq:whisper-large-v3', 'gemini-2.5-flash'] : ['gemini-2.5-flash'];
  if (!Array.isArray(fallbackChain)) return defaultFallback;
  const cleanPrimary = (primaryModelId || '').trim();
  const filtered = fallbackChain
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id && id !== cleanPrimary && isAllowedClinicalModel(id, isAudio) && !DEFUNCT_OR_INVALID_MODELS.has(id));

  if (!isAudio && !filtered.includes('gemini-2.5-flash') && cleanPrimary !== 'gemini-2.5-flash') {
    filtered.push('gemini-2.5-flash');
  }
  return Array.from(new Set(filtered));
}

/**
 * Garante que a configuração de seções seja completa, sem falhas de undefined,
 * fazendo merge profundo com os valores padrão recomendados (DEFAULT_SECTIONS_CONFIG).
 * Previne erros de "Cannot read properties of undefined (reading 'primaryModelId')".
 */
export function ensureSectionsConfig(loadedConfig?: Partial<AppAISectionsConfig> | null): AppAISectionsConfig {
  const base = DEFAULT_SECTIONS_CONFIG;
  if (!loadedConfig || typeof loadedConfig !== 'object') {
    return JSON.parse(JSON.stringify(base));
  }

  const mergeSection = (
    key: keyof AppAISectionsConfig,
    defaultSection: SectionAIOrchestrationConfig
  ): SectionAIOrchestrationConfig => {
    const rawSection = loadedConfig[key];
    if (!rawSection || typeof rawSection !== 'object') {
      return { ...defaultSection, fallbackChain: [...defaultSection.fallbackChain] };
    }

    let primaryModelId = (typeof rawSection.primaryModelId === 'string' && rawSection.primaryModelId.trim())
      ? rawSection.primaryModelId.trim()
      : defaultSection.primaryModelId;

    const isAudio = key === 'audioTranscription';
    if (!isAllowedClinicalModel(primaryModelId, isAudio) || DEFUNCT_OR_INVALID_MODELS.has(primaryModelId)) {
      primaryModelId = defaultSection.primaryModelId;
    }

    const rawChain = Array.isArray(rawSection.fallbackChain)
      ? rawSection.fallbackChain
      : defaultSection.fallbackChain;

    const fallbackChain = sanitizeFallbackChain(primaryModelId, rawChain, isAudio);

    return {
      primaryModelId,
      fallbackChain,
      temperature: typeof rawSection.temperature === 'number' ? rawSection.temperature : defaultSection.temperature,
      maxTokens: typeof rawSection.maxTokens === 'number' ? rawSection.maxTokens : defaultSection.maxTokens,
      systemPromptOverride: typeof rawSection.systemPromptOverride === 'string' ? rawSection.systemPromptOverride : undefined,
    };
  };

  return {
    soapPec: mergeSection('soapPec', base.soapPec),
    timelineLongitudinal: mergeSection('timelineLongitudinal', base.timelineLongitudinal),
    officialReports: mergeSection('officialReports', base.officialReports),
    medicalCertificates: mergeSection('medicalCertificates', base.medicalCertificates),
    examResults: mergeSection('examResults', base.examResults || base.soapPec),
    audioTranscription: mergeSection('audioTranscription', base.audioTranscription),
  };
}

/**
 * Retorna os modelos compatíveis com uma determinada seção clínica,
 * combinando os modelos do catálogo oficial, modelos customizados
 * e modelos atualmente ativos na configuração, aplicando o filtro especialista.
 */
export function getAvailableModelsForSection(
  sectionKey: string,
  customModels?: ModelOption[],
  activeModelsInUse?: string[]
): ModelOption[] {
  const isAudioSection = sectionKey === 'audioTranscription';
  const modelMap = new Map<string, ModelOption>();

  // 1. Catálogo oficial pré-configurado filtrado
  for (const m of AVAILABLE_MODELS) {
    if (isAllowedClinicalModel(m.id, isAudioSection)) {
      modelMap.set(m.id, m);
    }
  }

  // 2. Modelos customizados/persistidos no sistema (apenas permitidos)
  if (Array.isArray(customModels)) {
    for (const cm of customModels) {
      if (cm && cm.id && isAllowedClinicalModel(cm.id, isAudioSection)) {
        modelMap.set(cm.id, {
          ...cm,
          provider: cm.provider || getModelProvider(cm.id),
        });
      }
    }
  }

  // 3. Modelos atualmente em uso na seção (apenas permitidos)
  if (Array.isArray(activeModelsInUse)) {
    for (const mId of activeModelsInUse) {
      if (mId && typeof mId === 'string' && isAllowedClinicalModel(mId, isAudioSection) && !modelMap.has(mId)) {
        modelMap.set(mId, {
          id: mId,
          name: getFriendlyModelName(mId),
          badge: getModelProvider(mId) === 'groq' ? 'Groq' : 'Google AI Studio',
          description: `Modelo ativo no sistema (${mId})`,
          speed: 'Rápido',
          recommendedFor: 'Configuração do usuário',
          provider: getModelProvider(mId),
          isAudioCapable: mId.includes('whisper') || mId.includes('gemini'),
        });
      }
    }
  }

  const allCombined = Array.from(modelMap.values()).filter(
    (m) => !DEFUNCT_OR_INVALID_MODELS.has(m.id) && isAllowedClinicalModel(m.id, isAudioSection)
  );

  if (isAudioSection) {
    return allCombined.filter((m) => m.isAudioCapable === true || m.id.includes('whisper') || m.id.includes('gemini'));
  }

  // Seções de texto aceitam qualquer modelo disponível (exceto groq:whisper que é exclusivo de áudio)
  return allCombined.filter((m) => !m.id.startsWith('groq:whisper'));
}
