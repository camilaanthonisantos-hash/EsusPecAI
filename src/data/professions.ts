import {
  ProfessionConfig,
  ProfessionId,
  ModelOption,
  KnowledgeItem,
  User,
  Patient,
  Consultation,
  SystemSettings,
} from '../types';

export const ADMIN_MASTER_EMAIL = 'jerime.rego@gmail.com';

export function isUserAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.email && user.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()) {
    return true;
  }
  return user.role === 'admin';
}

export const DEFAULT_WORKPLACE_PRESETS: string[] = [
  'CAPS (Centro de Atenção Psicossocial)',
  'CAPS II (Saúde Mental Adulto)',
  'CAPS III (Atendimento 24 Horas)',
  'CAPS AD (Álcool e Outras Drogas)',
  'CAPSi (Infantojuvenil)',
  'eMulti Território Central',
  'UBS Central / ESF',
  'UBS Vila Esperança',
  'Policlínica Municipal de Especialidades',
  'Polo Academia da Saúde',
  'Secretaria Municipal de Saúde / Coordenação PEC',
];

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  geminiApiKey: '',
  defaultModel: 'gemini-3.7-flash',
  defaultCiapCode: '-69',
  defaultSigtapCode: '0301080445',
  municipalityName: 'Secretaria Municipal de Saúde',
  defaultUnitName: 'CAPS (Centro de Atenção Psicossocial)',
  systemCustomInstructions:
    'Priorizar recomendações da Relação Municipal de Medicamentos (REMUME) e respeitar as diretrizes da Atenção Primária à Saúde e da RAPS (APS / RAPS / eMulti / CAPS).',
  allowUserSelfRegister: true,
  customWorkplaces: [],
  updatedAt: Date.now(),
  updatedBy: ADMIN_MASTER_EMAIL,
};

export const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

export type BrazilianUF = typeof BRAZILIAN_UFS[number];

export const DEFAULT_COUNCIL_BODIES = [
  'CRM',
  'COREN',
  'CRP',
  'CRESS',
  'CRN',
  'CREF',
  'CREFITO',
  'CRFa',
  'CRF',
  'CRO',
  'CRBio',
  'CRTR',
  'ABPp',
  'CBO',
] as const;

export const DEFAULT_CBO_MAP: Record<string, string> = {
  enfermeiro: '2235-05',
  medico: '2251-25',
  psicologo: '2515-10',
  psicopedagogo: '2394-25',
  nutricionista: '2237-10',
  assistente_social: '2516-05',
  educador_fisico: '2241-40',
  fisioterapeuta: '2236-05',
  terapeuta_ocupacional: '2239-05',
  fonoaudiologo: '2238-10',
  farmaceutico: '2234-05',
  cirurgiao_dentista: '2232-08',
  dentista: '2232-08',
  acs: '5151-05',
  ace: '5151-40',
  tecnico_enfermagem: '3222-05',
  auxiliar_enfermagem: '3222-30',
};

export const DEFAULT_PROFESSION_COUNCIL_MAP: Record<string, string> = {
  enfermeiro: 'COREN',
  medico: 'CRM',
  psicologo: 'CRP',
  psicopedagogo: 'ABPp',
  nutricionista: 'CRN',
  assistente_social: 'CRESS',
  educador_fisico: 'CREF',
  fisioterapeuta: 'CREFITO',
  terapeuta_ocupacional: 'CREFITO',
  fonoaudiologo: 'CRFa',
  farmaceutico: 'CRF',
  cirurgiao_dentista: 'CRO',
  dentista: 'CRO',
  acs: 'CBO',
  ace: 'CBO',
  tecnico_enfermagem: 'COREN',
  auxiliar_enfermagem: 'COREN',
};

