import { ProfessionId } from '../types';

export type CapsInstrument = 'BPA-I' | 'RAAS-PSI' | 'BPA-C';

export interface CapsProcedure {
  code: string;           // Formato oficial com hífen: 03.01.08.019-4
  numericCode: string;    // Formato limpo com 10 dígitos: 0301080194
  name: string;           // Nome oficial
  instrument: CapsInstrument;
  instrumentFullName: string;
  rule: string;           // Regra operacional de faturamento e registro
  requiresHigherEducation: boolean; // Se exige nível superior isolado
  permittedProfessions: string[];   // Lista de IDs de profissão com compatibilidade CBO
  typicalCbos: string[];  // Exemplos de CBOs aceitos pelo MS
  isCrisisOrNight?: boolean;
  isInitialContact?: boolean;
  isCollective?: boolean;
}

export const DEFAULT_PROFESSION_CBOS: Record<string, string> = {
  medico: '225133', // Médico Psiquiatra
  enfermeiro: '223505', // Enfermeiro
  psicologo: '251510', // Psicólogo Clínico
  assistente_social: '251605', // Assistente Social
  terapeuta_ocupacional: '223905', // Terapeuta Ocupacional
  nutricionista: '223710', // Nutricionista
  educador_fisico: '224140', // Educador Físico
  fisioterapeuta: '223605', // Fisioterapeuta
  fonoaudiologo: '223810', // Fonoaudiólogo
  psicopedagogo: '239425', // Psicopedagogo
  tecnico_enfermagem: '322205', // Técnico de Enfermagem
  auxiliar_enfermagem: '322230', // Auxiliar de Enfermagem
  oficineiro: '371410', // Artesão / Oficineiro
  acs: '515105', // Agente Comunitário de Saúde
  administrativo: '411010', // Assistente Administrativo
};

export const CBO_LABELS: Record<string, string> = {
  '225133': '2251-33 - Médico Psiquiatra',
  '225125': '2251-25 - Médico Clínico',
  '223505': '2235-05 - Enfermeiro',
  '251510': '2515-10 - Psicólogo Clínico',
  '251605': '2516-05 - Assistente Social',
  '223905': '2239-05 - Terapeuta Ocupacional',
  '223710': '2237-10 - Nutricionista',
  '224140': '2241-40 - Educador Físico',
  '223605': '2236-05 - Fisioterapeuta',
  '223810': '2238-10 - Fonoaudiólogo',
  '239425': '2394-25 - Psicopedagogo',
  '322205': '3222-05 - Técnico de Enfermagem',
  '322230': '3222-30 - Auxiliar de Enfermagem',
  '371410': '3714-10 - Artesão / Oficineiro',
  '515105': '5151-05 - Agente Comunitário de Saúde',
  '515305': '5153-05 - Educador Social',
  '516220': '5162-20 - Cuidador em Saúde',
};

/**
 * 14 Procedimentos Oficiais Coletivos (BPA-C) do CAPS I (CNES 7676417)
 */
