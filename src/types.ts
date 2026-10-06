export type ProfessionId =
  | 'enfermeiro'
  | 'tecnico_enfermagem'
  | 'auxiliar_enfermagem'
  | 'administrativo'
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
  category: 'APS' | 'RAPS' | 'eMulti' | 'Gestão' | string;
  council: string;
  councilAbbr?: string;
  cbo?: string;
  color: string;
  accentBg: string;
  iconName: string;
  shortDesc: string;
  pecFocus: string;
  hasBlock3: boolean; // Enfermeiro has 3 blocks (Avaliação, Plano, Bloco 06 Conduta)
  isTriageOnly?: boolean; // Téc. and Aux. de Enfermagem have a single "Triagem" block
  isAdministrativeOnly?: boolean; // Administrativo: agendamentos e recepção, não gera atendimento
}

export type AIModelId =
  | 'gemini-3.7-flash'
  | 'gemini-3.8-flash'
  | 'gemini-3.6-flash'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.1-pro-preview'
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'openai:gpt-4o'
  | 'openai:gpt-4o-mini'
  | 'openai:o1'
  | 'openai:o1-preview'
  | 'openai:o1-mini'
  | 'openai:o3-mini'
  | 'openrouter:inclusionai/ling-3.0-flash-sante:free'
  | 'openrouter:inclusionai/ling-3.0-flash:free'
  | 'openrouter:anthropic/claude-3.5-sonnet'
  | 'openrouter:anthropic/claude-3.5-haiku'
  | 'openrouter:deepseek/deepseek-r1:free'
  | 'openrouter:deepseek/deepseek-chat:free'
  | 'openrouter:meta-llama/llama-3.3-70b-instruct:free'
  | 'openrouter:meta-llama/llama-3.3-70b-instruct'
  | 'openrouter:meta-llama/llama-3.1-8b-instruct:free'
  | 'openrouter:meta-llama/llama-3.1-8b-instruct'
  | 'openrouter:meta-llama/llama-3.2-3b-instruct:free'
  | 'openrouter:meta-llama/llama-3.2-1b-instruct:free'
  | 'openrouter:meta-llama/llama-3.1-70b-instruct:free'
  | 'openrouter:qwen/qwen-2.5-72b-instruct'
  | 'openrouter:qwen/qwen-2.5-72b-instruct:free'
  | 'openrouter:qwen/qwen-2.5-coder-32b-instruct:free'
  | 'openrouter:google/gemini-2.0-flash-exp:free'
  | 'openrouter:google/gemini-2.0-flash-thinking-exp:free'
  | 'openrouter:google/gemma-2-9b-it'
  | 'openrouter:mistralai/mistral-nemo'
  | 'openrouter:mistralai/mistral-small-24b-instruct-2501:free'
  | 'openrouter:mistralai/mistral-7b-instruct:free'
  | 'openrouter:openai/gpt-4o-mini'
  | 'openrouter:openai/o3-mini'
  | 'openrouter:microsoft/phi-3-medium-128k-instruct:free'
  | 'groq:whisper-large-v3-turbo'
  | 'groq:whisper-large-v3'
  | string;

export interface ModelOption {
  id: AIModelId;
  name: string;
  badge: string;
  description: string;
  speed: string;
  recommendedFor: string;
  provider?: 'gemini' | 'openai' | 'openrouter' | 'groq';
  isAudioCapable?: boolean;
  contextWindow?: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // 1. OPENROUTER ESPECIALIZADO EM SAÚDE & MEDICINA (FREE)
  {
    id: 'openrouter:inclusionai/ling-3.0-flash-sante:free',
    name: 'Ling 3.0 Flash Santé (Free)',
    badge: 'Saúde / Médico',
    description: 'Especializado em medicina, terminologia de saúde, condutas clínicas e SOAP (OpenRouter Free).',
    speed: 'Rápido',
    recommendedFor: 'Prontuários SOAP, laudos periciais, termos médicos e condutas',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '32k tokens',
  },
  {
    id: 'openrouter:inclusionai/ling-3.0-flash:free',
    name: 'Ling 3.0 Flash (Free)',
    badge: 'Geral / Free',
    description: 'Versão geral de alto desempenho da família Ling 3.0 via OpenRouter.',
    speed: 'Rápido',
    recommendedFor: 'Atendimentos clínicos, transcrições e resumos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '32k tokens',
  },

