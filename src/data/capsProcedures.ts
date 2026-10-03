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
}

/**
 * Relação oficial dos únicos procedimentos operacionais válidos para a produção direta do CAPS
 * segundo normativas do Ministério da Saúde (BPA-I, RAAS-PSI e BPA-C).
 */
export const CAPS_PROCEDURES: CapsProcedure[] = [
  // -------------------------------------------------------------
  // 1. INSTRUMENTO: BPA-I (Boletim de Produção Ambulatorial Individualizado)
  // -------------------------------------------------------------
  {
    code: '03.01.08.019-4',
    numericCode: '0301080194',
    name: 'Acolhimento Inicial por CAPS',
    instrument: 'BPA-I',
    instrumentFullName: 'BPA-I (Boletim de Produção Ambulatorial Individualizado)',
    rule: 'Regra de Ouro: Usado apenas para casos novos (portas abertas). Registra a primeira escuta qualificada. Não se repete se o paciente abandonar o tratamento e voltar posteriormente.',
    requiresHigherEducation: true,
    isInitialContact: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
    ],
    typicalCbos: [
      '2235-05 (Enfermeiro)',
      '2251-25 (Médico Clínico)',
      '2251-33 (Médico Psiquiatra)',
      '2515-10 (Psicólogo Clínico)',
      '2516-05 (Assistente Social)',
      '2239-05 (Terapeuta Ocupacional)',
    ],
  },

  // -------------------------------------------------------------
  // 2. INSTRUMENTO: RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)
  // -------------------------------------------------------------
  {
    code: '03.01.08.020-8',
    numericCode: '0301080208',
    name: 'Atendimento Individual em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Ações rotineiras de cuidado clínico, terapêutico e psicossocial individual no CAPS. Elaboração do PTS ou dele derivam, promovendo capacidades e autonomia.',
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
      '2251-25 (Médico Clínico)',
      '2251-33 (Médico Psiquiatra)',
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
      '2239-05 (Terapeuta Ocupacional)',
      '2237-10 (Nutricionista)',
      '2241-40 (Educador Físico)',
      '2394-25 (Psicopedagogo)',
    ],
  },
  {
    code: '03.01.08.021-6',
    numericCode: '0301080216',
    name: 'Atendimento em Grupo em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Grupos terapêuticos, oficinas de convivência e rodas de suporte mútuo. Compatível com nível superior e nível médio/técnico em co-condução.',
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
      'fisioterapeuta',
      'fonoaudiologo',
      'tecnico_enfermagem',
      'auxiliar_enfermagem',
      'oficineiro',
      'acs',
    ],
    typicalCbos: [
      'Equipe Nível Superior (2235-05, 2515-10, 2516-05, 2239-05, etc.)',
      'Nível Técnico/Médio (3222-05 Téc. Enfermagem, 3714-10 Oficineiro, 5151-05 ACS)',
    ],
  },
  {
    code: '03.01.08.022-4',
    numericCode: '0301080224',
    name: 'Atendimento Familiar em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Atendimento e orientação voltados à família ou rede de apoio do usuário no CAPS, fortalecendo a corresponsabilização no plano terapêutico.',
    requiresHigherEducation: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'psicopedagogo',
      'nutricionista',
    ],
    typicalCbos: [
      '2516-05 (Assistente Social)',
      '2515-10 (Psicólogo)',
      '2235-05 (Enfermeiro)',
      '2251-25 / 2251-33 (Médico)',
      '2239-05 (Terapeuta Ocupacional)',
    ],
  },
  {
    code: '03.01.08.023-2',
    numericCode: '0301080232',
    name: 'Atendimento Domiciliar em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Ações de busca ativa, visita domiciliar de acompanhamento clínico e suporte in loco no território para usuários impossibilitados de locomoção ou em crise.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'nutricionista',
      'fisioterapeuta',
      'tecnico_enfermagem',
      'auxiliar_enfermagem',
      'acs',
    ],
    typicalCbos: [
      '2235-05 (Enfermeiro)',
      '2516-05 (Assistente Social)',
      '2515-10 (Psicólogo)',
      '2251-25 (Médico)',
      '3222-05 (Técnico de Enfermagem)',
      '5151-05 (ACS)',
    ],
  },
  {
    code: '03.01.08.024-0',
    numericCode: '0301080240',
    name: 'Práticas Corporais em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Atividades físicas, expressão corporal, relaxamento, caminhadas no território e reabilitação funcional para integração comunitária.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'educador_fisico',
      'fisioterapeuta',
      'terapeuta_ocupacional',
      'enfermeiro',
      'psicologo',
      'assistente_social',
      'medico',
      'tecnico_enfermagem',
      'oficineiro',
    ],
    typicalCbos: [
      '2241-40 (Educador Físico)',
      '2236-05 (Fisioterapeuta)',
      '2239-05 (Terapeuta Ocupacional)',
      '2235-05 (Enfermeiro)',
      '3222-05 (Técnico de Enfermagem)',
      '3714-10 (Oficineiro)',
    ],
  },
  {
    code: '03.01.08.025-9',
    numericCode: '0301080259',
    name: 'Práticas Expressivas e Comunicativas em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Oficinas terapêuticas de música, artes visuais, literatura, teatro, rádio comunitária e recursos de expressão afetiva e de comunicação.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'terapeuta_ocupacional',
      'psicologo',
      'assistente_social',
      'psicopedagogo',
      'enfermeiro',
      'medico',
      'oficineiro',
      'tecnico_enfermagem',
      'educador_fisico',
    ],
    typicalCbos: [
      '2239-05 (Terapeuta Ocupacional)',
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
      '2394-25 (Psicopedagogo)',
      '3714-10 (Oficineiro)',
      '3222-05 (Técnico de Enfermagem)',
    ],
  },
  {
    code: '03.01.08.026-7',
    numericCode: '0301080267',
    name: 'Atenção às Situações de Crise em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Manejo clínico e psicossocial intensivo em episódios de agudização/crise severa. Exige avaliação clínica de nível superior.',
    requiresHigherEducation: true,
    isCrisisOrNight: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
    ],
    typicalCbos: [
      '2235-05 (Enfermeiro)',
      '2251-25 (Médico Clínico)',
      '2251-33 (Médico Psiquiatra)',
      '2515-10 (Psicólogo)',
      '2239-05 (Terapeuta Ocupacional)',
      '2516-05 (Assistente Social)',
    ],
  },
  {
    code: '03.01.08.027-5',
    numericCode: '0301080275',
    name: 'Ações de Reabilitação Psicossocial e Promoção de Contratualidade no Território',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Ações territoriais de inserção laboral, geração de renda, ocupação de espaços comunitários, lazer e ampliação de trocas sociais e autonomia.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'assistente_social',
      'terapeuta_ocupacional',
      'psicologo',
      'enfermeiro',
      'educador_fisico',
      'psicopedagogo',
      'medico',
      'oficineiro',
      'tecnico_enfermagem',
      'acs',
    ],
    typicalCbos: [
      '2516-05 (Assistente Social)',
      '2239-05 (Terapeuta Ocupacional)',
      '2515-10 (Psicólogo)',
      '2235-05 (Enfermeiro)',
      '2241-40 (Educador Físico)',
      '3714-10 (Oficineiro)',
    ],
  },
  {
    code: '03.01.08.035-6',
    numericCode: '0301080356',
    name: 'Acolhimento em Terceiro Turno',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Ações e atendimentos realizados no período noturno (18h às 21h). Lançado juntamente com o procedimento assistencial executado no horário.',
    requiresHigherEducation: false,
    isCrisisOrNight: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
      'tecnico_enfermagem',
    ],
    typicalCbos: [
      '2235-05 (Enfermeiro)',
      '2251-25 (Médico)',
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
      '3222-05 (Técnico de Enfermagem)',
    ],
  },
  {
    code: '03.01.08.002-0',
    numericCode: '0301080020',
    name: 'Acolhimento Noturno de Paciente em CAPS',
    instrument: 'RAAS-PSI',
    instrumentFullName: 'RAAS-PSI (Registro das Ações Ambulatoriais de Saúde)',
    rule: 'Restrito a unidades CAPS III 24h para hospitalidade noturna e leito de acolhimento durante estabilização de crises.',
    requiresHigherEducation: true,
    isCrisisOrNight: true,
    permittedProfessions: [
      'enfermeiro',
      'medico',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
    ],
    typicalCbos: [
      '2235-05 (Enfermeiro de Plantão CAPS III)',
      '2251-25 / 2251-33 (Médico Psiquiatra/Generalista)',
      'Equipe Multiprofissional 24h',
    ],
  },

  // -------------------------------------------------------------
  // 3. INSTRUMENTO: BPA-C (Boletim de Produção Ambulatorial Consolidado)
  // -------------------------------------------------------------
  {
    code: '03.01.08.028-3',
    numericCode: '0301080283',
    name: 'Matriciamento de Equipes da Atenção Básica',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Apoio matricial, discussão clínico-territorial e compartilhamento de casos com equipes de Saúde da Família / UBS.',
    requiresHigherEducation: true,
    permittedProfessions: [
      'psicologo',
      'assistente_social',
      'enfermeiro',
      'terapeuta_ocupacional',
      'medico',
      'educador_fisico',
      'nutricionista',
    ],
    typicalCbos: [
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
      '2235-05 (Enfermeiro)',
      '2239-05 (Terapeuta Ocupacional)',
      '2251-25 (Médico)',
    ],
  },
  {
    code: '03.01.08.029-1',
    numericCode: '0301080291',
    name: 'Matriciamento de Pontos de Atenção da Urgência e Emergência',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Articulação técnica, pactuação de fluxos e matriciamento conjunto com UPA, SAMU e emergências hospitalares.',
    requiresHigherEducation: true,
    permittedProfessions: [
      'medico',
      'enfermeiro',
      'psicologo',
      'assistente_social',
      'terapeuta_ocupacional',
    ],
    typicalCbos: [
      '2251-25 (Médico)',
      '2235-05 (Enfermeiro)',
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
    ],
  },
  {
    code: '03.01.08.030-5',
    numericCode: '0301080305',
    name: 'Matriciamento de Serviços da Rede de Atenção Psicossocial (RAPS)',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Reuniões clínicas e alinhamento de condutas entre pontos da RAPS (CAPS AD, CAPSi, SRT, UA, etc.).',
    requiresHigherEducation: true,
    permittedProfessions: [
      'psicologo',
      'assistente_social',
      'enfermeiro',
      'terapeuta_ocupacional',
      'medico',
    ],
    typicalCbos: [
      '2515-10 (Psicólogo)',
      '2516-05 (Assistente Social)',
      '2235-05 (Enfermeiro)',
      '2239-05 (Terapeuta Ocupacional)',
      '2251-25 / 2251-33 (Médico)',
    ],
  },
  {
    code: '03.01.08.031-3',
    numericCode: '0301080313',
    name: 'Matriciamento de Serviços Setoriais (Assistência Social, Educação, Justiça, etc.)',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Articulação com CRAS, CREAS, Conselhos Tutelares, escolas e órgãos de garantia de direitos.',
    requiresHigherEducation: true,
    permittedProfessions: [
      'assistente_social',
      'psicologo',
      'psicopedagogo',
      'terapeuta_ocupacional',
      'enfermeiro',
      'medico',
    ],
    typicalCbos: [
      '2516-05 (Assistente Social)',
      '2515-10 (Psicólogo)',
      '2394-25 (Psicopedagogo)',
      '2239-05 (Terapeuta Ocupacional)',
      '2235-05 (Enfermeiro)',
    ],
  },
  {
    code: '03.01.08.032-1',
    numericCode: '0301080321',
    name: 'Ações de Articulação de Redes Intra e Intersetoriais',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Comitês gestores territoriais, articulação intersetorial e fortalecimento das linhas de cuidado no município.',
    requiresHigherEducation: true,
    permittedProfessions: [
      'assistente_social',
      'psicologo',
      'enfermeiro',
      'terapeuta_ocupacional',
      'medico',
      'educador_fisico',
    ],
    typicalCbos: [
      '2516-05 (Assistente Social)',
      '2515-10 (Psicólogo)',
      '2235-05 (Enfermeiro)',
      '2239-05 (Terapeuta Ocupacional)',
      '2251-25 (Médico)',
    ],
  },
  {
    code: '03.01.08.033-0',
    numericCode: '0301080330',
    name: 'Fortalecimento do Protagonismo de Usuários e Familiares e de Redes Sociais de Apoio',
    instrument: 'BPA-C',
    instrumentFullName: 'BPA-C (Boletim de Produção Ambulatorial Consolidado)',
    rule: 'Produção institucional: Fóruns de saúde mental, assembleias de usuários, associações de familiares e controle social no SUS.',
    requiresHigherEducation: false,
    permittedProfessions: [
      'assistente_social',
      'psicologo',
      'terapeuta_ocupacional',
      'enfermeiro',
      'medico',
      'educador_fisico',
      'oficineiro',
      'tecnico_enfermagem',
      'acs',
    ],
    typicalCbos: [
      '2516-05 (Assistente Social)',
      '2515-10 (Psicólogo)',
      '2239-05 (Terapeuta Ocupacional)',
      '2235-05 (Enfermeiro)',
      '3714-10 (Oficineiro)',
    ],
  },
];

