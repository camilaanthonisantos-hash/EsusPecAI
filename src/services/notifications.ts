import { Appointment, PixTransactionRecord, SystemSettings } from '../types';

export type NotificationEventType =
  | 'pix_created'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'reminder_daily'
  | 'reminder_30m'
  | 'reminder_10m';

export interface NotificationButtonPayload {
  id: string;
  label: string;
  action: 'cancel' | 'reschedule' | 'help';
}

export interface NotificationPayload {
  event: NotificationEventType;
  timestamp: number;
  appointmentId: string;
  instance?: string;
  patient: {
    name: string;
    phone: string;
    phoneWhatsApp: string; // E.164 without '+' (e.g. 5511999998888)
    cpf?: string;
    cns?: string;
    email?: string;
  };
  appointment: {
    id: string;
    date: string; // YYYY-MM-DD
    dateFormatted: string; // DD/MM/YYYY
    startTime: string; // HH:mm
    endTime?: string;
    timeFormatted: string;
    professionalId?: string;
    professionalName: string;
    professionalProfession?: string;
    serviceName: string;
    servicePrice: number;
    servicePriceFormatted: string;
    location: string;
    status: string;
    notes?: string;
    hoursUntilAppointment?: number;
  };
  pix?: {
    copiaECola?: string;
    qrCode?: string;
    pixId?: string;
    amount: number;
    amountFormatted: string;
    expiresAt?: number;
    expiresAtFormatted?: string;
  };
  buttons: NotificationButtonPayload[];
  suggestedMessage: string;
}

/**
 * Normaliza e formata o telefone para o padrão WhatsApp Brasileiro (DDI 55 + DDD + 9 dígitos)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');

  // Se começou com 0, remove o zero inicial
  if (clean.startsWith('0')) {
    clean = clean.substring(1);
  }

  // Se já tem DDI 55
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    return clean;
  }

  // Se tem apenas DDD + Número (10 ou 11 dígitos)
  if (clean.length === 10 || clean.length === 11) {
    return `55${clean}`;
  }

  // Retorna como está se não bater nos padrões
  return clean ? `55${clean}` : '';
}

export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatCurrencyBRL(amount?: number): string {
  const val = Number(amount || 0);
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Constrói o payload completo estruturado para envio ao n8n e Evolution API
 */
