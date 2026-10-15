import { DayScheduleConfig, ScheduleConfig, ProfessionalService, ProfessionId, CustomTimeSlot } from '../types';

export function generateSlotsForTimeRange(
  startTime: string = '08:00',
  endTime: string = '17:00',
  breakStartTime?: string,
  breakEndTime?: string,
  durationMinutes: number = 45
): CustomTimeSlot[] {
  const parseMin = (str: string) => {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };
  const formatMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startMin = parseMin(startTime);
  const endMin = parseMin(endTime);
  const bStartMin = breakStartTime ? parseMin(breakStartTime) : null;
  const bEndMin = breakEndTime ? parseMin(breakEndTime) : null;

  const slots: CustomTimeSlot[] = [];
  let curr = startMin;
  let idx = 1;

  while (curr + durationMinutes <= endMin) {
    const sStart = curr;
    const sEnd = curr + durationMinutes;

    // Check lunch collision
    if (bStartMin !== null && bEndMin !== null) {
      if (
        (sStart >= bStartMin && sStart < bEndMin) ||
        (sEnd > bStartMin && sEnd <= bEndMin) ||
        (sStart <= bStartMin && sEnd >= bEndMin)
      ) {
        curr = bEndMin;
        continue;
      }
    }

    slots.push({
      id: `slot-${Date.now()}-${idx++}-${Math.random().toString(36).substring(2, 6)}`,
      startTime: formatMin(sStart),
      endTime: formatMin(sEnd),
      enabled: true,
    });

    curr = sEnd;
  }

  return slots;
}

const DEFAULT_WEEKDAY_SLOTS: CustomTimeSlot[] = [
  { id: 'slot-1', startTime: '08:00', endTime: '08:45', enabled: true },
  { id: 'slot-2', startTime: '08:45', endTime: '09:30', enabled: true },
  { id: 'slot-3', startTime: '09:30', endTime: '10:15', enabled: true },
  { id: 'slot-4', startTime: '10:15', endTime: '11:00', enabled: true },
  { id: 'slot-5', startTime: '11:00', endTime: '11:45', enabled: true },
  { id: 'slot-6', startTime: '13:00', endTime: '13:45', enabled: true },
  { id: 'slot-7', startTime: '13:45', endTime: '14:30', enabled: true },
  { id: 'slot-8', startTime: '14:30', endTime: '15:15', enabled: true },
  { id: 'slot-9', startTime: '15:15', endTime: '16:00', enabled: true },
  { id: 'slot-10', startTime: '16:00', endTime: '16:45', enabled: true },
];

export const DEFAULT_WEEKLY_SCHEDULE: DayScheduleConfig[] = [
  {
    dayOfWeek: 0,
    dayName: 'Domingo',
    enabled: false,
    startTime: '08:00',
    endTime: '12:00',
    customSlots: [],
  },
  {
    dayOfWeek: 1,
    dayName: 'Segunda-feira',
    enabled: true,
    startTime: '08:00',
    endTime: '17:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
    customSlots: DEFAULT_WEEKDAY_SLOTS.map((s) => ({ ...s, id: `seg-${s.id}` })),
  },
  {
    dayOfWeek: 2,
    dayName: 'Terça-feira',
    enabled: true,
    startTime: '08:00',
    endTime: '17:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
    customSlots: DEFAULT_WEEKDAY_SLOTS.map((s) => ({ ...s, id: `ter-${s.id}` })),
  },
  {
    dayOfWeek: 3,
    dayName: 'Quarta-feira',
    enabled: true,
    startTime: '08:00',
    endTime: '17:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
    customSlots: DEFAULT_WEEKDAY_SLOTS.map((s) => ({ ...s, id: `qua-${s.id}` })),
  },
  {
    dayOfWeek: 4,
    dayName: 'Quinta-feira',
    enabled: true,
    startTime: '08:00',
    endTime: '17:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
    customSlots: DEFAULT_WEEKDAY_SLOTS.map((s) => ({ ...s, id: `qui-${s.id}` })),
  },
  {
    dayOfWeek: 5,
    dayName: 'Sexta-feira',
    enabled: true,
    startTime: '08:00',
    endTime: '17:00',
    breakStartTime: '12:00',
    breakEndTime: '13:00',
    customSlots: DEFAULT_WEEKDAY_SLOTS.map((s) => ({ ...s, id: `sex-${s.id}` })),
  },
  {
    dayOfWeek: 6,
    dayName: 'Sábado',
    enabled: false,
    startTime: '08:00',
    endTime: '12:00',
    customSlots: [],
  },
];

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
  slotDurationMinutes: 30,
  breakDurationMinutes: 0,
  advanceBookingDays: 30,
  minNoticeHours: 2,
};