export const CAPS_COLLECTIVE_PROCEDURES: CapsProcedure[] = [
  {
    code: '03.01.08.025-9',
    numericCode: '0301080259',
    name: 'Ações de Articulação de Redes Intra e Intersetoriais',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção coletiva: Comitês gestores territoriais, articulação intersetorial e fortalecimento das linhas de cuidado no município.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '223505', '225133', '225125', '225124', '251510', '251605', '223905', '223605', '223710',
      '223810', '224140', '239425', '239415', '322205', '322230', '371410', '515105', '515305', '516220',
      '2235-05', '2251-33', '2251-25', '2515-10', '2516-05', '2239-05'
    ],
  },
  {
    code: '03.01.08.026-7',
    numericCode: '0301080267',
    name: 'Fortalecimento do Protagonismo de Usuários e Familiares',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção coletiva: Fóruns de saúde mental, assembleias de usuários, associações de familiares e controle social.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '251510', '251605', '239425', '239415', '322205', '322230', '515305', '516220', '371410', '791115',
      '223505', '223905', '225133', '225125', '2515-10', '2516-05', '3222-05'
    ],
  },
  {
    code: '03.01.08.030-5',
    numericCode: '0301080305',
    name: 'Matriciamento de Equipes da Atenção Básica',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Apoio matricial, discussão clínico-territorial e compartilhamento de casos com equipes de Saúde da Família / UBS.',
    requiresHigherEducation: true,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '225133', '225125', '225124', '251510', '251605', '223505', '223405', '223905', '223605',
      '223710', '223810', '226305', '224140', '239425', '239415', '516220',
      '2251-33', '2515-10', '2516-05', '2235-05', '2239-05'
    ],
  },
  {
    code: '03.01.08.039-9',
    numericCode: '0301080399',
    name: 'Matriciamento de Urgência/Emergência e Hospitalar',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Articulação técnica, pactuação de fluxos e matriciamento conjunto com UPA, SAMU e emergências.',
    requiresHigherEducation: true,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '225133', '225125', '225124', '223505', '251510', '251605', '223405', '223905', '223810',
      '226305', '239415', '239425', '516220', '2251-33', '2235-05', '2515-10', '2516-05'
    ],
  },
  {
    code: '03.01.08.031-3',
    numericCode: '0301080313',
    name: 'Ações de Redução de Danos',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Ações em campo e no serviço visando redução de vulnerabilidades associadas ao uso de SPA e práticas de autocuidado.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '225133', '225125', '251510', '251605', '223505', '223905', '239425', '239415',
      '322205', '322230', '515305', '516220', '371410', '515105', '2251-33', '2235-05'
    ],
  },
  {
    code: '03.01.08.032-1',
    numericCode: '0301080321',
    name: 'Acompanhamento de Serviço Residencial Terapêutico (SRT)',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Apoio técnico, supervisão do cotidiano e inserção comunitária para moradores de SRT.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '223505', '251510', '251605', '225133', '225125', '223905', '322205', '322230',
      '515305', '516220', '2235-05', '2515-10', '2516-05'
    ],
  },
  {
    code: '03.01.08.033-0',
    numericCode: '0301080330',
    name: 'Apoio a Serviço Residencial Transitório (CT)',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Apoio institucional e suporte multiprofissional a serviços residenciais transitórios e comunidades terapêuticas credenciadas.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '223505', '251510', '251605', '225133', '225125', '223905', '322205', '322230',
      '515305', '516220', '2235-05', '2515-10', '2516-05'
    ],
  },
  {
    code: '01.01.01.002-8',
    numericCode: '0101010028',
    name: 'Atividade Educativa / Orientação em Grupo',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Rodas de conversa, orientações de promoção em saúde mental e palestras grupais.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '251510', '251605', '223505', '223905', '224140', '223710', '223605', '223810',
      '225133', '225125', '239425', '322205', '2515-10', '2235-05'
    ],
  },
  {
    code: '01.01.03.002-9',
    numericCode: '0101030029',
    name: 'Visita Domiciliar / Institucional por Nível Superior',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Visitas técnicas institucionais, intersetoriais e avaliações territoriais conjuntas (exclusivo nível superior).',
    requiresHigherEducation: true,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '223505', '251510', '251605', '223905', '225133', '225125', '223605', '223710',
      '223810', '224140', '2235-05', '2515-10', '2516-05', '2239-05'
    ],
  },
  {
    code: '03.01.04.003-6',
    numericCode: '0301040036',
    name: 'Terapia em Grupo',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Sessão psicoterápica grupal com usuários ou familiares conduzida por profissional habilitado.',
    requiresHigherEducation: true,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '251510', '225133', '225125', '251605', '223905',
      '2515-10', '2251-33', '2516-05', '2239-05'
    ],
  },
  {
    code: '03.01.08.014-3',
    numericCode: '0301080143',
    name: 'Atendimento em Oficina Terapêutica I',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Oficinas de convivência, artesanato, recreação e geração de renda conduzidas por profissionais de nível médio e técnico.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '322205', '322230', '371410', '791115', '515305', '516220',
      '3222-05', '3714-10', '5153-05', '5162-20'
    ],
  },
  {
    code: '03.01.08.015-1',
    numericCode: '0301080151',
    name: 'Atendimento em Oficina Terapêutica II',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Oficinas expressivas, literárias, de reabilitação psicossocial e projeto de vida coordenadas por profissionais de nível superior.',
    requiresHigherEducation: true,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '223905', '251510', '251605', '223505', '224140', '239425', '239415', '226305',
      '2239-05', '2515-10', '2516-05', '2235-05'
    ],
  },
  {
    code: '03.01.05.013-9',
    numericCode: '0301050139',
    name: 'Busca Ativa',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Ações territoriais e comunitárias para resgate de vínculos e localização de usuários ausentes ou em vulnerabilidade.',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['all'],
    typicalCbos: [
      '223505', '251510', '251605', '225133', '225125', '223905', '322205', '322230', '515105', '515305', '516220',
      '2235-05', '2515-10', '2516-05', '3222-05', '5151-05'
    ],
  },
  {
    code: '03.01.10.001-2',
    numericCode: '0301100012',
    name: 'Administração de Medicamentos na Atenção Especializada',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Procedimento técnico de enfermagem de administração oral, intramuscular ou endovenosa de psicotrópicos no CAPS (exclusivo enfermagem).',
    requiresHigherEducation: false,
    isCollective: true,
    permittedProfessions: ['enfermeiro', 'tecnico_enfermagem', 'auxiliar_enfermagem'],
    typicalCbos: [
      '223505', '322205', '322230',
      '2235-05', '3222-05', '3222-30'
    ],
  },
];