/**
 * Normaliza o identificador da profissão para matching de regras CBO do CAPS.
 */
export function normalizeProfessionId(profIdOrName?: string): string {
  if (!profIdOrName) return 'enfermeiro';
  const clean = profIdOrName.toLowerCase().trim();
  if (clean.includes('enferm') && !clean.includes('t[ée]cnic') && !clean.includes('aux')) return 'enfermeiro';
  if (clean.includes('t[ée]c') && clean.includes('enferm')) return 'tecnico_enfermagem';
  if (clean.includes('aux') && clean.includes('enferm')) return 'auxiliar_enfermagem';
  if (clean.includes('m[ée]dic') || clean.includes('psiquiatr')) return 'medico';
  if (clean.includes('psicol')) return 'psicologo';
  if (clean.includes('social') || clean.includes('assist')) return 'assistente_social';
  if (clean.includes('terap') && clean.includes('ocup')) return 'terapeuta_ocupacional';
  if (clean.includes('nutri')) return 'nutricionista';
  if (clean.includes('educ') || clean.includes('f[íi]sic')) return 'educador_fisico';
  if (clean.includes('psicoped')) return 'psicopedagogo';
  if (clean.includes('oficin')) return 'oficineiro';
  if (clean.includes('acs') || clean.includes('agente')) return 'acs';
  return clean;
}

