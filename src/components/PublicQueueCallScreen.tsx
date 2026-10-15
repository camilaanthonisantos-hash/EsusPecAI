import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  Stethoscope,
  Sparkles,
  ArrowLeft,
  Tv,
  Bell,
  Activity,
  AlertTriangle,
  QrCode,
  UserCheck,
  UserX,
  XCircle,
  Pause,
  Play,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Check,
  Search,
  X,
  CalendarDays,
  User,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ReceptionQueueItem,
  RiskClassification,
  SystemSettings,
  Appointment,
  User as UserModel,
  QueueItemStatus,
} from '../types';
import { PROFESSIONS } from '../data/professions';
import { calculateChronologicalAge, getTodayDateString, formatQueueDateTime } from '../utils/dateCalculator';
import { SpecularButton } from './SpecularButton';
import { announcePatientCall, playHospitalCallChime } from '../utils/callAudioUtils';
import { PublicQueueQrCodeModal } from './PublicQueueQrCodeModal';

export interface PublicQueueCallScreenProps {
  queueItems: ReceptionQueueItem[];
  appointments?: Appointment[];
  professionals?: UserModel[];
  systemSettings?: SystemSettings;
  onBackToPanel?: () => void;
  onClose?: () => void;
  isStandalone?: boolean;
  onUpdateQueueItemStatus?: (queueItemId: string, newStatus: QueueItemStatus) => void;
}

interface CategorizedQueueItem extends ReceptionQueueItem {
  categoryType: 'waiting' | 'completed' | 'other';
  queueOrderNumber?: number;
}