/**
 * Procedimentos Individuais Oficiais (BPA-I e RAAS-PSI) do CAPS I
 */
export const CAPS_INDIVIDUAL_PROCEDURES: CapsProcedure[] = [
  // -------------------------------------------------------------
  // INSTRUMENTO: BPA-I (Boletim de Produção Ambulatorial Individualizado)
  // -------------------------------------------------------------
  {
    code: '01.02.01.024-2',
    numericCode: '0102010242',
    name: 'Atendimento à Denúncias/Reclamações / Triagem Especializada',
    instrument: 'BPA-I',
    instrumentFullName: 'BPA-I (Boletim de Produção Ambulatorial Individualizado)',
    rule: 'Atendimento e triagem ambulatorial especializada individualizada no BPA-I.',
    requiresHigherEducation: false,
    isInitialContact: true,
    permittedProfessions: ['all'],
    typicalCbos: ['2235-05', '2515-10', '2516-05', '2251-33', '2251-25', '2239-05', '3222-05'],
  },
  {
    code: '07.01.07.010-2',
    numericCode: '0701070102',
    name: 'Consulta / Atendimento em Atenção Especializada',
    instrument: 'BPA-I',
    instrumentFullName: 'BPA-I (Boletim de Produção Ambulatorial Individualizado)',
    rule: 'Produção ambulatorial individualizada registrada no Banco 2.',
    requiresHigherEducation: false,
    isInitialContact: false,
    permittedProfessions: ['all'],
    typicalCbos: ['2235-05', '2515-10', '2516-05', '2251-33', '2251-25', '2239-05'],
  },
  {
    code: '03.01.08.023-2',
    numericCode: '0301080232',
    name: 'Acolhimento Inicial por CAPS',
    instrument: 'BPA-I',
    instrumentFullName: 'BPA-I (Boletim de Produção Ambulatorial Individualizado)',
    rule: 'Regra de Ouro: Primeiro atendimento/acolhimento do usuário no serviço (Caso Novo). Portas abertas, escuta qualificada inicial.',
    requiresHigherEducation: false,
    isInitialContact: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'fonoaudiologo',
      'psicopedagogo',
      'tecnico_enfermagem',
      'auxiliar_enfermagem',
      'oficineiro',
    ],
    typicalCbos: [
      '2235-05 (Enfermeiro)',
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
      '2251-33 (Médico Psiquiatra)',
      '2251-25 (Médico Clínico)',
      '2239-05 (TO)',
      '3222-05 (Téc. Enfermagem)',
    ],
  },
  {
    code: '03.01.08.019-4',
    numericCode: '0301080194',
    name: 'Acolhimento Inicial por CAPS (Código Secundário)',
    instrument: 'BPA-I',
    instrumentFullName: 'BPA-I (Boletim de Produção Ambulatorial Individualizado)',
    rule: 'Compatível com acolhimento inicial em portas abertas.',
    requiresHigherEducation: true,
    isInitialContact: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
    ],
    typicalCbos: ['2235-05', '2251-25', '2251-33', '2515-10', '2516-05', '2239-05'],
  },

  // -------------------------------------------------------------
  // INSTRUMENTO: RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)
  // -------------------------------------------------------------
  {
    code: '03.01.08.020-8',
    numericCode: '0301080208',
    name: 'Atendimento Individual em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Ações rotineiras de cuidado clínico, terapêutico e psicossocial individual no CAPS. Construção e seguimento do PTS.',
    requiresHigherEducation: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'nutricionista',
      'educador_fisico',
      'fisioterapeuta',
      'fonoaudiologo',
      'psicopedagogo',
    ],
    typicalCbos: [
      '2235-05 (Enfermeiro)',
      '2251-33 (Médico Psiquiatra)',
      '2251-25 (Médico Clínico)',
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
      '2239-05 (TO)',
    ],
  },
  {
    code: '03.01.08.021-6',
    numericCode: '0301080216',
    name: 'Atendimento em Grupo em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Atendimento clínico continuado em grupo psicoterapêutico ou oficina do serviço com registro nominal do usuário.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'educador_fisico',
      'nutricionista',
      'psicopedagogo',
      'tecnico_enfermagem',
      'oficineiro',
    ],
    typicalCbos: ['2235-05', '2515-10', '2516-05', '2239-05', '3222-05', '3714-10'],
  },
  {
    code: '03.01.08.022-4',
    numericCode: '0301080224',
    name: 'Atendimento Familiar em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Atendimento e orientação voltados à família ou rede de apoio do usuário no CAPS.',
    requiresHigherEducation: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'psicopedagogo',
    ],
    typicalCbos: ['2516-05', '2515-10', '2235-05', '2251-33', '2239-05'],
  },
  {
    code: '03.01.08.024-0',
    numericCode: '0301080240',
    name: 'Práticas Corporais em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Atividades físicas, expressão corporal, relaxamento e reabilitação funcional comunitária.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'educador_fisico',
      'fisioterapeuta',
      'terapeuta_ocupacional',
      'enfermeiro',
      'psicologo',
      'tecnico_enfermagem',
      'oficineiro',
    ],
    typicalCbos: ['2241-40', '2236-05', '2239-05', '2235-05', '3222-05'],
  },
  {
    code: '03.01.08.027-5',
    numericCode: '0301080275',
    name: 'Atendimento Domiciliar em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Ações de busca ativa, visita domiciliar de acompanhamento clínico e suporte in loco no território.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'tecnico_enfermagem',
      'auxiliar_enfermagem',
      'acs',
    ],
    typicalCbos: ['2235-05', '2516-05', '2515-10', '2251-33', '3222-05', '5151-05'],
  },
  {
    code: '03.01.08.002-0',
    numericCode: '0301080020',
    name: 'Acolhimento Noturno de Paciente em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Hospitalidade noturna e leito de acolhimento durante estabilização de crises.',
    requiresHigherEducation: true,
    isCrisisOrNight: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
    ],
    typicalCbos: ['2235-05', '2251-33', '2515-10', '2516-05'],
  },
];