export function parseProfessionalRegister(
  registerStr?: string,
  professionId?: string
): { councilBody: string; councilNumber: string; councilUf: string } {
  const defaultUf = 'SP';
  const defaultCouncil = professionId
    ? DEFAULT_PROFESSION_COUNCIL_MAP[professionId] || 'CRM'
    : 'CRM';
  const defaultCbo = professionId
    ? DEFAULT_CBO_MAP[professionId] || '2235-05'
    : '2235-05';

  if (!registerStr || !registerStr.trim()) {
    return {
      councilBody: defaultCouncil,
      councilNumber: defaultCouncil === 'CBO' ? defaultCbo : '',
      councilUf: defaultUf,
    };
  }

  const clean = registerStr.trim();

  // Pattern 1: CBO
  if (clean.toUpperCase().startsWith('CBO')) {
    const ufMatch = clean.match(/CBO\/([A-Za-z]{2})/i);
    const numMatch = clean.match(/CBO(?:\/[A-Za-z]{2})?\s*([0-9\-\.]+)/i);
    return {
      councilBody: 'CBO',
      councilNumber: numMatch ? numMatch[1] : defaultCbo,
      councilUf: ufMatch ? ufMatch[1].toUpperCase() : defaultUf,
    };
  }

  // Pattern 2: Standard Council "CRM/SP 123456" or "COREN/SP 458921" or "CRP 06/89412"
  const standardMatch = clean.match(/^([A-Za-z]+)(?:\/([A-Za-z]{2}))?\s*(.*)$/);
  if (standardMatch) {
    const body = standardMatch[1].toUpperCase();
    const uf = standardMatch[2] ? standardMatch[2].toUpperCase() : defaultUf;
    const num = standardMatch[3] ? standardMatch[3].trim() : '';
    return {
      councilBody: body,
      councilNumber: num,
      councilUf: uf,
    };
  }

  return {
    councilBody: defaultCouncil,
    councilNumber: clean,
    councilUf: defaultUf,
  };
}

export function formatProfessionalRegister(
  councilBody: string,
  councilNumber: string,
  councilUf: string
): string {
  const body = (councilBody || 'CRM').trim().toUpperCase();
  const num = (councilNumber || '').trim();
  const uf = (councilUf || 'SP').trim().toUpperCase();

  if (body === 'CBO') {
    return `CBO ${num || '2235-05'}`;
  }
  return `${body}/${uf} ${num}`;
}

