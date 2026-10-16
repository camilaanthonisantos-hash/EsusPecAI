import { User, Appointment, ReceptionQueueItem } from '../types';
import { DEFAULT_WEEKLY_SCHEDULE, generateSlotsForTimeRange } from '../data/defaultSchedule';

export interface TimeSlotOption {
  startTime: string;
  endTime: string;
  available: boolean;
  occupiedBy?: string;
}

/**
 * Normaliza string de horário para o formato HH:MM (ex: "8:0" -> "08:00")
 */
export function normalizeTimeFormat(timeStr?: string): string {
  if (!timeStr) return '08:00';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Ajusta qualquer horário para o intervalo de 15 minutos mais próximo (08:00, 08:15, 08:30, 08:45...)
 */
export function adjustTimeTo15MinInterval(timeStr?: string): string {
  if (!timeStr) return '08:00';
  const clean = timeStr.trim();
  const parts = clean.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return normalizeTimeFormat(timeStr);
  let [hours, minutes] = parts;
  const roundedMin = Math.round(minutes / 15) * 15;
  if (roundedMin === 60) {
    hours = (hours + 1) % 24;
    minutes = 0;
  } else {
    minutes = roundedMin;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calcula os horários da grade do profissional para determinada data (YYYY-MM-DD),
 * e identifica/filtra os horários que já estão ocupados por consultas ou fila.
 */
export function getAvailableSlotsForProfessional(
  user: User | null | undefined,
  dateString: string, // "YYYY-MM-DD"
  queueItems: ReceptionQueueItem[] = [],
  appointments: Appointment[] = [],
  onlyAvailable: boolean = true
): TimeSlotOption[] {
  if (!dateString) return [];

  // Parse Date (yyyy-mm-dd) sem problema de timezone UTC
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return [];

  const [year, month, day] = parts;
  const targetDate = new Date(year, month - 1, day, 12, 0, 0);
  const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 1 = Segunda, ...

  // Buscar configuração do dia na grade do profissional
  const scheduleConfig = user?.scheduleConfig;
  const weeklySchedule = scheduleConfig?.weeklySchedule?.length
    ? scheduleConfig.weeklySchedule
    : DEFAULT_WEEKLY_SCHEDULE;

  let dayConfig = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);

  // Fallback para a grade padrão se o dia estiver desabilitado sem scheduleConfig explícito
  if (!dayConfig || (!dayConfig.enabled && !scheduleConfig)) {
    dayConfig = DEFAULT_WEEKLY_SCHEDULE.find((d) => d.dayOfWeek === dayOfWeek);
  }

  // Se o profissional fechou este dia da semana explicitamente em sua grade
  if (!dayConfig || !dayConfig.enabled) {
    return [];
  }

  // Obter horários base da grade
  let rawSlots: Array<{ startTime: string; endTime: string }> = [];

  if (dayConfig.customSlots && dayConfig.customSlots.length > 0) {
    rawSlots = dayConfig.customSlots
      .filter((s) => s.enabled !== false)
      .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
  } else {
    const startT = dayConfig.startTime || '08:00';
    const endT = dayConfig.endTime || '17:00';
    const breakStartT = dayConfig.breakStartTime;
    const breakEndT = dayConfig.breakEndTime;
    const durationMin = scheduleConfig?.slotDurationMinutes || 15;

    const generated = generateSlotsForTimeRange(startT, endT, breakStartT, breakEndT, durationMin);
    rawSlots = generated.map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
  }

  if (rawSlots.length === 0) {
    const generated = generateSlotsForTimeRange('08:00', '17:00', '12:00', '13:00', 15);
    rawSlots = generated.map((s) => ({ startTime: s.startTime, endTime: s.endTime }));
  }

  // Coletar horários ocupados para o profissional nesta data
  const profId = user?.id;
  const profName = user?.name ? user.name.toLowerCase().trim() : '';

  const occupiedMap = new Map<string, string>(); // time -> patientName/note

  // 1. Checar itens da fila
  for (const q of queueItems) {
    if (!q || q.status === 'cancelled' || q.status === 'abandoned') continue;
    const matchesProf =
      (profId && q.professionalId === profId) ||
      (profName && q.professionalName && q.professionalName.toLowerCase().trim() === profName);

    if (matchesProf && q.scheduledDate === dateString && q.scheduledTime) {
      const timeKey = adjustTimeTo15MinInterval(q.scheduledTime);
      occupiedMap.set(timeKey, q.patientName || 'Paciente na Fila');
    }
  }

  // 2. Checar agendamentos
  for (const app of appointments) {
    if (!app || app.status === 'cancelado') continue;
    const matchesProf =
      (profId && app.professionalId === profId) ||
      (profName && app.professionalName && app.professionalName.toLowerCase().trim() === profName);

    if (matchesProf && app.date === dateString && app.startTime) {
      const timeKey = adjustTimeTo15MinInterval(app.startTime);
      if (!occupiedMap.has(timeKey)) {
        occupiedMap.set(timeKey, app.patientName || 'Agendamento em Agenda');
      }
    }
  }

  const allMapped: TimeSlotOption[] = rawSlots.map((s) => {
    const startFormatted = adjustTimeTo15MinInterval(s.startTime);
    const endFormatted = adjustTimeTo15MinInterval(s.endTime);
    const occupiedBy = occupiedMap.get(startFormatted);
    const isAvailable = !occupiedBy;

    return {
      startTime: startFormatted,
      endTime: endFormatted,
      available: isAvailable,
      occupiedBy,
    };
  });

  if (onlyAvailable) {
    return allMapped.filter((s) => s.available);
  }

  return allMapped;
}
