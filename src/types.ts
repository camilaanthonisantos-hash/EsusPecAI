export type ProfessionId =
  | 'enfermeiro'
  | 'assistente_social'
  | 'psicopedagogo'
  | 'psicologo'
  | 'nutricionista'
  | 'educador_fisico'
  | 'medico'
  | string;

export interface ProfessionConfig {
  id: ProfessionId;
  name: string;
  category: 'APS' | 'RAPS' | 'eMulti' | string;
  council: string;
  councilAbbr?: string;
  cbo?: string;
  color: string;
  accentBg: string;
  iconName: string;
  shortDesc: string;
  pecFocus: string;
  hasBlock3: boolean; // Enfermeiro has 3 blocks (Avaliação, Plano, Bloco 06 Conduta)
}

export type AIModelId =
  | 'gemini-3.7-flash'
  | 'gemini-3.6-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-pro-preview'
  | 'openai:gpt-4o'
  | 'openai:gpt-4o-mini'
  | 'openai:o1-preview'
  | 'openai:o1-mini'
  | 'openrouter:anthropic/claude-3.5-sonnet'
  | 'openrouter:meta-llama/llama-3.1-8b-instruct'
  | 'openrouter:meta-llama/llama-3.3-70b-instruct'
  | 'openrouter:google/gemma-2-9b-it'
  | 'openrouter:mistralai/mistral-nemo'
  | string;

export interface ModelOption {
  id: AIModelId;
  name: string;
  badge: string;
  description: string;
  speed: string;
  recommendedFor: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'Ultra Rápido',
    description: 'Recomendado para atendimentos diários, estruturação de SOAP.',
    speed: 'Muito Rápido',
    recommendedFor: 'Atendimentos padrão e uso diário',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'Rápido',
    description: 'Alternativa rápida e estável para estruturação clínica.',
    speed: 'Rápido',
    recommendedFor: 'Alternativa em caso de instabilidade do 3.7',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Econômico',
    description: 'Ideal para tarefas simples com menor consumo de cota.',
    speed: 'Rápido',
    recommendedFor: 'Consultas rápidas e testes de quota',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Raciocínio Profundo',
    description: 'Para casos complexos, receitas manuscritas e exames.',
    speed: 'Moderado',
    recommendedFor: 'Casos complexos e multiprofissionais',
  },
  {
    id: 'openai:gpt-4o',
    name: 'OpenAI GPT-4o',
    badge: 'Poderoso',
    description: 'Excelente para raciocínio clínico e transcrições complexas.',
    speed: 'Moderado',
    recommendedFor: 'Estruturação de casos detalhados',
  },
  {
    id: 'openai:gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    badge: 'Rápido',
    description: 'Alternativa rápida e econômica da OpenAI.',
    speed: 'Muito Rápido',
    recommendedFor: 'Consultas padrão',
  },
  {
    id: 'openai:o1-preview',
    name: 'OpenAI o1 Preview',
    badge: 'Alta Complexidade',
    description: 'Modelo mais avançado da OpenAI focado em raciocínio complexo.',
    speed: 'Lento',
    recommendedFor: 'Casos clínicos extremamente complexos',
  },
  {
    id: 'openai:o1-mini',
    name: 'OpenAI o1 Mini',
    badge: 'Raciocínio Rápido',
    description: 'Excelente capacidade analítica com maior agilidade.',
    speed: 'Moderado',
    recommendedFor: 'Diagnósticos diferenciais',
  },
  {
    id: 'openrouter:anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (OpenRouter)',
    badge: 'Escrita Natural',
    description: 'Texto mais humano e focado em nuances.',
    speed: 'Rápido',
    recommendedFor: 'Textos longos e evoluções',
  },
  {
    id: 'openrouter:meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B (OpenRouter)',
    badge: 'Avançado / Open Source',
    description: 'Poderoso modelo open source de alto desempenho (Free via OpenRouter).',
    speed: 'Moderado',
    recommendedFor: 'Consultas detalhadas',
  },
  {
    id: 'openrouter:meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B (OpenRouter)',
    badge: 'Rápido / Free',
    description: 'Modelo ágil e acessível para análises rápidas.',
    speed: 'Muito Rápido',
    recommendedFor: 'Consultas de rotina',
  },
  {
    id: 'openrouter:google/gemma-2-9b-it',
    name: 'Google Gemma 2 9B (OpenRouter)',
    badge: 'Balanceado / Free',
    description: 'Eficiência e precisão com o padrão de qualidade Google.',
    speed: 'Rápido',
    recommendedFor: 'Atendimentos de saúde primária',
  },
  {
    id: 'openrouter:mistralai/mistral-nemo',
    name: 'Mistral Nemo (OpenRouter)',
    badge: 'Eficiente / Free',
    description: 'Alto desempenho para compreensão contextual.',
    speed: 'Rápido',
    recommendedFor: 'Prontuários e resumos clínicos',
  }
];

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string; // mimeType
  base64: string;
  previewUrl?: string;
  category: 'receita' | 'sinais_vitais' | 'documento' | 'audio' | 'geral';
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: 'remume' | 'protocolo_aps' | 'raps' | 'personalizado';
  content: string;
  isActive: boolean;
  isSystemDefault?: boolean;
  createdAt?: number;
}