export const PROFESSIONS: Record<ProfessionId, ProfessionConfig> = {
  enfermeiro: {
    id: 'enfermeiro',
    name: 'Enfermeiro',
    category: 'APS',
    council: 'COFEN / COREN',
    councilAbbr: 'COREN',
    cbo: '2235-05',
    color: 'emerald',
    accentBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    iconName: 'Activity',
    shortDesc: 'SAE com Diagnósticos NANDA-I, Metas NOC, Intervenções NIC e Conduta Bloco 06',
    pecFocus:
      'Bloco 1 (Avaliação + NANDA), Bloco 2 (Plano NOC/NIC + Códigos Fixos), Bloco 3 (Finalização/Conduta 06)',
    hasBlock3: true,
  },
  assistente_social: {
    id: 'assistente_social',
    name: 'Assistente Social',
    category: 'eMulti',
    council: 'CFESS / CRESS',
    councilAbbr: 'CRESS',
    cbo: '2516-05',
    color: 'amber',
    accentBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    iconName: 'Users',
    shortDesc: 'Vulnerabilidade social, determinação social da saúde, CadÚnico e articulação intersetorial',
    pecFocus:
      'Bloco 1 (Avaliação Social/Comportamental), Bloco 2 (Plano Terapêutico & Articulação Intersetorial)',
    hasBlock3: false,
  },
  psicopedagogo: {
    id: 'psicopedagogo',
    name: 'Psicopedagogo',
    category: 'eMulti',
    council: 'ABPp / Saúde Mental',
    councilAbbr: 'ABPp',
    cbo: '2394-25',
    color: 'indigo',
    accentBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    iconName: 'GraduationCap',
    shortDesc: 'Dificuldades de aprendizagem, neurodesenvolvimento infantil e mediação escolar/SUS',
    pecFocus:
      'Bloco 1 (Avaliação Psicoeducacional), Bloco 2 (Plano de Estimulação & Articulação Escolar)',
    hasBlock3: false,
  },
  psicologo: {
    id: 'psicologo',
    name: 'Psicólogo',
    category: 'RAPS',
    council: 'CFP / CRP',
    councilAbbr: 'CRP',
    cbo: '2515-10',
    color: 'violet',
    accentBg: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
    iconName: 'Brain',
    shortDesc: 'Acolhimento em Saúde Mental, escuta qualificada, PTS (Projeto Terapêutico Singular) e CAPS',
    pecFocus:
      'Bloco 1 (Exame Mental & Avaliação Subjetiva), Bloco 2 (Plano Terapêutico Singular & RAPS)',
    hasBlock3: false,
  },
  nutricionista: {
    id: 'nutricionista',
    name: 'Nutricionista',
    category: 'eMulti',
    council: 'CFN / CRN',
    councilAbbr: 'CRN',
    cbo: '2237-10',
    color: 'lime',
    accentBg: 'bg-lime-500/10 text-lime-700 dark:text-lime-300 border-lime-500/30',
    iconName: 'Apple',
    shortDesc: 'Avaliação antropométrica qualitativa, conduta alimentar, DCNT e orientação dietética',
    pecFocus: 'Bloco 1 (Estado Nutricional & Hábitos Alimentares), Bloco 2 (Plano Alimentar & Metas)',
    hasBlock3: false,
  },
  educador_fisico: {
    id: 'educador_fisico',
    name: 'Educador Físico',
    category: 'eMulti',
    council: 'CONFEF / CREF',
    councilAbbr: 'CREF',
    cbo: '2241-40',
    color: 'orange',
    accentBg: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
    iconName: 'Dumbbell',
    shortDesc: 'Prescrição de práticas corporais, atividade física em grupos da UBS e reabilitação funcional',
    pecFocus:
      'Bloco 1 (Aptidão Funcional & Condicionamento), Bloco 2 (Plano de Práticas Corporais e Grupos)',
    hasBlock3: false,
  },
  medico: {
    id: 'medico',
    name: 'Médico',
    category: 'APS',
    council: 'CFM / CRM',
    councilAbbr: 'CRM',
    cbo: '2251-25',
    color: 'cyan',
    accentBg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    iconName: 'Stethoscope',
    shortDesc: 'MFC / Clínica Geral, estratificação de risco, propedêutica e raciocínio diagnóstico',
    pecFocus:
      'Bloco 1 (Subjetivo/Objetivo + Hipóteses CID-10/CIAP-2), Bloco 2 (Plano Terapêutico & Manejo)',
    hasBlock3: false,
  },
};

export const MODELS_AVAILABLE: ModelOption[] = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'Rápido / Recomendado',
    description: 'Processamento ultra veloz de texto, áudio e imagens. Ideal para atendimentos rotineiros.',
    speed: '< 2.0s',
    recommendedFor: 'Consultas diárias, visitas domiciliares rápidas e relatos por áudio.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Alta Precisão Multimodal',
    description: 'Raciocínio clínico aprofundado, OCR avançado para receitas manuscritas e exames complexos.',
    speed: '~ 4.5s',
    recommendedFor: 'Receitas médicas ilegíveis, laudos de exames extensos e casos de alta complexidade.',
  },
];