export const PublicQueueCallScreen: React.FC<PublicQueueCallScreenProps> = ({
  queueItems,
  appointments = [],
  professionals = [],
  systemSettings,
  onBackToPanel,
  onClose,
  isStandalone = false,
  onUpdateQueueItemStatus,
}) => {
  const handleExit = onBackToPanel || onClose;
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [audioNeedsInteraction, setAudioNeedsInteraction] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  
  // Date and Professional Filter States
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(() => new Date());

  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');
  const [isProfFilterModalOpen, setIsProfFilterModalOpen] = useState<boolean>(false);
  const [profSearchQuery, setProfSearchQuery] = useState<string>('');

  // State for expanding/collapsing header filters, quick controls, and queue stats (Components 3, 4, 5, 6, 7)
  const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(false);

  // Scroll & Animation States
  const [isScrollPausedByUser, setIsScrollPausedByUser] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calling execution states (FIFO queue for 3x repetition)
  const [completedCallIds, setCompletedCallIds] = useState<Set<string>>(new Set());
  const [currentCallItem, setCurrentCallItem] = useState<ReceptionQueueItem | null>(null);
  const [currentCallCycle, setCurrentCallCycle] = useState<1 | 2 | 3>(1);
  const [cycleTimeRemaining, setCycleTimeRemaining] = useState<number>(5);

  // Live Digital Clock (updating every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Build unified items pool from queueItems and appointments
  const allAvailableItems = useMemo(() => {
    const clinicalProfs = (professionals || []).filter((p) => p && p.profession !== 'administrativo');
    const fallbackProf = clinicalProfs[0] || (professionals || [])[0];
    const defaultProfName = fallbackProf?.name || 'Profissional Responsável';
    const defaultProfId = fallbackProf?.id || '';
    const defaultProfProfession = fallbackProf?.profession || 'enfermeiro';

    const validQueueItems = (queueItems || []).filter((q) => {
      const patName = (q.patientName || '').trim().toLowerCase();
      if (!patName || patName === 'cidadão' || patName === 'cidadao' || patName === 'paciente agendado' || patName === 'paciente da fila' || patName === 'cidadão identificado') return false;
      const profName = (q.professionalName || '').trim().toLowerCase();
      const profId = (q.professionalId || '').trim().toLowerCase();
      if (profName === 'profissional da unidade' || profId === 'profissional da unidade' || profId === 'user-profissional-da-unidade') return false;
      if (q.professionalProfession === 'administrativo') return false;
      return true;
    });

    const list: ReceptionQueueItem[] = [...validQueueItems];
    const existingAppointmentIds = new Set(
      validQueueItems.map((q) => q.appointmentId || q.id).filter(Boolean)
    );

    if (appointments && appointments.length > 0) {
      for (const app of appointments) {
        if (!app.patientName && !app.date) continue;
        if (existingAppointmentIds.has(app.id)) continue;

        const patName = (app.patientName || '').trim().toLowerCase();
        if (!patName || patName === 'cidadão' || patName === 'cidadao' || patName === 'paciente agendado' || patName === 'paciente da fila' || patName === 'cidadão identificado') continue;
        const appPName = (app.professionalName || '').trim().toLowerCase();
        const appPId = (app.professionalId || '').trim().toLowerCase();
        if (appPName === 'profissional da unidade' || appPId === 'profissional da unidade' || appPId === 'user-profissional-da-unidade') continue;
        if (app.professionalProfession === 'administrativo') continue;

        const matchedProf = clinicalProfs.find(
          (p) =>
            (app.professionalId && p.id === app.professionalId) ||
            (app.professionalName && p.name.toLowerCase().trim() === app.professionalName.toLowerCase().trim())
        );

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
        if (!itemTimestamp) itemTimestamp = app.createdAt || Date.now();

        const formattedDate = formatQueueDateTime(app.date, app.startTime || '08:00');

        const queueItemFromAppointment: ReceptionQueueItem = {
          id: app.id,
          patientId: app.patientId || `pat-${app.id}`,
          patientName: app.patientName,
          patientCpf: app.patientCpf,
          patientCns: app.patientCns,
          patientBirthDate: app.patientBirthDate,
          patientPhone: app.patientPhone,
          professionalId: matchedProf?.id || defaultProfId,
          professionalName: matchedProf?.name || defaultProfName,
          professionalProfession: matchedProf?.profession || app.professionalProfession || defaultProfProfession,
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
  }, [queueItems, appointments, professionals]);

  // List of distinct professionals with patient counts for currently selected date
  const distinctProfessionalsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; profession: string; count: number }>();

    // 1. Seed from professionals prop
    professionals.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        profession: p.profession || 'medico',
        count: 0,
      });
    });

    // 2. Tally items for selected date and add any other found professionals
    allAvailableItems.forEach((item) => {
      const itemDate = item.scheduledDate || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : '');
      if (itemDate === selectedDate) {
        const profId = item.professionalId || item.professionalName || 'outro';
        if (map.has(profId)) {
          const entry = map.get(profId)!;
          entry.count += 1;
        } else {
          map.set(profId, {
            id: profId,
            name: item.professionalName || 'Profissional',
            profession: item.professionalProfession || 'medico',
            count: 1,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [professionals, allAvailableItems, selectedDate]);

  // Active selected professional object (if not 'all')
  const activeSelectedProfessional = useMemo(() => {
    if (selectedProfessionalId === 'all') return null;
    return distinctProfessionalsList.find((p) => p.id === selectedProfessionalId) || null;
  }, [distinctProfessionalsList, selectedProfessionalId]);

  // Filter queue strictly by selected date and professional
  const filteredQueue = useMemo(() => {
    return allAvailableItems.filter((item) => {
      const itemDate = item.scheduledDate || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : '');
      const matchDate = itemDate === selectedDate;
      if (!matchDate) return false;

      if (selectedProfessionalId === 'all') return true;

      // Match by ID or Name
      if (item.professionalId && item.professionalId === selectedProfessionalId) return true;
      if (activeSelectedProfessional && item.professionalName === activeSelectedProfessional.name) return true;
      return false;
    });
  }, [allAvailableItems, selectedDate, selectedProfessionalId, activeSelectedProfessional]);

  // Three prioritized groups:
  // 1. Aguardando atendimento (e em atendimento) ordenados em ordem crescente
  // 2. Pacientes já atendidos
  // 3. Demais status (Desistências, Cancelamentos)
  const { waitingGroup, completedGroup, otherGroup, allCategorizedItems } = useMemo(() => {
    // 1. Aguardando
    const waiting = filteredQueue
      .filter((item) => item.status === 'waiting' || item.status === 'in_consultation' || item.status === 'in_service')
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item, idx) => ({
        ...item,
        categoryType: 'waiting' as const,
        queueOrderNumber: idx + 1,
      }));

    // 2. Já atendidos
    const completed = filteredQueue
      .filter((item) => item.status === 'completed')
      .sort((a, b) => (b.attendedAt || b.completedAt || b.timestamp) - (a.attendedAt || a.completedAt || a.timestamp))
      .map((item) => ({
        ...item,
        categoryType: 'completed' as const,
      }));

    // 3. Demais status (abandoned, cancelled)
    const other = filteredQueue
      .filter((item) => item.status === 'abandoned' || item.status === 'cancelled')
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((item) => ({
        ...item,
        categoryType: 'other' as const,
      }));

    const all = [...waiting, ...completed, ...other];

    return {
      waitingGroup: waiting,
      completedGroup: completed,
      otherGroup: other,
      allCategorizedItems: all,
    };
  }, [filteredQueue]);

  // FIFO Queue for active calls in the selected date
  const pendingCallsQueue = useMemo(() => {
    return filteredQueue
      .filter((item) => item.status === 'calling' && !completedCallIds.has(item.id))
      .sort((a, b) => (a.calledAt || a.timestamp) - (b.calledAt || b.timestamp));
  }, [filteredQueue, completedCallIds]);

  // Manage Current Call and 3x Repetition Loop
  useEffect(() => {
    if (!currentCallItem && pendingCallsQueue.length > 0) {
      // Pick the first one in FIFO queue
      const nextCall = pendingCallsQueue[0];
      setCurrentCallItem(nextCall);
      setCurrentCallCycle(1);
      setCycleTimeRemaining(5);
    }
  }, [pendingCallsQueue, currentCallItem]);

  // Announce audio for each cycle
  useEffect(() => {
    if (!currentCallItem) return;

    if (isAudioEnabled) {
      const profConfig = PROFESSIONS[currentCallItem.professionalProfession];
      announcePatientCall(
        currentCallItem.patientName,
        currentCallItem.professionalName,
        profConfig?.name || currentCallItem.professionalProfession,
        currentCallCycle
      );
    }
  }, [currentCallItem, currentCallCycle, isAudioEnabled]);

  // Countdown timer for 3x execution cycles
  useEffect(() => {
    if (!currentCallItem) return;

    setCycleTimeRemaining(5);
    const interval = setInterval(() => {
      setCycleTimeRemaining((prev) => {
        if (prev <= 1) {
          if (currentCallCycle === 1) {
            setCurrentCallCycle(2);
            return 5;
          } else if (currentCallCycle === 2) {
            setCurrentCallCycle(3);
            return 5;
          } else {
            // 3 cycles finished!
            clearInterval(interval);
            const finishedId = currentCallItem.id;

            setCompletedCallIds((prevSet) => {
              const newSet = new Set(prevSet);
              newSet.add(finishedId);
              return newSet;
            });

            if (onUpdateQueueItemStatus) {
              onUpdateQueueItemStatus(finishedId, 'in_consultation');
            }

            setCurrentCallItem(null);
            setCurrentCallCycle(1);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentCallItem, currentCallCycle, onUpdateQueueItemStatus]);

  // Seamless Infinite Vertical Scroll Loop
  useEffect(() => {
    if (currentCallItem || isScrollPausedByUser) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const speed = 0.55; // pixels per frame (~33px/s)

    const step = () => {
      if (container) {
        const maxScroll = container.scrollHeight / 2;
        if (maxScroll > 10) {
          container.scrollTop += speed;
          if (container.scrollTop >= maxScroll) {
            container.scrollTop = 0;
          }
        }
      }
      animFrameIdRef.current = requestAnimationFrame(step);
    };

    animFrameIdRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [currentCallItem, isScrollPausedByUser, allCategorizedItems]);

  // User manual scroll triggers (Scroll Up, Scroll Down, Scroll to Top)
  const handleManualScroll = (delta: number) => {
    setIsScrollPausedByUser(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ top: delta, behavior: 'smooth' });
    }
    // Automatically resume after 6 seconds of inactivity unless explicitly kept paused
    if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsScrollPausedByUser(false);
    }, 6000);
  };

  const handleScrollToTop = () => {
    setIsScrollPausedByUser(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format digital time strings
  const formattedHoursMinutes = currentTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedSeconds = String(currentTime.getSeconds()).padStart(2, '0');
  
  // Format selected date for display
  const isToday = selectedDate === todayStr;
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Calendar Helpers for Date Modal
  const calendarDays = useMemo(() => {
    const year = calendarViewMonth.getFullYear();
    const month = calendarViewMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean; count: number }> = [];

    // Previous month padding
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false, count: 0 });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const count = allAvailableItems.filter((it) => {
        const itDate = it.scheduledDate || (it.timestamp ? new Date(it.timestamp).toISOString().split('T')[0] : '');
        return itDate === dateStr;
      }).length;

      days.push({ dateStr, dayNum: d, isCurrentMonth: true, count });
    }

    // Next month padding to complete 35 or 42 grid slots
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let nextD = 1; nextD <= remainingSlots; nextD++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: nextD, isCurrentMonth: false, count: 0 });
    }

    return days;
  }, [calendarViewMonth, allAvailableItems]);

  const unitName = systemSettings?.defaultUnitName || 'Centro de Saúde / CAPS • e-SUS PEC';
  const municipality = systemSettings?.municipalityName || 'Secretaria Municipal de Saúde';

  // Risk Badge Helper for TV
  const renderRiskBadge = (risk?: RiskClassification) => {
    if (!risk) return null;
    const map: Record<RiskClassification, { label: string; bg: string; text: string; dot: string; border: string }> = {
      vermelho: {
        label: 'EMERGÊNCIA',
        bg: 'bg-red-500/20',
        text: 'text-red-400 font-black',
        dot: 'bg-red-500 animate-ping',
        border: 'border-red-500/60',
      },
      laranja: {
        label: 'MUITO URGENTE',
        bg: 'bg-orange-500/20',
        text: 'text-orange-400 font-bold',
        dot: 'bg-orange-500',
        border: 'border-orange-500/60',
      },
      amarelo: {
        label: 'URGENTE',
        bg: 'bg-amber-500/20',
        text: 'text-amber-400 font-bold',
        dot: 'bg-amber-500',
        border: 'border-amber-500/60',
      },
      verde: {
        label: 'POUCO URGENTE',
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400 font-medium',
        dot: 'bg-emerald-500',
        border: 'border-emerald-500/60',
      },
      azul: {
        label: 'NÃO URGENTE',
        bg: 'bg-sky-500/20',
        text: 'text-sky-400 font-medium',
        dot: 'bg-sky-500',
        border: 'border-sky-500/60',
      },
    };
    const c = map[risk];
    if (!c) return null;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}
      >
        <span className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span>{c.label}</span>
      </span>
    );
  };

  // Render a Single Patient Card inside the vertical list
  const renderPatientCard = (item: CategorizedQueueItem, indexKey: string) => {
    const profConfig = PROFESSIONS[item.professionalProfession];
    const isWaiting = item.categoryType === 'waiting';
    const isCompleted = item.categoryType === 'completed';
    const isOther = item.categoryType === 'other';

    return (
      <div
        key={indexKey}
        className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
          isWaiting
            ? 'bg-slate-900/90 border-slate-750 text-slate-100 hover:border-teal-500/50 shadow-md'
            : isCompleted
            ? 'bg-slate-900/50 border-emerald-900/40 text-slate-300 opacity-90'
            : 'bg-slate-900/40 border-slate-800/60 text-slate-400 opacity-75'
        }`}
      >
        {/* Left Info: Position/Status + Name + Professional */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {isWaiting ? (
            <div className="flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-500/15 border border-teal-500/40 text-teal-300 shrink-0 font-black">
              <span className="text-xs text-teal-400/80 font-bold leading-none">FILA</span>
              <span className="text-sm sm:text-base leading-none mt-0.5">#{item.queueOrderNumber}</span>
            </div>
          ) : isCompleted ? (
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 shrink-0">
              {item.status === 'abandoned' ? <UserX className="w-5 h-5 text-amber-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base sm:text-xl font-black text-white tracking-tight uppercase truncate">
                {item.patientName}
              </h4>
              {renderRiskBadge(item.riskClassification)}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5 mt-1 font-medium truncate">
              <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>{item.professionalName}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 truncate">{profConfig?.name || item.professionalProfession}</span>
            </p>
          </div>
        </div>

        {/* Right Info: Status Badge & Time */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
          {isWaiting && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-black uppercase tracking-wider">
                AGUARDANDO
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs sm:text-sm font-bold border border-slate-700">
                {item.scheduledTime || '08:00'}
              </span>
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ATENDIDO</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-800/80 text-slate-400 font-mono text-xs font-bold">
                Concluído
              </span>
            </div>
          )}

          {isOther && (
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                item.status === 'abandoned'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                {item.status === 'abandoned' ? 'DESISTÊNCIA' : 'CANCELADO'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      id="public-queue-call-screen"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative overflow-hidden"
    >
      {/* 1. Autoplay Audio Banner Prompt if AudioContext is blocked */}
      {audioNeedsInteraction && (
        <div
          onClick={() => {
            playHospitalCallChime();
            setAudioNeedsInteraction(false);
          }}
          className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 text-white px-4 py-2 text-center text-xs sm:text-sm font-bold cursor-pointer hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg z-50 animate-pulse"
        >
          <Volume2 className="w-5 h-5" />
          <span>Clique em qualquer lugar da tela para ativar o som e o anúncio de voz na Smart TV</span>
        </div>
      )}

      {/* 2. Top TV Header */}
      <header className="p-3 sm:p-4 lg:p-6 bg-slate-900/95 border-b border-slate-800 shadow-2xl backdrop-blur-md shrink-0 z-20 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4">
          {/* Top Brand (Component 1) & Clock (Component 2) Row */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-4 sm:gap-6">
            {/* Clickable Title (Component 1) */}
            <button
              type="button"
              id="tv-panel-toggle-btn"
              onClick={() => setIsControlsExpanded((prev) => !prev)}
              className="flex items-center gap-2.5 group text-left focus:outline-none cursor-pointer select-none"
              title="Clique no PAINEL ou no Relógio para expandir/recolher controles"
            >
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider text-white uppercase drop-shadow-sm group-hover:text-teal-300 transition-colors">
                PAINEL
              </h1>
              <div className="p-1 rounded-xl bg-slate-800/90 border border-slate-700 text-teal-400 group-hover:bg-slate-700 group-hover:border-teal-500/50 transition-all shadow-sm">
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isControlsExpanded ? 'rotate-180 text-teal-300' : 'text-slate-400'}`} />
              </div>
            </button>

            {/* Clickable Clock (Component 2) - Expands components 3, 4, 5, 6, 7 when clicked */}
            <button
              type="button"
              id="tv-clock-toggle-btn"
              onClick={() => setIsControlsExpanded((prev) => !prev)}
              className="flex items-center px-2.5 py-1 rounded-xl bg-slate-850/60 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 transition-all cursor-pointer group select-none text-right shadow-inner"
              title="Clique no Relógio para expandir/recolher ferramentas e controles"
            >
              <div className="flex items-baseline gap-1 text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-wider text-teal-300 group-hover:text-teal-200 transition-colors">
                <span>{formattedHoursMinutes}</span>
                <span className="text-xs sm:text-sm text-slate-400 font-bold group-hover:text-teal-400">:{formattedSeconds}</span>
              </div>
            </button>
          </div>

          {/* Expanded Controls Container (Components 3, 4, 5) */}
          {isControlsExpanded && (
            <div
              className="w-full lg:w-auto flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-end gap-3 sm:gap-4 pt-3 lg:pt-0 border-t border-slate-800/80 lg:border-t-0 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* Component 3: Date Picker Trigger */}
              <button
                type="button"
                id="tv-calendar-filter-btn"
                onClick={() => {
                  setCalendarViewMonth(new Date(selectedDate + 'T00:00:00'));
                  setIsCalendarModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                  !isToday
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/30'
                    : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-teal-500/50'
                }`}
                title="Filtrar fila por data específica"
              >
                <CalendarDays className={`w-4 h-4 ${!isToday ? 'text-amber-400' : 'text-teal-400'}`} />
                <span className="truncate max-w-[140px] sm:max-w-[180px]">
                  {isToday ? 'Hoje (Dia Vigente)' : formattedSelectedDate}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Component 4: Professional Filter Trigger */}
              <button
                type="button"
                id="tv-prof-filter-btn"
                onClick={() => {
                  setProfSearchQuery('');
                  setIsProfFilterModalOpen(true);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                  selectedProfessionalId !== 'all'
                    ? 'bg-teal-500/20 border-teal-500/60 text-teal-200 hover:bg-teal-500/30'
                    : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-teal-500/50'
                }`}
                title="Filtrar por profissional de atendimento"
              >
                <Filter className={`w-4 h-4 ${selectedProfessionalId !== 'all' ? 'text-teal-300' : 'text-slate-400'}`} />
                <span className="truncate max-w-[130px] sm:max-w-[170px]">
                  {activeSelectedProfessional ? activeSelectedProfessional.name : 'Todos os Profissionais'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Component 5: Quick TV Control Buttons */}
              <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3 w-full sm:w-auto justify-center">
                {/* QR Code trigger */}
                <SpecularButton
                  type="button"
                  id="tv-open-qr-modal-btn"
                  onClick={() => setIsQrModalOpen(true)}
                  size="icon"
                  radius={12}
                  className="bg-slate-800 hover:bg-slate-750 text-teal-300 hover:text-white border-slate-700"
                  title="Ver QR Code para Celular"
                >
                  <QrCode className="w-5 h-5" />
                </SpecularButton>

                {/* Sound Toggle */}
                <SpecularButton
                  type="button"
                  id="tv-sound-toggle-btn"
                  onClick={() => {
                    if (!isAudioEnabled) playHospitalCallChime();
                    setIsAudioEnabled(!isAudioEnabled);
                  }}
                  size="icon"
                  radius={12}
                  className={`${
                    isAudioEnabled
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                  }`}
                  title={isAudioEnabled ? 'Áudio Ativado (Voz & Som da Chamada)' : 'Áudio Desativado'}
                >
                  {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </SpecularButton>

                {/* Fullscreen Toggle */}
                <SpecularButton
                  type="button"
                  id="tv-fullscreen-toggle-btn"
                  onClick={toggleFullscreen}
                  size="icon"
                  radius={12}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700"
                  title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (TV)'}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </SpecularButton>

                {/* Exit/Back button */}
                {handleExit && (
                  <SpecularButton
                    type="button"
                    id="tv-back-to-panel-btn"
                    onClick={handleExit}
                    size="sm"
                    radius={12}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </SpecularButton>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Component 6: Active Filter Notice Bar */}
        {isControlsExpanded && (!isToday || selectedProfessionalId !== 'all') && (
          <div
            className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">Filtros ativos:</span>
              {!isToday && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Data: {formattedSelectedDate}
                  <button
                    onClick={() => {
                      setSelectedDate(todayStr);
                      setIsControlsExpanded(false);
                    }}
                    className="ml-1 text-amber-400 hover:text-white"
                    title="Restaurar para Hoje"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {selectedProfessionalId !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-200 border border-teal-500/40 font-semibold">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                  Profissional: {activeSelectedProfessional?.name}
                  <button
                    onClick={() => {
                      setSelectedProfessionalId('all');
                      setIsControlsExpanded(false);
                    }}
                    className="ml-1 text-teal-400 hover:text-white"
                    title="Remover filtro de profissional"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setSelectedProfessionalId('all');
                setIsControlsExpanded(false);
              }}
              className="text-slate-400 hover:text-teal-300 font-bold flex items-center gap-1 text-[11px] underline"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Padrão (Hoje • Todos)
            </button>
          </div>
        )}
      </header>

      {/* 3. Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* =========================================================================
              CASE A: ACTIVE CALL SPOTLIGHT (ANIMAÇÃO INTERROMPIDA, MOSTRA O NOME POR 3X)
             ========================================================================= */}
          {currentCallItem ? (
            <motion.div
              key={currentCallItem.id}
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -30 }}
              transition={{ duration: 0.35, type: 'spring', damping: 22 }}
              className="relative p-6 sm:p-10 lg:p-14 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-4 border-emerald-500 shadow-[0_0_80px_rgba(16,185,129,0.3)] text-center overflow-hidden flex flex-col items-center justify-center my-auto"
            >
              {/* Pulsing Emerald Atmosphere Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-36 bg-emerald-500/25 blur-3xl pointer-events-none" />

              {/* Top Calling Badge & Repetition Counter */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <div className="inline-flex items-center gap-2.5 px-6 py-2 rounded-full bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/70 text-sm sm:text-base font-black uppercase tracking-widest animate-pulse shadow-lg">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                  </span>
                  <span>Chamando para Atendimento</span>
                  <Volume2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs sm:text-sm font-extrabold text-teal-300">
                  <span className="text-slate-400">EXECUÇÃO:</span>
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/30 text-teal-200 font-mono text-sm font-black">
                    {currentCallCycle}ª CHAMADA (DE 3)
                  </span>
                </div>
              </div>

              {/* Patient Name */}
              <h2 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight uppercase drop-shadow-lg max-w-5xl leading-tight">
                {currentCallItem.patientName}
              </h2>

              {/* Age & Clinical Risk */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                {currentCallItem.patientBirthDate && (
                  <span className="text-sm sm:text-base text-slate-300 font-bold bg-slate-800/90 px-4 py-1.5 rounded-2xl border border-slate-700">
                    Idade: {calculateChronologicalAge(currentCallItem.patientBirthDate).shortFormatted}
                  </span>
                )}
                {renderRiskBadge(currentCallItem.riskClassification)}
              </div>

              {/* Destination Professional & Consulting Room */}
              <div className="mt-8 max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-slate-850/90 border-2 border-slate-700 shadow-2xl flex items-center justify-center gap-5 text-left">
                <div className="p-4 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40 shrink-0">
                  <Stethoscope className="w-10 h-10" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider">
                    Dirija-se ao Consultório de
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-teal-300 truncate mt-0.5">
                    {currentCallItem.professionalName}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 font-bold mt-1">
                    {PROFESSIONS[currentCallItem.professionalProfession]?.name || currentCallItem.professionalProfession}
                  </p>
                </div>
              </div>

              {/* Visual Countdown Progress for Current Cycle */}
              <div className="mt-8 w-full max-w-md flex flex-col items-center gap-2">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(cycleTimeRemaining / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Próxima repetição em {cycleTimeRemaining}s • Ciclo {currentCallCycle}/3
                </p>
              </div>

              {/* Queued Call next notification */}
              {pendingCallsQueue.length > 1 && (
                <div className="mt-4 px-4 py-2 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>
                    Próximo paciente na sequência da chamada:{' '}
                    <strong className="text-amber-300">{pendingCallsQueue[1].patientName}</strong>
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            /* =========================================================================
                CASE B: CONTINUOUS VERTICAL ROLLING QUEUE (ORDEM: AGUARDANDO -> ATENDIDOS -> DEMAIS)
                WITH MANUAL SCROLL CONTROLS (CIMA / BAIXO / PAUSAR / TOPO)
               ========================================================================= */
            <div className="flex flex-col h-full space-y-3 relative">
              {/* Component 7: Summary Stats & Scroll Navigation Controls Bar */}
              {isControlsExpanded && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg shrink-0 transition-all animate-in fade-in slide-in-from-top-1 duration-200">
                {/* Stats */}
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-teal-400" />
                  <div>
                    <span className="text-xs sm:text-sm font-black text-white">
                      Fila de Atendimento
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 hidden sm:inline">
                      ({isToday ? 'Hoje' : formattedSelectedDate})
                    </span>
                  </div>
                </div>

                {/* Counts and Manual Scroll Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span>AGUARDANDO</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-teal-500/30 text-teal-200 font-mono font-black">
                      {waitingGroup.length}
                    </span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span>ATENDIDO</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-emerald-200 font-mono font-black">
                      {completedGroup.length}
                    </span>
                  </span>
                  {otherGroup.length > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>OUTROS</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-slate-700 text-slate-300 font-mono font-black">
                        {otherGroup.length}
                      </span>
                    </span>
                  )}

                  {/* Manual Scroll Up / Down / Pause buttons */}
                  <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      id="tv-scroll-up-btn"
                      onClick={() => handleManualScroll(-180)}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-teal-600 text-slate-200 hover:text-white transition-colors"
                      title="Rolar lista para Cima"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      id="tv-scroll-down-btn"
                      onClick={() => handleManualScroll(180)}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-teal-600 text-slate-200 hover:text-white transition-colors"
                      title="Rolar lista para Baixo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      id="tv-scroll-top-btn"
                      onClick={handleScrollToTop}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors text-xs font-bold px-2"
                      title="Voltar ao início da fila"
                    >
                      Topo
                    </button>
                    <button
                      type="button"
                      id="tv-pause-play-btn"
                      onClick={() => setIsScrollPausedByUser(!isScrollPausedByUser)}
                      className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-bold px-2.5 transition-colors ${
                        isScrollPausedByUser
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                      }`}
                      title={isScrollPausedByUser ? 'Retomar Rolagem Automática' : 'Pausar Rolagem Automática'}
                    >
                      {isScrollPausedByUser ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                      <span>{isScrollPausedByUser ? 'Continuar' : 'Pausar'}</span>
                    </button>
                  </div>
                </div>
              </div>
              )}

              {/* Vertical Animated Scroll Canvas */}
              {allCategorizedItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center">
                  <Users className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-xl sm:text-2xl font-black text-slate-200">
                    {isToday ? 'Nenhum na fila hoje' : `Nenhum na fila no dia ${selectedDate.split('-').reverse().join('/')}`}
                  </h3>

                  {/* 2 Filtros no Card: Calendário (Dia Vigente) e Lista Suspensa de Profissionais (Todos) */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    {/* Filtro 1: Calendário */}
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarViewMonth(new Date(selectedDate + 'T00:00:00'));
                        setIsCalendarModalOpen(true);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                        !isToday
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-amber-500/30'
                          : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-teal-500/50'
                      }`}
                      title="Filtrar fila por data específica"
                    >
                      <CalendarDays className={`w-4 h-4 ${!isToday ? 'text-amber-400' : 'text-teal-400'}`} />
                      <span className="truncate max-w-[150px] sm:max-w-[200px]">
                        {isToday ? 'Hoje (Dia Vigente)' : formattedSelectedDate}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {/* Filtro 2: Lista Suspensa de Profissionais */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfSearchQuery('');
                        setIsProfFilterModalOpen(true);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                        selectedProfessionalId !== 'all'
                          ? 'bg-teal-500/20 border-teal-500/60 text-teal-200 hover:bg-teal-500/30'
                          : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-teal-500/50'
                      }`}
                      title="Filtrar por profissional de atendimento"
                    >
                      <Filter className={`w-4 h-4 ${selectedProfessionalId !== 'all' ? 'text-teal-300' : 'text-slate-400'}`} />
                      <span className="truncate max-w-[140px] sm:max-w-[190px]">
                        {activeSelectedProfessional ? activeSelectedProfessional.name : 'Todos os Profissionais'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {(!isToday || selectedProfessionalId !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(todayStr);
                        setSelectedProfessionalId('all');
                        setIsControlsExpanded(false);
                      }}
                      className="mt-4 text-slate-400 hover:text-teal-300 font-bold flex items-center gap-1.5 text-xs transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar Padrão (Hoje • Todos os Profissionais)
                    </button>
                  )}
                </div>
              ) : (
                <div
                  ref={scrollContainerRef}
                  onMouseEnter={() => setIsScrollPausedByUser(true)}
                  onMouseLeave={() => setIsScrollPausedByUser(false)}
                  onTouchStart={() => setIsScrollPausedByUser(true)}
                  onTouchEnd={() => setIsScrollPausedByUser(false)}
                  onWheel={(e) => {
                    // Smooth wheel scrolling
                    handleManualScroll(e.deltaY > 0 ? 120 : -120);
                  }}
                  className="flex-1 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 relative select-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
                  style={{ scrollBehavior: 'auto' }}
                >
                  {/* First Pass of Items */}
                  <div className="space-y-3 pb-3">
                    {/* Bloco 1: Aguardando */}
                    {waitingGroup.length > 0 && (
                      <div className="space-y-3">
                        <div className="sticky top-0 z-10 py-1.5 px-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs font-black text-teal-400 uppercase tracking-wider">
                          <span>AGUARDANDO</span>
                          <span>{waitingGroup.length}</span>
                        </div>
                        {waitingGroup.map((item) => renderPatientCard(item, `wait-1-${item.id}`))}
                      </div>
                    )}

                    {/* Bloco 2: Atendidos */}
                    {completedGroup.length > 0 && (
                      <div className="space-y-3 pt-3">
                        <div className="sticky top-0 z-10 py-1.5 px-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs font-black text-emerald-400 uppercase tracking-wider">
                          <span>ATENDIDO</span>
                          <span>{completedGroup.length}</span>
                        </div>
                        {completedGroup.map((item) => renderPatientCard(item, `comp-1-${item.id}`))}
                      </div>
                    )}

                    {/* Bloco 3: Demais status */}
                    {otherGroup.length > 0 && (
                      <div className="space-y-3 pt-3">
                        <div className="sticky top-0 z-10 py-1.5 px-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                          <span>OUTROS</span>
                          <span>{otherGroup.length}</span>
                        </div>
                        {otherGroup.map((item) => renderPatientCard(item, `other-1-${item.id}`))}
                      </div>
                    )}
                  </div>

                  {/* Duplicate Pass for Seamless Continuous Upward Loop */}
                  <div className="space-y-3 pt-3 border-t border-dashed border-slate-800/80">
                    {waitingGroup.length > 0 && (
                      <div className="space-y-3">
                        <div className="py-1.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-black text-teal-400 uppercase tracking-wider">
                          <span>AGUARDANDO</span>
                          <span>{waitingGroup.length}</span>
                        </div>
                        {waitingGroup.map((item) => renderPatientCard(item, `wait-2-${item.id}`))}
                      </div>
                    )}

                    {completedGroup.length > 0 && (
                      <div className="space-y-3 pt-3">
                        <div className="py-1.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-black text-emerald-400 uppercase tracking-wider">
                          <span>ATENDIDO</span>
                          <span>{completedGroup.length}</span>
                        </div>
                        {completedGroup.map((item) => renderPatientCard(item, `comp-2-${item.id}`))}
                      </div>
                    )}

                    {otherGroup.length > 0 && (
                      <div className="space-y-3 pt-3">
                        <div className="py-1.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                          <span>OUTROS</span>
                          <span>{otherGroup.length}</span>
                        </div>
                        {otherGroup.map((item) => renderPatientCard(item, `other-2-${item.id}`))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* 4. Bottom Footer */}
      <footer className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between max-w-7xl w-full mx-auto gap-2 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-300">
            Painel Sincronizado em Tempo Real • Sala de Espera
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300 font-bold transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Escanear QR Code no Celular</span>
          </button>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-500 hidden sm:inline">
            Aguarde o chamado do seu nome para entrar
          </span>
        </div>
      </footer>

      {/* 5. QR Code Modal for Mobile Viewers */}
      <PublicQueueQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        unitName={unitName}
      />

      {/* =========================================================================
          MODAL 1: CALENDAR DATE PICKER MODAL
         ========================================================================= */}
      <AnimatePresence>
        {isCalendarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-750 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl text-slate-100 flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Escolher Data da Fila</h3>
                    <p className="text-xs text-slate-400">Selecione o dia para visualizar os pacientes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Preset Buttons (Ontem, Hoje, Amanhã) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday.toISOString().split('T')[0]);
                    setIsCalendarModalOpen(false);
                    setIsControlsExpanded(false);
                  }}
                  className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 text-center transition-colors"
                >
                  Ontem
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(todayStr);
                    setIsCalendarModalOpen(false);
                    setIsControlsExpanded(false);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black border text-center transition-colors ${
                    isToday
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                  }`}
                >
                  Hoje (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow.toISOString().split('T')[0]);
                    setIsCalendarModalOpen(false);
                    setIsControlsExpanded(false);
                  }}
                  className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 text-center transition-colors"
                >
                  Amanhã
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between bg-slate-850 p-2 rounded-2xl border border-slate-750">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(calendarViewMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCalendarViewMonth(prev);
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-white capitalize">
                  {calendarViewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calendarViewMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCalendarViewMonth(next);
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-300"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-1">
                {/* Days of week */}
                <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 pb-1">
                  <span>Dom</span>
                  <span>Seg</span>
                  <span>Ter</span>
                  <span>Qua</span>
                  <span>Qui</span>
                  <span>Sex</span>
                  <span>Sáb</span>
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((item, idx) => {
                    const isSelected = item.dateStr === selectedDate;
                    const isItemToday = item.dateStr === todayStr;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDate(item.dateStr);
                          setIsCalendarModalOpen(false);
                          setIsControlsExpanded(false);
                        }}
                        className={`h-11 rounded-xl flex flex-col items-center justify-center p-1 text-xs relative transition-all ${
                          isSelected
                            ? 'bg-teal-500 text-slate-950 font-black shadow-lg scale-105 z-10'
                            : isItemToday
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 font-bold'
                            : item.isCurrentMonth
                            ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                            : 'bg-slate-900/40 text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        <span className="leading-none">{item.dayNum}</span>
                        {item.count > 0 && (
                          <span
                            className={`text-[9px] font-mono leading-none mt-1 px-1 rounded-full ${
                              isSelected
                                ? 'bg-slate-950 text-teal-300 font-bold'
                                : 'bg-teal-500/30 text-teal-300 font-extrabold'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Date Input Fallback */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                <label className="text-xs text-slate-400 font-medium shrink-0">Data manual:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setIsCalendarModalOpen(false);
                      setIsControlsExpanded(false);
                    }
                  }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL 2: PROFESSIONAL FILTER MODAL
         ========================================================================= */}
      <AnimatePresence>
        {isProfFilterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-750 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Filtrar por Profissional</h3>
                    <p className="text-xs text-slate-400">Exiba os pacientes de um profissional específico ou todos</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfFilterModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={profSearchQuery}
                  onChange={(e) => setProfSearchQuery(e.target.value)}
                  placeholder="Buscar profissional por nome ou cargo..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* List of Professionals */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px] scrollbar-thin scrollbar-thumb-slate-700">
                {/* Option "Todos os Profissionais" */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfessionalId('all');
                    setIsProfFilterModalOpen(false);
                    setIsControlsExpanded(false);
                  }}
                  className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left ${
                    selectedProfessionalId === 'all'
                      ? 'bg-teal-500/20 border-teal-500/60 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-750 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/30 flex items-center justify-center text-teal-300 font-black">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Todos os Profissionais (Padrão)</h4>
                      <p className="text-xs text-slate-400">Exibir fila unificada da unidade</p>
                    </div>
                  </div>
                  {selectedProfessionalId === 'all' && (
                    <div className="p-1 rounded-full bg-teal-500 text-slate-950">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>

                {/* Filtered Professionals */}
                {distinctProfessionalsList
                  .filter((p) => {
                    if (!profSearchQuery) return true;
                    const query = profSearchQuery.toLowerCase();
                    return p.name.toLowerCase().includes(query) || (p.profession && p.profession.toLowerCase().includes(query));
                  })
                  .map((prof) => {
                    const isSelected = selectedProfessionalId === prof.id;
                    const profConfig = PROFESSIONS[prof.profession];

                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => {
                          setSelectedProfessionalId(prof.id);
                          setIsProfFilterModalOpen(false);
                          setIsControlsExpanded(false);
                        }}
                        className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between text-left ${
                          isSelected
                            ? 'bg-teal-500/20 border-teal-500/60 text-white shadow-md'
                            : 'bg-slate-800/60 border-slate-750 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-teal-300 font-black shrink-0">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{prof.name}</h4>
                            <p className="text-xs text-slate-400 truncate">
                              {profConfig?.name || prof.profession}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {prof.count > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-500/40 text-xs font-black">
                              {prof.count} {prof.count === 1 ? 'paciente' : 'pacientes'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[11px]">
                              Sem fila
                            </span>
                          )}
                          {isSelected && (
                            <div className="p-1 rounded-full bg-teal-500 text-slate-950 ml-1">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* Modal footer */}
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <SpecularButton
                  type="button"
                  onClick={() => setIsProfFilterModalOpen(false)}
                  size="sm"
                  radius={12}
                  className="bg-slate-800 text-slate-300 hover:text-white border-slate-700"
                >
                  Fechar
                </SpecularButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
