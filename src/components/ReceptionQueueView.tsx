import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Clock,
  Calendar,
  Search,
  Filter,
  Volume2,
  Play,
  XCircle,
  UserX,
  UserCheck,
  Stethoscope,
  Plus,
  RotateCw,
  Baby,
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Tv,
  CalendarCheck,
  LayoutGrid,
  List,
  QrCode,
  History,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  Pencil,
  Lock,
  X,
  Printer,
  Phone,
} from 'lucide-react';
import {
  ReceptionQueueItem,
  User,
  Patient,
  QueueItemStatus,
  RiskClassification,
  Appointment,
  SystemSettings,
} from '../types';
import { PROFESSIONS, isUserAdmin, getProfessionalProfessionTitle, DEFAULT_SYSTEM_SETTINGS } from '../data/professions';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import {
  calculateChronologicalAge,
  formatSimpleAge,
  getTodayDateString,
  formatQueueDateTime,
} from '../utils/dateCalculator';
import { SpecularButton } from './SpecularButton';
import { CallPatientModal } from './CallPatientModal';
import { PublicQueueQrCodeModal } from './PublicQueueQrCodeModal';
import { openProfessionalQueueInNewTab } from '../utils/printReceptionQueue';

const CALENDAR_MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const CALENDAR_WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Helper: calcula o tempo restante amigável até a data e hora da consulta
function formatRemainingTime(scheduledDateStr?: string, scheduledTimeStr?: string, timestamp?: number): string {
  if (!scheduledDateStr && !timestamp) return 'pouco tempo';

  let targetDate: Date;
  if (scheduledDateStr) {
    const timeParts = (scheduledTimeStr || '08:00').split(':');
    const [year, month, day] = scheduledDateStr.split('-').map(Number);
    targetDate = new Date(year, month - 1, day, Number(timeParts[0]) || 8, Number(timeParts[1]) || 0);
  } else if (timestamp) {
    targetDate = new Date(timestamp);
  } else {
    return 'pouco tempo';
  }

  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'horário previsto para agora';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    if (remainingHours > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} e ${remainingHours} hora${remainingHours > 1 ? 's' : ''}`;
    }
    return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    const remainingMins = diffMinutes % 60;
    if (remainingMins > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''} e ${remainingMins} minuto${remainingMins > 1 ? 's' : ''}`;
    }
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  }

  return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
}

// Helper: retorna o dia da semana por extenso (ex: Segunda-feira)
function getDayOfWeekName(dateStr?: string, timestamp?: number): string {
  let d: Date;
  if (dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    d = new Date(year, month - 1, day, 12, 0, 0);
  } else if (timestamp) {
    d = new Date(timestamp);
  } else {
    d = new Date();
  }
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[d.getDay()] || 'Segunda-feira';
}