export const DEFAULT_KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'remume-geral',
    title: 'REMUME Básica Municipal (Exemplo)',
    category: 'remume',
    isActive: true,
    isSystemDefault: true,
    content: `REMUME BÁSICA MUNICIPAL ATIVA:
- Anti-hipertensivos: Losartana 50mg, Enalapril 20mg, Hidroclorotiazida 25mg, Anlodipino 5mg, Atenolol 50mg.
- Antidiabéticos: Metformina 850mg, Glibenclamida 5mg, Insulina NPH 100UI/ml, Insulina Regular 100UI/ml.
- Analgésicos/Anti-inflamatórios: Paracetamol 500mg, Dipirona 500mg, Ibuprofeno 600mg.
- Saúde Mental APS: Fluoxetina 20mg, Sertralina 50mg, Amitriptilina 25mg, Clonazepam 2mg (controle especial).
- Antibióticos: Amoxicilina 500mg, Cefalexina 500mg, Azitromicina 500mg, Ciprofloxacino 500mg.`,
  },
  {
    id: 'protocolo-hiperdia',
    title: 'Protocolo APS: Hipertensão e Diabetes (Hiperdia)',
    category: 'protocolo_aps',
    isActive: true,
    isSystemDefault: true,
    content: `DIRETRIZ MUNICIPAL HIPERDIA:
- Classificação qualitativa obrigatória da PA: Normotenso (< 120/80), Pré-hipertenso (120-139/80-89), Hipertenso estágio 1 (140-159/90-99), Estágio 2/3 (>= 160/100).
- Avaliação de pés em diabéticos a cada consulta.
- Solicitação de Hemoglobina Glicada a cada 3 a 6 meses.
- Educação em saúde individual e encaminhamento para grupo de atividade física (eMulti).`,
  },
  {
    id: 'raps-saude-mental',
    title: 'Fluxograma RAPS / Saúde Mental na Atenção Básica',
    category: 'raps',
    isActive: true,
    isSystemDefault: true,
    content: `DIRETRIZ RAPS MUNICIPAL:
- Casos leves a moderados: Acompanhamento compartilhado UBS + eMulti (Psicologia/Serviço Social).
- Casos graves/persistentes e ideação suicida: Encaminhamento via matriciamento ou direto para CAPS II / CAPSi / CAPS AD.
- Construção conjunta de Projeto Terapêutico Singular (PTS).
- Evitar medicalização excessiva; priorizar grupos terapêuticos e redes de suporte comunitário.`,
  },
];