/**
 * Todos os procedimentos consolidados
 */
export const CAPS_PROCEDURES: CapsProcedure[] = [
  ...CAPS_INDIVIDUAL_PROCEDURES,
  ...CAPS_COLLECTIVE_PROCEDURES,
];

/**
 * Normaliza o identificador da profissão para matching de regras CBO do CAPS.
 */
export function normalizeProfessionId(profIdOrName?: string): string {
  if (!profIdOrName) return 'enfermeiro';
  const clean = profIdOrName.toLowerCase().trim();
  if (clean.includes('enferm') && !clean.includes('téc') && !clean.includes('aux') && !clean.includes('tecnic')) return 'enfermeiro';
  if (clean.includes('téc') && clean.includes('enferm') || clean.includes('tecnic') && clean.includes('enferm')) return 'tecnico_enfermagem';
  if (clean.includes('aux') && clean.includes('enferm')) return 'auxiliar_enfermagem';
  if (clean.includes('médic') || clean.includes('medic') || clean.includes('psiquiatr')) return 'medico';
  if (clean.includes('psicol')) return 'psicologo';
  if (clean.includes('social') || clean.includes('assist')) return 'assistente_social';
  if (clean.includes('terap') && clean.includes('ocup')) return 'terapeuta_ocupacional';
  if (clean.includes('nutri')) return 'nutricionista';
  if (clean.includes('educ') || clean.includes('físic') || clean.includes('fisic')) return 'educador_fisico';
  if (clean.includes('psicoped')) return 'psicopedagogo';
  if (clean.includes('oficin') || clean.includes('artes')) return 'oficineiro';
  if (clean.includes('acs') || clean.includes('agente')) return 'acs';
  return clean;
}

/**
 * Retorna os procedimentos individuais CAPS compatíveis com o perfil da profissão.
 */
