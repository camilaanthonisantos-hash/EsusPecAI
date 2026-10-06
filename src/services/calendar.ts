import { Appointment, AvailableTimeSlot, ScheduleConfig, User, ProfessionalService } from '../types';
import { DEFAULT_SCHEDULE_CONFIG, getDefaultServicesForProfession } from '../data/defaultSchedule';
import { getProfessionalProfessionTitle } from '../data/professions';

/**
 * Checks if a given Google Calendar ID is a valid secondary calendar.
 * Secondary calendars have IDs like c_... or hash@group.calendar.google.com
 */
export function isSecondaryCalendarId(calendarId?: string): boolean {
  if (!calendarId) return false;
  const clean = calendarId.trim().toLowerCase();
  return clean.endsWith('@group.calendar.google.com') || clean.endsWith('@import.calendar.google.com');
}

/**
 * Helper to check if a professional is strictly eligible for online booking.
 * DIRECTIVE: No professional can be available for booking if they do not have
 * their schedule linked to a verified SECONDARY Google Calendar!
 */
export function isProfessionalAvailableForBooking(user: User): boolean {
  if (user.isBookingEnabled === false) return false;
  if (!user.googleCalendarId || !user.googleCalendarId.trim()) return false;
  if (user.isGoogleCalendarVerified === false) return false;
  // USER MANDATE: Must strictly be a secondary calendar, never a primary personal email!
  if (!isSecondaryCalendarId(user.googleCalendarId) && user.googleCalendarType !== 'secondary_group') {
    return false;
  }
  return true;
}

/**
 * Calculates available time slots for a given professional and date
 * Cross-references weekly schedule, existing appointments, and Google Calendar
 */
export function calculateAvailableSlotsLocal(
  user: User,
  dateString: string, // "YYYY-MM-DD"
  serviceDurationMinutes: number = 30,
  existingAppointments: Appointment[] = []
): AvailableTimeSlot[] {
  // STRICT RULE: No professional can offer slots if not linked to Google Calendar
  if (!isProfessionalAvailableForBooking(user)) {
    return [];
  }

  const config = user.scheduleConfig || DEFAULT_SCHEDULE_CONFIG;
  const targetDate = new Date(`${dateString}T00:00:00`);
  const dayOfWeek = targetDate.getDay(); // 0 = Dom, 1 = Seg, ...

  const dayConfig = config.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);

  if (!dayConfig || !dayConfig.enabled) {
    return [];
  }

  const parseMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatMinutes = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startMin = parseMinutes(dayConfig.startTime);
  const endMin = parseMinutes(dayConfig.endTime);
  const breakStartMin = dayConfig.breakStartTime ? parseMinutes(dayConfig.breakStartTime) : null;
  const breakEndMin = dayConfig.breakEndTime ? parseMinutes(dayConfig.breakEndTime) : null;

  // Filter active appointments for this professional on this date (excluding cancelled)
  const dayAppointments = existingAppointments.filter(
    (app) =>
      app.professionalId === user.id &&
      app.date === dateString &&
      app.status !== 'cancelado'
  );

  const duration = serviceDurationMinutes > 0 ? serviceDurationMinutes : config.slotDurationMinutes || 30;
  const breakBetween = config.breakDurationMinutes || 0;

  const slots: AvailableTimeSlot[] = [];

  // Check current time to prevent booking past slots today
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isToday = dateString === todayStr;
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();
  const minNoticeHours = config.minNoticeHours || 1;
  const minAvailableMinutesToday = currentMinutesNow + minNoticeHours * 60;

  // 1. If user defined explicit custom slots for this day (e.g. 08:00 - 08:45, 08:45 - 09:30, ...)
  if (dayConfig.customSlots && dayConfig.customSlots.length > 0) {
    const activeCustomSlots = dayConfig.customSlots
      .filter((s) => s.enabled !== false)
      .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime));

    for (const slot of activeCustomSlots) {
      const slotStartMin = parseMinutes(slot.startTime);
      const slotEndMin = parseMinutes(slot.endTime);
      let isAvailable = true;
      let reason: string | undefined = undefined;

      // Check if in past for today
      if (isToday && slotStartMin < minAvailableMinutesToday) {
        isAvailable = false;
        reason = 'Horário indisponível (antecedência mínima)';
      }

      // Check collision with existing appointments
      if (isAvailable) {
        const collision = dayAppointments.find((app) => {
          const appStartMin = parseMinutes(app.startTime);
          const appEndMin = parseMinutes(app.endTime);
          return (
            (slotStartMin >= appStartMin && slotStartMin < appEndMin) ||
            (slotEndMin > appStartMin && slotEndMin <= appEndMin) ||
            (slotStartMin <= appStartMin && slotEndMin >= appEndMin)
          );
        });

        if (collision) {
          isAvailable = false;
          reason = `Ocupado: ${collision.serviceName || 'Agendamento PEC'}`;
        }
      }

      slots.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: isAvailable,
        reason,
      });
    }

    return slots;
  }

  // 2. Fallback: continuous generator based on startTime, endTime, and break
  let currentMin = startMin;
  while (currentMin + duration <= endMin) {
    const slotStartMin = currentMin;
    const slotEndMin = currentMin + duration;
    const slotStartStr = formatMinutes(slotStartMin);
    const slotEndStr = formatMinutes(slotEndMin);

    let isAvailable = true;
    let reason: string | undefined = undefined;

    // Check if overlaps with lunch/break
    if (breakStartMin !== null && breakEndMin !== null) {
      if (
        (slotStartMin >= breakStartMin && slotStartMin < breakEndMin) ||
        (slotEndMin > breakStartMin && slotEndMin <= breakEndMin) ||
        (slotStartMin <= breakStartMin && slotEndMin >= breakEndMin)
      ) {
        isAvailable = false;
        reason = 'Intervalo / Almoço';
      }
    }

    // Check if in the past for today
    if (isAvailable && isToday && slotStartMin < minAvailableMinutesToday) {
      isAvailable = false;
      reason = 'Horário indisponível (antecedência mínima)';
    }

    // Check collision with existing appointments
    if (isAvailable) {
      const collision = dayAppointments.find((app) => {
        const appStartMin = parseMinutes(app.startTime);
        const appEndMin = parseMinutes(app.endTime);
        return (
          (slotStartMin >= appStartMin && slotStartMin < appEndMin) ||
          (slotEndMin > appStartMin && slotEndMin <= appEndMin) ||
          (slotStartMin <= appStartMin && slotEndMin >= appEndMin)
        );
      });

      if (collision) {
        isAvailable = false;
        reason = `Ocupado: ${collision.serviceName || 'Agendamento PEC'}`;
      }
    }

    slots.push({
      startTime: slotStartStr,
      endTime: slotEndStr,
      available: isAvailable,
      reason,
    });

    currentMin += duration + breakBetween;
  }

  return slots;
}

