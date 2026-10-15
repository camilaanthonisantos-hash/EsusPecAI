import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Phone,
  Search,
  Plus,
  Settings,
  Link,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Trash2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  CalendarCheck,
  Eye,
  Filter,
  DollarSign,
  QrCode,
  FileSpreadsheet,
  Users,
  Lock,
} from 'lucide-react';
import { User, Appointment, AppointmentStatus, Patient, ProfessionId, SystemSettings } from '../types';
import {
  PROFESSIONS,
  isUserAdmin,
  DEFAULT_SYSTEM_SETTINGS,
} from '../data/professions';
import { updateAppointmentStatusInFirestore, deleteAppointmentFromFirestore } from '../services/firebase';
import {
  generateGoogleCalendarUrl,
  generateWhatsAppReminderLink,
  isProfessionalAvailableForBooking,
} from '../services/calendar';
import { SpecularButton } from './SpecularButton';
import { WhatsAppChatModal } from './WhatsAppChatModal';

interface AppointmentsManagementViewProps {
  currentUser: User | null;
  professionals: User[];
  appointments: Appointment[];
  patients: Patient[];
  systemSettings?: SystemSettings;
  onOpenScheduleSettings: (targetUser?: User, initialTab?: 'schedule' | 'services' | 'calendar_sync') => void;
  onOpenPublicPortal: (userId?: string) => void;
  onStartConsultationForPatient: (appointment: Appointment) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onAddUser?: (user: User) => Promise<void> | void;
  onDeleteAppointment?: (appointmentId: string) => Promise<void> | void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: AppointmentStatus) => Promise<void> | void;
  onAppointmentUpdated?: (updatedAppt: Appointment) => void;
}