// Helper: formata data no formato brasileiro dd/mm/aaaa
function formatBrazilianDate(dateStr?: string, timestamp?: number): string {
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  if (timestamp) {
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const today = new Date();
  return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
}

// Helper: retorna a saudação compatível com o horário atual (Bom dia, Boa tarde, Boa noite)
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Helper: determina o artigo correto ('o' ou 'a') de acordo com o gênero ou nome do profissional
function getProfessionalArticle(prof?: User | { name?: string; gender?: string } | null, profName?: string): string {
  if (prof) {
    const g = ((prof as any).gender || '').toLowerCase().trim();
    if (g === 'f' || g.startsWith('fem') || g === 'mulher') return 'a';
    if (g === 'm' || g.startsWith('masc') || g === 'homem') return 'o';
  }

  const nameToTest = (prof?.name || profName || '').trim();
  const firstName = nameToTest.split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const knownFemale = [
    'alice', 'beatriz', 'carmen', 'cleo', 'daiane', 'denise', 'elienai', 'ellen', 'ester', 'evelyn', 
    'gleice', 'helen', 'inês', 'iris', 'isabel', 'jaqueline', 'karen', 'katia', 'laiane', 'laís', 
    'lorrane', 'lourdes', 'luciane', 'maite', 'mercedes', 'mirian', 'monique', 'morgana', 'nataly', 
    'nicole', 'noemi', 'patricia', 'quel', 'raquel', 'regiane', 'rose', 'ruthe', 'solange', 'sueli', 
    'thais', 'tamires', 'vivian'
  ];
  if (knownFemale.includes(firstName)) return 'a';

  const knownMale = [
    'alexandre', 'andré', 'arthur', 'davi', 'felipe', 'guilherme', 'henrique', 'jean', 'jorge', 
    'lucas', 'luiz', 'matheus', 'miguel', 'rafael', 'samuel', 'victor', 'gabriel', 'ayrton', 
    'bento', 'luca', 'elias', 'josias', 'messias', 'matias', 'tobias', 'isaías', 'jeremias', 
    'natan', 'alan', 'renan', 'eder', 'valdir', 'vagner', 'cleber', 'nilton', 'milton', 'airton', 
    'cleiton', 'wellingon', 'washington', 'claudio', 'marcio', 'paulo', 'pedro', 'joao', 'jose', 
    'carlos', 'marcos', 'marcelo', 'antonio', 'francisco'
  ];
  if (knownMale.includes(firstName)) return 'o';

  // Na língua portuguesa, nomes terminados em 'a' são tipicamente femininos
  if (firstName.endsWith('a')) return 'a';

  return 'o';
}

export interface ReceptionQueueViewProps {
  currentUser: User | null;
  queueItems: ReceptionQueueItem[];
  appointments?: Appointment[];
  professionals: User[];
  patients: Patient[];
  onOpenAddToQueue?: () => void;
  onCallPatient?: (item: ReceptionQueueItem) => void;
  onOpenCallModal?: (item: ReceptionQueueItem) => void;
  onStartConsultation?: (item: ReceptionQueueItem) => void;
  onStartConsultationForPatient?: (item: ReceptionQueueItem) => void;
  onMarkAbandonment?: (item: ReceptionQueueItem) => void;
  onCancelQueueItem?: (item: ReceptionQueueItem) => void;
  onUpdateQueueItemStatus?: (queueItemId: string, newStatus: any) => void;
  onDeleteQueueItem?: (queueItemId: string) => void;
  onReorderQueue?: (reorderedItems: ReceptionQueueItem[]) => void;
  onUpdateQueueItem?: (updatedItem: ReceptionQueueItem) => void;
  onUpdateQueueItemDateTime?: (itemId: string, newDate: string, newTime: string) => void;
  onRefreshQueue?: () => void;
  onOpenPublicCallScreen?: () => void;
  onOpenTimeline?: (patient: Patient) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
  systemSettings?: SystemSettings;
  onAppointmentUpdated?: (updatedAppt: Appointment) => void;
}

export const ReceptionQueueView: React.FC<ReceptionQueueViewProps> = ({
  currentUser,
  queueItems,
  appointments = [],
  professionals,
  patients,
  onOpenAddToQueue,
  onCallPatient,
  onOpenCallModal,
  onStartConsultation,
  onStartConsultationForPatient,
  onMarkAbandonment,
  onCancelQueueItem,
  onUpdateQueueItemStatus,
  onDeleteQueueItem,
  onReorderQueue,
  onUpdateQueueItem,
  onUpdateQueueItemDateTime,
  onRefreshQueue,
  onOpenPublicCallScreen,
  onOpenTimeline,
  onShowToast,
  systemSettings = DEFAULT_SYSTEM_SETTINGS,
  onAppointmentUpdated,
}) => {
  const isAdmin = Boolean(currentUser && isUserAdmin(currentUser));
  const isAdministrative = currentUser?.profession === 'administrativo';

  // Helper date
  const todayStr = useMemo(() => getTodayDateString(), []);

  // 1. ALL STATE HOOKS (Top of Component)
  const [selectedChatAppointment, setSelectedChatAppointment] = useState<Appointment | null>(null);
  const [hoveredWhatsAppItemId, setHoveredWhatsAppItemId] = useState<string | null>(null);
  const [activeCallingItem, setActiveCallingItem] = useState<ReceptionQueueItem | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [editingDateTimeItem, setEditingDateTimeItem] = useState<ReceptionQueueItem | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'by_professional' | 'list'>('by_professional');
  const [dateScope, setDateScope] = useState<'today' | 'custom' | 'all'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() => getTodayDateString());
  const [customEndDate, setCustomEndDate] = useState<string>(() => getTodayDateString());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarMode, setCalendarMode] = useState<'single' | 'range'>('single');
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());
  const [selectedStatuses, setSelectedStatuses] = useState<('active' | 'completed' | 'cancelled')[]>(['active']);
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [selectedProfId, setSelectedProfId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [showAbandonedGroupIds, setShowAbandonedGroupIds] = useState<Set<string>>(new Set());

  // Helper to resolve or construct Appointment object for WhatsApp CRM modal
  const getAppointmentForQueueItem = (item: ReceptionQueueItem): Appointment => {
    const byId = item.appointmentId ? appointments.find((a) => a.id === item.appointmentId) : null;
    if (byId) return byId;

    const byPatient = appointments.find(
      (a) => a.patientId === item.patientId && (!item.scheduledDate || a.date === item.scheduledDate)
    );
    if (byPatient) return byPatient;

    const resolvedId = item.appointmentId || (String(item.id || '').startsWith('queue') ? item.id : `queue_${item.id}`);

    return {
      id: resolvedId,
      patientId: item.patientId,
      patientName: item.patientName,
      patientPhone: item.patientPhone || patients.find((p) => p.id === item.patientId)?.phone || '',
      patientCpf: item.patientCpf,
      patientBirthDate: item.patientBirthDate,
      patientGender: item.patientGender,
      professionalId: item.professionalId,
      professionalName: item.professionalName,
      professionalProfession: item.professionalProfession,
      serviceName: 'Atendimento CAPS / e-SUS PEC',
      servicePrice: 0,
      date: item.scheduledDate || todayStr,
      startTime: item.scheduledTime || '08:00',
      status: item.status === 'cancelled' || item.status === 'abandoned' ? 'cancelado' : 'agendado',
      location: systemSettings?.defaultUnitName || 'CAPS / Unidade de Saúde',
      notifications: (item as any).notifications || {},
      createdAt: item.timestamp || Date.now(),
    } as unknown as Appointment;
  };

  // 2. EFFECT HOOKS
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.queue-actions-dropdown-container')) {
        setOpenDropdownId(null);
      }
      if (!target?.closest('.queue-filter-dropdown-container')) {
        setIsFilterDropdownOpen(false);
      }
    };
    if (openDropdownId || isFilterDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdownId, isFilterDropdownOpen]);

  // 3. MEMOIZED VALUES
  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    // Next month padding to complete 7-day rows
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [calendarViewDate]);

  // Filter strictly clinical professionals (exclude administrative profiles who don't attend patients)
  const clinicalProfessionals = useMemo(() => {
    return (professionals || []).filter((p) => p && p.profession !== 'administrativo');
  }, [professionals]);

  // Helper to determine accurate ordering priority (orderIndex takes precedence, followed by timestamp)
  const getItemOrderValue = (item: ReceptionQueueItem): number => {
    if (typeof item.orderIndex === 'number') {
      return item.orderIndex;
    }
    return Number(item.timestamp) || 0;
  };

  // Helper: verifica se um item da fila está dentro do escopo de data selecionado
  const isItemInDateScope = (item: ReceptionQueueItem): boolean => {
    const itemDate = item.scheduledDate || (item.timestamp && !isNaN(new Date(item.timestamp).getTime()) ? new Date(item.timestamp).toISOString().split('T')[0] : '');
    if (dateScope === 'today') {
      return itemDate === todayStr;
    }
    if (dateScope === 'custom') {
      if (!customStartDate && !customEndDate) return true;
      if (customStartDate && customEndDate) {
        const start = customStartDate <= customEndDate ? customStartDate : customEndDate;
        const end = customStartDate <= customEndDate ? customEndDate : customStartDate;
        return itemDate >= start && itemDate <= end;
      }
      if (customStartDate) return itemDate >= customStartDate;
      if (customEndDate) return itemDate <= customEndDate;
      return true;
    }
    return true; // 'all'
  };

  // Unified list of all queue items + scheduled appointments
  const mergedAllQueueItems = useMemo(() => {
    // Default fallback clinical professional from real registered users
    const defaultProf = clinicalProfessionals.find((p) => currentUser && p.id === currentUser.id) || clinicalProfessionals[0];
    const defaultProfName = defaultProf?.name || 'Profissional Responsável';
    const defaultProfId = defaultProf?.id || '';
    const defaultProfession = defaultProf?.profession || 'enfermeiro';

    // Filter and normalize queue items to guarantee all properties exist
    const validQueueItems = (queueItems || [])
      .filter((q) => q && q.id)
      .filter((q) => {
        // Discard any legacy mock items associated with "Profissional da Unidade" or mock "Cidadão"
        const pName = (q.professionalName || '').trim().toLowerCase();
        const pId = (q.professionalId || '').trim().toLowerCase();
        const patName = (q.patientName || '').trim().toLowerCase();
        if (patName === 'cidadão' || patName === 'cidadao' || patName === 'paciente agendado' || patName === 'paciente da fila' || !patName) return false;
        if (pName === 'profissional da unidade' || pId === 'profissional da unidade' || pId === 'user-profissional-da-unidade') return false;

        // Discard any queue item directed to an administrative user
        const matchedProf = (professionals || []).find((p) => (q.professionalId && p.id === q.professionalId) || (q.professionalName && p.name.toLowerCase().trim() === q.professionalName.toLowerCase().trim()));
        if (matchedProf?.profession === 'administrativo' || q.professionalProfession === 'administrativo') return false;

        return true;
      })
      .map((q) => {
        const matchedProf = clinicalProfessionals.find(
          (p) =>
            (q.professionalId && p.id === q.professionalId) ||
            (q.professionalName && p.name.toLowerCase().trim() === q.professionalName.toLowerCase().trim() && p.name.toLowerCase().trim() !== 'profissional da unidade')
        );
        const pNameClean = (q.professionalName || '').trim().toLowerCase();
        const finalProfName = matchedProf?.name || (pNameClean === 'profissional da unidade' || !q.professionalName ? defaultProfName : q.professionalName);
        const finalProfId = matchedProf?.id || (pNameClean === 'profissional da unidade' || !q.professionalId ? defaultProfId : q.professionalId);
        const finalProfession = matchedProf?.profession || q.professionalProfession || defaultProfession;

        return {
          ...q,
          patientName: q.patientName,
          professionalId: finalProfId,
          professionalName: finalProfName,
          professionalProfession: finalProfession,
          scheduledDate: q.scheduledDate || (q.timestamp && !isNaN(new Date(q.timestamp).getTime()) ? new Date(q.timestamp).toISOString().split('T')[0] : todayStr),
          scheduledTime: q.scheduledTime || '08:00',
        };
      });

    const list: ReceptionQueueItem[] = [...validQueueItems];
    const existingAppointmentIds = new Set(
      validQueueItems.map((q) => q.appointmentId || q.id).filter(Boolean)
    );

    if (appointments && appointments.length > 0) {
      for (const app of appointments) {
        if (!app.patientName && !app.date) continue;
        if (app.id && app.id.startsWith('ord_pix')) continue;
        if (existingAppointmentIds.has(app.id)) continue;

        const appPName = (app.professionalName || '').trim().toLowerCase();
        const appPId = (app.professionalId || '').trim().toLowerCase();
        const appPatName = (app.patientName || '').trim().toLowerCase();
        if (appPatName === 'cidadão' || appPatName === 'cidadao' || appPatName === 'paciente agendado' || !appPatName) continue;
        if (appPName === 'profissional da unidade' || appPId === 'profissional da unidade' || appPId === 'user-profissional-da-unidade') continue;

        // Discard any appointment assigned to administrative staff
        const matchedProf = (professionals || []).find(
          (p) =>
            (app.professionalId && p.id === app.professionalId) ||
            (app.professionalName && p.name.toLowerCase().trim() === app.professionalName.toLowerCase().trim())
        );
        if (matchedProf?.profession === 'administrativo' || app.professionalProfession === 'administrativo') continue;

        let mappedStatus: QueueItemStatus = 'waiting';
        if (app.status === 'em_atendimento') {
          mappedStatus = 'in_consultation';
        } else if (app.status === 'finalizado') {
          mappedStatus = 'completed';
        } else if (app.status === 'cancelado') {
          mappedStatus = 'cancelled';
        }

        let itemTimestamp = app.timestamp;
        if (!itemTimestamp && app.date) {
          const timeStr = app.startTime || '08:00';
          const d = new Date(`${app.date}T${timeStr}:00`);
          itemTimestamp = isNaN(d.getTime()) ? (app.createdAt || Date.now()) : d.getTime();
        }
        if (!itemTimestamp) {
          itemTimestamp = app.createdAt || Date.now();
        }

        const formattedDate = formatQueueDateTime(app.date, app.startTime || '08:00');

        const resolvedProfId = matchedProf?.id || (appPName === 'profissional da unidade' ? defaultProfId : app.professionalId) || defaultProfId;
        const resolvedProfName = matchedProf?.name || (appPName === 'profissional da unidade' ? defaultProfName : app.professionalName) || defaultProfName;
        const resolvedProfession = matchedProf?.profession || app.professionalProfession || defaultProfession;

        const queueItemFromAppointment: ReceptionQueueItem = {
          id: app.id,
          patientId: app.patientId || `pat-${app.id}`,
          patientName: app.patientName,
          patientCpf: app.patientCpf,
          patientCns: app.patientCns,
          patientBirthDate: app.patientBirthDate,
          patientPhone: app.patientPhone,
          professionalId: resolvedProfId,
          professionalName: resolvedProfName,
          professionalProfession: resolvedProfession,
          scheduledDate: app.date,
          scheduledTime: app.startTime || '08:00',
          timestamp: itemTimestamp,
          formattedDateTime: formattedDate,
          status: mappedStatus,
          origin: 'agendamento',
          priorityCategory: 'padrao',
          appointmentId: app.id,
          notes: app.serviceName ? `Serviço: ${app.serviceName}${app.notes ? ` • ${app.notes}` : ''}` : app.notes,
          createdAt: app.createdAt || Date.now(),
          updatedAt: app.updatedAt || Date.now(),
        };

        list.push(queueItemFromAppointment);
      }
    }

    return list;
  }, [queueItems, appointments, clinicalProfessionals, professionals, currentUser, todayStr]);

  // Per-professional calling rank calculation
  const profRankingMap = useMemo(() => {
    const scopeList = mergedAllQueueItems.filter(isItemInDateScope);
    const grouped = new Map<string, ReceptionQueueItem[]>();
    for (const item of scopeList) {
      const profKey = item.professionalId || item.professionalName || 'geral';
      if (!grouped.has(profKey)) {
        grouped.set(profKey, []);
      }
      grouped.get(profKey)!.push(item);
    }

    const rankMap = new Map<
      string,
      {
        profOrder: number;
        profWaitingOrder: number | null;
        profTotal: number;
        profWaitingTotal: number;
      }
    >();

    grouped.forEach((profItems) => {
      profItems.sort((a, b) => getItemOrderValue(a) - getItemOrderValue(b));

      let waitingCounter = 0;
      const waitingTotal = profItems.filter(
        (i) => i.status === 'waiting' || i.status === 'calling' || i.status === 'in_consultation' || i.status === 'in_service'
      ).length;

      profItems.forEach((item, index) => {
        const isWaiting = item.status === 'waiting' || item.status === 'calling';
        if (isWaiting) {
          waitingCounter++;
        }
        rankMap.set(item.id, {
          profOrder: index + 1,
          profWaitingOrder: isWaiting ? waitingCounter : null,
          profTotal: profItems.length,
          profWaitingTotal: waitingTotal,
        });
      });
    });

    return rankMap;
  }, [mergedAllQueueItems, dateScope, customStartDate, customEndDate, todayStr]);

  // Filter items based on active UI filters
  const filteredItems = useMemo(() => {
    let list = mergedAllQueueItems.filter(isItemInDateScope);

    // 2. Status multiselection filtering
    if (selectedStatuses.length > 0) {
      list = list.filter((i) => {
        const isActive = i.status === 'waiting' || i.status === 'calling' || i.status === 'in_consultation' || i.status === 'in_service';
        const isCompleted = i.status === 'completed';
        const isCancelled = i.status === 'cancelled' || i.status === 'abandoned';

        return (
          (selectedStatuses.includes('active') && isActive) ||
          (selectedStatuses.includes('completed') && isCompleted) ||
          (selectedStatuses.includes('cancelled') && isCancelled)
        );
      });
    }

    // 3. Filter by "only mine"
    if (onlyMine && currentUser) {
      list = list.filter((i) => i.professionalId === currentUser.id);
    }

    // 4. Filter by selected professional
    if (selectedProfId !== 'all') {
      list = list.filter((i) => i.professionalId === selectedProfId);
    }

    // 5. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => {
        return (
          i.patientName.toLowerCase().includes(q) ||
          i.patientCpf?.includes(q) ||
          i.patientCns?.includes(q) ||
          i.patientPhone?.includes(q) ||
          i.notes?.toLowerCase().includes(q) ||
          i.professionalName.toLowerCase().includes(q)
        );
      });
    }

    // Sort: group primarily by professional name and then by custom orderIndex/timestamp
    list.sort((a, b) => {
      const profCompare = (a.professionalName || '').localeCompare(b.professionalName || '');
      if (profCompare !== 0 && selectedProfId === 'all') {
        return profCompare;
      }
      return getItemOrderValue(a) - getItemOrderValue(b);
    });

    return list;
  }, [mergedAllQueueItems, dateScope, customStartDate, customEndDate, selectedStatuses, todayStr, onlyMine, currentUser, selectedProfId, searchQuery]);

  // Group filtered items by professional for structured individual queues
  const groupedByProf = useMemo(() => {
    let baseList = mergedAllQueueItems.filter(isItemInDateScope);

    if (onlyMine && currentUser) {
      baseList = baseList.filter((i) => i.professionalId === currentUser.id);
    }

    if (selectedProfId !== 'all') {
      baseList = baseList.filter((i) => i.professionalId === selectedProfId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      baseList = baseList.filter((i) => {
        return (
          i.patientName.toLowerCase().includes(q) ||
          i.patientCpf?.includes(q) ||
          i.patientCns?.includes(q) ||
          i.patientPhone?.includes(q) ||
          i.notes?.toLowerCase().includes(q) ||
          i.professionalName.toLowerCase().includes(q)
        );
      });
    }

    const defaultProf = clinicalProfessionals.find((p) => currentUser && p.id === currentUser.id && p.profession !== 'administrativo') || clinicalProfessionals[0];
    const defaultProfName = defaultProf?.name || 'Profissional Responsável';
    const defaultProfession = defaultProf?.profession || 'enfermeiro';

    const map = new Map<string, ReceptionQueueItem[]>();
    for (const item of baseList) {
      const patName = (item.patientName || '').trim().toLowerCase();
      if (patName === 'cidadão' || patName === 'cidadao' || patName === 'paciente agendado' || patName === 'paciente da fila' || patName === 'cidadão identificado' || !patName) continue;

      const pName = (item.professionalName || '').trim().toLowerCase();
      const pId = (item.professionalId || '').trim().toLowerCase();
      if (pName === 'profissional da unidade' || pId === 'profissional da unidade' || pId === 'user-profissional-da-unidade') continue;

      const rawProf = (professionals || []).find(
        (p) =>
          (item.professionalId && p.id === item.professionalId) ||
          (item.professionalName && p.name.toLowerCase().trim() === item.professionalName.toLowerCase().trim())
      );
      if (rawProf?.profession === 'administrativo' || item.professionalProfession === 'administrativo' || rawProf?.name.toLowerCase().includes('nangley')) {
        continue;
      }

      const matchedProf = clinicalProfessionals.find(
        (p) =>
          (item.professionalId && p.id === item.professionalId) ||
          (item.professionalName && p.name.toLowerCase().trim() === item.professionalName.toLowerCase().trim() && p.name.toLowerCase().trim() !== 'profissional da unidade')
      );

      if (!matchedProf && !defaultProf) continue;

      const key = matchedProf?.id || defaultProf?.id || 'geral';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }

    const groups: {
      professionalId: string;
      professionalName: string;
      professionalProfession: string;
      items: ReceptionQueueItem[];
      waitingCount: number;
      completedCount: number;
      abandonedCount: number;
      callingCount: number;
      firstWaitingItem: ReceptionQueueItem | null;
    }[] = [];

    map.forEach((items, key) => {
      items.sort((a, b) => getItemOrderValue(a) - getItemOrderValue(b));
      const firstItem = items[0];
      const profUser = clinicalProfessionals.find(
        (p) => p.id === key || (firstItem?.professionalName && p.name.toLowerCase().trim() === firstItem.professionalName.toLowerCase().trim() && p.name.toLowerCase().trim() !== 'profissional da unidade')
      );
      if (profUser?.profession === 'administrativo' || profUser?.name.toLowerCase().includes('nangley')) return;

      const groupName = profUser?.name || (firstItem?.professionalName && firstItem.professionalName.toLowerCase().trim() !== 'profissional da unidade' ? firstItem.professionalName : defaultProfName);
      if (groupName.toLowerCase().trim() === 'profissional da unidade') return;

      const waitingItems = items.filter((i) => i.status === 'waiting' || i.status === 'calling' || i.status === 'in_consultation' || i.status === 'in_service');
      const completedItems = items.filter((i) => i.status === 'completed');
      const abandonedItems = items.filter((i) => i.status === 'abandoned' || i.status === 'cancelled');

      groups.push({
        professionalId: profUser?.id || key,
        professionalName: groupName,
        professionalProfession: profUser?.profession || firstItem?.professionalProfession || defaultProfession,
        items,
        waitingCount: waitingItems.length,
        completedCount: completedItems.length,
        abandonedCount: abandonedItems.length,
        callingCount: items.filter((i) => i.status === 'calling').length,
        firstWaitingItem: waitingItems[0] || null,
      });
    });

    groups.sort((a, b) => {
      if (currentUser) {
        if (a.professionalId === currentUser.id) return -1;
        if (b.professionalId === currentUser.id) return 1;
      }
      return a.professionalName.localeCompare(b.professionalName);
    });

    return groups;
  }, [mergedAllQueueItems, dateScope, customStartDate, customEndDate, todayStr, onlyMine, currentUser, selectedProfId, searchQuery, professionals]);

  // Today's total count
  const countTodayTotal = useMemo(() => {
    return mergedAllQueueItems.filter((i) => {
      const itemDate = i.scheduledDate || (i.timestamp ? new Date(i.timestamp).toISOString().split('T')[0] : '');
      return itemDate === todayStr;
    }).length;
  }, [mergedAllQueueItems, todayStr]);

  // Active scope items for dynamic counts
  const scopeItems = useMemo(() => {
    return mergedAllQueueItems.filter(isItemInDateScope);
  }, [mergedAllQueueItems, dateScope, customStartDate, customEndDate, todayStr]);

  const countScopeTotal = scopeItems.length;
  const countAllTotal = mergedAllQueueItems.length;

  const countActive = useMemo(() => {
    return scopeItems.filter((i) => i.status === 'waiting' || i.status === 'calling' || i.status === 'in_consultation' || i.status === 'in_service').length;
  }, [scopeItems]);

  const countCompleted = useMemo(() => {
    return scopeItems.filter((i) => i.status === 'completed').length;
  }, [scopeItems]);

  const countCancelled = useMemo(() => {
    return scopeItems.filter((i) => i.status === 'cancelled' || i.status === 'abandoned').length;
  }, [scopeItems]);

  const callingCount = useMemo(() => {
    return scopeItems.filter((i) => i.status === 'calling').length;
  }, [scopeItems]);

  // 4. HANDLERS AND HELPER FUNCTIONS
  const handleCall = (item: ReceptionQueueItem) => {
    const isAssigned = Boolean(currentUser && currentUser.id === item.professionalId);
    if (!isAssigned && !isAdmin) {
      onShowToast?.('warning', `Apenas ${item.professionalName} pode chamar este paciente.`, 'Acesso Restrito');
      return;
    }
    if (onCallPatient) {
      onCallPatient(item);
    } else if (onOpenCallModal) {
      onOpenCallModal(item);
    } else if (onUpdateQueueItemStatus) {
      onUpdateQueueItemStatus(item.id, 'calling');
    }
  };

  const handleStartConsult = (item: ReceptionQueueItem) => {
    const isAttendedBySomeone = (item.status === 'in_consultation' || item.status === 'in_service');
    const isAttendedByMe = isAttendedBySomeone && Boolean(
      (currentUser && item.currentAttendingProfessionalId === currentUser.id) ||
      (currentUser && !item.currentAttendingProfessionalId && item.professionalId === currentUser.id)
    );
    const isAttendedByOther = isAttendedBySomeone && !isAttendedByMe;
    const attendingDoctorName = item.currentAttendingProfessionalName || item.professionalName || 'outro profissional';

    if (isAttendedByOther) {
      onShowToast?.(
        'warning',
        `O paciente "${item.patientName}" já está em atendimento com ${attendingDoctorName}. Aguarde a conclusão da consulta para iniciar um novo atendimento.`,
        'Atendimento em Andamento'
      );
      return;
    }

    const isAssigned = Boolean(currentUser && currentUser.id === item.professionalId);
    if (!isAssigned && !isAdmin) {
      onShowToast?.('warning', `Apenas ${item.professionalName} pode realizar este atendimento.`, 'Acesso Restrito');
      return;
    }
    if (isAdministrative) {
      onShowToast?.('warning', 'Perfil administrativo não realiza atendimento clínico.', 'Acesso Restrito');
      return;
    }
    if (onStartConsultation) {
      onStartConsultation(item);
    } else if (onStartConsultationForPatient) {
      onStartConsultationForPatient(item);
    }
  };

  const handleAbandon = (item: ReceptionQueueItem) => {
    const isAssigned = Boolean(currentUser && currentUser.id === item.professionalId);
    if (!isAssigned && !isAdmin) {
      onShowToast?.('warning', `Apenas ${item.professionalName} pode alterar o status deste paciente.`, 'Acesso Restrito');
      return;
    }
    if (onMarkAbandonment) {
      onMarkAbandonment(item);
    } else if (onUpdateQueueItemStatus) {
      onUpdateQueueItemStatus(item.id, 'abandoned');
    }
  };

  const handleCancel = (item: ReceptionQueueItem) => {
    const isAssigned = Boolean(currentUser && currentUser.id === item.professionalId);
    if (!isAssigned && !isAdmin) {
      onShowToast?.('warning', `Apenas ${item.professionalName} pode cancelar este atendimento.`, 'Acesso Restrito');
      return;
    }
    if (onCancelQueueItem) {
      onCancelQueueItem(item);
    } else if (onUpdateQueueItemStatus) {
      onUpdateQueueItemStatus(item.id, 'cancelled');
    }
  };

  const handlePrintProfessionalQueue = (group: {
    professionalId: string;
    professionalName: string;
    items: ReceptionQueueItem[];
    waitingCount: number;
    completedCount: number;
    abandonedCount: number;
  }) => {
    const profObj = professionals.find((p) => p.id === group.professionalId);
    const dateLabel =
      dateScope === 'today'
        ? `Hoje - ${formatBrazilianDate(todayStr)}`
        : dateScope === 'custom'
        ? customStartDate === customEndDate
          ? formatBrazilianDate(customStartDate)
          : `${formatBrazilianDate(customStartDate)} a ${formatBrazilianDate(customEndDate)}`
        : 'Todas as Datas';

    openProfessionalQueueInNewTab(
      {
        professionalId: group.professionalId,
        professionalName: group.professionalName,
        professionalProfession: profObj?.profession,
        items: group.items,
        waitingCount: group.waitingCount,
        completedCount: group.completedCount,
        abandonedCount: group.abandonedCount,
      },
      dateLabel,
      currentUser
    );

    onShowToast?.('info', `Abrindo impressão A4 da fila de ${group.professionalName}...`, 'Imprimir Fila');
  };

  const handlePrintAllQueue = () => {
    const dateLabel =
      dateScope === 'today'
        ? `Hoje - ${formatBrazilianDate(todayStr)}`
        : dateScope === 'custom'
        ? customStartDate === customEndDate
          ? formatBrazilianDate(customStartDate)
          : `${formatBrazilianDate(customStartDate)} a ${formatBrazilianDate(customEndDate)}`
        : 'Todas as Datas';

    const profName =
      selectedProfId !== 'all'
        ? professionals.find((p) => p.id === selectedProfId)?.name || 'Profissional Selecionado'
        : 'Todos os Profissionais da Unidade';
    const profRole =
      selectedProfId !== 'all'
        ? professionals.find((p) => p.id === selectedProfId)?.profession
        : 'Recepção / Triagem Geral';

    openProfessionalQueueInNewTab(
      {
        professionalId: selectedProfId !== 'all' ? selectedProfId : 'geral',
        professionalName: profName,
        professionalProfession: profRole,
        items: filteredItems,
        waitingCount: filteredItems.filter((i) => i.status === 'waiting' || i.status === 'calling').length,
        completedCount: filteredItems.filter((i) => i.status === 'completed').length,
        abandonedCount: filteredItems.filter((i) => i.status === 'abandoned' || i.status === 'cancelled').length,
      },
      dateLabel,
      currentUser
    );

    onShowToast?.('info', 'Abrindo impressão A4 da fila de atendimento geral...', 'Imprimir Fila');
  };

  const handleOpenTimeline = (item: ReceptionQueueItem) => {
    const itemCpfClean = (item.patientCpf || '').replace(/\D/g, '');
    const itemCnsClean = (item.patientCns || '').replace(/\D/g, '');
    const itemNameNorm = (item.patientName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const itemFirstToken = itemNameNorm ? itemNameNorm.split(' ')[0] : '';

    let targetPatient = patients.find((p) => {
      const pNameNorm = (p.fullName || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      const pFirstToken = pNameNorm ? pNameNorm.split(' ')[0] : '';

      // Priority 1: Exact ID Match (with name compatibility check)
      if (item.patientId && p.id === item.patientId) {
        if (!itemNameNorm || !pNameNorm || pNameNorm === itemNameNorm || (itemFirstToken && pNameNorm.includes(itemFirstToken)) || (pFirstToken && itemNameNorm.includes(pFirstToken))) {
          return true;
        }
      }
      // Priority 2: Exact Name Match
      if (itemNameNorm && pNameNorm === itemNameNorm) return true;
      return false;
    });

    if (!targetPatient) {
      targetPatient = patients.find((p) => {
        const pNameNorm = (p.fullName || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        const pFirstToken = pNameNorm ? pNameNorm.split(' ')[0] : '';
        const namesCompatible = !itemNameNorm || !pNameNorm || pNameNorm === itemNameNorm || (itemFirstToken && pNameNorm.includes(itemFirstToken)) || (pFirstToken && itemNameNorm.includes(pFirstToken));
        if (!namesCompatible) return false;

        if (itemCpfClean.length === 11 && (p.cpf || '').replace(/\D/g, '') === itemCpfClean) return true;
        if (itemCnsClean.length >= 10 && (p.cns || '').replace(/\D/g, '') === itemCnsClean) return true;
        return false;
      });
    }

    const finalPatient = targetPatient || ({
      id: item.patientId || `pat-${item.id}`,
      fullName: item.patientName || 'Paciente',
      cpf: item.patientCpf || '',
      cns: item.patientCns || '',
      birthDate: item.patientBirthDate || '',
      gender: item.patientGender || 'Outro',
      phone: item.patientPhone || '',
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
    } as Patient);

    if (onOpenTimeline) {
      onOpenTimeline(finalPatient);
    }
  };

  const handleOpenEditDateTime = (item: ReceptionQueueItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDateTimeItem(item);
    setEditDate(item.scheduledDate || getTodayDateString());
    setEditTime(item.scheduledTime || '08:00');
  };

  const formatDatePtBr = (dateStr?: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleSaveDateTime = () => {
    if (!editingDateTimeItem || !editDate || !editTime) return;

    const [year, month, day] = editDate.split('-').map(Number);
    const [hours, minutes] = editTime.split(':').map(Number);
    const newDateObj = new Date(year, (month || 1) - 1, day || 1, hours || 8, minutes || 0, 0);
    const newTimestamp = isNaN(newDateObj.getTime()) ? Date.now() : newDateObj.getTime();
    const newFormatted = formatQueueDateTime(editDate, editTime);

    const updatedItem: ReceptionQueueItem = {
      ...editingDateTimeItem,
      scheduledDate: editDate,
      scheduledTime: editTime,
      timestamp: newTimestamp,
      formattedDateTime: newFormatted,
      updatedAt: Date.now(),
    };

    if (onUpdateQueueItem) {
      onUpdateQueueItem(updatedItem);
    } else if (onUpdateQueueItemDateTime) {
      onUpdateQueueItemDateTime(editingDateTimeItem.id, editDate, editTime);
    }

    if (onShowToast) {
      onShowToast(
        'success',
        `Data e horário de "${editingDateTimeItem.patientName}" atualizados para ${formatDatePtBr(editDate)} às ${editTime}.`,
        'Horário Atualizado'
      );
    }

    setEditingDateTimeItem(null);
  };

  // Drag & Drop reorder execution for any professional's queue
  const handleReorderItem = (
    sourceItemId: string,
    targetItemId: string,
    position: 'before' | 'after'
  ) => {
    if (!sourceItemId || !targetItemId || sourceItemId === targetItemId) return;

    const sourceItem = mergedAllQueueItems.find((i) => i.id === sourceItemId);
    const targetItem = mergedAllQueueItems.find((i) => i.id === targetItemId);
    if (!sourceItem || !targetItem) return;

    const targetProfKey = targetItem.professionalId || targetItem.professionalName || 'geral';

    const profGroupItems = mergedAllQueueItems
      .filter((i) => {
        const pKey = i.professionalId || i.professionalName || 'geral';
        return pKey === targetProfKey && isItemInDateScope(i);
      })
      .sort((a, b) => getItemOrderValue(a) - getItemOrderValue(b));

    const filteredGroup = profGroupItems.filter((i) => i.id !== sourceItemId);
    const targetIdx = filteredGroup.findIndex((i) => i.id === targetItemId);
    if (targetIdx === -1) return;

    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;

    const updatedSourceItem: ReceptionQueueItem = {
      ...sourceItem,
      professionalId: targetItem.professionalId,
      professionalName: targetItem.professionalName,
      professionalProfession: targetItem.professionalProfession,
      scheduledDate: targetItem.scheduledDate || sourceItem.scheduledDate,
    };

    filteredGroup.splice(insertIdx, 0, updatedSourceItem);

    const reorderedResults = filteredGroup.map((item, index) => ({
      ...item,
      orderIndex: (index + 1) * 10,
      updatedAt: Date.now(),
    }));

    if (onReorderQueue) {
      onReorderQueue(reorderedResults);
    }

    if (onShowToast) {
      onShowToast(
        'success',
        `"${sourceItem.patientName}" reposicionado(a) para a posição ${insertIdx + 1}º da fila.`,
        'Fila Reposicionada'
      );
    }
  };

  const handleQuickMove = (item: ReceptionQueueItem, direction: 'top' | 'up' | 'down' | 'bottom') => {
    const profKey = item.professionalId || item.professionalName || 'geral';
    const profGroupItems = mergedAllQueueItems
      .filter((i) => {
        const pKey = i.professionalId || i.professionalName || 'geral';
        return pKey === profKey && isItemInDateScope(i);
      })
      .sort((a, b) => getItemOrderValue(a) - getItemOrderValue(b));

    const currentIndex = profGroupItems.findIndex((i) => i.id === item.id);
    if (currentIndex === -1) return;

    let targetIndex = currentIndex;
    if (direction === 'top') targetIndex = 0;
    else if (direction === 'up') targetIndex = Math.max(0, currentIndex - 1);
    else if (direction === 'down') targetIndex = Math.min(profGroupItems.length - 1, currentIndex + 1);
    else if (direction === 'bottom') targetIndex = profGroupItems.length - 1;

    if (targetIndex === currentIndex) return;

    const reorderedList = [...profGroupItems];
    const [moved] = reorderedList.splice(currentIndex, 1);
    reorderedList.splice(targetIndex, 0, moved);

    const reorderedResults = reorderedList.map((it, idx) => ({
      ...it,
      orderIndex: (idx + 1) * 10,
      updatedAt: Date.now(),
    }));

    if (onReorderQueue) {
      onReorderQueue(reorderedResults);
    }

    if (onShowToast) {
      onShowToast(
        'success',
        `"${item.patientName}" reposicionado(a) para o ${targetIndex + 1}º lugar da fila.`,
        'Posição Atualizada'
      );
    }
  };

  const handleCalendarDayClick = (dateStr: string) => {
    if (calendarMode === 'single') {
      setCustomStartDate(dateStr);
      setCustomEndDate(dateStr);
      if (dateStr === todayStr) {
        setDateScope('today');
      } else {
        setDateScope('custom');
      }
    } else {
      if (customStartDate && customEndDate && customStartDate !== customEndDate) {
        setCustomStartDate(dateStr);
        setCustomEndDate(dateStr);
        setDateScope('custom');
      } else if (customStartDate && customEndDate === customStartDate) {
        if (dateStr >= customStartDate) {
          setCustomEndDate(dateStr);
        } else {
          setCustomEndDate(customStartDate);
          setCustomStartDate(dateStr);
        }
        setDateScope('custom');
      } else {
        setCustomStartDate(dateStr);
        setCustomEndDate(dateStr);
        setDateScope('custom');
      }
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleShowAbandoned = (profId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowAbandonedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(profId)) {
        next.delete(profId);
      } else {
        next.add(profId);
      }
      return next;
    });
  };

  const renderRiskBadge = (risk?: RiskClassification) => {
    if (!risk) return null;
    const map: Record<RiskClassification, { label: string; bg: string; text: string; dot: string; border: string }> = {
      vermelho: {
        label: 'Vermelho • Emergência',
        bg: 'bg-red-100 dark:bg-red-950/80',
        text: 'text-red-700 dark:text-red-200 font-black',
        dot: 'bg-red-600 animate-ping',
        border: 'border-red-300 dark:border-red-800',
      },
      laranja: {
        label: 'Laranja • Muito Urgente',
        bg: 'bg-orange-100 dark:bg-orange-950/80',
        text: 'text-orange-800 dark:text-orange-200 font-bold',
        dot: 'bg-orange-500',
        border: 'border-orange-300 dark:border-orange-800',
      },
      amarelo: {
        label: 'Amarelo • Urgente',
        bg: 'bg-amber-100 dark:bg-amber-950/80',
        text: 'text-amber-800 dark:text-amber-200 font-bold',
        dot: 'bg-amber-500',
        border: 'border-amber-300 dark:border-amber-800',
      },
      verde: {
        label: 'Verde • Pouco Urgente',
        bg: 'bg-emerald-100 dark:bg-emerald-950/80',
        text: 'text-emerald-800 dark:text-emerald-200 font-medium',
        dot: 'bg-emerald-500',
        border: 'border-emerald-300 dark:border-emerald-800',
      },
      azul: {
        label: 'Azul • Não Urgente',
        bg: 'bg-sky-100 dark:bg-sky-950/80',
        text: 'text-sky-800 dark:text-sky-200 font-medium',
        dot: 'bg-sky-500',
        border: 'border-sky-300 dark:border-sky-800',
      },
    };
    const c = map[risk];
    if (!c) return null;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs ${c.bg} ${c.text} border ${c.border}`}
      >
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span>{c.label}</span>
      </span>
    );
  };

  // Handlers for filter pill clicks
  const handleSelectTodayScope = () => {
    setDateScope('today');
    if (selectedStatuses.length === 0) {
      setSelectedStatuses(['active']);
    }
  };

  const handleSelectAllScope = () => {
    if (dateScope === 'all' && selectedStatuses.length === 0) {
      setDateScope('today');
      setSelectedStatuses(['active']);
    } else {
      setDateScope('all');
      setSelectedStatuses([]);
    }
  };

  const handleToggleStatus = (statusKey: 'active' | 'completed' | 'cancelled') => {
    setSelectedStatuses((prev) => {
      if (prev.includes(statusKey)) {
        return prev.filter((s) => s !== statusKey);
      } else {
        return [...prev, statusKey];
      }
    });
  };

  // State flags for UI highlighting
  const isTodayActive = dateScope === 'today';
  const isAllDatesActive = dateScope === 'all';
  const isAllStandaloneActive = dateScope === 'all' && selectedStatuses.length === 0;

  // Patient Card Renderer
  const renderPatientCard = (item: ReceptionQueueItem) => {
    const isAssignedToCurrentUser = Boolean(currentUser && currentUser.id === item.professionalId);
    const canManageItem = isAssignedToCurrentUser || isAdmin;
    const canCall = canManageItem;
    const canAttend = canManageItem && !isAdministrative;
    const isCalling = item.status === 'calling';
    const isWaiting = item.status === 'waiting';
    const isInConsultation = item.status === 'in_consultation' || item.status === 'in_service';
    const isCompleted = item.status === 'completed';
    const isCancelled = item.status === 'cancelled';
    const isAbandoned = item.status === 'abandoned';
    const isAbandonedOrCancelled = isAbandoned || isCancelled;

    const isAttendedBySomeone = isInConsultation;
    const isAttendedByMe = isAttendedBySomeone && Boolean(
      (currentUser && item.currentAttendingProfessionalId === currentUser.id) ||
      (currentUser && !item.currentAttendingProfessionalId && item.professionalId === currentUser.id)
    );
    const isAttendedByOther = isAttendedBySomeone && !isAttendedByMe;
    const attendingDoctorName = item.currentAttendingProfessionalName || item.professionalName || 'outro profissional';

    const simpleAge = formatSimpleAge(item.patientBirthDate);
    const rankInfo = profRankingMap.get(item.id) || {
      profOrder: 1,
      profWaitingOrder: null,
      profTotal: 1,
      profWaitingTotal: 1,
    };

    // Verifica se a consulta já expirou (apenas para consultas ativas)
    const isAppointmentExpired = (() => {
      if (item.status === 'completed' || item.status === 'abandoned' || item.status === 'cancelled') {
        return true;
      }
      if (!item.scheduledDate && !item.timestamp) return false;
      let targetDate: Date;
      if (item.scheduledDate) {
        const timeParts = (item.scheduledTime || '23:59').split(':');
        const [year, month, day] = item.scheduledDate.split('-').map(Number);
        targetDate = new Date(year, month - 1, day, Number(timeParts[0]) || 23, Number(timeParts[1]) || 59, 59);
      } else if (item.timestamp) {
        targetDate = new Date(item.timestamp);
      } else {
        return false;
      }
      return targetDate.getTime() < Date.now();
    })();

    // O botão de WhatsApp deve ser exibido:
    // 1. Para pacientes com status de Desistência ou Cancelado (para aviso de reagendamento)
    // 2. Para pacientes em atendimento/aguardando caso a data/hora agendada ainda não tenha expirado
    const showWhatsAppButton = isAbandonedOrCancelled || (!isCompleted && !isAppointmentExpired);

    const isBeingDragged = draggedItemId === item.id;
    const isDragOverThis = dragOverItemId === item.id;

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: isBeingDragged ? 0.45 : 1, y: 0, scale: isBeingDragged ? 0.98 : 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        draggable={openDropdownId !== item.id}
        onDragStart={(e: any) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', item.id);
            e.dataTransfer.effectAllowed = 'move';
          }
          setDraggedItemId(item.id);
        }}
        onDragOver={(e: any) => {
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
          }
          if (draggedItemId && draggedItemId !== item.id) {
            const rect = e.currentTarget.getBoundingClientRect();
            const isTop = (e.clientY - rect.top) < (rect.height / 2);
            setDragOverItemId(item.id);
            setDragPosition(isTop ? 'before' : 'after');
          }
        }}
        onDragLeave={(e: any) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverItemId === item.id) {
              setDragOverItemId(null);
              setDragPosition(null);
            }
          }
        }}
        onDrop={(e: any) => {
          e.preventDefault();
          const sourceId = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || draggedItemId;
          if (sourceId && sourceId !== item.id) {
            handleReorderItem(sourceId, item.id, dragPosition || 'after');
          }
          setDraggedItemId(null);
          setDragOverItemId(null);
          setDragPosition(null);
        }}
        onDragEnd={() => {
          setDraggedItemId(null);
          setDragOverItemId(null);
          setDragPosition(null);
        }}
        className={`relative rounded-3xl border transition-all cursor-grab active:cursor-grabbing select-none ${
          openDropdownId === item.id ? 'z-50' : 'z-10'
        } ${
          isBeingDragged
            ? 'border-teal-500 ring-2 ring-teal-500/60 shadow-2xl bg-teal-50/30 dark:bg-teal-950/40'
            : isCalling
            ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border-emerald-500 ring-4 ring-emerald-500/20 shadow-xl'
            : isInConsultation
            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 shadow-xs'
        }`}
      >
        {/* Drop Target Visual Indicator Bars */}
        {isDragOverThis && dragPosition === 'before' && (
          <div className="absolute -top-2 left-3 right-3 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 rounded-full shadow-lg shadow-teal-500/60 z-40 animate-pulse flex items-center justify-between pointer-events-none">
            <span className="w-3 h-3 rounded-full bg-teal-500 -ml-1 border-2 border-white shadow-xs" />
            <span className="text-[10px] font-black uppercase text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-900/90 px-2 py-0.5 rounded-full border border-teal-400 shadow-xs">
              Mover para esta posição (Acima)
            </span>
            <span className="w-3 h-3 rounded-full bg-teal-500 -mr-1 border-2 border-white shadow-xs" />
          </div>
        )}
        {isDragOverThis && dragPosition === 'after' && (
          <div className="absolute -bottom-2 left-3 right-3 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 rounded-full shadow-lg shadow-teal-500/60 z-40 animate-pulse flex items-center justify-between pointer-events-none">
            <span className="w-3 h-3 rounded-full bg-teal-500 -ml-1 border-2 border-white shadow-xs" />
            <span className="text-[10px] font-black uppercase text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-900/90 px-2 py-0.5 rounded-full border border-teal-400 shadow-xs">
              Mover para esta posição (Abaixo)
            </span>
            <span className="w-3 h-3 rounded-full bg-teal-500 -mr-1 border-2 border-white shadow-xs" />
          </div>
        )}

        {/* Visual Animated Green Top Bar if Calling */}
        {isCalling && (
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 animate-pulse rounded-t-3xl" />
        )}

        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Position & Patient Info */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
            {/* 0. Alça / Grip para arrastar e reposicionar a fila */}
            <div
              className="cursor-grab active:cursor-grabbing p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center shrink-0"
              title="Clique e segure para arrastar e reposicionar na fila de atendimento"
            >
              <GripVertical className="w-5 h-5" />
            </div>

            {/* 1. Ordem (1º, 2º... sem texto adicional) */}
            <div
              className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0 font-black text-lg sm:text-xl text-center shadow-xs transition-transform ${
                isCalling
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-bounce'
                  : isWaiting
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title={`Posição na fila: ${rankInfo.profOrder}º de ${rankInfo.profTotal}`}
            >
              <span>{rankInfo.profOrder}º</span>
            </div>

            {/* 2. Informações do Paciente e da Fila */}
            <div className="space-y-1.5 min-w-0 flex-1">
              {/* Linha 1: Nome completo do paciente com a idade + Fila de: [nome do profissional] + Status em tempo real */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {item.patientName}
                  {simpleAge && (
                    <span className="text-slate-600 dark:text-slate-400 font-bold text-sm sm:text-base ml-1.5">
                      ({simpleAge})
                    </span>
                  )}
                </h3>

                {/* Fila de: [nome completo do profissional] com o mesmo tamanho e dimensão do componente 3 */}
                <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight bg-slate-100 dark:bg-slate-800/90 px-3 py-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>
                    Fila de: <strong className="text-teal-700 dark:text-teal-400 font-black">{item.professionalName}</strong>
                  </span>
                </span>

                {/* Status em tempo real se chamando */}
                {isCalling && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm shadow-emerald-500/30 animate-pulse">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Chamando Agora</span>
                  </span>
                )}
                {isWaiting && rankInfo.profWaitingOrder === 1 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500 text-white text-[10px] font-extrabold shadow-xs">
                    <span>👉 Próximo</span>
                  </span>
                )}

                {/* Status em tempo real se em atendimento por outro colega ou por mim */}
                {isAttendedByOther && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/90 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-black shadow-xs animate-pulse">
                    <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Em atendimento por {attendingDoctorName}</span>
                  </span>
                )}
                {isAttendedByMe && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950/90 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 text-xs font-black shadow-xs">
                    <Play className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 fill-current shrink-0" />
                    <span>Você está atendendo</span>
                  </span>
                )}
              </div>

              {/* Linha 2: Data e hora do atendimento + Ícone de WhatsApp */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                {/* Data e hora do atendimento (Clicável para editar data e hora para todos os pacientes de todos os profissionais) */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleOpenEditDateTime(item, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenEditDateTime(item);
                    }
                  }}
                  className="font-extrabold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 px-3 py-1 rounded-xl border border-teal-200 hover:border-teal-400 dark:border-teal-850 dark:hover:border-teal-700 text-xs cursor-pointer select-none transition-all active:scale-95 group/datebtn shadow-xs hover:shadow-sm"
                  title="Clique para editar a data e horário do atendimento deste paciente"
                >
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 group-hover/datebtn:rotate-12 transition-transform shrink-0" />
                  <span>
                    {item.formattedDateTime
                      ? item.formattedDateTime.replace(/\s*\+\s*/g, ' ')
                      : formatQueueDateTime(item.scheduledDate, item.scheduledTime)}
                  </span>
                  <Pencil className="w-3 h-3 text-teal-600 dark:text-teal-400 opacity-60 group-hover/datebtn:opacity-100 group-hover/datebtn:scale-110 transition-all shrink-0 ml-0.5" />
                </span>

                {/* Ícone de WhatsApp na Linha 2 com 3 estados animados, hover card e abertura do CRM Modal */}
                {showWhatsAppButton && (() => {
                  const matchingAppt = getAppointmentForQueueItem(item);
                  const hasReplied = Boolean(matchingAppt.notifications?.hasReplied);
                  const isReminderSent = Boolean(matchingAppt.notifications?.reminderSent);

                  return (
                    <div
                      className="relative inline-block"
                      onMouseEnter={() => setHoveredWhatsAppItemId(item.id)}
                      onMouseLeave={() => setHoveredWhatsAppItemId((prev) => (prev === item.id ? null : prev))}
                    >
                      <button
                        type="button"
                        id={`queue-whatsapp-btn-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChatAppointment(matchingAppt);
                        }}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all cursor-pointer shadow-xs relative ${
                          hasReplied
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500 animate-pulse border-blue-400 dark:border-blue-700 shadow-md shadow-blue-500/25'
                            : isReminderSent
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500 animate-pulse border-rose-400 dark:border-rose-700 shadow-md shadow-rose-500/25'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/40 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 animate-pulse'
                        }`}
                        title="Abrir CRM WhatsApp e Histórico de Mensagens"
                      >
                        <svg
                          className={`w-3.5 h-3.5 fill-current shrink-0 ${
                            hasReplied
                              ? 'text-blue-600 dark:text-blue-400'
                              : isReminderSent
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                          viewBox="0 0 24 24"
                        >
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        <span>WhatsApp</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hasReplied ? 'bg-blue-600' : isReminderSent ? 'bg-rose-600' : 'bg-emerald-500'
                          }`}
                        />
                      </button>

                      {/* Tooltip Card no Hover com a última mensagem respondida, data, hora e minutos */}
                      {hoveredWhatsAppItemId === item.id && (
                        <div className="absolute left-0 bottom-full mb-2 z-50 w-64 sm:w-72 p-3 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white shadow-2xl border border-slate-700 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center gap-1.5 font-bold mb-1.5 pb-1 border-b border-slate-800">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Status WhatsApp</span>
                            {hasReplied ? (
                              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-blue-600 font-bold">
                                Respondido
                              </span>
                            ) : isReminderSent ? (
                              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-rose-600 font-bold">
                                Aguardando Resposta
                              </span>
                            ) : (
                              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 font-bold">
                                Não Enviado
                              </span>
                            )}
                          </div>

                          {hasReplied && matchingAppt.notifications?.lastPatientReply ? (
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-400 font-semibold">Última mensagem respondida:</p>
                              <p className="text-slate-100 font-medium italic bg-slate-800/80 p-2 rounded-xl text-[11px] line-clamp-3">
                                "{matchingAppt.notifications.lastPatientReply.message}"
                              </p>
                              <p className="text-[10px] text-blue-300 font-semibold pt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(matchingAppt.notifications.lastPatientReply.repliedAt).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </p>
                            </div>
                          ) : isReminderSent ? (
                            <div className="space-y-1">
                              <p className="text-slate-300">
                                Lembrete enviado ao webhook do n8n. Aguardando retorno do paciente.
                              </p>
                              {matchingAppt.notifications?.reminderSentAt && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    Enviado em:{' '}
                                    {new Date(matchingAppt.notifications.reminderSentAt).toLocaleString('pt-BR', {
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
                            Clique para abrir o CRM e histórico de mensagens
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right: Actions Dropdown Menu (Lista Suspensa) */}
          <div className="relative queue-actions-dropdown-container shrink-0 self-start md:self-center">
            {isCompleted || isAbandoned || isCancelled ? (
              <div className="flex items-center gap-2">
                {isCompleted && (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Atendido</span>
                  </span>
                )}
                {isAbandoned && (
                  <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-amber-600" />
                    <span>Desistência</span>
                  </span>
                )}
                {isCancelled && (
                  <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Cancelado</span>
                  </span>
                )}

                <button
                  type="button"
                  id={`queue-actions-menu-btn-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                  }}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Ações da fila"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <SpecularButton
                type="button"
                id={`queue-actions-menu-btn-${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                }}
                size="sm"
                radius={12}
                className={`px-3.5 py-2 text-xs font-extrabold flex items-center gap-2 transition-all ${
                  isCalling
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 shadow-xs'
                }`}
              >
                {isCalling ? (
                  <Volume2 className="w-3.5 h-3.5 animate-bounce text-white" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                )}
                <span>Ações</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openDropdownId === item.id ? 'rotate-180' : ''
                  }`}
                />
              </SpecularButton>
            )}

            {/* Dropdown Menu (Lista Suspensa) */}
            {openDropdownId === item.id && (
              <div
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/30 dark:shadow-black/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between">
                  <span>Fila: {(item.professionalName || 'Profissional').split(' ')[0]}</span>
                  <span className="font-black text-teal-600">#{rankInfo.profOrder}º na fila</span>
                </div>

                {!canManageItem && (
                  <div className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="truncate">Atendimento restrito a {item.professionalName || 'Profissional Responsável'}</span>
                  </div>
                )}

                {/* 1. Linha do Tempo (Prontuário & Histórico Clínico - Sempre acessível para consulta) */}
                <button
                  type="button"
                  id={`dropdown-timeline-${item.id}`}
                  onClick={() => {
                    handleOpenTimeline(item);
                    setOpenDropdownId(null);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                  title="Abrir linha do tempo e prontuário deste paciente"
                >
                  <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span>Linha do tempo</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Prontuário & histórico clínico
                    </span>
                  </div>
                </button>

                {/* 1.5. Editar Data e Horário */}
                <button
                  type="button"
                  id={`dropdown-edit-datetime-${item.id}`}
                  onClick={() => {
                    handleOpenEditDateTime(item);
                    setOpenDropdownId(null);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                  title="Alterar data e horário deste paciente na fila"
                >
                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span>Editar Data e Horário</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Reagendar ou ajustar horário na fila
                    </span>
                  </div>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* 2. Chamar */}
                <button
                  type="button"
                  id={`dropdown-call-${item.id}`}
                  disabled={!canCall}
                  onClick={() => {
                    if (!canCall) return;
                    handleCall(item);
                    setActiveCallingItem(item);
                    setOpenDropdownId(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 transition-colors ${
                    !canCall
                      ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : isCalling
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300'
                  }`}
                  title={!canCall ? `Disponível apenas para ${item.professionalName}` : 'Chamar paciente no painel'}
                >
                  <Volume2 className={`w-4 h-4 shrink-0 ${isCalling ? 'text-emerald-500 animate-bounce' : 'text-emerald-600'}`} />
                  <div className="flex flex-col min-w-0">
                    <span>{isCalling ? 'Chamando no Painel...' : 'Chamar no Painel (TV)'}</span>
                    {!canCall && (
                      <span className="text-[10px] text-slate-400 font-normal truncate">
                        Apenas {item.professionalName}
                      </span>
                    )}
                  </div>
                </button>

                {/* 3. Atender */}
                <button
                  type="button"
                  id={`dropdown-attend-${item.id}`}
                  disabled={!canAttend || isAttendedByOther}
                  onClick={() => {
                    if (!canAttend || isAttendedByOther) return;
                    handleStartConsult(item);
                    setOpenDropdownId(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 transition-colors ${
                    !canAttend || isAttendedByOther
                      ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300'
                  }`}
                  title={
                    isAttendedByOther
                      ? `Atendimento em andamento com ${attendingDoctorName}. Bloqueado até a finalização.`
                      : !canManageItem
                      ? `Apenas ${item.professionalName} pode realizar este atendimento`
                      : isAdministrative
                      ? 'Perfil Administrativo não realiza atendimento clínico'
                      : 'Iniciar atendimento clínico'
                  }
                >
                  {isAttendedByOther ? (
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Play className="w-4 h-4 text-teal-600 fill-current shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span>{isAttendedByOther ? `Em Atendimento (${attendingDoctorName.split(' ')[0]})` : 'Iniciar Atendimento Clínico'}</span>
                    {isAttendedByOther ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold truncate">
                        Bloqueado por {attendingDoctorName}
                      </span>
                    ) : !canManageItem ? (
                      <span className="text-[10px] text-slate-400 font-normal truncate">
                        Apenas {item.professionalName}
                      </span>
                    ) : isAdministrative ? (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Restrito a prof. de saúde
                      </span>
                    ) : null}
                  </div>
                </button>

                {/* 4. Concluir Atendimento */}
                {!isCompleted && (
                  <button
                    type="button"
                    id={`dropdown-complete-${item.id}`}
                    disabled={!canManageItem}
                    onClick={() => {
                      if (!canManageItem) return;
                      if (onUpdateQueueItemStatus) {
                        onUpdateQueueItemStatus(item.id, 'completed');
                      }
                      setOpenDropdownId(null);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      !canManageItem
                        ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                        : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                    title={!canManageItem ? `Apenas ${item.professionalName}` : 'Marcar paciente como atendido'}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span>Marcar como Atendido</span>
                      {!canManageItem && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">
                          Apenas {item.professionalName}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* 5. Voltar para Aguardando */}
                {(isCalling || isInConsultation || isCompleted || isAbandoned || isCancelled) && (
                  <button
                    type="button"
                    id={`dropdown-reopen-${item.id}`}
                    disabled={!canManageItem}
                    onClick={() => {
                      if (!canManageItem) return;
                      if (onUpdateQueueItemStatus) {
                        onUpdateQueueItemStatus(item.id, 'waiting');
                      }
                      setOpenDropdownId(null);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      !canManageItem
                        ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title={!canManageItem ? `Apenas ${item.professionalName}` : 'Voltar para aguardando'}
                  >
                    <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span>Voltar para Aguardando</span>
                      {!canManageItem && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">
                          Apenas {item.professionalName}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Reposicionamento Rápido na Fila */}
                <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Reposicionar Fila</span>
                  <span className="text-teal-600 font-black">#{rankInfo.profOrder}º de {rankInfo.profTotal}</span>
                </div>

                <div className="grid grid-cols-2 gap-1 p-1.5 bg-slate-50/60 dark:bg-slate-900/60">
                  <button
                    type="button"
                    disabled={rankInfo.profOrder <= 1}
                    onClick={() => {
                      handleQuickMove(item, 'up');
                      setOpenDropdownId(null);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      rankInfo.profOrder <= 1
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 border border-teal-200 dark:border-teal-800'
                    }`}
                    title="Subir 1 posição na fila"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-teal-600" />
                    <span>Subir 1</span>
                  </button>

                  <button
                    type="button"
                    disabled={rankInfo.profOrder >= rankInfo.profTotal}
                    onClick={() => {
                      handleQuickMove(item, 'down');
                      setOpenDropdownId(null);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      rankInfo.profOrder >= rankInfo.profTotal
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 border border-teal-200 dark:border-teal-800'
                    }`}
                    title="Descer 1 posição na fila"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                    <span>Descer 1</span>
                  </button>

                  <button
                    type="button"
                    disabled={rankInfo.profOrder <= 1}
                    onClick={() => {
                      handleQuickMove(item, 'top');
                      setOpenDropdownId(null);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      rankInfo.profOrder <= 1
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800'
                    }`}
                    title="Mover diretamente para o 1º lugar"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mover ao Topo</span>
                  </button>

                  <button
                    type="button"
                    disabled={rankInfo.profOrder >= rankInfo.profTotal}
                    onClick={() => {
                      handleQuickMove(item, 'bottom');
                      setOpenDropdownId(null);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      rankInfo.profOrder >= rankInfo.profTotal
                        ? 'opacity-30 cursor-not-allowed text-slate-400'
                        : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="Mover para o último lugar da fila"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                    <span>Ao Final</span>
                  </button>
                </div>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* 6. Desistência */}
                {!isAbandoned && !isCompleted && (
                  <button
                    type="button"
                    id={`dropdown-abandon-${item.id}`}
                    disabled={!canManageItem}
                    onClick={() => {
                      if (!canManageItem) return;
                      handleAbandon(item);
                      setOpenDropdownId(null);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      !canManageItem
                        ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                        : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                    title={!canManageItem ? `Apenas ${item.professionalName}` : 'Registrar desistência'}
                  >
                    <UserX className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span>Registrar Desistência</span>
                      {!canManageItem && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">
                          Apenas {item.professionalName}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* 7. Cancelar */}
                {!isCancelled && (
                  <button
                    type="button"
                    id={`dropdown-cancel-${item.id}`}
                    disabled={!canManageItem}
                    onClick={() => {
                      if (!canManageItem) return;
                      handleCancel(item);
                      setOpenDropdownId(null);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      !canManageItem
                        ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                        : 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    }`}
                    title={!canManageItem ? `Apenas ${item.professionalName}` : 'Cancelar atendimento'}
                  >
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span>Cancelar Atendimento</span>
                      {!canManageItem && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">
                          Apenas {item.professionalName}
                        </span>
                      )}
                    </div>
                  </button>
                )}

                {/* 7. Remover da Fila */}
                {(isAdmin || canManageItem) && onDeleteQueueItem && (
                  <button
                    type="button"
                    id={`dropdown-delete-${item.id}`}
                    onClick={() => {
                      setOpenDropdownId(null);
                      onDeleteQueueItem(item.id);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Remove apenas o chamado atual da fila de espera. O prontuário e histórico clínico permanecem intactos."
                  >
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span>Remover da Fila</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Apenas remove o chamado da fila)
                      </span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div id="reception-queue-view" className="space-y-6">
      {/* 1. View Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative p-3 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
            <Users className="w-6 h-6" />
            {callingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] font-black text-white items-center justify-center">
                  {callingCount}
                </span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Fila de Atendimento Multiprofissional
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 text-xs font-bold border border-teal-200 dark:border-teal-800">
                {filteredItems.length} pacientes ({groupedByProf.length} profissional(is))
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Ordem de chamada individual classificada por profissional de saúde.</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold inline-flex items-center gap-1">
                <GripVertical className="w-3.5 h-3.5" />
                Clique e segure para arrastar e reposicionar
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Painel TV da Sala de Espera */}
          <SpecularButton
            type="button"
            id="open-tv-panel-header-btn"
            onClick={() => {
              if (onOpenPublicCallScreen) {
                onOpenPublicCallScreen();
              } else {
                window.open(`${window.location.origin}${window.location.pathname}?painel=chamada`, '_blank');
              }
            }}
            size="sm"
            radius={14}
            className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-teal-700 dark:text-teal-300 font-bold text-xs sm:text-sm border-slate-300 dark:border-slate-700 shadow-xs flex items-center gap-1.5"
            title="Abrir Painel TV de Chamadas da Sala de Espera"
          >
            <Tv className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Painel TV</span>
          </SpecularButton>

          {/* QR Code para Celular dos Pacientes */}
          <SpecularButton
            type="button"
            id="open-qrcode-header-btn"
            onClick={() => setIsQrModalOpen(true)}
            size="sm"
            radius={14}
            className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border-slate-300 dark:border-slate-700 shadow-xs flex items-center gap-1.5"
            title="Gerar QR Code para celular dos pacientes"
          >
            <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden md:inline">QR Code</span>
          </SpecularButton>

          {/* Imprimir Fila Geral A4 */}
          <SpecularButton
            type="button"
            id="print-general-queue-header-btn"
            onClick={handlePrintAllQueue}
            size="sm"
            radius={14}
            className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border-slate-300 dark:border-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Imprimir relatório A4 com a fila de atendimento atual"
          >
            <Printer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="hidden md:inline">Imprimir Fila</span>
          </SpecularButton>

          {onRefreshQueue && (
            <SpecularButton
              type="button"
              id="refresh-queue-btn"
              onClick={onRefreshQueue}
              size="icon"
              radius={12}
              className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 border-transparent"
              title="Recarregar Fila"
            >
              <RotateCw className="w-4 h-4" />
            </SpecularButton>
          )}

          {onOpenAddToQueue && (
            <SpecularButton
              type="button"
              id="add-to-queue-header-btn"
              onClick={onOpenAddToQueue}
              size="sm"
              radius={14}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold shadow-md shadow-teal-600/20 text-xs sm:text-sm border-teal-500/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Paciente à Fila</span>
            </SpecularButton>
          )}
        </div>
      </div>

      {/* 2. Filter Bar with Multi-selection Dropdown & View Mode Lado a Lado */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Left Side: Dropdown de Filtros (Data & Status) + Alternador de Visualização */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Lista Suspensa de Filtros (Data & Status) Multiseleção */}
          <div className="relative queue-filter-dropdown-container">
            <button
              type="button"
              id="queue-filters-dropdown-btn"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Filtrar por Período e Status de Atendimento"
            >
              <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Filtros (
                {dateScope === 'today'
                  ? 'Hoje'
                  : dateScope === 'custom'
                  ? customStartDate === customEndDate
                    ? formatDatePtBr(customStartDate)
                    : `${formatDatePtBr(customStartDate).slice(0, 5)} a ${formatDatePtBr(customEndDate).slice(0, 5)}`
                  : 'Todas as Datas'}
                )
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-extrabold">
                {filteredItems.length}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isFilterDropdownOpen ? 'rotate-180 text-teal-600' : ''
                }`}
              />
            </button>

            {/* Dropdown Popover Panel */}
            {isFilterDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-80 sm:w-[380px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/20 dark:shadow-black/70 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Filtros da Fila
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                    {filteredItems.length} paciente(s)
                  </span>
                </div>

                {/* Section A: Período / Escopo de Data com Calendário */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-0.5">
                      Período da Fila
                    </span>
                    {dateScope !== 'today' && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateScope('today');
                          setCustomStartDate(todayStr);
                          setCustomEndDate(todayStr);
                        }}
                        className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Restaurar para a data atual"
                      >
                        <RotateCw className="w-2.5 h-2.5" />
                        <span>Voltar para Hoje (Padrão)</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      id="filter-scope-today-btn"
                      onClick={() => {
                        setIsCalendarOpen((prev) => !prev);
                        if (dateScope === 'all') {
                          setDateScope('today');
                          setCustomStartDate(todayStr);
                          setCustomEndDate(todayStr);
                        }
                        if (selectedStatuses.length === 0) setSelectedStatuses(['active']);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                        dateScope === 'today' || dateScope === 'custom'
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100 ring-1 ring-teal-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                      title="Clique para abrir o calendário e escolher uma data ou intervalo"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">
                          {dateScope === 'today'
                            ? 'Dia Vigente'
                            : dateScope === 'custom'
                            ? customStartDate === customEndDate
                              ? formatDatePtBr(customStartDate)
                              : `${formatDatePtBr(customStartDate).slice(0, 5)} - ${formatDatePtBr(customEndDate).slice(0, 5)}`
                            : 'Dia Vigente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-extrabold">
                          {dateScope === 'today' ? countTodayTotal : countScopeTotal}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-teal-600 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    <button
                      type="button"
                      id="filter-scope-all-btn"
                      onClick={() => {
                        setDateScope('all');
                        setIsCalendarOpen(false);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                        dateScope === 'all'
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100 ring-1 ring-teal-500/20 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Todas as Datas</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                        {countAllTotal}
                      </span>
                    </button>
                  </div>

                  {/* Painel do Calendário (Data única ou Intervalo de Datas com Calendário Interativo) */}
                  {isCalendarOpen && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-teal-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      {/* Abas: Data Única vs Intervalo */}
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMode('single');
                              setCustomEndDate(customStartDate);
                              setDateScope(customStartDate === todayStr ? 'today' : 'custom');
                            }}
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              calendarMode === 'single'
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Data Única
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMode('range');
                              setDateScope('custom');
                            }}
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              calendarMode === 'range'
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Intervalo
                          </button>
                        </div>
                        <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400">
                          {dateScope === 'today'
                            ? 'Hoje (Dia Vigente)'
                            : customStartDate === customEndDate
                            ? formatDatePtBr(customStartDate)
                            : `${formatDatePtBr(customStartDate).slice(0, 5)} a ${formatDatePtBr(customEndDate).slice(0, 5)}`}
                        </span>
                      </div>

                      {/* Campos para Digitar a Data Única ou Intervalo */}
                      {calendarMode === 'single' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">
                            Digitar Data
                          </label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomStartDate(val);
                              setCustomEndDate(val);
                              if (val) {
                                const [y, m] = val.split('-').map(Number);
                                if (y && m) setCalendarViewDate(new Date(y, m - 1, 1));
                              }
                              if (val === todayStr) {
                                setDateScope('today');
                              } else {
                                setDateScope('custom');
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">
                              De (Início)
                            </label>
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomStartDate(val);
                                if (val) {
                                  const [y, m] = val.split('-').map(Number);
                                  if (y && m) setCalendarViewDate(new Date(y, m - 1, 1));
                                }
                                setDateScope('custom');
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block">
                              Até (Fim)
                            </label>
                            <input
                              type="date"
                              value={customEndDate}
                              min={customStartDate}
                              onChange={(e) => {
                                setCustomEndDate(e.target.value);
                                setDateScope('custom');
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {/* Calendário Interativo para Selecionar Data ou Intervalo Diretamente */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-2">
                        {/* Header de Navegação do Mês */}
                        <div className="flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                            className="p-1 rounded-md text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Mês Anterior"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {CALENDAR_MONTHS[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                            className="p-1 rounded-md text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Próximo Mês"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Cabeçalho dos Dias da Semana */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {CALENDAR_WEEK_DAYS.map((w, idx) => (
                            <span key={idx} className="text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">
                              {w.slice(0, 1)}
                            </span>
                          ))}
                        </div>

                        {/* Grade de Dias */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {calendarDays.map((item, idx) => {
                            const isSelectedStart = item.dateStr === customStartDate;
                            const isSelectedEnd = item.dateStr === customEndDate;
                            const isInRange =
                              calendarMode === 'range' &&
                              customStartDate &&
                              customEndDate &&
                              item.dateStr >= customStartDate &&
                              item.dateStr <= customEndDate;
                            const isToday = item.dateStr === todayStr;

                            let btnClasses = 'text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600';
                            if (!item.isCurrentMonth) {
                              btnClasses = 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800';
                            }
                            if (isSelectedStart || isSelectedEnd) {
                              btnClasses = 'bg-teal-600 text-white font-black shadow-xs hover:bg-teal-500';
                            } else if (isInRange) {
                              btnClasses = 'bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold';
                            }

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleCalendarDayClick(item.dateStr)}
                                className={`h-6 text-[10.5px] rounded-md transition-all flex items-center justify-center relative cursor-pointer ${btnClasses} ${
                                  isToday && !isSelectedStart && !isSelectedEnd ? 'ring-1 ring-teal-500 font-bold' : ''
                                }`}
                                title={formatDatePtBr(item.dateStr)}
                              >
                                {item.day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section B: Status de Atendimento (Multiseleção) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-0.5">
                    Status de Atendimento
                  </span>
                  <div className="space-y-1">
                    {/* 1. Aguardando / Chamando */}
                    <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes('active')}
                          onChange={() => handleToggleStatus('active')}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Aguardando / Chamando
                        </span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-extrabold border border-teal-200 dark:border-teal-800">
                        {countActive}
                      </span>
                    </label>

                    {/* 2. Atendidos */}
                    <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes('completed')}
                          onChange={() => handleToggleStatus('completed')}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Atendidos
                        </span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-800">
                        {countCompleted}
                      </span>
                    </label>

                    {/* 3. Desistência / Cancelados */}
                    <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes('cancelled')}
                          onChange={() => handleToggleStatus('cancelled')}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Desistência / Cancelados
                        </span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold border border-rose-200 dark:border-rose-800">
                        {countCancelled}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setDateScope('today');
                      setCustomStartDate(todayStr);
                      setCustomEndDate(todayStr);
                      setIsCalendarOpen(false);
                      setSelectedStatuses(['active']);
                    }}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    Restaurar Padrão
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterDropdownOpen(false)}
                    className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Alternador de Visualização: [ Por Profissional | Lista Contínua ] */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              id="view-mode-by-prof-btn"
              onClick={() => setViewMode('by_professional')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'by_professional'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Visualizar filas separadas e organizadas por profissional"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Por Profissional</span>
            </button>
            <button
              type="button"
              id="view-mode-list-btn"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Visualizar lista contínua"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Contínua</span>
            </button>
          </div>
        </div>

        {/* Right Side: Seleção de Profissional + Checkbox Meus Atendimentos + Busca */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 3. Seleção de Profissional: [ Todos os Profissionais ▾ ] */}
          <select
            id="queue-filter-professional-select"
            value={selectedProfId}
            onChange={(e) => setSelectedProfId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
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

          {/* 4. Checkbox: [ ] Meus atendimentos */}
          {currentUser && !isAdministrative && (
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors">
              <input
                type="checkbox"
                id="queue-only-mine-toggle"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span>Meus atendimentos</span>
            </label>
          )}

          {/* 5. Campo de Busca: [ 🔍 Buscar paciente, CPF... ] */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="queue-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar paciente, CPF..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Queue List / Cards */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mb-3">
            <Users className="w-8 h-8 opacity-70" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Nenhum paciente na fila de atendimento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Utilize o botão superior <strong>"Adicionar Paciente à Fila"</strong> para inserir pacientes com data, horário e profissional direcionado.
          </p>
        </div>
      ) : viewMode === 'by_professional' ? (
        /* Organização por Fila de Cada Profissional */
        <div className="space-y-6">
          {groupedByProf.map((group) => {
            const isMyQueue = Boolean(currentUser && currentUser.id === group.professionalId);
            const isExpanded = expandedGroupIds.has(group.professionalId);
            const isShowingAbandoned = showAbandonedGroupIds.has(group.professionalId);
            const groupHasOpenDropdown = Boolean(
              openDropdownId && group.items.some((item) => item.id === openDropdownId)
            );

            // Pacientes desistentes/cancelados ficam ocultos por padrão, a menos que o botão de desistentes seja acionado
            const visibleItems = group.items.filter((item) => {
              const isAbandoned = item.status === 'abandoned' || item.status === 'cancelled';
              if (isAbandoned) {
                return isShowingAbandoned;
              }
              return true;
            });

            return (
              <div
                key={group.professionalId}
                id={`queue-group-${group.professionalId}`}
                className={`rounded-3xl bg-indigo-50/40 dark:bg-slate-900/60 border-2 border-indigo-200/80 dark:border-indigo-950/60 p-3 sm:p-4 space-y-3 shadow-sm transition-all ${
                  groupHasOpenDropdown ? 'relative z-50' : 'relative z-10'
                }`}
              >
                {/* Professional Queue Header Card - Drasticamente diferenciado nos modos Claro e Escuro */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleGroupExpand(group.professionalId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleGroupExpand(group.professionalId);
                    }
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 text-white p-4 sm:p-5 rounded-2xl border-2 border-indigo-400/60 hover:border-teal-400 shadow-xl shadow-indigo-950/25 cursor-pointer select-none group transition-all duration-200 hover:brightness-105"
                  title="Clique para expandir ou recolher a lista de pacientes deste profissional"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500/40 via-teal-500/30 to-blue-600/30 text-teal-300 border-2 border-indigo-300/60 dark:border-indigo-400/50 flex items-center justify-center font-black shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7 text-teal-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-xl font-black text-white tracking-tight truncate group-hover:text-teal-200 transition-colors">
                          {group.professionalName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-2.5 mt-1.5 flex-wrap">
                        {/* 1. Aguardando */}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/25 text-teal-200 border border-teal-400/50 text-xs font-bold shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
                          <span>{group.waitingCount} aguardando</span>
                        </span>

                        {/* 2. Atendidos */}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 text-slate-200 border border-slate-700 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{group.completedCount} atendidos</span>
                        </span>

                        {/* 3. Desistentes (Oculto por padrão, acionado mostra na lista) */}
                        <button
                          type="button"
                          id={`toggle-abandoned-btn-${group.professionalId}`}
                          onClick={(e) => toggleShowAbandoned(group.professionalId, e)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer select-none shadow-xs ${
                            isShowingAbandoned
                              ? 'bg-amber-500/35 text-amber-100 border-2 border-amber-400 ring-2 ring-amber-400/40 shadow-amber-950/40'
                              : 'bg-slate-800/90 text-amber-300 hover:bg-slate-750 hover:text-amber-200 border border-amber-500/40'
                          }`}
                          title={
                            isShowingAbandoned
                              ? 'Clique para ocultar os pacientes desistentes desta lista'
                              : 'Clique para exibir os pacientes desistentes nesta lista'
                          }
                        >
                          <UserX className={`w-3.5 h-3.5 ${isShowingAbandoned ? 'text-amber-300' : 'text-amber-400'}`} />
                          <span>{group.abandonedCount} {group.abandonedCount === 1 ? 'desistente' : 'desistentes'}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                              isShowingAbandoned
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-700/80 text-slate-300'
                            }`}
                          >
                            {isShowingAbandoned ? 'Exibindo' : 'Oculto'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Ações (Imprimir Fila do Profissional + Indicador de Expansão) */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    {/* Botão de Impressão da Fila do Profissional */}
                    <button
                      type="button"
                      id={`print-queue-btn-${group.professionalId}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintProfessionalQueue(group);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-teal-200 hover:text-white border border-indigo-400/40 hover:border-teal-400 text-xs font-bold transition-all shadow-md cursor-pointer select-none"
                      title={`Imprimir folha A4 com a fila de atendimento de ${group.professionalName}`}
                    >
                      <Printer className="w-3.5 h-3.5 text-teal-300" />
                      <span className="hidden sm:inline">Imprimir Fila</span>
                    </button>

                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/95 group-hover:bg-slate-750 border border-indigo-400/40 text-teal-300 text-xs font-extrabold transition-all shadow-md">
                      <span>{isExpanded ? 'Recolher Fila' : 'Expandir Fila'}</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/30 text-teal-100 font-mono text-xs font-black">
                        {group.items.length}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-teal-400 transition-transform duration-300 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Patient Cards for this Professional (Expandable/Collapsible) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key={`patient-list-${group.professionalId}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="space-y-2.5 pt-1"
                    >
                      {visibleItems.length === 0 ? (
                        <div className="text-center py-6 px-4 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                          Nenhum paciente aguardando nesta fila.{' '}
                          {group.abandonedCount > 0 && !isShowingAbandoned && (
                            <button
                              type="button"
                              onClick={(e) => toggleShowAbandoned(group.professionalId, e)}
                              className="text-amber-600 dark:text-amber-400 font-bold underline hover:opacity-80 ml-1 cursor-pointer"
                            >
                              Exibir {group.abandonedCount} {group.abandonedCount === 1 ? 'desistente' : 'desistentes'}
                            </button>
                          )}
                        </div>
                      ) : (
                        visibleItems.map((item) => renderPatientCard(item))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        /* Lista Contínua Unificada */
        <div className="space-y-3">
          {filteredItems.map((item) => renderPatientCard(item))}
        </div>
      )}

      {/* Standalone Calling Modal for active audio/screen call */}
      {activeCallingItem && (
        <CallPatientModal
          isOpen={Boolean(activeCallingItem)}
          onClose={() => setActiveCallingItem(null)}
          queueItem={activeCallingItem}
          onStartConsultation={(item) => {
            handleStartConsult(item);
            setActiveCallingItem(null);
          }}
          onMarkAbandonment={(item) => {
            handleAbandon(item);
            setActiveCallingItem(null);
          }}
          onCancelQueue={(item) => {
            handleCancel(item);
            setActiveCallingItem(null);
          }}
        />
      )}

      {/* Modal de Edição Rápida de Data e Horário para Pacientes da Fila de Todos os Profissionais */}
      {editingDateTimeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingDateTimeItem(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200 dark:border-teal-800 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Alterar Data e Horário
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Edite a data e hora prevista de atendimento deste paciente na fila
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDateTimeItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Patient & Professional Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                  👤 {editingDateTimeItem.patientName}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200">
                  Paciente da Fila
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>
                  Fila de: <strong className="text-teal-700 dark:text-teal-300">{editingDateTimeItem.professionalName}</strong>
                </span>
              </div>
            </div>

            {/* Form Fields: Data e Hora */}
            <div className="space-y-4">
              {/* Field 1: Data */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Data do Atendimento</span>
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                />

                {/* Date Quick Shortcuts */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditDate(todayStr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      editDate === todayStr
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setEditDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 2);
                      setEditDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    +2 Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setEditDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    +7 Dias
                  </button>
                </div>
              </div>

              {/* Field 2: Horário */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Horário Previsto (HH:mm)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const hh = String(now.getHours()).padStart(2, '0');
                      const mm = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
                      setEditTime(`${hh}:${mm}`);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    title="Definir horário atual"
                  >
                    Agora
                  </button>
                </div>

                {/* Common Slot Presets */}
                <div className="pt-1">
                  <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 block mb-1">
                    Horários sugeridos:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setEditTime(slot)}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          editTime === slot
                            ? 'bg-teal-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Banner */}
              <div className="p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 text-xs text-teal-900 dark:text-teal-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] block">
                    Como será exibido na fila:
                  </span>
                  <span className="font-extrabold text-teal-800 dark:text-teal-200">
                    {formatQueueDateTime(editDate, editTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingDateTimeItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <SpecularButton
                type="button"
                onClick={handleSaveDateTime}
                size="sm"
                radius={14}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-600/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </SpecularButton>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal for Public Queue TV & Mobile Screen */}
      <PublicQueueQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* WhatsApp CRM Chat Modal */}
      {selectedChatAppointment && (
        <WhatsAppChatModal
          isOpen={Boolean(selectedChatAppointment)}
          onClose={() => setSelectedChatAppointment(null)}
          appointment={selectedChatAppointment}
          currentUser={currentUser}
          systemSettings={systemSettings || DEFAULT_SYSTEM_SETTINGS}
          onShowToast={onShowToast || (() => {})}
          onAppointmentUpdated={(updatedAppt) => {
            setSelectedChatAppointment(updatedAppt);
            if (onAppointmentUpdated) {
              onAppointmentUpdated(updatedAppt);
            }
            if (onUpdateQueueItem) {
              const targetQueueItem = queueItems.find(
                (q) =>
                  q.id === updatedAppt.id ||
                  q.appointmentId === updatedAppt.id ||
                  q.id === updatedAppt.id.replace(/^queue_/, '') ||
                  q.id === updatedAppt.id.replace(/^queue-/, '') ||
                  `queue_${q.id}` === updatedAppt.id ||
                  `queue-${q.id}` === updatedAppt.id
              );
              if (targetQueueItem) {
                onUpdateQueueItem({
                  ...targetQueueItem,
                  // @ts-ignore
                  notifications: updatedAppt.notifications,
                });
              }
            }
          }}
        />
      )}
    </div>
  );
};