export interface PatientHistorySummary {
  date: string;
  author: string;
  profession: string;
  avaliacao: string;
  plano: string;
  conduta?: string;
}

export interface GeneratedPECRecord {
  id: string;
  timestamp: number;
  professionId: ProfessionId;
  modelUsed: AIModelId;
  isFirstConsultation?: boolean;
  clinicalAudit?: string;
  patientId?: string;
  patientName?: string;
  patientContextPreview?: string;
  avaliacao: string;
  plano: string;
  conduta?: string;
  fullText: string;
  rawInputSummary: string;
  qualitativeChecks: {
    hasQualitativeVitals: boolean;
    hasFixedCiapSigtap: boolean;
    hasNandaNocNic?: boolean;
  };
}

export interface ToastInfo {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

// -------------------------------------------------------------
// USER & AUTHENTICATION TYPES (RBAC)
// -------------------------------------------------------------
export type UserRole = 'admin' | 'user';

export type WorkplaceType = 'UBS' | 'CAPS' | 'Policlínica' | 'eMulti' | string;

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  professionalRegister: string; // Coren, CRM, CRP, CRESS, CRN, CREF, etc.
  councilBody?: string; // CRM, COREN, CRP, CRESS, CRN, CREF, CBO, etc.
  councilNumber?: string; // Registro no conselho ou número CBO
  councilUf?: string; // Sigla UF (SP, RJ, MG, etc.)
  cboCode?: string; // Código CBO (ex: 2235-05)
  customProfessionName?: string; // Nome customizado se adicionado
  profession: ProfessionId;
  workplace: WorkplaceType;
  avatarUrl?: string;
  createdAt: number;
}

export interface SystemSettings {
  geminiApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
  groqApiKey?: string;
  defaultModel: AIModelId;
  defaultCiapCode: string;
  defaultSigtapCode: string;
  municipalityName: string;
  defaultUnitName: string;
  systemCustomInstructions?: string;
  allowUserSelfRegister?: boolean;
  customProfessions?: ProfessionConfig[];
  customCouncilBodies?: string[];
  customWorkplaces?: string[];
  updatedAt?: number;
  updatedBy?: string;
}

// -------------------------------------------------------------
// PATIENT & CHRONOLOGICAL MANAGEMENT TYPES
// -------------------------------------------------------------
export type KinshipType =
  | 'Mãe'
  | 'Pai'
  | 'Avó / Avô'
  | 'Tia / Tio'
  | 'Irmã / Irmão'
  | 'Cônjuge / Companheiro(a)'
  | 'Tutor(a) Legal / Curador(a)'
  | 'Outro';

export interface Patient {
  id: string;
  fullName: string;
  cns: string; // Cartão Nacional de Saúde - 15 digits
  cpf: string; // 11 digits formatted 000.000.000-00
  birthDate: string; // YYYY-MM-DD
  gender?: 'Feminino' | 'Masculino' | 'Outro';
  phone?: string;
  address?: string;
  legalGuardianName?: string;
  guardianKinship?: KinshipType;
  guardianKinshipCustom?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChronologicalAge {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  isMinor: boolean;
  formatted: string; // e.g. "7 anos, 4 meses e 12 dias"
  shortFormatted: string; // e.g. "7a 4m 12d"
}

// -------------------------------------------------------------
// CONSULTATION & TIMELINE TYPES
// -------------------------------------------------------------
export interface Consultation {
  id: string;
  patientId: string;
  patientName: string;
  authorId: string;
  authorName: string;
  authorProfession: ProfessionId;
  authorRegister: string;
  workplace: string;
  timestamp: number;
  isFirstConsultation?: boolean;
  clinicalAudit?: string;
  avaliacao: string;
  plano: string;
  conduta?: string;
  rawNotes?: string;
  modelUsed: AIModelId;
  qualitativeChecks: {
    hasQualitativeVitals: boolean;
    hasFixedCiapSigtap: boolean;
    hasNandaNocNic?: boolean;
  };
}

// -------------------------------------------------------------
// LONGITUDINAL AI EVOLUTION ANALYSIS TYPES
// -------------------------------------------------------------
export type EvolutionStatus = 'positiva' | 'negativa' | 'estavel' | 'mista';

export interface EvolutionAspect {
  status: EvolutionStatus;
  statusLabel: string;
  descricao: string;
}

export interface EvolutionSummary {
  patientId: string;
  patientName: string;
  generatedAt: number;
  modelUsed: string;
  totalConsultationsAnalyzed: number;
  dateRange: {
    start: string;
    end: string;
  };
  resumoLongitudinal: string;
  matrizEvolucao: {
    aspectosPsicoemocionais: EvolutionAspect;
    aspectosFisicosSinais: EvolutionAspect;
    dinamicaFamiliarSocial: EvolutionAspect;
  };
  pontosAlertaRecomendacoes: string[];
  rawMarkdown: string;
}
