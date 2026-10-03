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
  MoreVertical,
  Tv,
  CalendarCheck,
  LayoutGrid,
  List,
  QrCode,
  History,
} from 'lucide-react';
import {
  ReceptionQueueItem,
  User,
  Patient,
  QueueItemStatus,
  RiskClassification,
  Appointment,
} from '../types';
import { PROFESSIONS, isUserAdmin } from '../data/professions';
import {
  calculateChronologicalAge,
  formatSimpleAge,
  getTodayDateString,
  formatQueueDateTime,
} from '../utils/dateCalculator';
import { SpecularButton } from './SpecularButton';
import { CallPatientModal } from './CallPatientModal';
import { PublicQueueQrCodeModal } from './PublicQueueQrCodeModal';

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
  onRefreshQueue?: () => void;
  onOpenPublicCallScreen?: () => void;
  onOpenTimeline?: (patient: Patient) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
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
  onRefreshQueue,
  onOpenPublicCallScreen,
  onOpenTimeline,
  onShowToast,
}) => {
  const isAdmin = Boolean(currentUser && isUserAdmin(currentUser));
  const isAdministrative = currentUser?.profession === 'administrativo';

  // Unify callbacks with aliases if provided
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

  // Active call modal target
  const [activeCallingItem, setActiveCallingItem] = useState<ReceptionQueueItem | null>(null);

  // QR Code Modal for Mobile / TV Waiting Room Link
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // Dropdown menu state for queue card actions
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Filter Dropdown / Popover state
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);

  // View layout mode: 'by_professional' (Default, distinct queues per professional) or 'list' (Flat list)
  const [viewMode, setViewMode] = useState<'by_professional' | 'list'>('by_professional');

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

  // Filters state
  // dateScope: 'today' (Dia Vigente - Padrão) | 'all' (Todos - Todas as datas)
  const [dateScope, setDateScope] = useState<'today' | 'all'>('today');
  // selectedStatuses: multiselection of status categories ('active' | 'completed' | 'cancelled')
  // Default: ['active'] (which combined with dateScope 'today' shows today's active queue)
  const [selectedStatuses, setSelectedStatuses] = useState<('active' | 'completed' | 'cancelled')[]>(['active']);

  // Meus atendimentos - padrão desmarcado (false) conforme solicitado
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [selectedProfId, setSelectedProfId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manchester risk badge helper
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

  // Helper date
  const todayStr = getTodayDateString();

  // Unified list of all queue items + scheduled appointments
  const mergedAllQueueItems = useMemo(() => {
    // Filter and normalize queue items to guarantee all properties exist
    const validQueueItems = (queueItems || [])
      .filter((q) => q && (q.patientName || q.scheduledDate || q.id))
      .map((q) => ({
        ...q,
        patientName: q.patientName || 'Cidadão',
        professionalName: q.professionalName || 'Profissional da Unidade',
        scheduledDate: q.scheduledDate || (q.timestamp && !isNaN(new Date(q.timestamp).getTime()) ? new Date(q.timestamp).toISOString().split('T')[0] : todayStr),
        scheduledTime: q.scheduledTime || '08:00',
      }));

    const list: ReceptionQueueItem[] = [...validQueueItems];
    const existingAppointmentIds = new Set(
      validQueueItems.map((q) => q.appointmentId || q.id).filter(Boolean)
    );

    if (appointments && appointments.length > 0) {
      for (const app of appointments) {
        if (!app.patientName && !app.date) continue;
        if (app.id && app.id.startsWith('ord_pix')) continue;
        if (existingAppointmentIds.has(app.id)) continue;

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

        // Accurately resolve professional identity from registered users catalog
        const matchedProf = professionals.find(
          (p) =>
            (app.professionalId && p.id === app.professionalId) ||
            (app.professionalName && p.name.toLowerCase().trim() === app.professionalName.toLowerCase().trim())
        );

        const resolvedProfId = matchedProf?.id || app.professionalId || '';
        const resolvedProfName = matchedProf?.name || app.professionalName || 'Profissional da Unidade';
        const resolvedProfession = matchedProf?.profession || app.professionalProfession || 'assistente_social';

        const queueItemFromAppointment: ReceptionQueueItem = {
          id: app.id,
          patientId: app.patientId || `pat-${app.id}`,
          patientName: app.patientName || 'Paciente Agendado',
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
  }, [queueItems, appointments]);

  // Per-professional calling rank calculation
  // Each professional maintains their own chronological order of calling
  const profRankingMap = useMemo(() => {
    // Filter by date scope so positions reflect the current scope (e.g. today's order)
    const scopeList = mergedAllQueueItems.filter((i) => {
      if (dateScope === 'today') {
        const itemDate = i.scheduledDate || (i.timestamp ? new Date(i.timestamp).toISOString().split('T')[0] : '');
        return itemDate === todayStr;
      }
      return true;
    });

    // Group items by professional ID / name
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
      // Sort chronologically (oldest to newest: ascending timestamp)
      profItems.sort((a, b) => a.timestamp - b.timestamp);

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
  }, [mergedAllQueueItems, dateScope, todayStr]);

  // Filter items based on active UI filters
  const filteredItems = useMemo(() => {
    let list = [...mergedAllQueueItems];

    // 1. Date scope filtering
    if (dateScope === 'today') {
      list = list.filter((i) => {
        const itemDate = i.scheduledDate || (i.timestamp ? new Date(i.timestamp).toISOString().split('T')[0] : '');
        return itemDate === todayStr;
      });
    }

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

    // Sort: group primarily by professional name and then chronologically by timestamp
    list.sort((a, b) => {
      const profCompare = (a.professionalName || '').localeCompare(b.professionalName || '');
      if (profCompare !== 0 && selectedProfId === 'all') {
        return profCompare;
      }
      return a.timestamp - b.timestamp;
    });

    return list;
  }, [mergedAllQueueItems, dateScope, selectedStatuses, todayStr, onlyMine, currentUser, selectedProfId, searchQuery]);

  // Group filtered items by professional for structured individual queues
  const groupedByProf = useMemo(() => {
    const map = new Map<string, ReceptionQueueItem[]>();
    for (const item of filteredItems) {
      // Find matching professional to group under the real professional UID
      const matchedProf = professionals.find(
        (p) =>
          (item.professionalId && p.id === item.professionalId) ||
          (item.professionalName && p.name.toLowerCase().trim() === item.professionalName.toLowerCase().trim())
      );
      const key = matchedProf?.id || item.professionalId || item.professionalName || 'geral';
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
      callingCount: number;
      firstWaitingItem: ReceptionQueueItem | null;
    }[] = [];

    map.forEach((items, key) => {
      items.sort((a, b) => a.timestamp - b.timestamp);
      const firstItem = items[0];
      const profUser = professionals.find(
        (p) => p.id === key || (firstItem?.professionalName && p.name.toLowerCase().trim() === firstItem.professionalName.toLowerCase().trim())
      );
      const waitingItems = items.filter((i) => i.status === 'waiting' || i.status === 'calling');

      groups.push({
        professionalId: profUser?.id || key,
        professionalName: profUser?.name || firstItem?.professionalName || 'Profissional da Unidade',
        professionalProfession: profUser?.profession || firstItem?.professionalProfession || 'assistente_social',
        items,
        waitingCount: waitingItems.length,
        completedCount: items.filter((i) => i.status === 'completed').length,
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
  }, [filteredItems, professionals, currentUser]);

  // Today's total count
  const countTodayTotal = useMemo(() => {
    return mergedAllQueueItems.filter((i) => {
      const itemDate = i.scheduledDate || (i.timestamp ? new Date(i.timestamp).toISOString().split('T')[0] : '');
      return itemDate === todayStr;
    }).length;
  }, [mergedAllQueueItems, todayStr]);

  // All dates total count
  const countAllTotal = mergedAllQueueItems.length;

  // Active scope items for dynamic counts
  const scopeItems = useMemo(() => {
    if (dateScope === 'today') {
      return mergedAllQueueItems.filter((i) => {
        const itemDate = i.scheduledDate || (i.timestamp ? new Date(i.timestamp).toISOString().split('T')[0] : '');
        return itemDate === todayStr;
      });
    }
    return mergedAllQueueItems;
  }, [mergedAllQueueItems, dateScope, todayStr]);

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
    const isInConsultation = item.status === 'in_consultation';
    const isCompleted = item.status === 'completed';
    const isCancelled = item.status === 'cancelled';
    const isAbandoned = item.status === 'abandoned';

    const simpleAge = formatSimpleAge(item.patientBirthDate);
    const rankInfo = profRankingMap.get(item.id) || {
      profOrder: 1,
      profWaitingOrder: null,
      profTotal: 1,
      profWaitingTotal: 1,
    };

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative rounded-3xl border transition-all ${
          openDropdownId === item.id ? 'z-30' : 'z-10'
        } ${
          isCalling
            ? 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 border-emerald-500 ring-4 ring-emerald-500/20 shadow-xl'
            : isInConsultation
            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 shadow-xs'
        }`}
      >
        {/* Visual Animated Green Top Bar if Calling */}
        {isCalling && (
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 animate-pulse rounded-t-3xl" />
        )}

        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Position & Patient Info */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            {/* 1. Ordem (1º, 2º... sem texto adicional) */}
            <div
              className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0 font-black text-lg sm:text-xl text-center shadow-xs transition-transform ${
                isCalling
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-bounce'
                  : isWaiting
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title={`Posição na fila: ${rankInfo.profOrder}º`}
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
              </div>

              {/* Linha 2: Data e hora do atendimento + Ícone de WhatsApp */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                {/* Data e hora do atendimento */}
                <span className="font-extrabold text-teal-800 dark:text-teal-300 flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/50 px-3 py-1 rounded-xl border border-teal-200 dark:border-teal-850 text-xs">
                  <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>
                    {item.formattedDateTime
                      ? item.formattedDateTime.replace(/\s*\+\s*/g, ' ')
                      : formatQueueDateTime(item.scheduledDate, item.scheduledTime)}
                  </span>
                </span>

                {/* Ícone de WhatsApp na Linha 2 */}
                <button
                  type="button"
                  id={`queue-whatsapp-btn-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const phone = item.patientPhone || patients.find((p) => p.id === item.patientId)?.phone;
                    if (phone) {
                      const cleanPhone = phone.replace(/\D/g, '');
                      window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}`, '_blank');
                    } else if (onShowToast) {
                      onShowToast('info', `O paciente "${item.patientName}" não possui número de WhatsApp/Telefone cadastrado.`, 'WhatsApp');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2.5 py-1 rounded-xl border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-xs"
                  title={
                    (item.patientPhone || patients.find((p) => p.id === item.patientId)?.phone)
                      ? `Conversar no WhatsApp (${item.patientPhone || patients.find((p) => p.id === item.patientId)?.phone})`
                      : 'WhatsApp do Paciente (Sem número cadastrado)'
                  }
                >
                  <svg className="w-3.5 h-3.5 fill-current text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>
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
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/15 dark:shadow-black/60 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
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
                  disabled={!canAttend}
                  onClick={() => {
                    if (!canAttend) return;
                    handleStartConsult(item);
                    setOpenDropdownId(null);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center gap-2.5 transition-colors ${
                    !canAttend
                      ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300'
                  }`}
                  title={
                    !canManageItem
                      ? `Apenas ${item.professionalName} pode realizar este atendimento`
                      : isAdministrative
                      ? 'Perfil Administrativo não realiza atendimento clínico'
                      : 'Iniciar atendimento clínico'
                  }
                >
                  <Play className="w-4 h-4 text-teal-600 fill-current shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span>Iniciar Atendimento Clínico</span>
                    {!canManageItem ? (
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ordem de chamada individual e cronológica classificada por cada profissional de saúde
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
              <span>Filtros ({dateScope === 'today' ? 'Hoje' : 'Todas as Datas'})</span>
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
                className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/20 dark:shadow-black/70 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3"
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

                {/* Section A: Período / Escopo de Data */}
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-0.5">
                    Período da Fila
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      id="filter-scope-today-btn"
                      onClick={() => {
                        setDateScope('today');
                        if (selectedStatuses.length === 0) setSelectedStatuses(['active']);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                        dateScope === 'today'
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>Dia Vigente</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[10px] font-extrabold">
                        {countTodayTotal}
                      </span>
                    </button>

                    <button
                      type="button"
                      id="filter-scope-all-btn"
                      onClick={() => {
                        setDateScope('all');
                      }}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                        dateScope === 'all'
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>Todos</span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                        {countAllTotal}
                      </span>
                    </button>
                  </div>
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
            const profConfig = PROFESSIONS[group.professionalProfession];
            const isMyQueue = Boolean(currentUser && currentUser.id === group.professionalId);
            const canCallFromGroup = isMyQueue || isAdmin;

            return (
              <div
                key={group.professionalId}
                id={`queue-group-${group.professionalId}`}
                className="rounded-3xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-xs"
              >
                {/* Professional Queue Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-indigo-700/50 shadow-md">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/25 text-indigo-300 border border-indigo-400/40 flex items-center justify-center font-black shrink-0 shadow-inner">
                      <Stethoscope className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-white tracking-tight">
                          {group.professionalName}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-100 text-[11px] font-bold border border-indigo-400/40">
                          {profConfig?.name || group.professionalProfession}
                        </span>
                        {isMyQueue && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[10px] font-extrabold border border-emerald-400/40">
                            Minha Fila
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-indigo-200/80 mt-1 flex items-center gap-2">
                        <span className="font-semibold">{group.waitingCount} aguardando</span>
                        <span className="opacity-60">•</span>
                        <span>{group.completedCount} atendidos</span>
                        <span className="opacity-60">•</span>
                        <span>{group.items.length} total nesta lista</span>
                      </p>
                    </div>
                  </div>

                  {/* Chamar Próximo Deste Profissional */}
                  {group.firstWaitingItem && canCallFromGroup && (
                    <SpecularButton
                      type="button"
                      id={`call-next-btn-${group.professionalId}`}
                      onClick={() => {
                        if (group.firstWaitingItem) {
                          setActiveCallingItem(group.firstWaitingItem);
                          handleCall(group.firstWaitingItem);
                        }
                      }}
                      size="sm"
                      radius={12}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 border border-emerald-300/40"
                    >
                      <Volume2 className="w-4 h-4 text-slate-950" />
                      <span>Chamar 1º da Fila ({(group.firstWaitingItem?.patientName || 'Próximo').split(' ')[0]})</span>
                    </SpecularButton>
                  )}
                </div>

                {/* Patient Cards for this Professional */}
                <div className="space-y-2.5">
                  {group.items.map((item) => renderPatientCard(item))}
                </div>
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

      {/* QR Code Modal for Public Queue TV & Mobile Screen */}
      <PublicQueueQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};