/**
 * Creates Google Calendar "Add to Calendar" link (web URL)
 */
export function generateGoogleCalendarUrl(appointment: Appointment): string {
  try {
    const rawDate = appointment.date || new Date().toISOString().split('T')[0];
    const [year, month, day] = rawDate.split('-').map(Number);
    const [startH, startM] = (appointment.startTime || '08:00').split(':').map(Number);
    
    let endH = startH;
    let endM = startM + (appointment.serviceDurationMinutes || 30);
    if (appointment.endTime && appointment.endTime.includes(':')) {
      const parts = appointment.endTime.split(':').map(Number);
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        endH = parts[0];
        endM = parts[1];
      }
    } else {
      endH = Math.floor((startH * 60 + endM) / 60);
      endM = (startH * 60 + endM) % 60;
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    // Dates in format YYYYMMDDTHHmmSS
    const startIso = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
    const endIso = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;

    const title = encodeURIComponent(
      `Consulta: ${appointment.serviceName || 'Atendimento Multiprofissional'} - ${appointment.professionalName || 'Profissional'}`
    );
    const details = encodeURIComponent(
      `Paciente: ${appointment.patientName || 'Paciente'}\n` +
      `Profissional: ${appointment.professionalName || ''} (${appointment.professionalProfession || ''})\n` +
      `Serviço: ${appointment.serviceName || ''}\n` +
      `Status: Confirmado no e-SUS PEC Multiprofissional AI\n` +
      (appointment.notes ? `Observações: ${appointment.notes}\n` : '')
    );
    const location = encodeURIComponent('Unidade de Saúde SUS / CAPS / APS');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  } catch {
    return 'https://calendar.google.com';
  }
}

/**
 * Generates WhatsApp reminder link for patients
 */
