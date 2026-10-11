import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Trash2,
  RefreshCw,
  Phone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  UserCheck,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { Appointment, Patient, User, WhatsAppMessage, SystemSettings } from '../types';
import { buildWhatsAppReminderMessageText } from '../services/calendar';
import { getProfessionalProfessionTitle } from '../data/professions';
import {
  supabase,
  getWhatsAppMessagesFromDb,
  deleteWhatsAppMessageFromDb,
  clearWhatsAppHistoryFromDb,
  mapRawDbMessageToWhatsAppMessage,
  subscribeToWhatsAppMessagesRealtime,
} from '../services/supabase';

interface WhatsAppChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  patient?: Patient | null;
  currentUser: User | null;
  systemSettings: SystemSettings;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onAppointmentUpdated?: (updatedAppt: Appointment) => void;
  hideAutomaticReminder?: boolean;
}

function renderWhatsAppFormattedText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return part;
  });
}

export const WhatsAppChatModal: React.FC<WhatsAppChatModalProps> = ({
  isOpen,
  onClose,
  appointment,
  patient,
  currentUser,
  systemSettings,
  onShowToast,
  onAppointmentUpdated,
  hideAutomaticReminder = false,
}) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const effectivePatientPhone = appointment?.patientPhone || patient?.phone || '';
  const cleanPhone = effectivePatientPhone.replace(/\D/g, '');
  const patientName = appointment?.patientName || patient?.fullName || 'Paciente';
  const patientId = appointment?.patientId || patient?.id || '';
  const patientCpf = appointment?.patientCpf || patient?.cpf || '';
  const appointmentId = appointment?.id || '';

  const loadMessages = async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const data = await getWhatsAppMessagesFromDb({
        appointmentId: appointmentId || undefined,
        patientPhone: cleanPhone || undefined,
        patientId: patientId || undefined,
      });
      // Sort most recent first (da mais recente para a mais antiga)
      data.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      setMessages((prev) => {
        // Evita re-render se as mensagens forem idênticas
        if (
          prev.length === data.length &&
          prev.length > 0 &&
          prev[0]?.id === data[0]?.id &&
          prev[0]?.status === data[0]?.status
        ) {
          const hasDiff = prev.some(
            (p, i) =>
              p.id !== data[i]?.id ||
              p.status !== data[i]?.status ||
              p.messageText !== data[i]?.messageText
          );
          if (!hasDiff) return prev;
        }
        return data;
      });

      // Sincroniza se o paciente já respondeu
      const latestInbound = data.find((m) => m.direction === 'inbound' || m.status === 'replied');
      if (latestInbound && appointment) {
        if (!appointment.notifications?.hasReplied || appointment.notifications?.lastPatientReply !== latestInbound.messageText) {
          const updated = {
            ...appointment,
            notifications: {
              ...appointment.notifications,
              reminderSent: true,
              hasReplied: true,
              lastPatientReply: latestInbound.messageText,
              repliedAt: latestInbound.createdAt,
            },
          };
          if (onAppointmentUpdated) onAppointmentUpdated(updated);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar mensagens do WhatsApp:', err);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Carregamento inicial ao abrir o modal
    loadMessages(false);
    setConfirmClearAll(false);

    // 1. Ouvinte Realtime Supabase (WebSockets via Broadcast e Postgres CDC)
    const unsubRealtime = subscribeToWhatsAppMessagesRealtime((event) => {
      if (event.eventType === 'INSERT' && event.new) {
        const newMsg = event.message || mapRawDbMessageToWhatsAppMessage(event.new);
        const msgPhone = (newMsg.patientPhone || '').replace(/\D/g, '');
        const phoneMatch = Boolean(
          cleanPhone &&
          msgPhone &&
          (cleanPhone.endsWith(msgPhone.slice(-8)) || msgPhone.endsWith(cleanPhone.slice(-8)))
        );
        const idMatch = Boolean(
          appointmentId &&
          newMsg.appointmentId &&
          (newMsg.appointmentId === appointmentId ||
            newMsg.appointmentId === appointmentId.replace(/^queue_/, '') ||
            `queue_${newMsg.appointmentId}` === appointmentId)
        );
        const patIdMatch = Boolean(
          patientId &&
          newMsg.patientId &&
          newMsg.patientId === patientId
        );

        if (idMatch || phoneMatch || patIdMatch) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });

          if (appointment && (newMsg.direction === 'inbound' || newMsg.status === 'replied')) {
            if (onAppointmentUpdated) {
              onAppointmentUpdated({
                ...appointment,
                notifications: {
                  ...appointment.notifications,
                  reminderSent: true,
                  hasReplied: true,
                  lastPatientReply: {
                    message: newMsg.messageText,
                    repliedAt: newMsg.createdAt,
                    senderName: newMsg.senderName || patientName,
                  },
                },
              });
            }
          }
          return;
        }
      }

      if (event.eventType === 'DELETE' && event.old) {
        setMessages((prev) => prev.filter((m) => m.id !== event.old.id));
        return;
      }

      // Reconciliação silenciosa
      loadMessages(true);
    });

    // 2. Intervalo de Sincronização em Segundo Plano (Failsafe silencioso a cada 3.5 segundos enquanto o modal estiver aberto)
    // Garante que mesmo que o n8n grave diretamente no banco sem emitir evento WebSocket, a tela atualize sem piscar
    const silentSyncInterval = setInterval(() => {
      loadMessages(true);
    }, 3500);

    return () => {
      unsubRealtime();
      clearInterval(silentSyncInterval);
    };
  }, [isOpen, appointmentId, patientId, cleanPhone]);

  if (!isOpen) return null;

  // Enviar Lembrete Oficial via Webhook do n8n com template e carimbo do usuário logado
  const handleSendOfficialReminder = async () => {
    if (!appointment) {
      onShowToast('info', 'O envio de lembrete oficial requer agendamento ativo.', 'Lembrete Oficial');
      return;
    }
    if (!cleanPhone) {
      onShowToast('error', 'O paciente não possui número de telefone cadastrado.', 'Sem Telefone');
      return;
    }

    setIsSendingReminder(true);
    try {
      const messageText = buildWhatsAppReminderMessageText(
        appointment,
        undefined,
        currentUser,
        systemSettings.defaultUnitName
      );

      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const callbackUrl = `${window.location.origin}/api/appointments/button-action-callback`;

      const fullName = (currentUser?.name || '').trim();
      const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
      const firstName = nameParts.length > 0 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;
      const professionTitle = currentUser
        ? getProfessionalProfessionTitle(currentUser, currentUser.profession) || currentUser.profession
        : '';
      const unitLotacao = currentUser?.workplace || systemSettings.defaultUnitName || 'Unidade de Atendimento e-SUS PEC';

      const enrichedSenderUser = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
            firstName,
            lastName,
            primeiroNome: firstName,
            ultimoNome: lastName,
            primeiroEUltimoNome: firstName && lastName && firstName !== lastName ? `${firstName} ${lastName}` : firstName,
            profession: currentUser.profession,
            professionTitle,
            especialidade: currentUser.specialty || professionTitle,
            profissao: professionTitle,
            workplace: unitLotacao,
            unidadeLotacao: unitLotacao,
            unidade: unitLotacao,
          }
        : undefined;

      // Dispara exclusivamente para o backend e n8n (sem gravar no banco pelo CRM; gravação é exclusiva do n8n)
      const res = await fetch('/api/appointments/notify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'appointment_reminder',
          appointmentId: appointment.id,
          patientPhone: fullPhone || cleanPhone,
          messageText,
          senderUser: enrichedSenderUser,
          perfil_interacao: 'automatica',
          interaction_type: 'automatic',
          interaction_mode: 'automated_template',
          origem_mensagem: 'template_pre_construido',
          descricao_perfil: 'Mensagem automática disparada via template pré-construído',
          is_automatic: true,
          is_automated: true,
          is_human: false,
          is_humanized: false,
          is_manual: false,
          message_type: 'template',
          sender_type: 'system',
          webhookUrl: systemSettings.n8nAppointmentWebhookUrl || 'https://n8n.mentoriajrs.com/webhook/pec-caps-lembrete',
          evolutionApiUrl: systemSettings.evolutionApiUrl,
          evolutionApiKey: systemSettings.evolutionApiKey,
          evolutionInstanceName: systemSettings.evolutionInstanceName,
          callback_url: callbackUrl,
          button_action_callback: callbackUrl,
          pec_api_url: window.location.origin,
          pec_callback_route: '/api/appointments/button-action-callback',
          replyWebhookUrl: callbackUrl,
          whatsappEnabled: systemSettings.whatsappNotificationsEnabled !== false,
          payload: {
            patient: {
              name: appointment.patientName,
              phone: fullPhone || cleanPhone,
              cpf: appointment.patientCpf,
            },
            appointment: {
              id: appointment.id,
              date: appointment.date,
              startTime: appointment.startTime,
              endTime: appointment.endTime,
              serviceName: appointment.serviceName,
              professionalName: appointment.professionalName,
            },
            messageText,
            suggestedMessage: messageText,
            senderUser: enrichedSenderUser,
            usuarioLogado: enrichedSenderUser,
            perfil_interacao: 'automatica',
            interaction_type: 'automatic',
            origem_mensagem: 'template_pre_construido',
            is_automatic: true,
            is_human: false,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        onShowToast('success', 'Lembrete enviado ao webhook do n8n com sucesso!', 'Lembrete Disparado');
        // Update local appointment state
        const updated = {
          ...appointment,
          notifications: {
            ...appointment.notifications,
            reminderSent: true,
            reminderSentAt: Date.now(),
            hasReplied: false,
          },
        };
        if (onAppointmentUpdated) onAppointmentUpdated(updated);
        // O Supabase Realtime receberá a inserção gravada pelo n8n; reconciliação como redundância:
        setTimeout(() => { loadMessages(true); }, 1500);
        setTimeout(() => { loadMessages(true); }, 3500);
      } else {
        onShowToast('error', data.error || 'Falha ao disparar lembrete via webhook.', 'Erro no Envio');
      }
    } catch (err: any) {
      onShowToast('error', err?.message || 'Falha ao enviar lembrete.', 'Erro');
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Envio de Mensagem Personalizada Humanizada (disparada ao n8n sem duplicidade)
  const handleSendCustomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    setIsSendingCustom(true);
    try {
      const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
      const textToSend = customText.trim();

      const fullName = (currentUser?.name || '').trim();
      const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
      const firstName = nameParts.length > 0 ? nameParts[0] : '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : firstName;
      const professionTitle = currentUser
        ? getProfessionalProfessionTitle(currentUser, currentUser.profession) || currentUser.profession
        : '';
      const unitLotacao = currentUser?.workplace || systemSettings.defaultUnitName || 'Unidade de Atendimento e-SUS PEC';

      const enrichedSenderUser = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
            firstName,
            lastName,
            primeiroNome: firstName,
            ultimoNome: lastName,
            primeiroEUltimoNome: firstName && lastName && firstName !== lastName ? `${firstName} ${lastName}` : firstName,
            profession: currentUser.profession,
            professionTitle,
            especialidade: currentUser.specialty || professionTitle,
            profissao: professionTitle,
            workplace: unitLotacao,
            unidadeLotacao: unitLotacao,
            unidade: unitLotacao,
          }
        : undefined;

      const res = await fetch('/api/whatsapp/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointmentId || undefined,
          patientPhone: fullPhone || cleanPhone,
          patientName,
          patientId: patientId || undefined,
          messageText: textToSend,
          senderUser: enrichedSenderUser,
          perfil_interacao: 'humanizada',
          interaction_type: 'human',
          interaction_mode: 'humanized_crm',
          origem_mensagem: 'interacao_humanizada_crm',
          descricao_perfil: 'Mensagem oriunda de interação humanizada através do CRM',
          is_automatic: false,
          is_automated: false,
          is_human: true,
          is_humanized: true,
          is_manual: true,
          message_type: 'text',
          sender_type: 'professional',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setCustomText('');
        onShowToast('success', 'Mensagem humanizada enviada com sucesso ao n8n.', 'Mensagem Enviada');
        // O Supabase Realtime receberá a inserção gravada pelo n8n; reconciliação como redundância:
        setTimeout(() => { loadMessages(true); }, 1500);
        setTimeout(() => { loadMessages(true); }, 3500);
      } else {
        onShowToast('error', data?.error || 'Erro ao enviar mensagem ao n8n.', 'Erro');
      }
    } catch {
      onShowToast('error', 'Erro ao disparar mensagem.', 'Erro');
    } finally {
      setIsSendingCustom(false);
    }
  };

  // Excluir Mensagem Individual
  const handleDeleteSingle = async (msgId: string) => {
    setDeletingId(msgId);
    try {
      const success = await deleteWhatsAppMessageFromDb(msgId);
      if (success) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        onShowToast('info', 'Mensagem excluída do histórico.', 'Excluída');
      } else {
        onShowToast('error', 'Não foi possível excluir a mensagem.', 'Erro');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Excluir Todo o Histórico
  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      const success = await clearWhatsAppHistoryFromDb({
        appointmentId: appointmentId || undefined,
        patientPhone: cleanPhone,
        patientId: patientId || undefined,
      });

      if (success) {
        setMessages([]);
        setConfirmClearAll(false);
        onShowToast('info', 'Todo o histórico de conversa foi excluído do Supabase.', 'Histórico Limpo');
        if (appointment) {
          const updated = {
            ...appointment,
            notifications: {
              ...appointment.notifications,
              reminderSent: false,
              hasReplied: false,
              lastPatientReply: undefined,
            },
          };
          if (onAppointmentUpdated) onAppointmentUpdated(updated);
        }
      } else {
        onShowToast('error', 'Erro ao limpar histórico no banco de dados.', 'Erro');
      }
    } finally {
      setIsClearingAll(false);
    }
  };

  const latestInbound = messages.find((m) => m.direction === 'inbound' || m.status === 'replied');
  const hasReplied = Boolean(appointment?.notifications?.hasReplied || latestInbound);
  const isReminderSent = Boolean(appointment?.notifications?.reminderSent || messages.some((m) => m.direction === 'outbound'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-2xl flex items-center justify-center ${
              hasReplied
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30'
                : isReminderSent
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/30'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
            }`}>
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  CRM WhatsApp: {patientName}
                </h3>
                {hasReplied ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1 shrink-0 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" />
                    Respondido
                  </span>
                ) : isReminderSent ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1 shrink-0 animate-pulse">
                    <Clock className="w-3 h-3" />
                    Aguardando Resposta
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                    Não Enviado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span>WhatsApp: {effectivePatientPhone || 'Não informado'}</span>
                {appointment?.date && appointment?.startTime ? (
                  <>
                    <span>•</span>
                    <span>Consulta: {appointment.date} às {appointment.startTime}</span>
                  </>
                ) : patientCpf ? (
                  <>
                    <span>•</span>
                    <span>CPF: {patientCpf}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs"
              title="Conectado ao Supabase Realtime (WebSockets) com sincronização em segundo plano"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 -ml-3" />
              <span>Ao Vivo</span>
            </span>
            <button
              type="button"
              onClick={() => loadMessages(false)}
              disabled={isLoading}
              title="Recarregar histórico manualmente"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas (Disparar Lembrete Oficial & Limpar Histórico) */}
        <div className="px-4 py-3 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {!hideAutomaticReminder && appointment && (
              <button
                type="button"
                onClick={handleSendOfficialReminder}
                disabled={isSendingReminder}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSendingReminder ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Disparar Lembrete Oficial (n8n)</span>
              </button>
            )}

            {cleanPhone && (
              <a
                href={`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(
                  appointment
                    ? buildWhatsAppReminderMessageText(appointment, undefined, currentUser, systemSettings.defaultUnitName)
                    : `Olá, ${patientName}!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                title="Abrir WhatsApp Web diretamente"
              >
                <ExternalLink className="w-3 h-3 text-emerald-600" />
                <span>WhatsApp Web</span>
              </a>
            )}
          </div>

          <div>
            {confirmClearAll ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">Apagar tudo?</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isClearingAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-xs disabled:opacity-50"
                >
                  {isClearingAll ? 'Apagando...' : 'Sim, Excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                disabled={messages.length === 0}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-30 cursor-pointer"
                title="Apagar todo o histórico desta conversa no banco de dados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Apagar Todo o Histórico</span>
              </button>
            )}
          </div>
        </div>

        {/* Lista de Mensagens: Ordem da mais recente (topo) para mais antiga */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Histórico de Mensagens (Da mais recente para mais antiga)
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-semibold">Carregando histórico do Supabase...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-slate-400 p-4">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Nenhuma mensagem registrada.
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                {hideAutomaticReminder
                  ? 'Digite uma mensagem humanizada abaixo para iniciar a conversa com o paciente via CRM.'
                  : 'Clique no botão verde acima para disparar o lembrete oficial via webhook ou digite uma mensagem abaixo.'}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOutbound = msg.direction === 'outbound';
              const formattedDate = new Date(msg.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isOutbound ? 'items-start' : 'items-end'} group`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-xs border relative ${
                      isOutbound
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                        : 'bg-blue-600 text-white border-blue-500 rounded-tr-xs'
                    }`}
                  >
                    {/* Cabeçalho da Mensagem */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 border-b pb-1 border-black/10 dark:border-white/10 text-[10px]">
                      <div className="flex items-center gap-1 font-bold">
                        {isOutbound ? (
                          <>
                            <Bot className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {msg.senderName || 'Sistema / PEC'}
                            </span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3 text-blue-100" />
                            <span className="text-blue-100">
                              {msg.senderName || appointment.patientName} (Paciente)
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 opacity-80">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>

                    {/* Conteúdo da Mensagem */}
                    <div className="text-xs whitespace-pre-wrap leading-relaxed font-sans">
                      {renderWhatsAppFormattedText(msg.messageText)}
                    </div>

                    {/* Ação de Excluir Mensagem Individual */}
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(msg.id)}
                        disabled={deletingId === msg.id}
                        className={`text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors opacity-70 hover:opacity-100 ${
                          isOutbound
                            ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-blue-100 hover:text-white hover:bg-blue-700'
                        }`}
                        title="Apagar esta mensagem individual"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{deletingId === msg.id ? 'Apagando...' : 'Apagar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé: Envio Manual de Mensagem no CRM */}
        <form
          onSubmit={handleSendCustomMessage}
          className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Digite uma nova mensagem para enviar ao paciente..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={isSendingCustom || !customText.trim()}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSendingCustom ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Enviar</span>
          </button>
        </form>

      </div>
    </div>
  );
};