export function buildNotificationPayload(
  event: NotificationEventType,
  data: {
    appointment?: Partial<Appointment>;
    pixOrder?: Partial<PixTransactionRecord>;
    unitName?: string;
    instance?: string;
  }
): NotificationPayload {
  const { appointment, pixOrder, unitName = 'Unidade de Atendimento de Saúde', instance = 'Typebot_curso_tec' } = data;

  const apptId = appointment?.id || pixOrder?.id || `app-${Date.now()}`;
  const patientName = appointment?.patientName || pixOrder?.patientName || 'Paciente';
  const rawPhone = appointment?.patientPhone || pixOrder?.patientPhone || '';
  const phoneWhatsApp = formatPhoneForWhatsApp(rawPhone);
  const patientCpf = appointment?.patientCpf || pixOrder?.patientCpf;
  const patientEmail = appointment?.patientEmail || pixOrder?.patientEmail;

  const rawDate = appointment?.date || pixOrder?.date || '';
  const dateFormatted = formatDateBR(rawDate);
  const startTime = appointment?.startTime || pixOrder?.startTime || '00:00';
  const endTime = appointment?.endTime || pixOrder?.endTime || '';
  const professionalName = appointment?.professionalName || pixOrder?.professionalName || 'Profissional de Saúde';
  const serviceName = appointment?.serviceName || pixOrder?.serviceName || 'Consulta / Atendimento';
  const price = appointment?.servicePrice ?? pixOrder?.servicePrice ?? pixOrder?.amount ?? 0;
  const priceFormatted = formatCurrencyBRL(price);

  // Calculate hours until appointment
  let hoursUntil = 0;
  if (rawDate && startTime) {
    try {
      const apptTimestamp = new Date(`${rawDate}T${startTime}:00`).getTime();
      hoursUntil = Math.max(0, (apptTimestamp - Date.now()) / (1000 * 60 * 60));
    } catch {
      // ignore
    }
  }

  // Action buttons (Cancel, Reschedule, Questions)
  const buttons: NotificationButtonPayload[] = [
    {
      id: `btn_cancelar_${apptId}`,
      label: '❌ Cancelar',
      action: 'cancel',
    },
    {
      id: `btn_reagendar_${apptId}`,
      label: '🔄 Reagendar',
      action: 'reschedule',
    },
    {
      id: `btn_duvidas_${apptId}`,
      label: '❓ Dúvidas',
      action: 'help',
    },
  ];

  // Build suggested message based on event
  let suggestedMessage = '';

  switch (event) {
    case 'pix_created': {
      const copiaCola = pixOrder?.pixCopiaECola || appointment?.pixCopiaECola || '';
      suggestedMessage =
        `Olá, *${patientName}*! 👋\n\n` +
        `Recebemos sua solicitação de agendamento para *${serviceName}* com *${professionalName}* no dia *${dateFormatted} às ${startTime}*.\n\n` +
        `⏳ Para garantir sua vaga, realize o pagamento via PIX no valor de *${priceFormatted}* em até 30 minutos.\n\n` +
        `🔑 *Código PIX Copia e Cola:*\n\`${copiaCola}\`\n\n` +
        `_Assim que o pagamento for aprovado, você receberá a confirmação definitiva por aqui!_`;
      break;
    }

    case 'appointment_confirmed': {
      suggestedMessage =
        `✅ *Agendamento Confirmado com Sucesso!*\n\n` +
        `Olá, *${patientName}*, seu atendimento foi agendado:\n\n` +
        `📅 *Data:* ${dateFormatted}\n` +
        `⏰ *Horário:* ${startTime}${endTime ? ` às ${endTime}` : ''}\n` +
        `👨‍⚕️ *Profissional:* ${professionalName}\n` +
        `🩺 *Serviço:* ${serviceName}\n` +
        `📍 *Local:* ${unitName}\n\n` +
        `⚠️ *Importante:* Chegue com pelo menos 1 hora de antecedência ao horário da consulta munido de documento oficial com foto e Cartão SUS.\n\n` +
        `Caso precise cancelar ou alterar a data, utilize os botões abaixo:`;
      break;
    }

    case 'reminder_daily': {
      suggestedMessage =
        `🔔 *Lembrete de Consulta*\n\n` +
        `Olá, *${patientName}*! Lembramos que você possui um agendamento:\n\n` +
        `🗓️ *Data:* ${dateFormatted} às *${startTime}*\n` +
        `👨‍⚕️ *Profissional:* ${professionalName}\n` +
        `🩺 *Serviço:* ${serviceName}\n` +
        `📍 *Local:* ${unitName}\n\n` +
        `⚠️ *Importante:* Por favor, chegue com pelo menos 1 hora de antecedência ao horário da consulta munido de documento oficial com foto e Cartão SUS.\n\n` +
        `Por favor, confirme se comparecerá utilizando os botões abaixo:`;
      break;
    }

    case 'reminder_30m': {
      suggestedMessage =
        `⏳ *Sua consulta é em 30 minutos!*\n\n` +
        `Olá, *${patientName}*, seu atendimento com *${professionalName}* começará às *${startTime}*.\n` +
        `Já estamos preparando tudo para receber você na ${unitName}.\n\n` +
        `Utilize os botões abaixo caso necessite de suporte:`;
      break;
    }

    case 'reminder_10m': {
      suggestedMessage =
        `⏰ *Atenção: Sua consulta inicia em 10 minutos!*\n\n` +
        `Olá, *${patientName}*, por favor apresente-se à recepção da ${unitName} para o acolhimento com *${professionalName}*.\n\n` +
        `Agradecemos a sua pontualidade!`;
      break;
    }

    case 'appointment_cancelled': {
      suggestedMessage =
        `⚠️ *Agendamento Cancelado*\n\n` +
        `Olá, *${patientName}*, seu agendamento para o dia *${dateFormatted} às ${startTime}* com *${professionalName}* foi cancelado.\n\n` +
        `Se desejar agendar uma nova data, basta entrar em contato novamente ou acessar o portal.`;
      break;
    }

    case 'appointment_rescheduled': {
      suggestedMessage =
        `🔄 *Agendamento Reagendado*\n\n` +
        `Olá, *${patientName}*, seu atendimento foi remarcado para o dia *${dateFormatted} às ${startTime}* com *${professionalName}*.\n\n` +
        `Estamos à disposição!`;
      break;
    }
  }

  return {
    event,
    timestamp: Date.now(),
    appointmentId: apptId,
    instance,
    patient: {
      name: patientName,
      phone: rawPhone,
      phoneWhatsApp,
      cpf: patientCpf,
      cns: appointment?.patientCns,
      email: patientEmail,
    },
    appointment: {
      id: apptId,
      date: rawDate,
      dateFormatted,
      startTime,
      endTime,
      timeFormatted: `${startTime}${endTime ? ` - ${endTime}` : ''}`,
      professionalId: appointment?.professionalId || pixOrder?.professionalId,
      professionalName,
      professionalProfession: appointment?.professionalProfession,
      serviceName,
      servicePrice: price,
      servicePriceFormatted: priceFormatted,
      location: unitName,
      status: appointment?.status || 'agendado',
      notes: appointment?.notes,
      hoursUntilAppointment: Math.round(hoursUntil * 10) / 10,
    },
    pix: pixOrder?.pixCopiaECola || appointment?.pixCopiaECola
      ? {
          copiaECola: pixOrder?.pixCopiaECola || appointment?.pixCopiaECola,
          qrCode: pixOrder?.pixQrCode || appointment?.pixQrCode,
          pixId: pixOrder?.pixId || appointment?.pixId,
          amount: price,
          amountFormatted: priceFormatted,
          expiresAt: pixOrder?.expiresAt,
          expiresAtFormatted: pixOrder?.expiresAt ? new Date(pixOrder.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
        }
      : undefined,
    buttons,
    suggestedMessage,
  };
}

/**
 * Dispara o evento de notificação através da rota do servidor e/ou webhook direto do n8n
 */
export async function dispatchAppointmentNotification(
  event: NotificationEventType,
  data: {
    appointment?: Partial<Appointment>;
    pixOrder?: Partial<PixTransactionRecord>;
  },
  settings?: Partial<SystemSettings>
): Promise<{ success: boolean; message: string; payload: NotificationPayload }> {
  const payload = buildNotificationPayload(event, {
    ...data,
    unitName: settings?.defaultUnitName || 'Unidade de Atendimento e-SUS PEC',
    instance: settings?.evolutionInstanceName || 'Typebot_curso_tec',
  });

  try {
    // 1. Dispatch to server-side notification router
    const response = await fetch('/api/appointments/notify-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        payload,
        webhookUrl: settings?.n8nAppointmentWebhookUrl,
        whatsappEnabled: settings?.whatsappNotificationsEnabled !== false,
      }),
    });

    if (response.ok) {
      const resJson = await response.json();
      return {
        success: true,
        message: resJson.message || 'Notificação enviada com sucesso.',
        payload,
      };
    } else {
      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errJson.error || `Erro HTTP ${response.status} ao disparar notificação.`,
        payload,
      };
    }
  } catch (err: any) {
    console.warn(`[Notification Dispatch] Erro ao despachar notificação ${event}:`, err);
    return {
      success: false,
      message: err?.message || 'Falha de conexão ao enviar notificação.',
      payload,
    };
  }
}
