import { AppAISectionsConfig, SectionAIOrchestrationConfig, AVAILABLE_MODELS, ModelOption } from '../types';
import { getFriendlyModelName, getModelProvider } from './aiModelHelper';

/**
 * Configuração recomendada e padrão de IA com cascata resiliente por seção clínica
 */
export const DEFAULT_SECTIONS_CONFIG: AppAISectionsConfig = {
  soapPec: {
    primaryModelId: 'gemini-3.7-flash',
    fallbackChain: [
      'openrouter:inclusionai/ling-3.0-flash-sante:free',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'openai:gpt-4o-mini',
    ],
    temperature: 0.2,
  },
  timelineLongitudinal: {
    primaryModelId: 'openai:gpt-4o',
    fallbackChain: [
      'gemini-3.7-flash',
      'openrouter:meta-llama/llama-3.3-70b-instruct',
      'openrouter:inclusionai/ling-3.0-flash-sante:free',
      'gemini-3.6-flash',
    ],
    temperature: 0.2,
  },
  officialReports: {
    primaryModelId: 'gemini-3.7-flash',
    fallbackChain: [
      'openrouter:inclusionai/ling-3.0-flash-sante:free',
      'openai:gpt-4o-mini',
      'gemini-3.6-flash',
    ],
    temperature: 0.2,
  },
  medicalCertificates: {
    primaryModelId: 'gemini-3.7-flash',
    fallbackChain: [
      'openrouter:inclusionai/ling-3.0-flash-sante:free',
      'gemini-3.1-flash-lite',
    ],
    temperature: 0.3,
  },
  examResults: {
    primaryModelId: 'gemini-3.7-flash',
    fallbackChain: [
      'openrouter:inclusionai/ling-3.0-flash-sante:free',
      'gemini-3.1-pro-preview',
    ],
    temperature: 0.2,
  },
  audioTranscription: {
    primaryModelId: 'groq:whisper-large-v3-turbo',
    fallbackChain: [
      'groq:whisper-large-v3',
      'gemini-3.7-flash',
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

/**
 * Sanitiza a lista de fallback garantindo:
 * 1. Não conter IDs nulos ou vazios
 * 2. Não conter o modelo primário (evita loop redundante)
 * 3. Não conter itens duplicados
 */
export function sanitizeFallbackChain(primaryModelId: string, fallbackChain?: string[]): string[] {
  if (!Array.isArray(fallbackChain)) return [];
  const cleanPrimary = (primaryModelId || '').trim();
  const filtered = fallbackChain
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id && id !== cleanPrimary);
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

    const primaryModelId = (typeof rawSection.primaryModelId === 'string' && rawSection.primaryModelId.trim())
      ? rawSection.primaryModelId.trim()
      : defaultSection.primaryModelId;

    const rawChain = Array.isArray(rawSection.fallbackChain)
      ? rawSection.fallbackChain
      : defaultSection.fallbackChain;

    const fallbackChain = sanitizeFallbackChain(primaryModelId, rawChain);

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
 * combinando os modelos do catálogo, modelos customizados cadastrados
 * e modelos atualmente ativos na configuração para garantir que nenhum modelo seja perdido.
 */
export function getAvailableModelsForSection(
  sectionKey: string,
  customModels?: ModelOption[],
  activeModelsInUse?: string[]
): ModelOption[] {
  const modelMap = new Map<string, ModelOption>();

  // 1. Catálogo oficial pré-configurado
  for (const m of AVAILABLE_MODELS) {
    modelMap.set(m.id, m);
  }

  // 2. Modelos customizados/persistidos no sistema
  if (Array.isArray(customModels)) {
    for (const cm of customModels) {
      if (cm && cm.id) {
        modelMap.set(cm.id, {
          ...cm,
          provider: cm.provider || getModelProvider(cm.id),
        });
      }
    }
  }

  // 3. Modelos atualmente em uso na seção (para nunca ficarem ausentes do dropdown)
  if (Array.isArray(activeModelsInUse)) {
    for (const mId of activeModelsInUse) {
      if (mId && typeof mId === 'string' && !modelMap.has(mId)) {
        modelMap.set(mId, {
          id: mId,
          name: getFriendlyModelName(mId),
          badge: mId.includes('sante') ? 'Saúde / Médico' : 'Customizado',
          description: `Modelo ativo no sistema (${mId})`,
          speed: 'Rápido',
          recommendedFor: 'Configuração do usuário',
          provider: getModelProvider(mId),
          isAudioCapable: mId.includes('whisper') || mId.includes('gemini'),
        });
      }
    }
  }

  const allCombined = Array.from(modelMap.values());

  if (sectionKey === 'audioTranscription') {
    return allCombined.filter((m) => m.isAudioCapable === true || m.id.includes('whisper') || m.id.includes('gemini'));
  }

  // Seções de texto aceitam qualquer modelo disponível (exceto groq:whisper que é exclusivo de áudio)
  return allCombined.filter((m) => !m.id.startsWith('groq:whisper'));
}