export const AppointmentsManagementView: React.FC<AppointmentsManagementViewProps> = ({
  currentUser,
  professionals,
  appointments,
  patients,
  systemSettings = DEFAULT_SYSTEM_SETTINGS,
  onOpenScheduleSettings,
  onOpenPublicPortal,
  onStartConsultationForPatient,
  onShowToast,
  onAddUser,
  onDeleteAppointment,
  onUpdateAppointmentStatus,
  onAppointmentUpdated,
}) => {
  const isAdmin = Boolean(currentUser && isUserAdmin(currentUser));

  // WhatsApp CRM chat modal state
  const [selectedChatAppointment, setSelectedChatAppointment] = useState<Appointment | null>(null);
  const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);

  // Deletion modal state
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Date filter: 'today' | 'tomorrow' | 'week' | 'month' | 'all' | 'past'
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'week' | 'month' | 'all' | 'past'>('today');
  const [professionalFilter, setProfessionalFilter] = useState<string>(() => {
    // If admin or administrative, default to 'all' so they manage the full schedule
    if (currentUser && (isUserAdmin(currentUser) || currentUser.profession === 'administrativo')) {
      return 'all';
    }
    if (currentUser) {
      return currentUser.id;
    }
    return 'all';
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      // 1. Professional Filter
      if (professionalFilter !== 'all' && app.professionalId !== professionalFilter) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false;
      }

      // 3. Date Filter
      const appDate = app.date;
      if (dateFilter === 'today' && appDate !== todayStr) return false;
      if (dateFilter === 'tomorrow' && appDate !== tomorrowStr) return false;
      if (dateFilter === 'past' && appDate >= todayStr) return false;
      if (dateFilter === 'week') {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const appD = new Date(`${appDate}T00:00:00`);
        if (appD < new Date(`${todayStr}T00:00:00`) || appD > nextWeek) return false;
      }
      if (dateFilter === 'month') {
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);
        const appD = new Date(`${appDate}T00:00:00`);
        if (appD < new Date(`${todayStr}T00:00:00`) || appD > nextMonth) return false;
      }

      // 4. Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.patientName?.toLowerCase().includes(q);
        const matchPhone = app.patientPhone?.includes(q);
        const matchCpf = app.patientCpf?.includes(q);
        const matchService = app.serviceName?.toLowerCase().includes(q);
        const matchProf = app.professionalName?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCpf && !matchService && !matchProf) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, professionalFilter, statusFilter, dateFilter, searchQuery, todayStr, tomorrowStr]);

  // Statistics
  const stats = useMemo(() => {
    const todayApps = appointments.filter((a) => a.date === todayStr);
    return {
      todayTotal: todayApps.length,
      todayScheduled: todayApps.filter((a) => a.status === 'agendado').length,
      todayInAttendance: todayApps.filter((a) => a.status === 'em_atendimento').length,
      todayFinished: todayApps.filter((a) => a.status === 'finalizado').length,
      todayCancelled: todayApps.filter((a) => a.status === 'cancelado').length,
      totalCount: appointments.length,
    };
  }, [appointments, todayStr]);

  // Status Change Handlers
  const handleUpdateStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      if (onUpdateAppointmentStatus) {
        await onUpdateAppointmentStatus(appointmentId, newStatus);
      } else {
        await updateAppointmentStatusInFirestore(appointmentId, newStatus);
        const labels: Record<AppointmentStatus, string> = {
          agendado: 'Marcado como Agendado',
          em_atendimento: 'Em Atendimento Clínico',
          finalizado: 'Atendimento Finalizado',
          cancelado: 'Agendamento Cancelado / Desistência',
        };
        onShowToast('success', labels[newStatus], 'Status Atualizado');
      }
    } catch (err) {
      onShowToast('error', 'Falha ao atualizar status.', 'Erro');
    }
  };

  // Delete Handler with Modal Confirmation
  const handleDeleteAppointmentClick = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
  };

  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;
    setIsDeleting(true);
    try {
      if (onDeleteAppointment) {
        await onDeleteAppointment(appointmentToDelete.id);
      } else {
        await deleteAppointmentFromFirestore(appointmentToDelete.id);
        onShowToast('info', `Agendamento de "${appointmentToDelete.patientName}" excluído com sucesso.`, 'Agendamento Excluído');
      }
      setAppointmentToDelete(null);
    } catch (err) {
      onShowToast('error', 'Falha ao excluir agendamento do banco de dados.', 'Erro na Exclusão');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboardSafe = async (text: string, successMsg: string, title = 'Link Copiado') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      onShowToast('success', successMsg, title);
    } catch {
      onShowToast('info', `Link gerado: ${text}`, 'Compartilhar Link');
    }
  };

  const handleCopyUnitPublicLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?portal=agendar`;
    copyToClipboardSafe(url, 'Link público geral da unidade copiado! Qualquer cidadão pode agendar sem login.');
  };

  const handleCopyMyPublicLink = () => {
    const targetId = currentUser ? currentUser.id : professionals[0]?.id;
    if (!targetId) return;
    const url = `${window.location.origin}${window.location.pathname}?portal=agendar&userId=${encodeURIComponent(
      targetId
    )}`;
    copyToClipboardSafe(url, 'Link copiado! Seu perfil virá selecionado, com opção de trocar de profissional.');
  };

  const handleCopyProfessionalLink = (targetId: string, profName: string) => {
    const url = `${window.location.origin}${window.location.pathname}?portal=agendar&userId=${encodeURIComponent(
      targetId
    )}`;
    copyToClipboardSafe(url, `Link de agendamento de ${profName} copiado com sucesso!`);
  };

  const handleWhatsAppClick = (e: React.MouseEvent, app: Appointment) => {
    const clean = (app.patientPhone || '').replace(/\D/g, '');
    if (!clean) {
      e.preventDefault();
      onShowToast('info', `O paciente "${app.patientName}" não possui número de telefone cadastrado neste agendamento.`, 'Telefone Ausente');
    }
  };

  return (
    <div id="appointments-management-view" className="space-y-5">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Central de Agendamentos & Grade Clínica
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 text-[10px] font-extrabold border border-teal-200 dark:border-teal-800">
                  Google Calendar & n8n
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-800">
                  Link 100% Público aos Cidadãos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie a fila de pacientes, horários de atendimento e sincronização bidirecional
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <SpecularButton
              type="button"
              onClick={handleCopyUnitPublicLink}
              size="sm"
              radius={12}
              className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-xs font-bold border border-teal-200 dark:border-teal-800"
              title="Copiar link geral da unidade (cidadão escolhe qualquer profissional sem precisar de login)"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copiar Link Geral
            </SpecularButton>

            <SpecularButton
              type="button"
              onClick={handleCopyMyPublicLink}
              size="sm"
              radius={12}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold"
              title="Copiar link direto para sua agenda pública (sem login para o cidadão)"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copiar Meu Link
            </SpecularButton>

            <SpecularButton
              type="button"
              onClick={() => onOpenPublicPortal(undefined)}
              size="sm"
              radius={12}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20"
              title="Acessar o portal de agendamento para realizar novos agendamentos"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Ver Portal Público
            </SpecularButton>

            {currentUser && (
              <SpecularButton
                type="button"
                onClick={() => onOpenScheduleSettings(currentUser)}
                size="sm"
                radius={12}
                className="bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300 hover:bg-slate-200 text-xs font-bold border border-teal-200 dark:border-teal-800/80"
              >
                <Settings className="w-3.5 h-3.5 mr-1" />
                Minha Grade
              </SpecularButton>
            )}
          </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Hoje</span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {stats.todayTotal}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">Agendados</span>
            <span className="text-lg sm:text-xl font-black text-blue-800 dark:text-blue-200 font-mono">
              {stats.todayScheduled}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900">
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase block">Em Atendimento</span>
            <span className="text-lg sm:text-xl font-black text-amber-800 dark:text-amber-200 font-mono">
              {stats.todayInAttendance}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">Concluídos</span>
            <span className="text-lg sm:text-xl font-black text-emerald-800 dark:text-emerald-200 font-mono">
              {stats.todayFinished}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase block">Desistências / Falta</span>
            <span className="text-lg sm:text-xl font-black text-rose-800 dark:text-rose-200 font-mono">
              {stats.todayCancelled}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Date Quick Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'tomorrow', label: 'Amanhã' },
              { id: 'week', label: 'Próximos 7 Dias' },
              { id: 'month', label: 'Próximos 30 Dias' },
              { id: 'all', label: 'Todos' },
              { id: 'past', label: 'Passados' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === tab.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar paciente, CPF, serviço..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">Profissional:</span>
            <select
              value={professionalFilter}
              onChange={(e) => setProfessionalFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="all">Todos os Profissionais</option>
              {professionals
                .filter((p) => p.profession !== 'administrativo')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({PROFESSIONS[p.profession]?.name || p.profession})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-semibold"
            >
              <option value="all">Todos os Status</option>
              <option value="agendado">Agendados</option>
              <option value="em_atendimento">Em Atendimento</option>
              <option value="finalizado">Concluídos</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          <div className="ml-auto text-[11px] text-slate-500 font-medium flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold shadow-xs"
              title="Sincronização em tempo real via WebSockets (Supabase Realtime) ativa sem polling"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 -ml-3" />
              <span>CRM Realtime Ativo</span>
            </span>
            <span>
              Exibindo <strong>{filteredAppointments.length}</strong> agendamento{filteredAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Appointments List / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800">
        {filteredAppointments.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <CalendarCheck className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum agendamento encontrado com os filtros selecionados.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Utilize o Portal de Agendamento ou compartilhe seu link público para receber e realizar marcações.
            </p>
            <SpecularButton
              type="button"
              onClick={() => onOpenPublicPortal(undefined)}
              size="sm"
              radius={12}
              className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
            >
              <CalendarCheck className="w-4 h-4 mr-1" />
              Realizar Agendamento no Portal
            </SpecularButton>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((app) => {
              const isAssignedToCurrentUser =
                currentUser &&
                (app.professionalId === currentUser.id || app.professionalEmail === currentUser.email);
              const isAdmin = currentUser && isUserAdmin(currentUser);
              const isAdministrative = currentUser?.profession === 'administrativo';
              const canAttend = !isAdministrative && (isAssignedToCurrentUser || isAdmin);

              const isAttendedBySomeone = app.status === 'em_atendimento';
              const isAttendedByMe = isAttendedBySomeone && Boolean(
                (currentUser && app.currentAttendingProfessionalId === currentUser.id) ||
                (currentUser && !app.currentAttendingProfessionalId && (app.professionalId === currentUser.id || app.professionalEmail === currentUser.email))
              );
              const isAttendedByOther = isAttendedBySomeone && !isAttendedByMe;
              const attendingDoctorName = app.currentAttendingProfessionalName || app.professionalName || 'outro profissional';

              const getStatusBadge = (status: AppointmentStatus) => {
                switch (status) {
                  case 'agendado':
                    return (
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Agendado
                      </span>
                    );
                  case 'em_atendimento':
                    return (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold flex items-center gap-1.5 border border-amber-300 dark:border-amber-800">
                        <Lock className="w-3 h-3 text-amber-600" />
                        {isAttendedByOther ? `Em Atendimento por ${attendingDoctorName}` : 'Em Atendimento Clínico'}
                      </span>
                    );
                  case 'finalizado':
                    return (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Finalizado
                      </span>
                    );
                  case 'cancelado':
                    return (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-extrabold">
                        Desistência / Falta
                      </span>
                    );
                }
              };

              const cleanPhone = (app.patientPhone || '').replace(/\D/g, '');

              return (
                <div
                  key={app.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    app.status === 'em_atendimento'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : app.status === 'cancelado'
                      ? 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Time & Patient Info */}
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center shrink-0 min-w-[72px]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          {app.date === todayStr ? 'Hoje' : app.date}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 font-mono block">
                          {app.startTime}
                        </span>
                        <span className="text-[9px] text-slate-400 block">{app.serviceDurationMinutes}m</span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {app.patientName}
                          </h4>
                          {getStatusBadge(app.status)}
                          {app.source === 'whatsapp_n8n' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold">
                              WhatsApp Bot
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          {app.patientPhone && (
                            <a
                              href={`https://api.whatsapp.com/send?phone=55${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {app.patientPhone}
                            </a>
                          )}
                          {app.patientCpf && <span>CPF: {app.patientCpf}</span>}
                          {app.patientCns && <span>CNS: {app.patientCns}</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 text-xs pt-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {app.serviceName}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-teal-700 dark:text-teal-400 font-medium">
                            {app.professionalName} ({PROFESSIONS[app.professionalProfession]?.name || app.professionalProfession})
                          </span>
                          {app.servicePrice > 0 && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-600 font-bold">
                                R$ {app.servicePrice.toFixed(2)} ({app.paymentStatus})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons (RBAC Protected) */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Google Calendar Link */}
                      <a
                        href={generateGoogleCalendarUrl(app)}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`btn-calendar-link-${app.id}`}
                        className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                        title="Ver / Adicionar no Google Calendar"
                      >
                        <CalendarIcon className="w-4 h-4" />
                      </a>

                      {/* WhatsApp CRM Interactive Button with Animated Status and Hover Info */}
                      <div
                        className="relative inline-block"
                        onMouseEnter={() => setHoveredApptId(app.id)}
                        onMouseLeave={() => setHoveredApptId((prev) => (prev === app.id ? null : prev))}
                      >
                        <button
                          type="button"
                          id={`btn-whatsapp-crm-${app.id}`}
                          onClick={() => setSelectedChatAppointment(app)}
                          className={`p-2 rounded-xl transition-all duration-300 cursor-pointer relative ${
                            app.notifications?.hasReplied
                              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 ring-2 ring-blue-500 animate-pulse shadow-md shadow-blue-500/25'
                              : app.notifications?.reminderSent
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 ring-2 ring-rose-500 animate-pulse shadow-md shadow-rose-500/25'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 animate-pulse'
                          }`}
                          title="Abrir CRM WhatsApp e Histórico de Mensagens"
                        >
                          <Phone className="w-4 h-4" />
                          <span
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                              app.notifications?.hasReplied
                                ? 'bg-blue-600'
                                : app.notifications?.reminderSent
                                ? 'bg-rose-600'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </button>

                        {/* Tooltip Card no Hover com a última mensagem respondida, data, hora e minutos */}
                        {hoveredApptId === app.id && (
                          <div className="absolute right-0 bottom-full mb-2 z-50 w-64 sm:w-72 p-3 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white shadow-2xl border border-slate-700 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center gap-1.5 font-bold mb-1.5 pb-1 border-b border-slate-800">
                              <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Status WhatsApp</span>
                              {app.notifications?.hasReplied ? (
                                <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-blue-600 font-bold">
                                  Respondido
                                </span>
                              ) : app.notifications?.reminderSent ? (
                                <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-rose-600 font-bold">
                                  Aguardando Resposta
                                </span>
                              ) : (
                                <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 font-bold">
                                  Não Enviado
                                </span>
                              )}
                            </div>

                            {app.notifications?.hasReplied && app.notifications.lastPatientReply ? (
                              <div className="space-y-1">
                                <p className="text-[10px] text-slate-400 font-semibold">Última mensagem respondida:</p>
                                <p className="text-slate-100 font-medium italic bg-slate-800/80 p-2 rounded-xl text-[11px] line-clamp-3">
                                  "{app.notifications.lastPatientReply.message}"
                                </p>
                                <p className="text-[10px] text-blue-300 font-semibold pt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {new Date(app.notifications.lastPatientReply.repliedAt).toLocaleString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </p>
                              </div>
                            ) : app.notifications?.reminderSent ? (
                              <div className="space-y-1">
                                <p className="text-slate-300">
                                  Lembrete enviado ao webhook do n8n. Aguardando retorno do paciente.
                                </p>
                                {app.notifications.reminderSentAt && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      Enviado em:{' '}
                                      {new Date(app.notifications.reminderSentAt).toLocaleString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-slate-300">
                                Nenhum lembrete enviado ainda. Clique para abrir o CRM e disparar.
                              </p>
                            )}

                            <p className="text-[9px] text-slate-400 mt-2 border-t border-slate-800 pt-1 text-center">
                              Clique no botão para abrir o histórico e responder
                            </p>
                          </div>
                        )}
                      </div>

                      {/* BOTÃO ATENDER: Professional or Admin */}
                      {app.status === 'agendado' && (
                        <SpecularButton
                          type="button"
                          id={`btn-attend-appointment-${app.id}`}
                          disabled={!canAttend}
                          onClick={() => onStartConsultationForPatient(app)}
                          size="sm"
                          radius={12}
                          className={`font-bold text-xs shadow-xs ${
                            canAttend
                              ? 'bg-teal-600 hover:bg-teal-500 text-white'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          title={
                            isAdministrative
                              ? 'Perfil Administrativo não realiza atendimento clínico. Apenas o profissional de saúde vinculado pode atender.'
                              : canAttend
                              ? 'Iniciar atendimento do paciente'
                              : 'Apenas o profissional de saúde vinculado ou administrador pode atender'
                          }
                        >
                          <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                          Atender
                        </SpecularButton>
                      )}

                      {/* Em atendimento por outro profissional */}
                      {app.status === 'em_atendimento' && isAttendedByOther && (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Em atendimento por {attendingDoctorName}</span>
                        </span>
                      )}

                      {/* Finish attendance (Only the attending professional or admin) */}
                      {app.status === 'em_atendimento' && (isAttendedByMe || isAdmin) && (
                        <SpecularButton
                          type="button"
                          id={`btn-finish-appointment-${app.id}`}
                          onClick={() => handleUpdateStatus(app.id, 'finalizado')}
                          size="sm"
                          radius={12}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Concluir Atendimento
                        </SpecularButton>
                      )}

                      {/* Desistência / Falta */}
                      {app.status === 'agendado' && (
                        <button
                          type="button"
                          id={`btn-cancel-appointment-${app.id}`}
                          onClick={() => handleUpdateStatus(app.id, 'cancelado')}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Registrar falta ou desistência do paciente"
                        >
                          Desistência / Falta
                        </button>
                      )}

                      {/* Reativar agendamento se cancelado */}
                      {app.status === 'cancelado' && (
                        <button
                          type="button"
                          id={`btn-reactivate-appointment-${app.id}`}
                          onClick={() => handleUpdateStatus(app.id, 'agendado')}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Reativar agendamento"
                        >
                          Reativar
                        </button>
                      )}

                      {/* EXCLUIR REGISTRO */}
                      <button
                        type="button"
                        id={`btn-delete-appointment-${app.id}`}
                        onClick={() => handleDeleteAppointmentClick(app)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Excluir Agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE AGENDAMENTO */}
      <AnimatePresence>
        {appointmentToDelete && (
          <div
            id="modal-delete-appointment-backdrop"
            onClick={() => {
              if (!isDeleting) setAppointmentToDelete(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Excluir Agendamento
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Remoção definitiva da agenda da equipe
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-1">
                <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  {appointmentToDelete.patientName}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-rose-700/90 dark:text-rose-300/90">
                  <span>📅 {appointmentToDelete.date} às {appointmentToDelete.startTime}</span>
                  <span>•</span>
                  <span>🩺 {appointmentToDelete.serviceName}</span>
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-0.5">
                  Profissional: {appointmentToDelete.professionalName}
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tem certeza que deseja excluir este agendamento? Esta ação removerá o registro permanentemente do sistema e do Cloud Firestore.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <SpecularButton
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setAppointmentToDelete(null)}
                  size="sm"
                  radius={12}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-transparent"
                >
                  Cancelar
                </SpecularButton>
                <SpecularButton
                  type="button"
                  id="confirm-delete-appointment-action-btn"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  size="sm"
                  radius={12}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border-rose-500/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
                </SpecularButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp CRM Chat Modal */}
      {selectedChatAppointment && (
        <WhatsAppChatModal
          isOpen={Boolean(selectedChatAppointment)}
          onClose={() => setSelectedChatAppointment(null)}
          appointment={selectedChatAppointment}
          currentUser={currentUser}
          systemSettings={systemSettings}
          onShowToast={onShowToast}
          onAppointmentUpdated={(updatedAppt) => {
            setSelectedChatAppointment(updatedAppt);
            if (onAppointmentUpdated) {
              onAppointmentUpdated(updatedAppt);
            }
          }}
        />
      )}
    </div>
  );
};