export function getCapsProceduresForProfession(
  professionId?: string,
  userRegister?: string
): CapsProcedure[] {
  const normId = normalizeProfessionId(professionId);

  const isExplicitTechnician =
    normId === 'tecnico_enfermagem' ||
    normId === 'auxiliar_enfermagem' ||
    normId === 'oficineiro' ||
    normId === 'acs' ||
    Boolean(userRegister && /(3222|5151|3714|t[ée]cnico|auxiliar)/i.test(userRegister));

  return CAPS_INDIVIDUAL_PROCEDURES.filter((proc) => {
    if (isExplicitTechnician && proc.requiresHigherEducation) {
      return false;
    }
    return (
      proc.permittedProfessions.includes(normId) ||
      proc.permittedProfessions.includes('all')
    );
  });
}

/**
 * Retorna os 14 procedimentos coletivos (BPA-C).
 */
export function getCapsCollectiveProcedures(): CapsProcedure[] {
  return CAPS_COLLECTIVE_PROCEDURES;
}

/**
 * Procedimento CAPS padrão sugerido por profissão e tipo de atendimento
 */
export function getDefaultCapsProcedure(
  professionId?: string,
  isFirstContact: boolean = false
): CapsProcedure {
  const normId = normalizeProfessionId(professionId);

  if (isFirstContact) {
    return CAPS_INDIVIDUAL_PROCEDURES[0]; // 03.01.08.023-2 Acolhimento Inicial
  }

  if (normId === 'educador_fisico') {
    return CAPS_INDIVIDUAL_PROCEDURES.find((p) => p.code === '03.01.08.024-0') || CAPS_INDIVIDUAL_PROCEDURES[2];
  }

  return CAPS_INDIVIDUAL_PROCEDURES[2]; // 03.01.08.020-8 Atendimento Individual
}

/**
 * Retorna o CBO padrão de 6 dígitos para a profissão
 */
export function getDefaultCboForProfession(professionId?: string): string {
  const normId = normalizeProfessionId(professionId);
  return DEFAULT_PROFESSION_CBOS[normId] || '225133';
}

/**
 * Formata um CBO de 6 dígitos no padrão 'XXXX-XX'
 */