  // 2. GOOGLE GEMINI (NATIVO)
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'Ultra Rápido',
    description: 'Recomendado para atendimentos diários, estruturação de SOAP e multimodal.',
    speed: 'Muito Rápido',
    recommendedFor: 'Atendimentos padrão e uso diário',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Nova Geração',
    description: 'Nova geração Flash da Google com alto raciocínio clínico e baixa latência.',
    speed: 'Ultra Rápido',
    recommendedFor: 'Consultas, diagnósticos e SOAP',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'Rápido',
    description: 'Alternativa rápida e estável para estruturação clínica.',
    speed: 'Rápido',
    recommendedFor: 'Alternativa em caso de instabilidade do 3.7',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Econômico',
    description: 'Ideal para tarefas simples com menor consumo de cota.',
    speed: 'Rápido',
    recommendedFor: 'Consultas rápidas e testes de quota',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Raciocínio Profundo',
    description: 'Para casos complexos, receitas manuscritas e exames.',
    speed: 'Moderado',
    recommendedFor: 'Casos complexos e multiprofissionais',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '2M tokens',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Estável',
    description: 'Modelo veloz de backup para processamento multimodal e texto.',
    speed: 'Muito Rápido',
    recommendedFor: 'Fallback de contingência',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'Rápido / Estável',
    description: 'Modelo de produção veloz com excelente taxa de acerto.',
    speed: 'Muito Rápido',
    recommendedFor: 'Contingência rápida de consultas',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    badge: 'Ultra Leve',
    description: 'Versão ultra leve do Gemini 2.0 com máxima eficiência de custos.',
    speed: 'Ultra Rápido',
    recommendedFor: 'Triagens e resumos compactos',
    provider: 'gemini',
    isAudioCapable: true,
    contextWindow: '1M tokens',
  },

  // 3. OPENROUTER - MODELOS GRATUITOS (FREE TIER)
  {
    id: 'openrouter:deepseek/deepseek-r1:free',
    name: 'DeepSeek R1 (OpenRouter Free)',
    badge: 'Raciocínio Clínico / Free',
    description: 'Modelo avançado de raciocínio passo-a-passo (Chain-of-Thought) gratuito.',
    speed: 'Moderado',
    recommendedFor: 'Auditorias clínicas complexas e diagnósticos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '64k tokens',
  },
  {
    id: 'openrouter:deepseek/deepseek-chat:free',
    name: 'DeepSeek V3 (OpenRouter Free)',
    badge: 'Alta Performance / Free',
    description: 'Modelo geral de ponta gratuito para processamento textual ágil.',
    speed: 'Rápido',
    recommendedFor: 'Prontuários PEC e evoluções',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '64k tokens',
  },
  {
    id: 'openrouter:meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct (OpenRouter Free)',
    badge: 'Open Source / Free',
    description: 'Versão gratuita do Llama 3.3 70B de alto desempenho.',
    speed: 'Moderado',
    recommendedFor: 'Consultas detalhadas e relatórios',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B Instruct (OpenRouter Free)',
    badge: 'Rápido / Free',
    description: 'Versão gratuita ágil para rotinas ambulatoriais.',
    speed: 'Muito Rápido',
    recommendedFor: 'Consultas rápidas e triagem',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:meta-llama/llama-3.2-3b-instruct:free',
    name: 'Llama 3.2 3B Instruct (OpenRouter Free)',
    badge: 'Ultra Leve / Free',
    description: 'Modelo ultra veloz e gratuito para respostas quase instantâneas.',
    speed: 'Ultra Rápido',
    recommendedFor: 'Classificações rápidas de risco e triagem',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:meta-llama/llama-3.2-1b-instruct:free',
    name: 'Llama 3.2 1B Instruct (OpenRouter Free)',
    badge: 'Instantâneo / Free',
    description: 'Menor modelo da família Llama 3.2, com latência mínima.',
    speed: 'Ultra Rápido',
    recommendedFor: 'Validações simples e triagens',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:meta-llama/llama-3.1-70b-instruct:free',
    name: 'Llama 3.1 70B Instruct (OpenRouter Free)',
    badge: 'Avançado / Free',
    description: 'Modelo Llama 3.1 70B gratuito com forte capacidade de síntese.',
    speed: 'Moderado',
    recommendedFor: 'Relatórios e laudos médicos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (OpenRouter Free)',
    badge: 'Experimental / Free',
    description: 'Acesso gratuito ao Gemini 2.0 Flash via OpenRouter.',
    speed: 'Muito Rápido',
    recommendedFor: 'Atendimento de rotina e contingência',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '1M tokens',
  },
  {
    id: 'openrouter:google/gemini-2.0-flash-thinking-exp:free',
    name: 'Gemini 2.0 Flash Thinking (OpenRouter Free)',
    badge: 'Raciocínio / Free',
    description: 'Versão com cadeia de pensamento explícita do Gemini 2.0 via OpenRouter.',
    speed: 'Moderado',
    recommendedFor: 'Casos clínicos complexos e diagnósticos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '1M tokens',
  },
  {
    id: 'openrouter:mistralai/mistral-small-24b-instruct-2501:free',
    name: 'Mistral Small 24B (OpenRouter Free)',
    badge: 'Eficiente / Free',
    description: 'Modelo moderno e equilibrado da Mistral AI gratuito.',
    speed: 'Rápido',
    recommendedFor: 'Prontuários e resumos clínicos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '32k tokens',
  },
  {
    id: 'openrouter:mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct (OpenRouter Free)',
    badge: 'Rápido / Free',
    description: 'Modelo consagrado da Mistral AI, ágil e gratuito.',
    speed: 'Muito Rápido',
    recommendedFor: 'Rotinas clínicas rápidas',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '32k tokens',
  },
  {
    id: 'openrouter:qwen/qwen-2.5-coder-32b-instruct:free',
    name: 'Qwen 2.5 Coder 32B (OpenRouter Free)',
    badge: 'Lógica Rigorosa / Free',
    description: 'Modelo de raciocínio rigoroso e estruturação precisa de dados clínicos.',
    speed: 'Rápido',
    recommendedFor: 'Estruturação JSON e códigos CID/CIAP',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '32k tokens',
  },
  {
    id: 'openrouter:microsoft/phi-3-medium-128k-instruct:free',
    name: 'Microsoft Phi-3 Medium (OpenRouter Free)',
    badge: 'Compacto / Free',
    description: 'Modelo otimizado da Microsoft com janela de 128k tokens gratuito.',
    speed: 'Muito Rápido',
    recommendedFor: 'Históricos clínicos longos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },

  // 4. OPENROUTER - MODELOS AVANÇADOS / PRO
  {
    id: 'openrouter:anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet (OpenRouter)',
    badge: 'Escrita Natural',
    description: 'Texto mais humano e focado em nuances clínicas.',
    speed: 'Rápido',
    recommendedFor: 'Textos longos e evoluções',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '200k tokens',
  },
  {
    id: 'openrouter:anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku (OpenRouter)',
    badge: 'Ultra Rápido',
    description: 'Velocidade extrema e alta qualidade de escrita da Anthropic.',
    speed: 'Ultra Rápido',
    recommendedFor: 'Consultas ambulatoriais e triagem',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '200k tokens',
  },
  {
    id: 'openrouter:qwen/qwen-2.5-72b-instruct',
    name: 'Qwen 2.5 72B Instruct (OpenRouter)',
    badge: 'Alta Precisão',
    description: 'Excelente modelo multilíngue de alta capacidade para medicina.',
    speed: 'Moderado',
    recommendedFor: 'Consultas complexas e farmacoterapia',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B (OpenRouter)',
    badge: 'Avançado / Open Source',
    description: 'Poderoso modelo open source de alto desempenho.',
    speed: 'Moderado',
    recommendedFor: 'Consultas detalhadas',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B (OpenRouter)',
    badge: 'Rápido',
    description: 'Modelo ágil e acessível para análises rápidas.',
    speed: 'Muito Rápido',
    recommendedFor: 'Consultas de rotina',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:google/gemma-2-9b-it',
    name: 'Google Gemma 2 9B (OpenRouter)',
    badge: 'Balanceado',
    description: 'Eficiência e precisão com o padrão de qualidade Google.',
    speed: 'Rápido',
    recommendedFor: 'Atendimentos de saúde primária',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '8k tokens',
  },
  {
    id: 'openrouter:mistralai/mistral-nemo',
    name: 'Mistral Nemo (OpenRouter)',
    badge: 'Eficiente',
    description: 'Alto desempenho para compreensão contextual clínica.',
    speed: 'Rápido',
    recommendedFor: 'Prontuários e resumos clínicos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:openai/gpt-4o-mini',
    name: 'GPT-4o Mini (OpenRouter)',
    badge: 'Rápido / OpenAI via OR',
    description: 'Acesso ao GPT-4o Mini através da infraestrutura OpenRouter.',
    speed: 'Muito Rápido',
    recommendedFor: 'Consultas padrão',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openrouter:openai/o3-mini',
    name: 'OpenAI o3-mini (OpenRouter)',
    badge: 'Raciocínio via OR',
    description: 'Modelo o3-mini com alta precisão de raciocínio lógico via OpenRouter.',
    speed: 'Rápido',
    recommendedFor: 'Diagnósticos e casos complexos',
    provider: 'openrouter',
    isAudioCapable: false,
    contextWindow: '200k tokens',
  },

  // 5. OPENAI (NATIVO)
  {
    id: 'openai:gpt-4o',
    name: 'OpenAI GPT-4o',
    badge: 'Poderoso',
    description: 'Excelente para raciocínio clínico e transcrições complexas.',
    speed: 'Moderado',
    recommendedFor: 'Estruturação de casos detalhados',
    provider: 'openai',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openai:gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    badge: 'Rápido',
    description: 'Alternativa rápida e econômica da OpenAI.',
    speed: 'Muito Rápido',
    recommendedFor: 'Consultas padrão',
    provider: 'openai',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openai:o1',
    name: 'OpenAI o1',
    badge: 'Raciocínio Máximo',
    description: 'O mais potente modelo de raciocínio e auditoria clínica da OpenAI.',
    speed: 'Lento',
    recommendedFor: 'Casos médicos raros, diagnósticos difíceis e auditorias',
    provider: 'openai',
    isAudioCapable: false,
    contextWindow: '200k tokens',
  },
  {
    id: 'openai:o1-preview',
    name: 'OpenAI o1 Preview',
    badge: 'Alta Complexidade',
    description: 'Modelo avançado da OpenAI focado em raciocínio complexo.',
    speed: 'Lento',
    recommendedFor: 'Casos clínicos extremamente complexos',
    provider: 'openai',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openai:o1-mini',
    name: 'OpenAI o1 Mini',
    badge: 'Raciocínio Rápido',
    description: 'Excelente capacidade analítica com maior agilidade.',
    speed: 'Moderado',
    recommendedFor: 'Diagnósticos diferenciais',
    provider: 'openai',
    isAudioCapable: false,
    contextWindow: '128k tokens',
  },
  {
    id: 'openai:o3-mini',
    name: 'OpenAI o3-mini',
    badge: 'Raciocínio Avançado',
    description: 'Modelo de raciocínio lógico de ponta com alta precisão diagnóstica.',
    speed: 'Rápido',
    recommendedFor: 'Casos clínicos complexos e diagnósticos diferenciais',
    provider: 'openai',
    isAudioCapable: false,
    contextWindow: '200k tokens',
  },

  // 6. GROQ (VOZ & ÁUDIO CLÍNICO)
  {
    id: 'groq:whisper-large-v3-turbo',
    name: 'Groq Whisper Large v3 Turbo',
    badge: 'Voz / Ultra Rápido',
    description: 'Reconhecimento e transcrição de áudio clínico em milissegundos.',
    speed: 'Ultra Rápido',
    recommendedFor: 'Transcrição de áudio e ditado clínico por voz',
    provider: 'groq',
    isAudioCapable: true,
  },
  {
    id: 'groq:whisper-large-v3',
    name: 'Groq Whisper Large v3',
    badge: 'Voz / Alta Precisão',
    description: 'Máxima precisão na transcrição de consultas em português.',
    speed: 'Rápido',
    recommendedFor: 'Transcrição de áudios com ruído ou sotaques regionais',
    provider: 'groq',
    isAudioCapable: true,
  },
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

export interface TriageVitalsData {
  paSystolic?: string;
  paDiastolic?: string;
  paFormatted?: string;
  paClassification?: string;
  isHypertensivePatient?: boolean;
  temperature?: string; // number string with . or ,
  temperatureClassification?: string;
  sao2?: string;
  sao2Classification?: string;
  hasDpoc?: boolean;
  bloodGlucose?: string;
  bloodGlucoseCondition?: 'jejum' | 'casual' | 'pos_prandial';
  bloodGlucoseClassification?: string;
  heartRate?: string;
  heartRateClassification?: string;
  respiratoryRate?: string;
  respiratoryRateClassification?: string;
  weightKg?: string; // peso em kg (ex: "70.5")
  weightGrams?: string; // peso em gramas
  heightCm?: string;
  imc?: string;
  imcClassification?: string;
  observations?: string;
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
  isTriage?: boolean;
  triageData?: TriageVitalsData;
  prescription?: PrescriptionData;
  referral?: ReferralData;
  pts?: PtsData;
  examRequest?: ExamRequestData;
  medicalReport?: MedicalReportData;
  medicalCertificate?: MedicalCertificateData;
  attendanceCertificate?: AttendanceCertificateData;
  examMedia?: ExamMediaReportData;
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
  councilRegister?: string; // Sinônimo para registro profissional
  registrationNumber?: string; // Sinônimo para número de registro
  cboCode?: string; // Código CBO (ex: 2235-05)
  cbo?: string; // Sinônimo para CBO
  specialty?: string; // Especialidade clínica
  customProfessionName?: string; // Nome customizado se adicionado
  profession: ProfessionId;
  workplace: WorkplaceType;
  avatarUrl?: string;
  digitalStampUrl?: string; // Imagem do carimbo / assinatura digitalizada (PNG/JPG base64 ou URL)
  useDigitalStamp?: boolean; // Chave para alternar entre carimbo imagem ou texto tradicional
  createdAt: number;
  updatedAt?: number;
  // Subscription & Free Trial
  free_used?: boolean;
  lifetime_trial?: boolean;
  subscription_status?: 'free' | 'pendente' | 'pago';
  subscription_expires_at?: number;
  plan_name?: string;
  cpf?: string;
  phone?: string;
  // Scheduling & Google Calendar Integration
  googleCalendarId?: string; // ID da agenda do Google Calendar (ex: email ou xxxx@group.calendar.google.com)
  isGoogleCalendarVerified?: boolean; // Indica se a conexão com o Google Calendar foi testada e aprovada
  googleCalendarType?: 'primary_email' | 'secondary_group'; // Tipo de agenda vinculada
  googleCalendarVerifiedAt?: number; // Timestamp da última validação funcional
  isBookingEnabled?: boolean; // Habilita ou desabilita agendamentos online
  isChargingEnabled?: boolean; // Exige pagamento obrigatório (PIX) no agendamento
  scheduleConfig?: ScheduleConfig; // Grade de horários de atendimento
  customServices?: ProfessionalService[]; // Catálogo de serviços customizados
}

// -------------------------------------------------------------
// SCHEDULING & APPOINTMENTS TYPES
// -------------------------------------------------------------
export interface CustomTimeSlot {
  id: string;
  startTime: string; // "08:00"
  endTime: string; // "08:45"
  enabled?: boolean; // default true
}

export interface DayScheduleConfig {
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  dayName: string; // "Domingo", "Segunda-feira", etc.
  enabled: boolean;
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  breakStartTime?: string; // "12:00"
  breakEndTime?: string; // "13:00"
  customSlots?: CustomTimeSlot[]; // Horários específicos cadastrados: ex: 08:00 às 08:45, 08:45 às 09:30
}

export interface ScheduleConfig {
  weeklySchedule: DayScheduleConfig[];
  slotDurationMinutes: number; // 30, 45, 60 min
  breakDurationMinutes?: number; // Intervalo entre consultas (min)
  advanceBookingDays?: number; // Quantos dias no futuro pode agendar (default: 30)
  minNoticeHours?: number; // Quantas horas de antecedência mínima para agendar (default: 2)
}

export interface ProfessionalService {
  id: string;
  name: string; // Ex: "Consulta de Enfermagem", "Atendimento Psicológico", "Avaliação Médica"
  durationMinutes: number; // 30, 45, 60
  price: number; // Valor financeiro em R$ (0.00 para gratuito)
  description?: string;
  active: boolean;
}

export type AppointmentStatus =
  | 'agendado' // Confirmado / Aguardando
  | 'em_atendimento' // Em Atendimento
  | 'finalizado' // Concluído / Atendido
  | 'cancelado'; // Cancelado / Desistência

// -------------------------------------------------------------
// RECEPTION QUEUE & MANCHESTER TRIAGE TYPES
// -------------------------------------------------------------
export type RiskClassification =
  | 'vermelho' // Vermelho (Emergência): atendimento imediato
  | 'laranja'  // Laranja (Muito Urgente): atendimento em até 10 min
  | 'amarelo'  // Amarelo (Urgente): atendimento em até 50 a 60 min
  | 'verde'    // Verde (Pouco Urgente): atendimento em até 120 min
  | 'azul';    // Azul (Não Urgente): atendimento em até 240 min

export type QueuePriorityCategory =
  | 'padrao'
  | 'idoso_60'
  | 'idoso_80'
  | 'puericultura'
  | 'gestante'
  | 'pcd';

export type QueueItemStatus =
  | 'waiting'          // Aguardando na fila
  | 'calling'          // Chamando para atendimento (alerta visual verde pulsante)
  | 'in_consultation'  // Em atendimento
  | 'in_service'       // Em atendimento
  | 'completed'        // Finalizado
  | 'cancelled'        // Cancelado
  | 'abandoned';       // Desistência

export interface ReceptionQueueItem {
  id: string;
  patientId: string;
  patientName: string;
  patientCpf?: string;
  patientCns?: string;
  patientBirthDate?: string;
  patientGender?: string;
  patientPhone?: string;

  // Target Destination Professional
  professionalId: string;
  professionalName: string;
  professionalProfession: ProfessionId;

  // Date & Time
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // "08:30"
  timestamp: number;     // calculated timestamp ms for chronological sorting
  formattedDateTime: string; // "dd/mm/aa + [dia da semana] às hh:mm"

  // Status
  status: QueueItemStatus;
  orderIndex?: number; // Custom position order index in queue for drag-and-drop / repositioning

  // Clinical & Triage Details
  riskClassification?: RiskClassification;
  priorityCategory?: QueuePriorityCategory;
  isPregnant?: boolean;
  triageSummary?: string;
  origin: 'triagem' | 'agendamento' | 'pacientes' | 'conclusao_atendimento';

  // Associated IDs
  appointmentId?: string;
  consultationId?: string;
  createdBy?: string;
  createdByName?: string;
  calledAt?: number;
  attendedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  notes?: string;

  createdAt: number;
  updatedAt: number;
}

export interface Appointment {
  id: string;
  patientId?: string; // ID do paciente cadastrado no PEC (se existir)
  patientName: string;
  patientCpf?: string;
  patientPhone: string; // WhatsApp
  patientEmail?: string;
  patientCns?: string;
  patientBirthDate?: string;
  professionalId: string;
  professionalName: string;
  professionalEmail: string;
  professionalProfession: ProfessionId;
  serviceId: string;
  serviceName: string;
  serviceDurationMinutes: number;
  servicePrice: number;
  date: string; // YYYY-MM-DD
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  timestamp: number; // Epoch time em ms
  orderIndex?: number; // Custom position order index
  status: AppointmentStatus;
  notes?: string;
  googleCalendarEventId?: string;
  paymentStatus?: 'isento' | 'pendente' | 'pago' | 'reembolsado';
  paymentMethod?: 'pix' | 'gratuito' | 'balcao' | 'cartao';
  pixQrCode?: string;
  pixCopiaECola?: string;
  pixId?: string;
  source: 'portal_publico' | 'whatsapp_n8n' | 'interno';
  consultationId?: string; // ID do prontuário gerado ao atender
  cancelReason?: string;
  balanceApplied?: number; // Saldo da carteira utilizado para abater o valor do agendamento
  pixOrderReferenceId?: string; // ID do pedido/transação PIX vinculado
  notifications?: {
    pixSent?: boolean;
    pixSentAt?: number;
    confirmedSent?: boolean;
    confirmedSentAt?: number;
    lastDailyReminderDate?: string; // e.g. "2026-09-10"
    dailyReminderSentCount?: number;
    reminder30Sent?: boolean;
    reminder30SentAt?: number;
    reminder10Sent?: boolean;
    reminder10SentAt?: number;
    lastError?: string;
    lastEventDispatched?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export interface AvailableTimeSlot {
  startTime: string; // "08:00"
  endTime: string; // "08:30"
  available: boolean;
  reason?: string; // "Ocupado no Google Calendar" | "Agendado no PEC" | "Intervalo"
}

export interface SubscriptionPlan {
  id: string; // 'quinzenal' | 'mensal' | 'anual' | string
  name: string;
  price: number; // e.g. 13.90, 19.90, 199.90
  durationDays: number; // 15, 30, 365
  description: string;
  badge?: string;
  features: string[];
  active: boolean;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userCpf: string;
  userPhone: string;
  planId: string;
  planName: string;
  amount: number;
  durationDays: number;
  status: 'pendente' | 'pago' | 'expirado' | 'cancelado';
  createdAt: number;
  expiresAt?: number; // timestamp em ms para contagem regressiva e expiração automática
  expirationDate?: string; // string legível formatada retornada pelo n8n/PagBank (ex: "14/09/2026 às 23:59:59")
  pixQrCode?: string;
  pixCopiaECola?: string;
  pixId?: string;
}

export interface PixTransactionRecord {
  id: string; // e.g. "ord_pix_..."
  type: 'appointment' | 'subscription';
  patientCpf: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientId?: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  amount: number; // valor em R$ (ex: 50.00)
  amountCents: number; // em centavos para PagBank (ex: 5000)
  status: 'pendente' | 'pago' | 'expirado' | 'utilizado';
  createdAt: number;
  expiresAt: number; // timestamp ms (30 min)
  pixQrCode?: string;
  pixCopiaECola?: string;
  pixId?: string;
  professionalId?: string;
  professionalName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  usedInAppointmentId?: string;
  notes?: string;
}

export interface SectionAIOrchestrationConfig {
  primaryModelId: string;
  fallbackChain: string[];
  temperature?: number;
  maxTokens?: number;
  systemPromptOverride?: string;
}

export interface AppAISectionsConfig {
  soapPec: SectionAIOrchestrationConfig;
  timelineLongitudinal: SectionAIOrchestrationConfig;
  officialReports: SectionAIOrchestrationConfig;
  medicalCertificates: SectionAIOrchestrationConfig;
  examResults?: SectionAIOrchestrationConfig;
  audioTranscription: SectionAIOrchestrationConfig;
}

export interface SystemSettings {
  geminiApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
  groqApiKey?: string;
  defaultModel: AIModelId;
  sectionsConfig?: AppAISectionsConfig;
  customModels?: ModelOption[];
  defaultCiapCode: string;
  defaultSigtapCode: string;
  municipalityName: string;
  defaultUnitName: string;
  systemCustomInstructions?: string;
  allowUserSelfRegister?: boolean;
  customProfessions?: ProfessionConfig[];
  customCouncilBodies?: string[];
  customWorkplaces?: string[];
  n8nPixWebhookUrl?: string; // URL do webhook n8n para gerar PIX
  n8nAppointmentWebhookUrl?: string; // URL do webhook n8n para eventos e notificações de agendamento WhatsApp
  n8nSubscriptionWebhookUrl?: string; // URL do webhook n8n para eventos de assinaturas, planos e usuários
  n8nClinicalConsultationWebhookUrl?: string; // URL do webhook n8n para exportação/notificação de prontuários
  whatsappNotificationsEnabled?: boolean; // Se as notificações de WhatsApp via n8n/Evo API estão ativas
  evolutionApiUrl?: string; // URL base da Evolution API (ex: https://api.whatsapp.suaempresa.com)
  evolutionApiKey?: string; // Global API Key ou Instance Key da Evolution API
  evolutionInstanceName?: string; // Nome da instância no WhatsApp (ex: esus_pec_atendimento)
  dailyReminderHour?: number; // Hora do disparo diário (padrão: 9h)
  reminder30MinutesEnabled?: boolean; // Enviar lembrete 30 min antes
  reminder10MinutesEnabled?: boolean; // Enviar lembrete 10 min antes
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
  motherName?: string;
  susCard?: string;
  medicalHistory?: string;
  allergies?: string[];
  continuousMedications?: string[];
  legalGuardianName?: string;
  guardianKinship?: KinshipType;
  guardianKinshipCustom?: string;
  balance?: number; // Saldo em carteira (R$) decorrente de pagamentos PIX
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
// PRESCRIPTION & TRANSCRIPTION TYPES (ENFERMEIRO & MÉDICO)
// -------------------------------------------------------------
export type PrescriptionType = 'PRESCRIÇÃO' | 'TRANSCRIÇÃO';

export type AdministrationRoute =
  | 'USO ORAL'
  | 'USO IV'
  | 'USO IM'
  | 'USO SUBLINGUAL'
  | 'USO TÓPICO'
  | 'USO ID'
  | 'USO INALATÓRIO'
  | 'USO OFTÁLMICO'
  | 'USO OTOLÓGICO'
  | 'USO RETAL'
  | 'USO NASAL'
  | 'USO VAGINAL'
  | string;

export type MedicationComponent =
  | 'Farmácia Básica (CBAF)'
  | 'Saúde Mental / RAPS'
  | 'Componente Especializado'
  | 'Componente Estratégico'
  | 'Atenção Primária';

export type MedicationControlCategory =
  | 'Receita Simples'
  | 'Antimicrobiano (2 Vias)'
  | 'Controle Especial C1 (Branca 2 Vias)'
  | 'Notificação B (Azul - Psicotrópicos)'
  | 'Notificação A (Amarela - Entorpecentes)'
  | 'Sem Retenção';

export interface SUSMedication {
  id: string;
  name: string; // Ex: "Nifedipino", "Amoxicilina", "Losartana Potássica"
  concentration: string; // Ex: "10 mg", "500 mg"
  pharmaceuticalForm: string; // Ex: "Cápsula", "Comprimido", "Suspensão Oral", "Ampola", "Solução Gotas"
  fullName: string; // Ex: "NIFEDIPINO 10MG – 30 CÁPSULAS"
  route: AdministrationRoute;
  defaultPosology: string; // Ex: "TOMAR 1 COMPRIMIDO DE 8/8h"
  defaultDuration: string; // Ex: "DURANTE 14 DIAS" ou "USO CONTÍNUO"
  defaultSchedule?: string; // Ex: "6h – 14h – 22h" ou "MANHÃ"
  component: MedicationComponent;
  controlCategory: MedicationControlCategory;
  therapeuticClass: string; // Ex: "Bloqueador dos Canais de Cálcio / Tocolítico / Anti-hipertensivo"
  atcCode?: string; // Ex: "C08CA05" ou "G02CA"
  atcCategory?: string; // Ex: "C: Aparelho cardiovascular"
  atcClasses?: string[]; // Ex: ["C: Aparelho cardiovascular", "G: Aparelho geniturinário e hormônios sexuais"]
  awareCategory?: 'Acesso' | 'Alerta' | 'Reservado'; // Classificação AWaRe OMS/RENAME
  instructions?: string;
  keywords: string[];
  isRemumeDefault?: boolean;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface PrescribedMedicationItem {
  id: string;
  itemNumber?: number;
  medicationName: string; // e.g. "SULFATO FERROSO 40MG – 30CP"
  route: AdministrationRoute; // e.g. "USO ORAL"
  posology: string; // e.g. "TOMAR 1CP 12/12h"
  duration: string; // e.g. "DURANTE 15 DIAS"
  scheduleInstructions?: string; // e.g. "7h – 19h" ou "MANHÃ"
}

export interface PrescriptionHeaderConfig {
  unitName: string; // e.g. "CENTRO DE ATENÇÃO PSICOSSOCIAL"
  authorityName: string; // e.g. "SECRETARIA MUNICIPAL DE SAÚDE"
  cityPrefecture: string; // e.g. "PREFEITURA MUNICIPAL DE ANAJÁS"
  leftLogoUrl?: string;
  rightLogoUrl?: string;
  headerHeightCm?: number;
}

export interface PrescriptionFooterConfig {
  addressLine1: string; // e.g. "TRAVESSA FRANCISCO JR. FILHO"
  addressLine2: string; // e.g. "CIDADE NOVA I"
  footerHeightCm?: number;
}

export interface PrescriptionData {
  id: string;
  type: PrescriptionType; // 'PRESCRIÇÃO' | 'TRANSCRIÇÃO'
  patientId: string;
  patientName: string;
  patientAge: string; // e.g. "49A"
  dateFormatted: string; // e.g. "Anajás 02 de setembro de 2026"
  header: PrescriptionHeaderConfig;
  footer: PrescriptionFooterConfig;
  defaultRoute: AdministrationRoute;
  items: PrescribedMedicationItem[];
  professionalName: string;
  professionalRole: 'Enfermeiro' | 'Médico' | string;
  professionalRegister: string; // e.g. "CRM/PA 12345" ou "COREN/PA 54321"
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace: string;
  createdAt: number;
  consultationId?: string;
}

// -------------------------------------------------------------
// GUIA DE ENCAMINHAMENTO (REFERRAL) TYPES
// -------------------------------------------------------------
export type ReferralPriority = 'Eletivo' | 'Prioritário' | 'Urgência/Emergência';

export interface ReferralData {
  id: string;
  destination: string; // Especialidade ou serviço de destino (ex.: Psiquiatria Infantil, Neurologia, CRAS, CAPS, Ortopedia)
  priority: ReferralPriority; // Grau de prioridade (Eletivo, Prioritário, Urgência/Emergência)
  clinicalIndication: string; // Resumo clínico da indicação e justificativa do encaminhamento
  hypotheses: string; // Hipóteses diagnósticas ou demandas de suporte (CID-10, CIAP-2, suspeita clínica)
  proceduresRequested?: string; // Condutas, exames ou avaliações complementares solicitadas
  examsConducted?: string; // Exames já realizados e resultados relevantes
  counterReference?: string; // Campo de contra-referência no rodapé (para resposta do serviço de destino)
  dateFormatted?: string;
  professionalName?: string;
  professionalRole?: string;
  professionalRegister?: string;
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace?: string;
  createdAt?: number;
  consultationId?: string;
}

// -------------------------------------------------------------
// LAUDO MÉDICO (MEDICAL REPORT) TYPES
// -------------------------------------------------------------
export interface MedicalReportData {
  id: string;
  patientName: string;
  patientAgeFormatted: string; // "idade sem informar meses e dias. Ex: 1 ano ou 10 meses ou 25 dias."
  patientDocument: string; // "Cpf ou CNS"
  description: string; // Descrição do laudo gerada por IA e editável pelo médico
  cid10: string; // CID-10 no final do laudo
  purpose?: string; // Finalidade do laudo (ex: Pericial INSS, Afastamento, Curatela, Escolar, BPC, etc.)
  cityDateFormatted: string; // "Anajás, dd de [mes por extenso] de aaaa"
  professionalName: string; // Nome do médico
  professionalSpecialty: string; // Especialidade com especialidade
  professionalCouncil: string; // Órgão de classe (ex: CRM/PA 12345)
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace?: string; // Unidade de saúde
  createdAt?: number;
  consultationId?: string;
}

// -------------------------------------------------------------
// ATESTADO MÉDICO (MEDICAL CERTIFICATE) TYPES - EXCLUSIVO MÉDICO
// -------------------------------------------------------------
export interface MedicalCertificateData {
  id: string;
  patientId?: string;
  patientName: string;
  patientAgeFormatted: string;
  patientDocument: string;
  daysOff: number; // Quantidade de dias de afastamento (ex: 1, 3, 5, 14, 30)
  daysOffExtenso: string; // Ex: "03 (três) dias" ou "01 (um) dia"
  startDate: string; // Data de início do repouso/afastamento (YYYY-MM-DD ou formato DD/MM/AAAA)
  startDateFormatted?: string; // Ex: "19 de setembro de 2026"
  cid10?: string; // Código e descrição do CID-10 (opcional ou com consentimento)
  cidCode?: string;
  cidDescription?: string;
  includeCid: boolean; // Se inclui o CID expressamente no atestado
  showCid?: boolean;
  purpose?: string; // Finalidade (ex: "afastamento de atividades laborais e escolares por motivo de saúde")
  clinicalNotes?: string; // Observações / recomendações adicionais (ex: "necessita de repouso domiciliar")
  observations?: string;
  cityDateFormatted: string; // Ex: "Anajás, 19 de setembro de 2026"
  professionalName: string;
  professionalSpecialty?: string;
  professionalCouncil: string; // CRM/UF 12345
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace?: string;
  createdAt?: number;
  consultationId?: string;
}

// -------------------------------------------------------------
// ATESTADO DE COMPARECIMENTO (ATTENDANCE CERTIFICATE) TYPES - NÍVEL SUPERIOR
// -------------------------------------------------------------
export type AttendanceShift = 'matutino' | 'vespertino' | 'noturno' | 'integral' | 'personalizado';

export interface AttendanceCertificateData {
  id: string;
  patientId?: string;
  patientName: string;
  patientAgeFormatted: string;
  patientDocument: string;
  isCompanion?: boolean; // Se a declaração é para o acompanhante legal
  companionName?: string;
  companionDocument?: string;
  companionKinship?: string;
  attendanceDate: string; // Data estrita do atendimento
  attendanceDateFormatted: string; // Ex: "19 de setembro de 2026"
  period: AttendanceShift;
  periodLabel: string; // Ex: "Matutino (das 08:00 às 12:00)" ou "Vespertino" ou "Período Integral"
  startTime?: string; // Ex: "08:30"
  endTime?: string; // Ex: "11:45"
  attendanceType: string; // Ex: "Consulta de Enfermagem", "Atendimento Psicológico", "Acolhimento Multiprofissional", etc.
  observations?: string; // Observações institucionais
  cityDateFormatted: string;
  professionalName: string;
  professionalRole: string; // Ex: "Enfermeiro(a)", "Psicólogo(a)", "Assistente Social", etc.
  professionalCouncil: string; // COREN, CRP, CRESS, CRN, CREF, ABPp, etc.
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace?: string;
  createdAt?: number;
  consultationId?: string;
}

// -------------------------------------------------------------
// PROJETO TERAPÊUTICO SINGULAR (PTS) TYPES
// -------------------------------------------------------------
export interface PtsData {
  id: string;
  diagnosisVulnerability: string; // Diagnóstico situacional, vulnerabilidades e potencialidades do usuário/família
  shortTermGoals: string; // Metas de curto prazo (intervenções imediatas)
  mediumLongTermGoals: string; // Metas de médio e longo prazo (autonomia e reabilitação psicossocial)
  agreedActions: string; // Divisão de responsabilidades (Ações do usuário/família, Ações da equipe e Articulação intersetorial)
  referenceProfessional: string; // Profissional de referência responsável pelo caso
  reassessmentDate: string; // Previsão de data para reavaliação do PTS (ex: 30 dias, 60 dias ou data DD/MM/AAAA)
  teamMembers?: string; // Equipe técnica envolvida
  dateFormatted?: string;
  professionalName?: string;
  professionalRole?: string;
  professionalRegister?: string;
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace?: string;
  createdAt?: number;
  consultationId?: string;
}

// -------------------------------------------------------------
// EXAM REQUEST & SUS EXAMS DATABASE TYPES
// -------------------------------------------------------------
export type ExamCategory = 'Laboratorial' | 'Imagem' | 'Cardiológico' | 'Ginecológico/Obstétrico' | 'Outros';

export interface SUSExam {
  id: string;
  name: string; // e.g. "HEMOGRAMA COMPLETO", "GLICEMIA EM JEJUM", "RAIO-X DE TÓRAX PA E PERFIL"
  category: ExamCategory;
  sigtapCode?: string; // Código de procedimento SIGTAP / SIA (ex: "02.02.01.047-3")
  clinicalIndication?: string; // Indicação clínica padrão / justificativa
  preparation?: string; // Instruções de preparo (ex: "Jejum obrigatório de 8 a 12 horas")
  keywords: string[]; // Termos de busca inteligente e sinônimos
  isDefault?: boolean;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface RequestedExamItem {
  id: string;
  examId?: string;
  name: string; // Nome do exame solicitado
  category?: string;
  clinicalIndication?: string; // Justificativa clínica específica / hipótese diagnóstica
  urgency?: boolean;
}

export interface ExamRequestData {
  id: string;
  title?: string; // Padrão: "SOLICITAÇÃO DE EXAMES" ou "SOLICITAÇÃO EXAMES"
  patientId: string;
  patientName: string;
  patientAge: string; // e.g. "49A"
  patientCns?: string;
  patientCpf?: string;
  dateFormatted: string; // e.g. "Anajás, 17 de setembro de 2026"
  header: PrescriptionHeaderConfig;
  footer: PrescriptionFooterConfig;
  clinicalIndicationGeneral?: string; // Justificativa clínica geral / Hipótese diagnóstica / CID-10
  items: RequestedExamItem[]; // Relação de exames solicitados em ordem alfabética
  professionalName: string;
  professionalRole: 'Enfermeiro' | 'Médico' | string;
  professionalRegister: string; // e.g. "CRM/PA 12345" ou "COREN/PA 54321"
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace: string;
  createdAt: number;
  consultationId?: string;
}

// -------------------------------------------------------------
// EXAM MEDIA & VIDEO QR CODE REPORT TYPES (A4 - ATÉ 6 IMAGENS POR PÁGINA)
// -------------------------------------------------------------
export type ExamMediaType = 'image' | 'video';

export interface ExamMediaItem {
  id: string;
  type: ExamMediaType;
  title: string; // Título ou hipótese diagnóstica da imagem/vídeo
  description: string; // Descrição sob cada imagem
  imageDataUrl?: string; // Imagem em base64 ou URL remota
  videoUrl?: string; // Link direto do vídeo ou arquivo local
  videoThumbnailDataUrl?: string; // Thumbnail/frame renderizado do vídeo
  qrCodeDataUrl?: string; // QR Code que redireciona para a reprodução do vídeo
  order: number;
  retentionYears?: number; // Tempo de vigência legal em anos (padrão 20 anos)
  validUntilFormatted?: string; // Data limite da vigência (ex: "22/09/2046")
  createdAt: number;
}

export interface ExamMediaReportData {
  id: string;
  title?: string; // Padrão: "ANEXO ICONOGRÁFICO DE EXAMES E VÍDEOS"
  patientId: string;
  patientName: string;
  patientAge: string;
  patientAgeFormatted?: string;
  patientCns?: string;
  patientCpf?: string;
  patientDocument?: string;
  examDate?: string; // YYYY-MM-DD
  dateFormatted: string; // Ex: "Anajás, 22 de setembro de 2026"
  header?: PrescriptionHeaderConfig;
  footer?: PrescriptionFooterConfig;
  items: ExamMediaItem[]; // 2 colunas com 3 imagens por lado (até 6 por página)
  legalRetentionYears: number; // Vigência legal (20 anos)
  validUntilFormatted: string; // Ex: "22/09/2046"
  legalNotice: string; // Texto legal sucinto para rodapé
  professionalName: string;
  professionalRole: string;
  professionalRegister: string;
  professionalStampUrl?: string;
  useDigitalStamp?: boolean;
  workplace: string;
  createdAt: number;
  consultationId?: string;
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
  authorCbo?: string;
  authorDigitalStampUrl?: string;
  authorUseDigitalStamp?: boolean;
  workplace: string;
  timestamp: number;
  isFirstConsultation?: boolean;
  clinicalAudit?: string;
  avaliacao: string;
  plano: string;
  conduta?: string;
  rawNotes?: string;
  modelUsed: AIModelId;
  isTriage?: boolean;
  triageData?: TriageVitalsData;
  prescription?: PrescriptionData;
  referral?: ReferralData;
  pts?: PtsData;
  examRequest?: ExamRequestData;
  medicalReport?: MedicalReportData;
  medicalCertificate?: MedicalCertificateData;
  attendanceCertificate?: AttendanceCertificateData;
  examMedia?: ExamMediaReportData;
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

export interface EvolutionCondutasSummary {
  prescricoes: string[];
  examesSolicitados: string[];
  encaminhamentos: string[];
  laudosMedicos: string[];
  atestados: string[];
}

export interface EvolutionFaltasSummary {
  totalFaltasOuCancelamentos: number;
  totalAbandonos: number;
  detalhes: string[];
}

export interface EvolutionSummary {
  id?: string;
  patientId: string;
  patientName: string;
  generatedAt: number;
  modelUsed: string;
  totalConsultationsAnalyzed: number;
  lastAnalyzedTimestamp?: number;
  analyzedConsultationIds?: string[];
  pendingConsultationsAnalyzed?: number;
  isIncrementalUpdate?: boolean;
  alreadyUpToDate?: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  resumoLongitudinal: string;
  condicoesSaude?: {
    psicologicas: string;
    naoPsicologicas: string;
  };
  farmacoterapia?: {
    emUsoContinuo: string[];
    mudancasTratamento: string[];
    adesaoRelatada: string;
  };
  trajetoriaClinica?: {
    statusGeral: EvolutionStatus;
    descricao: string;
  };
  matrizEvolucao: {
    aspectosPsicoemocionais: EvolutionAspect;
    aspectosFisicosSinais: EvolutionAspect;
    dinamicaFamiliarSocial: EvolutionAspect;
  };
  pontosAlertaRecomendacoes: string[];
  condutasRealizadas?: EvolutionCondutasSummary;
  faltasEAbandonos?: EvolutionFaltasSummary;
  rawMarkdown: string;
}