export function getDefaultServicesForProfession(profession: ProfessionId): ProfessionalService[] {
  switch (profession) {
    case 'medico':
      return [
        {
          id: 'serv-med-1',
          name: 'Consulta Médica Geral / APS',
          durationMinutes: 30,
          price: 0,
          description: 'Atendimento clínico geral, avaliação diagnóstica, prescrição e orientações terapêuticas.',
          active: true,
        },
        {
          id: 'serv-med-2',
          name: 'Avaliação Médica Especializada / Saúde Mental',
          durationMinutes: 45,
          price: 0,
          description: 'Acompanhamento psiquiátrico/clínico, ajuste de psicotrópicos e elaboração de PTS.',
          active: true,
        },
        {
          id: 'serv-med-3',
          name: 'Renovação de Receitas & Laudos',
          durationMinutes: 15,
          price: 0,
          description: 'Reavaliação rápida para continuidade de tratamentos de uso contínuo.',
          active: true,
        },
      ];

    case 'enfermeiro':
      return [
        {
          id: 'serv-enf-1',
          name: 'Consulta de Enfermagem (SOAP / SAE)',
          durationMinutes: 30,
          price: 0,
          description: 'Sistematização da assistência, acolhimento, anamnese, exame físico e plano de cuidados.',
          active: true,
        },
        {
          id: 'serv-enf-2',
          name: 'Acompanhamento de Hiperdia / Pré-Natal',
          durationMinutes: 40,
          price: 0,
          description: 'Monitoramento de condições crônicas (HAS/DM) e puericultura/gestação.',
          active: true,
        },
        {
          id: 'serv-enf-3',
          name: 'Coleta de Exames Citopatológicos / Procedimentos',
          durationMinutes: 30,
          price: 0,
          description: 'Procedimentos preventivos e orientações de saúde da mulher.',
          active: true,
        },
      ];

    case 'psicologo':
      return [
        {
          id: 'serv-psi-1',
          name: 'Atendimento Psicoterápico Individual',
          durationMinutes: 50,
          price: 0,
          description: 'Sessão clínica de acompanhamento psicoterapêutico e acolhimento do sofrimento psíquico.',
          active: true,
        },
        {
          id: 'serv-psi-2',
          name: 'Acolhimento Inicial em Saúde Mental (Intake)',
          durationMinutes: 45,
          price: 0,
          description: 'Primeira escuta qualificada, avaliação de risco e formulação do Projeto Terapêutico Singular.',
          active: true,
        },
        {
          id: 'serv-psi-3',
          name: 'Atendimento Familiar / Orientação de Pais',
          durationMinutes: 50,
          price: 0,
          description: 'Espaço de escuta e mediação para dinâmicas familiares e rede de apoio.',
          active: true,
        },
      ];

    case 'assistente_social':
      return [
        {
          id: 'serv-as-1',
          name: 'Acolhimento e Estudo Socioeconômico',
          durationMinutes: 40,
          price: 0,
          description: 'Mapeamento de vulnerabilidades, rede socioassistencial e benefícios (BPC, Bolsa Família).',
          active: true,
        },
        {
          id: 'serv-as-2',
          name: 'Articulação Intersetorial e Acompanhamento de PTS',
          durationMinutes: 45,
          price: 0,
          description: 'Visitas institucionais, diálogo com CRAS/CREAS/Conselho Tutelar e suporte à família.',
          active: true,
        },
      ];

    case 'nutricionista':
      return [
        {
          id: 'serv-nut-1',
          name: 'Avaliação Nutricional & Plano Alimentar',
          durationMinutes: 45,
          price: 0,
          description: 'Antropometria, inquérito alimentar, cálculo de necessidades e plano dietético personalizado.',
          active: true,
        },
        {
          id: 'serv-nut-2',
          name: 'Retorno Nutricional e Educação Alimentar',
          durationMinutes: 30,
          price: 0,
          description: 'Acompanhamento da evolução de metas e ajustes das orientações.',
          active: true,
        },
      ];

    case 'psicopedagogo':
      return [
        {
          id: 'serv-psp-1',
          name: 'Avaliação Psicopedagógica Clínica',
          durationMinutes: 50,
          price: 0,
          description: 'Investigação dos processos de aprendizagem, funções executivas e neurodesenvolvimento.',
          active: true,
        },
        {
          id: 'serv-psp-2',
          name: 'Sessão de Intervenção Psicopedagógica',
          durationMinutes: 45,
          price: 0,
          description: 'Estimulação cognitiva, adaptações curriculares e mediação pedagógica.',
          active: true,
        },
      ];

    case 'educador_fisico':
      return [
        {
          id: 'serv-ef-1',
          name: 'Avaliação Física Funcional & Prescrição de Exercício',
          durationMinutes: 40,
          price: 0,
          description: 'Testes de mobilidade, capacidade cardiorrespiratória e planejamento de atividade adaptada.',
          active: true,
        },
      ];

    default:
      return [
        {
          id: `serv-gen-1`,
          name: 'Consulta Multiprofissional e Acolhimento',
          durationMinutes: 30,
          price: 0,
          description: 'Atendimento multiprofissional de referência no SUS.',
          active: true,
        },
      ];
  }
}