/**
 * Retorna os procedimentos CAPS compatíveis estritamente com o perfil e CBO da profissão.
 * Se uma profissão não tiver autorização ministerial para registrar o código, ele não será exibido.
 */
export function getCapsProceduresForProfession(
  professionId?: string,
  userRegister?: string
): CapsProcedure[] {
  const normId = normalizeProfessionId(professionId);

  // Verificação de CBO explícito de nível médio/técnico no registro
  const isExplicitTechnician =
    normId === 'tecnico_enfermagem' ||
    normId === 'auxiliar_enfermagem' ||
    normId === 'oficineiro' ||
    normId === 'acs' ||
    Boolean(userRegister && /(3222|5151|3714|t[ée]cnico|auxiliar)/i.test(userRegister));

  return CAPS_PROCEDURES.filter((proc) => {
    // Se for profissional técnico, filtra códigos que exigem nível superior
    if (isExplicitTechnician && proc.requiresHigherEducation) {
      return false;
    }

    // Verifica compatibilidade com lista de profissões aceitas
    return (
      proc.permittedProfessions.includes(normId) ||
      proc.permittedProfessions.includes('all')
    );
  });
}

/**
 * Procedimento CAPS padrão sugerido por profissão e tipo de atendimento
 */
export function getDefaultCapsProcedure(
  professionId?: string,
  isFirstContact: boolean = false
): CapsProcedure {
  const normId = normalizeProfessionId(professionId);

  // Acolhimento Inicial em casos novos para Nível Superior
  if (isFirstContact && ['enfermeiro', 'medico', 'psicologo', 'assistente_social', 'terapeuta_ocupacional'].includes(normId)) {
    return CAPS_PROCEDURES[0]; // 03.01.08.019-4
  }

  // Padrão de práticas para Educador Físico
  if (normId === 'educador_fisico') {
    return CAPS_PROCEDURES.find((p) => p.code === '03.01.08.024-0') || CAPS_PROCEDURES[1];
  }

  // Padrão de práticas expressivas para TO / Psicopedagogo
  if (normId === 'terapeuta_ocupacional') {
    return CAPS_PROCEDURES.find((p) => p.code === '03.01.08.025-9') || CAPS_PROCEDURES[1];
  }

  // Padrão geral de Atendimento Individual em CAPS
  return CAPS_PROCEDURES[1]; // 03.01.08.020-8
}