export const QUICK_CLINICAL_TEMPLATES = [
  {
    title: 'Hiperdia (HAS + DM2)',
    category: 'APS',
    preview: 'Paciente 58a, retorno de rotina...',
    text: `Paciente comparece à consulta de acompanhamento de Hipertensão Arterial e Diabetes Mellitus tipo 2. Refere uso regular de Losartana 50mg 1x/dia e Metformina 850mg 2x/dia. Nega queixas álgicas, tonturas ou alterações visuais. Relata melhora na ingestão de água, porém ainda consome alimentos ricos em sódio nos finais de semana.
PA aferida: 126x82 mmHg. FC: 74 bpm. Glicemia capilar em jejum: 112 mg/dL. IMC: 26.8 kg/m².
Exame físico: Sem edemas em membros inferiores, pulsos periféricos palpáveis e simétricos. Teste de monofilamento nos pés sem alterações sensitivas.
Solicitados exames de controle (HbA1c, perfil lipídico, creatinina).`,
  },
  {
    title: 'Acolhimento Saúde Mental / Ansiedade',
    category: 'RAPS',
    preview: 'Cidadã 32a com sintomas ansiosos...',
    text: `Usuária acolhida na unidade com queixas de insônia inicial há 3 semanas, aperto no peito e preocupação excessiva relacionada à sobrecarga de trabalho e cuidados familiares. Nega ideação de autoextermínio. Choro fácil durante a escuta qualificada.
Apresenta-se orientada no tempo e espaço, vigil, pensamento com curso acelerado porém coerente, afeto modulado. Sinais vitais: PA 118x76 mmHg, FC 82 bpm, Eupneica.
Realizada escuta empática, técnicas de respiração diafragmática e agendado acompanhamento conjunto com a equipe multiprofissional (Psicologia e Práticas Integrativas).`,
  },
  {
    title: 'Puericultura (Criança / Desenvolvimento)',
    category: 'APS',
    preview: 'Consulta de crescimento e desenvolvimento...',
    text: `Criança trazida pela genitora para acompanhamento de rotina. Alimentação adequada para a faixa etária, com bom apetite. Sono regular e sem queixas gastrointestinais.
Exame físico: Eutrófico, corado, hidratado, afebril, eupneico, normocárdico. Marcos de desenvolvimento neuropsicomotor adequados para a idade. Cartão de vacinas conferido e em dia conforme PNI.
Orientações fornecidas sobre hábitos de vida saudáveis, estímulos lúdicos e prevenção de acidentes domésticos.`,
  },
  {
    title: 'Visita Domiciliar - Idoso Acamado',
    category: 'APS / Visita',
    preview: 'Paciente 79a, sequela de AVC...',
    text: `Visita domiciliar realizada a idoso acamado, 79 anos, com sequela de AVC isquêmico há 2 anos, dependente total para AVDs. Cuidadora principal presente (filha).
Alimentação por via oral pastosa com boa deglutição. Diurese e evacuações presentes em fralda.
Exame físico: PA: 130x84 mmHg, FC: 68 bpm, Tax: 36.4°C, SatO2: 97% em ar ambiente. Pele íntegra, com áreas de hiperemia em região sacral sem perda de continuidade epitelial. Ausculta pulmonar limpa.
Orientações à cuidadora sobre mudança de decúbito de 2 em 2 horas, hidratação da pele com AGE, higiene oral e exercícios passivos orientados pelo Educador Físico.`,
  },
  {
    title: 'Avaliação Nutricional (Sobrepeso/DCNT)',
    category: 'eMulti',
    preview: 'Encaminhamento para reeducação alimentar...',
    text: `Paciente comparece encaminhado pela ESF para atendimento nutricional após diagnóstico de Esteatose Hepática Grau I e Dislipidemia.
Antropometria: Peso elevado, sobrepeso evidente, aumento da circunferência abdominal.
Recordatório alimentar de 24h revela baixo consumo de frutas e verduras, alto consumo de frituras e ultraprocessados durante a jornada de trabalho.
Pactuado plano de metas graduais para redução de ultraprocessados, inclusão de fibras e aumento de ingestão hídrica (2L/dia).`,
  },
  {
    title: 'Matriciamento & Avaliação eMulti',
    category: 'eMulti / RAPS',
    preview: 'Discussão de caso de alta vulnerabilidade...',
    text: `Atendimento compartilhado/matriciamento de família em situação de vulnerabilidade social no território da microárea 03. Criança com dificuldades no processo de aprendizagem e comportamento agitado em sala de aula. Família inscrita no CadÚnico.
Avaliação conjunta de vínculo comunitário, suporte da rede de assistência (CRAS) e mediação com a escola municipal.
Definido plano singular de suporte pedagógico lúdico, oficinas de esportes na UBS e acompanhamento social contínuo.`,
  },
];

export const LEGACY_MOCK_USER_IDS = [
  'user-enfermeiro-1',
  'user-medico-1',
  'user-psicologo-1',
  'user-psicopedagogo-1',
  'user-nutricionista-1',
  'user-assistente-social-1',
  'user-educador-fisico-1',
];

// -------------------------------------------------------------
// PRE-SEEDED MULTI-PROFESSIONAL USERS / PROFILES (RBAC)
// -------------------------------------------------------------
export const DEFAULT_USERS: User[] = [
  {
    id: 'user-admin-jerime',
    name: 'Dr. Jerime Rêgo',
    email: 'jerime.rego@gmail.com',
    password: 'admin',
    role: 'admin',
    professionalRegister: 'CRM/SP 998877 (Admin Geral)',
    profession: 'medico',
    workplace: 'Secretaria Municipal de Saúde / Coordenação PEC',
    createdAt: Date.now(),
  },
];

// -------------------------------------------------------------
// REAL PATIENTS REGISTRY (Starts empty for real production data)
// -------------------------------------------------------------
export const DEFAULT_PATIENTS: Patient[] = [];

// -------------------------------------------------------------
// REAL MULTI-PROFESSIONAL CONSULTATIONS (Starts empty for real production data)
// -------------------------------------------------------------
export const DEFAULT_CONSULTATIONS: Consultation[] = [];