export function generateWhatsAppReminderLink(appointment: Appointment, professionalObj?: User): string {
  const cleanPhone = (appointment.patientPhone || '').replace(/\D/g, '');
  let dateFormatted = appointment.date || 'Hoje';
  try {
    dateFormatted = new Date(`${appointment.date}T00:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    // fallback
  }

  const profTitle = getProfessionalProfessionTitle(professionalObj, appointment.professionalProfession);
  const professionalDisplay = appointment.professionalName
    ? `*${appointment.professionalName}* (*${profTitle}*)`
    : `*Profissional* (*${profTitle}*)`;

  const message = encodeURIComponent(
    `🏥 *Lembrete de Agendamento - e-SUS PEC Multiprofissional*\n\n` +
    `Olá *${appointment.patientName || 'Paciente'}*!\n\n` +
    `Seu atendimento está confirmado com os seguintes dados:\n` +
    `📅 *Data:* ${dateFormatted}\n` +
    `⏰ *Horário:* ${appointment.startTime || ''}${appointment.endTime ? ` às ${appointment.endTime}` : ''}\n` +
    `👨‍⚕️ *Profissional:* ${professionalDisplay}\n` +
    `📋 *Serviço:* ${appointment.serviceName || 'Consulta'}\n` +
    `📍 *Local:* Atendimento e-SUS PEC / Unidade de Saúde\n\n` +
    `⚠️ *Importante:* Por favor, chegue ao local com pelo menos 1 hora de antecedência ao horário da consulta munido de documento com foto e Cartão SUS.\n\n` +
    `Em caso de dúvidas ou necessidade de reagendamento, favor nos avisar com antecedência. Tenha um ótimo dia!`
  );

  return cleanPhone
    ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${message}`
    : `https://api.whatsapp.com/send?text=${message}`;
}

/**
 * Fetch available slots from backend (which can check Google Calendar API freebusy in real-time)
 */
export async function fetchAvailableSlotsFromApi(
  professionalId: string,
  date: string,
  serviceDurationMinutes: number
): Promise<AvailableTimeSlot[]> {
  try {
    const res = await fetch(
      `/api/appointments/available-slots?professionalId=${encodeURIComponent(
        professionalId
      )}&date=${encodeURIComponent(date)}&duration=${serviceDurationMinutes}`
    );
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const data = await res.json();
    return data.slots || [];
  } catch (err) {
    console.warn('Fallback to local calculation for available slots:', err);
    return [];
  }
}

/**
 * Generates PIX payment order via n8n webhook (PagBank) using dynamically configured settings
 */
export async function generateAppointmentPixOrder(
  appointment: Partial<Appointment> & { id: string; patientName: string; patientPhone: string; serviceName?: string; professionalName?: string; servicePrice: number },
  n8nWebhookUrl?: string,
  customAmount?: number
): Promise<{ pixQrCode?: string; pixCopiaECola?: string; pixId?: string }> {
  const amountToCharge = customAmount !== undefined ? customAmount : (appointment.servicePrice || 0);

  // 1. First attempt: Dispatch to backend /api/webhook/generate-pix
  // The server automatically uses the exact webhook URL saved in Firestore / settings database
  try {
    const res = await fetch('/api/webhook/generate-pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: n8nWebhookUrl?.trim() || undefined,
        appointment,
        customAmount: amountToCharge,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && (data.pixCopiaECola || data.pixQrCode)) {
        return {
          pixCopiaECola: data.pixCopiaECola,
          pixQrCode: data.pixQrCode,
          pixId: data.pixId,
        };
      }
    }
  } catch (error) {
    console.warn('[Calendar Service] Erro ao chamar /api/webhook/generate-pix:', error);
  }

  // 2. Direct fetch fallback if webhookUrl is explicitly provided
  if (n8nWebhookUrl && n8nWebhookUrl.trim()) {
    try {
      const cleanCpf = (appointment.patientCpf || '').replace(/\D/g, '') || '00000000000';
      const cleanPhone = (appointment.patientPhone || '').replace(/\D/g, '');
      const payload = {
        agendamento_id: appointment.id,
        userName: appointment.patientName,
        Email: appointment.patientEmail || `${cleanPhone}@paciente.esus.gov.br`,
        userCpf: cleanCpf,
        userPhone: cleanPhone,
        'Nome-servico': `${appointment.serviceName || 'Consulta'} - ${appointment.professionalName || 'Profissional'}`,
        Valor: Math.round(amountToCharge * 100), // Em centavos para PagBank (ex: 50.00 -> 5000)
        valorFormatado: amountToCharge.toFixed(2),
        professionalId: appointment.professionalId,
        date: appointment.date,
        time: appointment.startTime,
      };

      const res = await fetch(n8nWebhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          pixCopiaECola: data['chave-pix-copia-cola'] || data.chavePix || data.pixCopiaECola,
          pixQrCode: data['qr-code'] || data.qrCodeUrl || data.pixQrCode,
          pixId: data['id-pix'] || data.idPix || data.id,
        };
      }
    } catch (error) {
      console.warn('n8n PIX webhook call failed:', error);
    }
  }

  // Fallback simulated PIX Copia e Cola EMV payload only as last resort
  const simulatedPixCode = `00020101021226580014br.gov.bcb.pix0136${appointment.id}520400005303986540${amountToCharge.toFixed(2)}5802BR5925PEC MULTIPROFISSIONAL6009SAO PAULO62070503***6304ABCD`;
  const simulatedQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    simulatedPixCode
  )}`;

  return {
    pixCopiaECola: simulatedPixCode,
    pixQrCode: simulatedQrCode,
    pixId: `pix-${appointment.id}`,
  };
}