export function formatCboWithHyphen(cbo?: string): string {
  if (!cbo) return '2251-33';
  const clean = cbo.replace(/\D/g, '');
  if (clean.length === 6) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}`;
  }
  return cbo;
}

/**
 * Extrai apenas o 1º e o último nome do profissional
 * Ex: 'Dra. Maria Clara dos Santos Silva' -> 'Maria Silva'
 */
export function formatFirstAndLastName(fullName?: string): string {
  if (!fullName) return '';
  // Limpa prefixos comuns como Dr., Dra., Enf., etc. se houver mais palavras
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return fullName.trim();

  let first = words[0];
  if (/^(dr|dra|enf|psic|med|prof)\.?$/i.test(first) && words.length >= 3) {
    first = words[1];
  }
  const last = words[words.length - 1];
  return `${first} ${last}`;
}

/**
 * Verifica se um CBO está habilitado no SUS/SIGTAP para executar o procedimento especificado.
 */
export function isCboHabilitatedForProcedure(rawCbo?: string, proc?: CapsProcedure): boolean {
  if (!proc) return false;
  if (!rawCbo) return true;
  const clean = rawCbo.replace(/\D/g, '');
  if (!clean) return true;

  // Procedimentos abertos a toda a equipe multiprofissional
  if (
    proc.typicalCbos.some((item) =>
      item.toLowerCase().includes('equipe') || item.toLowerCase().includes('caps')
    )
  ) {
    return true;
  }

  // Compara códigos numéricos e famílias CBO (primeiros 4 dígitos)
  return proc.typicalCbos.some((item) => {
    const itemClean = item.replace(/\D/g, '');
    if (!itemClean) return false;
    return (
      itemClean === clean ||
      (clean.length >= 4 && itemClean.startsWith(clean.slice(0, 4))) ||
      (itemClean.length >= 4 && clean.startsWith(itemClean.slice(0, 4)))
    );
  });
}

/**
 * Retorna exclusivamente os procedimentos coletivos (BPA-C) habilitados para o CBO do profissional logado.
 * Se o profissional não for habilitado, o procedimento não é listado.
 */
export function getCapsCollectiveProceduresForCbo(rawCbo?: string, professionId?: string): CapsProcedure[] {
  let clean = rawCbo?.replace(/\D/g, '');
  if (!clean && professionId) {
    clean = getDefaultCboForProfession(professionId);
  }
  if (!clean) return CAPS_COLLECTIVE_PROCEDURES;

  const habilitated = CAPS_COLLECTIVE_PROCEDURES.filter((proc) =>
    isCboHabilitatedForProcedure(clean, proc)
  );

  return habilitated.length > 0 ? habilitated : CAPS_COLLECTIVE_PROCEDURES;
}

/**
 * Procedimentos Perfil para Faturamento no Banco de Dados 2 (BPA-I e RAAS)
 * Formatados estritamente como "[codigo do procedimento - nome do procedimento]"
 */
export interface IndividualProfileProcedure {
  code: string;
  formattedCode: string;
  name: string;
  displayLabel: string;
  instrument: 'BPA-I' | 'RAAS-PSI';
  targetTable: 'procedure_production' | 'raas_psychosocial';
  rule: string;
}

export const INDIVIDUAL_PROFILE_PROCEDURES: IndividualProfileProcedure[] = [
  {
    code: '0102010242',
    formattedCode: '01.02.01.024-2',
    name: 'Atendimento à Denúncias/Reclamações / Triagem Especializada',
    displayLabel: '[0102010242 - Atendimento à Denúncias/Reclamações / Triagem Especializada]',
    instrument: 'BPA-I',
    targetTable: 'procedure_production',
    rule: 'Lançamento ambulatorial individual BPA-I gravado em public.procedure_production com os dados do paciente.',
  },
  {
    code: '0301080232',
    formattedCode: '03.01.08.023-2',
    name: 'Acolhimento Inicial por CAPS',
    displayLabel: '[03.01.08.023-2 - Acolhimento Inicial por CAPS]',
    instrument: 'BPA-I',
    targetTable: 'procedure_production',
    rule: 'Primeiro atendimento / acolhimento do usuário no serviço (Caso Novo / Portas Abertas).',
  },
  {
    code: '0301080194',
    formattedCode: '03.01.08.019-4',
    name: 'Acolhimento Inicial por CAPS (Código Secundário)',
    displayLabel: '[03.01.08.019-4 - Acolhimento Inicial por CAPS (Código Secundário)]',
    instrument: 'BPA-I',
    targetTable: 'procedure_production',
    rule: 'Acolhimento inicial alternativo por nível superior no CAPS.',
  },
  {
    code: '0701070102',
    formattedCode: '07.01.07.010-2',
    name: 'Consulta / Atendimento em Atenção Especializada',
    displayLabel: '[07.01.07.010-2 - Consulta / Atendimento em Atenção Especializada]',
    instrument: 'BPA-I',
    targetTable: 'procedure_production',
    rule: 'Produção ambulatorial individualizada no Banco 2.',
  },
  {
    code: '0301080208',
    formattedCode: '03.01.08.020-8',
    name: 'Atendimento Individual em CAPS',
    displayLabel: '[03.01.08.020-8 - Atendimento Individual em CAPS]',
    instrument: 'RAAS-PSI',
    targetTable: 'raas_psychosocial',
    rule: 'Acompanhamento clínico individual continuado do PTS.',
  },
  {
    code: '0301080216',
    formattedCode: '03.01.08.021-6',
    name: 'Atendimento em Grupo em CAPS',
    displayLabel: '[03.01.08.021-6 - Atendimento em Grupo em CAPS]',
    instrument: 'RAAS-PSI',
    targetTable: 'raas_psychosocial',
    rule: 'Atendimento em grupo psicoterapêutico ou oficina nominal.',
  },
  {
    code: '0301080224',
    formattedCode: '03.01.08.022-4',
    name: 'Atendimento Familiar em CAPS',
    displayLabel: '[03.01.08.022-4 - Atendimento Familiar em CAPS]',
    instrument: 'RAAS-PSI',
    targetTable: 'raas_psychosocial',
    rule: 'Atendimento e orientação à família do usuário no CAPS.',
  },
  {
    code: '0301080240',
    formattedCode: '03.01.08.024-0',
    name: 'Práticas Corporais em CAPS',
    displayLabel: '[03.01.08.024-0 - Práticas Corporais em CAPS]',
    instrument: 'RAAS-PSI',
    targetTable: 'raas_psychosocial',
    rule: 'Atividades físicas, expressão corporal e relaxamento.',
  },
  {
    code: '0301080275',
    formattedCode: '03.01.08.027-5',
    name: 'Atendimento Domiciliar em CAPS',
    displayLabel: '[03.01.08.027-5 - Atendimento Domiciliar em CAPS]',
    instrument: 'RAAS-PSI',
    targetTable: 'raas_psychosocial',
    rule: 'Visita domiciliar e busca ativa de suporte no território.',
  },
];
