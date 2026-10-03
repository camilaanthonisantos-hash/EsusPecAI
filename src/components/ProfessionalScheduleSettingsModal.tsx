import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Link,
  Copy,
  ExternalLink,
  CalendarCheck,
  DollarSign,
  Shield,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  Wand2,
  Layers,
  ArrowRight,
  RotateCcw,
  Search,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { User, DayScheduleConfig, ScheduleConfig, ProfessionalService, CustomTimeSlot } from '../types';
import { PROFESSIONS, isUserAdmin } from '../data/professions';
import {
  DEFAULT_WEEKLY_SCHEDULE,
  DEFAULT_SCHEDULE_CONFIG,
  getDefaultServicesForProfession,
  generateSlotsForTimeRange,
} from '../data/defaultSchedule';
import { isSecondaryCalendarId } from '../services/calendar';
import {
  connectAndFetchSecondaryCalendars,
  SecondaryGoogleCalendar,
} from '../services/googleCalendarAuth';
import { SpecularButton } from './SpecularButton';

interface ProfessionalScheduleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  currentUser?: User | null;
  initialTab?: 'schedule' | 'services' | 'calendar_sync';
  onSaveUser: (updatedUser: User) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
  onOpenPublicPortal?: (userId: string) => void;
}

export const ProfessionalScheduleSettingsModal: React.FC<ProfessionalScheduleSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  initialTab,
  onSaveUser,
  onShowToast,
  onOpenPublicPortal,
}) => {
  const isOperatorAdmin = Boolean(currentUser && isUserAdmin(currentUser));
  const isConfiguringOtherUser = Boolean(currentUser && currentUser.id !== user.id);

  const [googleCalendarId, setGoogleCalendarId] = useState(
    user.googleCalendarId || ''
  );
  const [isCalendarVerified, setIsCalendarVerified] = useState<boolean>(
    Boolean(
      user.googleCalendarId &&
      isSecondaryCalendarId(user.googleCalendarId) &&
      user.isGoogleCalendarVerified !== false
    )
  );
  const [calendarType, setCalendarType] = useState<'primary_email' | 'secondary_group' | undefined>(
    user.googleCalendarType === 'secondary_group' ? 'secondary_group' : undefined
  );
  const [calendarVerifiedAt, setCalendarVerifiedAt] = useState<number | undefined>(
    user.googleCalendarVerifiedAt
  );
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string>(
    user.email || ''
  );
  const [isSearchingSecondaryCalendars, setIsSearchingSecondaryCalendars] = useState<boolean>(false);
  const [secondaryCalendarsList, setSecondaryCalendarsList] = useState<SecondaryGoogleCalendar[]>([]);
  const [calendarSearchAttempted, setCalendarSearchAttempted] = useState<boolean>(false);
  const [calendarSearchError, setCalendarSearchError] = useState<string | null>(null);
  const [selectedSecondarySummary, setSelectedSecondarySummary] = useState<string>('');
  const [isBookingEnabled, setIsBookingEnabled] = useState(
    user.isBookingEnabled !== undefined ? user.isBookingEnabled : false
  );
  const [isChargingEnabled, setIsChargingEnabled] = useState(
    user.isChargingEnabled || false
  );

  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(() => {
    if (user.scheduleConfig && user.scheduleConfig.weeklySchedule?.length > 0) {
      // Ensure customSlots are initialized if missing
      const weekly = user.scheduleConfig.weeklySchedule.map((d) => {
        if (!d.customSlots || d.customSlots.length === 0) {
          if (d.enabled) {
            return {
              ...d,
              customSlots: generateSlotsForTimeRange(
                d.startTime || '08:00',
                d.endTime || '17:00',
                d.breakStartTime || '12:00',
                d.breakEndTime || '13:00',
                user.scheduleConfig?.slotDurationMinutes || 45
              ),
            };
          }
          return { ...d, customSlots: [] };
        }
        return d;
      });
      return {
        ...user.scheduleConfig,
        weeklySchedule: weekly,
      };
    }
    return {
      ...DEFAULT_SCHEDULE_CONFIG,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE.map((d) => ({ ...d })),
    };
  });

  // Services state: STRICTLY from the database (user.customServices).
  // NO automatic mock services injection!
  const [services, setServices] = useState<ProfessionalService[]>(() => {
    if (user.customServices && Array.isArray(user.customServices)) {
      return user.customServices;
    }
    return [];
  });

  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'services' | 'calendar_sync'>(
    initialTab || 'schedule'
  );

  // Sync activeSubTab if initialTab changes on open
  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);
  const [testingCalendar, setTestingCalendar] = useState(false);
  const [calendarTestResult, setCalendarTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Expanded days in weekly schedule (Monday-Friday expanded by default)
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({
    0: false,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: false,
  });

  // Adding slot inline state
  const [addingSlotForDay, setAddingSlotForDay] = useState<number | null>(null);
  const [newSlotStart, setNewSlotStart] = useState('08:00');
  const [newSlotEnd, setNewSlotEnd] = useState('08:45');

  // Editing slot state
  const [editingSlotInfo, setEditingSlotInfo] = useState<{ dayIndex: number; slotId: string } | null>(null);
  const [editSlotStart, setEditSlotStart] = useState('08:00');
  const [editSlotEnd, setEditSlotEnd] = useState('08:45');

  // Copy slots state
  const [copyingFromDay, setCopyingFromDay] = useState<number | null>(null);
  const [selectedCopyTargets, setSelectedCopyTargets] = useState<number[]>([1, 2, 3, 4, 5]);

  // Generator modal state
  const [generatorModalDay, setGeneratorModalDay] = useState<number | 'all' | null>(null);
  const [genStart, setGenStart] = useState('08:00');
  const [genEnd, setGenEnd] = useState('17:00');
  const [genBreakStart, setGenBreakStart] = useState('12:00');
  const [genBreakEnd, setGenBreakEnd] = useState('13:00');
  const [genDuration, setGenDuration] = useState(45);

  // New service inline form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState(30);
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Edit service state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceDuration, setEditServiceDuration] = useState(30);
  const [editServicePrice, setEditServicePrice] = useState(0);
  const [editServiceDesc, setEditServiceDesc] = useState('');

  const calculateEndTime = (startStr: string, durationMin: number): string => {
    const [hStr, mStr] = startStr.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const totalMin = h * 60 + m + durationMin;
    const endH = Math.floor(totalMin / 60);
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const calculateDurationInMinutes = (startStr: string, endStr: string): number => {
    const [h1, m1] = startStr.split(':').map(Number);
    const [h2, m2] = endStr.split(':').map(Number);
    const min1 = (h1 || 0) * 60 + (m1 || 0);
    const min2 = (h2 || 0) * 60 + (m2 || 0);
    return Math.max(0, min2 - min1);
  };

  const handleToggleExpandDay = (dayIndex: number) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayIndex]: !prev[dayIndex],
    }));
  };

  const handleOpenAddSlot = (dayIndex: number) => {
    const day = scheduleConfig.weeklySchedule.find((d) => d.dayOfWeek === dayIndex);
    const slots = day?.customSlots || [];
    let start = '08:00';
    if (slots.length > 0) {
      const lastSlot = slots[slots.length - 1];
      start = lastSlot.endTime || '08:00';
    }
    const end = calculateEndTime(start, scheduleConfig.slotDurationMinutes || 45);
    setNewSlotStart(start);
    setNewSlotEnd(end);
    setAddingSlotForDay(dayIndex);
  };

  const handleQuickAddSlotDuration = (durationMin: number) => {
    setNewSlotEnd(calculateEndTime(newSlotStart, durationMin));
  };

  const handleSaveNewSlot = (dayIndex: number) => {
    if (!newSlotStart || !newSlotEnd) {
      onShowToast('error', 'Informe o horário de início e término.', 'Campos Obrigatórios');
      return;
    }
    if (newSlotStart >= newSlotEnd) {
      onShowToast('error', 'O horário de término deve ser após o horário de início.', 'Horário Inválido');
      return;
    }

    const newSlot: CustomTimeSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      startTime: newSlotStart,
      endTime: newSlotEnd,
      enabled: true,
    };

    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (d.dayOfWeek === dayIndex) {
          const currentSlots = d.customSlots || [];
          const newSlots = [...currentSlots, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime));
          return { ...d, customSlots: newSlots };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });

    // Advance start/end for next slot so user can chain-add effortlessly
    const nextStart = newSlotEnd;
    const nextEnd = calculateEndTime(nextStart, scheduleConfig.slotDurationMinutes || 45);
    setNewSlotStart(nextStart);
    setNewSlotEnd(nextEnd);

    onShowToast('success', `Horário ${newSlot.startTime} às ${newSlot.endTime} adicionado!`, 'Horário Cadastrado');
  };

  const handleStartEditSlot = (dayIndex: number, slot: CustomTimeSlot) => {
    setEditingSlotInfo({ dayIndex, slotId: slot.id });
    setEditSlotStart(slot.startTime);
    setEditSlotEnd(slot.endTime);
  };

  const handleSaveEditSlot = (dayIndex: number, slotId: string) => {
    if (!editSlotStart || !editSlotEnd) {
      onShowToast('error', 'Informe o horário de início e término.', 'Campos Obrigatórios');
      return;
    }
    if (editSlotStart >= editSlotEnd) {
      onShowToast('error', 'O horário de término deve ser após o horário de início.', 'Horário Inválido');
      return;
    }

    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (d.dayOfWeek === dayIndex) {
          const updatedSlots = (d.customSlots || [])
            .map((s) => (s.id === slotId ? { ...s, startTime: editSlotStart, endTime: editSlotEnd } : s))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return { ...d, customSlots: updatedSlots };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });

    setEditingSlotInfo(null);
    onShowToast('success', 'Horário atualizado com sucesso!', 'Horário Salvo');
  };

  const handleDeleteSlot = (dayIndex: number, slotId: string) => {
    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (d.dayOfWeek === dayIndex) {
          const updatedSlots = (d.customSlots || []).filter((s) => s.id !== slotId);
          return { ...d, customSlots: updatedSlots };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });
    onShowToast('info', 'Horário removido do dia.', 'Horário Excluído');
  };

  const handleToggleSlot = (dayIndex: number, slotId: string) => {
    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (d.dayOfWeek === dayIndex) {
          const updatedSlots = (d.customSlots || []).map((s) =>
            s.id === slotId ? { ...s, enabled: s.enabled === false ? true : false } : s
          );
          return { ...d, customSlots: updatedSlots };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });
  };

  const handleClearDaySlots = (dayIndex: number) => {
    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (d.dayOfWeek === dayIndex) {
          return { ...d, customSlots: [] };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });
    onShowToast('info', 'Todos os horários deste dia foram removidos.', 'Grade Limpa');
  };

  const handleExecuteGenerateSlots = () => {
    if (!genStart || !genEnd) {
      onShowToast('error', 'Preencha o intervalo de início e fim.', 'Atenção');
      return;
    }

    const generated = generateSlotsForTimeRange(genStart, genEnd, genBreakStart, genBreakEnd, genDuration);

    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (generatorModalDay === 'all') {
          if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
            return {
              ...d,
              enabled: true,
              startTime: genStart,
              endTime: genEnd,
              breakStartTime: genBreakStart,
              breakEndTime: genBreakEnd,
              customSlots: generated.map((s) => ({ ...s, id: `gen-${d.dayOfWeek}-${s.id}` })),
            };
          }
        } else if (d.dayOfWeek === generatorModalDay) {
          return {
            ...d,
            enabled: true,
            startTime: genStart,
            endTime: genEnd,
            breakStartTime: genBreakStart,
            breakEndTime: genBreakEnd,
            customSlots: generated.map((s) => ({ ...s, id: `gen-${d.dayOfWeek}-${s.id}` })),
          };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });

    onShowToast('success', `${generated.length} horários gerados automaticamente!`, 'Grade Criada');
    setGeneratorModalDay(null);
  };

  const handleExecuteCopySlots = (sourceDayIndex: number) => {
    const sourceDay = scheduleConfig.weeklySchedule.find((d) => d.dayOfWeek === sourceDayIndex);
    const sourceSlots = sourceDay?.customSlots || [];

    if (sourceSlots.length === 0) {
      onShowToast('error', 'O dia selecionado não possui horários para copiar.', 'Atenção');
      return;
    }

    if (selectedCopyTargets.length === 0) {
      onShowToast('error', 'Selecione ao menos um dia de destino.', 'Atenção');
      return;
    }

    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (selectedCopyTargets.includes(d.dayOfWeek) && d.dayOfWeek !== sourceDayIndex) {
          return {
            ...d,
            enabled: true,
            startTime: sourceDay?.startTime || '08:00',
            endTime: sourceDay?.endTime || '17:00',
            breakStartTime: sourceDay?.breakStartTime,
            breakEndTime: sourceDay?.breakEndTime,
            customSlots: sourceSlots.map((s) => ({
              ...s,
              id: `copy-${d.dayOfWeek}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            })),
          };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });

    onShowToast('success', `Horários copiados para ${selectedCopyTargets.length} dias!`, 'Cópia Concluída');
    setCopyingFromDay(null);
  };

  const handleStartEditService = (serv: ProfessionalService) => {
    setEditingServiceId(serv.id);
    setEditServiceName(serv.name);
    setEditServiceDuration(serv.durationMinutes || 30);
    setEditServicePrice(serv.price || 0);
    setEditServiceDesc(serv.description || '');
  };

  const handleCancelEditService = () => {
    setEditingServiceId(null);
    setEditServiceName('');
    setEditServiceDuration(30);
    setEditServicePrice(0);
    setEditServiceDesc('');
  };

  const handleSaveEditService = (serviceId: string) => {
    if (!editServiceName.trim()) {
      onShowToast('error', 'Informe o nome do serviço.', 'Campo Obrigatório');
      return;
    }

    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              name: editServiceName.trim(),
              durationMinutes: Number(editServiceDuration) || 30,
              price: Number(editServicePrice) || 0,
              description: editServiceDesc.trim() || undefined,
            }
          : s
      )
    );

    handleCancelEditService();
    onShowToast('success', 'Serviço atualizado com sucesso!', 'Serviço Atualizado');
  };

  const publicGeneralUrl = `${window.location.origin}${window.location.pathname}?portal=agendar`;
  const publicBookingUrl = `${window.location.origin}${window.location.pathname}?portal=agendar&userId=${encodeURIComponent(
    user.id
  )}`;

  const handleCopyGeneralLink = () => {
    navigator.clipboard.writeText(publicGeneralUrl);
    onShowToast('success', 'Link geral da unidade copiado! Permite ao cidadão agendar com qualquer profissional sem login.', 'Link Geral Copiado');
  };

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicBookingUrl);
    onShowToast('success', 'Link direto com seu perfil copiado! O cidadão poderá agendar com você ou escolher outro profissional da equipe.', 'Link Copiado');
  };

  const handleToggleDay = (dayIndex: number) => {
    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (d.dayOfWeek === dayIndex) {
          return { ...d, enabled: !d.enabled };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });
  };

  const handleUpdateDayTime = (
    dayIndex: number,
    field: 'startTime' | 'endTime' | 'breakStartTime' | 'breakEndTime',
    val: string
  ) => {
    setScheduleConfig((prev) => {
      const updated = prev.weeklySchedule.map((d) => {
        if (d.dayOfWeek === dayIndex) {
          return { ...d, [field]: val };
        }
        return d;
      });
      return { ...prev, weeklySchedule: updated };
    });
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      onShowToast('error', 'Informe o nome do serviço.', 'Campo Obrigatório');
      return;
    }

    const newService: ProfessionalService = {
      id: `serv-${Date.now()}`,
      name: newServiceName.trim(),
      durationMinutes: Number(newServiceDuration) || 30,
      price: Number(newServicePrice) || 0,
      description: newServiceDesc.trim() || undefined,
      active: true,
    };

    setServices((prev) => [...prev, newService]);
    setNewServiceName('');
    setNewServiceDuration(30);
    setNewServicePrice(0);
    setNewServiceDesc('');
    onShowToast('success', `Serviço "${newService.name}" adicionado com sucesso!`, 'Serviço Criado');
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    onShowToast('info', 'Serviço removido do catálogo.', 'Serviço Removido');
  };

  const handleToggleServiceActive = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, active: !s.active } : s))
    );
  };

  const handleSearchSecondaryCalendars = async (emailToSearch?: string) => {
    const targetEmail = (emailToSearch || googleAccountEmail || user.email || '').trim();
    if (!targetEmail) {
      onShowToast('error', 'Informe o seu e-mail do Google para buscar as agendas secundárias.', 'E-mail Obrigatório');
      return;
    }

    setIsSearchingSecondaryCalendars(true);
    setCalendarSearchError(null);
    setCalendarSearchAttempted(true);

    try {
      const result = await connectAndFetchSecondaryCalendars(targetEmail);
      if (result.success) {
        setSecondaryCalendarsList(result.secondaryCalendars);
        if (result.secondaryCalendars.length === 1) {
          const single = result.secondaryCalendars[0];
          setGoogleCalendarId(single.id);
          setSelectedSecondarySummary(single.summary);
          setIsCalendarVerified(true);
          setCalendarType('secondary_group');
          setCalendarVerifiedAt(Date.now());
          setCalendarTestResult({
            valid: true,
            message: `Agenda secundária "${single.summary}" identificada e vinculada com sucesso!`,
          });
          onShowToast('success', `Agenda secundária "${single.summary}" vinculada com sucesso!`, 'Google Calendar Conectado');
        } else if (result.secondaryCalendars.length > 1) {
          const currentMatch = result.secondaryCalendars.find((c) => c.id === googleCalendarId);
          if (currentMatch) {
            setSelectedSecondarySummary(currentMatch.summary);
            setIsCalendarVerified(true);
            setCalendarType('secondary_group');
          }
          onShowToast('info', `${result.secondaryCalendars.length} agendas secundárias encontradas. Escolha a que deseja utilizar para o consultório.`, 'Agendas Secundárias');
        } else {
          onShowToast('warning', 'Nenhuma agenda secundária encontrada nesta conta Google.', 'Nenhuma Agenda');
        }
      } else {
        setCalendarSearchError(result.error || 'Falha ao buscar agendas secundárias no Google.');
        onShowToast('error', result.error || 'Falha ao buscar agendas secundárias.', 'Erro');
      }
    } catch (err: any) {
      const msg = err.message || 'Erro inesperado na comunicação com o Google Calendar.';
      setCalendarSearchError(msg);
      onShowToast('error', msg, 'Erro Google');
    } finally {
      setIsSearchingSecondaryCalendars(false);
    }
  };

  const handleSelectSecondaryCalendar = (cal: SecondaryGoogleCalendar) => {
    setGoogleCalendarId(cal.id);
    setSelectedSecondarySummary(cal.summary);
    setIsCalendarVerified(true);
    setCalendarType('secondary_group');
    setCalendarVerifiedAt(Date.now());
    setCalendarTestResult({
      valid: true,
      message: `Agenda secundária "${cal.summary}" (${cal.id}) vinculada com sucesso!`,
    });
    onShowToast('success', `Agenda "${cal.summary}" selecionada!`, 'Agenda Definida');
  };

  const handleTestGoogleCalendar = async () => {
    const cleanId = googleCalendarId.trim();
    if (!cleanId) {
      onShowToast('error', 'Informe o ID da agenda secundária ou use "Buscar Agendas Secundárias".', 'Google Calendar');
      return;
    }

    if (!isSecondaryCalendarId(cleanId)) {
      setIsCalendarVerified(false);
      setCalendarTestResult({
        valid: false,
        message: 'Atenção: Apenas agendas secundárias (@group.calendar.google.com) são permitidas para agendamentos. Para sua privacidade e compatibilidade com o n8n e e-SUS PEC, informe seu e-mail acima e clique em "Buscar Agendas Secundárias" para escolher a agenda do consultório.',
      });
      onShowToast('error', 'Apenas agendas secundárias (@group.calendar.google.com) são aceitas.', 'Agenda Principal Proibida');
      return;
    }

    setTestingCalendar(true);
    setCalendarTestResult(null);

    try {
      const res = await fetch('/api/appointments/google-calendar/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: cleanId }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setIsCalendarVerified(true);
        setCalendarType('secondary_group');
        setCalendarVerifiedAt(Date.now());
        setCalendarTestResult({ valid: true, message: data.message });
        onShowToast('success', data.message, 'Agenda Secundária Validada');
      } else {
        setIsCalendarVerified(false);
        setCalendarTestResult({ valid: false, message: data.message || 'ID de calendário inválido.' });
        onShowToast('error', data.message || 'Falha ao validar agenda secundária.', 'Erro de Validação');
      }
    } catch (err) {
      setIsCalendarVerified(false);
      setCalendarTestResult({ valid: false, message: 'Erro de comunicação ao validar a agenda Google.' });
      onShowToast('error', 'Não foi possível conectar ao servidor de validação.', 'Erro de Conexão');
    } finally {
      setTestingCalendar(false);
    }
  };

  // Condition to enable save button:
  // "só assim habilita o botão 'Salvar Configurações da Agenda'"
  const isSecondaryValid = Boolean(
    googleCalendarId.trim() &&
    isSecondaryCalendarId(googleCalendarId.trim()) &&
    isCalendarVerified
  );

  const isSaveDisabled = false;

  const handleSaveAll = () => {
    const cleanCalendarId = googleCalendarId.trim();

    let finalBookingEnabled = isBookingEnabled;
    if (isBookingEnabled && (!cleanCalendarId || !isSecondaryCalendarId(cleanCalendarId) || !isCalendarVerified)) {
      finalBookingEnabled = false;
      onShowToast(
        'info',
        'Configurações salvas no banco de dados! O agendamento público permanecerá pausado até que uma agenda secundária (@group.calendar.google.com) seja vinculada e validada.',
        'Dados Salvos (Agendamento Pausado)'
      );
    } else {
      onShowToast('success', 'Configurações de agendamento e catálogo de serviços gravadas com sucesso no banco de dados!', 'Configurações Salvas');
    }

    const updatedUser: User = {
      ...user,
      googleCalendarId: isSecondaryValid ? cleanCalendarId : user.googleCalendarId,
      isGoogleCalendarVerified: isSecondaryValid ? true : Boolean(user.isGoogleCalendarVerified && isSecondaryValid),
      googleCalendarType: isSecondaryValid ? 'secondary_group' : user.googleCalendarType,
      googleCalendarVerifiedAt: isSecondaryValid ? calendarVerifiedAt || Date.now() : user.googleCalendarVerifiedAt,
      isBookingEnabled: finalBookingEnabled,
      isChargingEnabled,
      scheduleConfig,
      customServices: services,
    };

    onSaveUser(updatedUser);
    onClose();
  };

  if (!isOpen) return null;

  const profConfig = PROFESSIONS[user.profession];

  return (
    <AnimatePresence>
      <div
        id="professional-schedule-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="professional-schedule-modal"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-h-[92vh] flex flex-col relative my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Gestão de Agenda & Atendimentos
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/10 dark:bg-teal-500/20 text-[10px] font-extrabold text-teal-700 dark:text-teal-300 border border-teal-500/20">
                    {profConfig?.name || user.profession}
                  </span>
                  {isConfiguringOtherUser && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-[10px] font-extrabold text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-purple-600" />
                      Configuração por Administrador
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isConfiguringOtherUser ? (
                    <>
                      Configurando grade de: <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong> • {user.workplace}
                    </>
                  ) : (
                    <>
                      {user.name} • {user.workplace}
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions / Public Link Banner */}
          <div className="my-4 p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-slate-900 border border-teal-200/80 dark:border-teal-800/60 shrink-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    Links Públicos para Cidadãos (Sem Login)
                  </span>
                  {isBookingEnabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Recebendo Agendamentos
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold">
                      Agendamentos Desativados
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  O cidadão sempre pode escolher qualquer profissional da unidade através do portal público.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <SpecularButton
                  type="button"
                  onClick={handleCopyGeneralLink}
                  size="sm"
                  radius={10}
                  className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs"
                  title="Link geral onde o cidadão escolhe qualquer profissional da unidade"
                >
                  <Copy className="w-3.5 h-3.5 mr-1 text-teal-600" />
                  Link Geral da Unidade
                </SpecularButton>

                <SpecularButton
                  type="button"
                  onClick={handleCopyPublicLink}
                  size="sm"
                  radius={10}
                  className="bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700 text-xs font-bold shadow-2xs"
                  title="Link direto com seu perfil recomendado inicialmente"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Meu Link Direto
                </SpecularButton>

                {onOpenPublicPortal && (
                  <SpecularButton
                    type="button"
                    onClick={() => onOpenPublicPortal(user.id)}
                    size="sm"
                    radius={10}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Abrir Portal
                  </SpecularButton>
                )}
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('schedule')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'schedule'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Grade de Atendimento Semanal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('services')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'services'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Catálogo de Serviços ({services.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('calendar_sync')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'calendar_sync'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Google Calendar & Pagamento</span>
            </button>
          </div>

          {/* Tab Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* 1. WEEKLY SCHEDULE */}
            {activeSubTab === 'schedule' && (
              <div className="space-y-4">
                {/* Global Scheduling Parameters & Quick Action */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span>Configuração Geral de Vagas & Horários</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Cadastre, edite e exclua os horários específicos de atendimento para cada dia da semana (ex: 08:00 às 08:45, 08:45 às 09:30).
                      </p>
                    </div>

                    <SpecularButton
                      type="button"
                      onClick={() => setGeneratorModalDay('all')}
                      size="sm"
                      radius={12}
                      className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 self-start sm:self-auto"
                    >
                      <Wand2 className="w-3.5 h-3.5 mr-1" />
                      ⚡ Gerar Grade Semanal (Seg-Sex)
                    </SpecularButton>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Duração Padrão Sugerida
                      </label>
                      <select
                        value={scheduleConfig.slotDurationMinutes}
                        onChange={(e) =>
                          setScheduleConfig({ ...scheduleConfig, slotDurationMinutes: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                      >
                        <option value={15}>15 minutos</option>
                        <option value={20}>20 minutos</option>
                        <option value={30}>30 minutos</option>
                        <option value={40}>40 minutos</option>
                        <option value={45}>45 minutos (Recomendado)</option>
                        <option value={50}>50 minutos</option>
                        <option value={60}>60 minutos (1 hora)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Intervalo entre Consultas
                      </label>
                      <select
                        value={scheduleConfig.breakDurationMinutes || 0}
                        onChange={(e) =>
                          setScheduleConfig({ ...scheduleConfig, breakDurationMinutes: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                      >
                        <option value={0}>Sem intervalo (0 min)</option>
                        <option value={5}>5 minutos</option>
                        <option value={10}>10 minutos</option>
                        <option value={15}>15 minutos</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Antecedência Mínima
                      </label>
                      <select
                        value={scheduleConfig.minNoticeHours || 2}
                        onChange={(e) =>
                          setScheduleConfig({ ...scheduleConfig, minNoticeHours: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
                      >
                        <option value={1}>1 hora antes</option>
                        <option value={2}>2 horas antes (Padrão)</option>
                        <option value={4}>4 horas antes</option>
                        <option value={12}>12 horas antes</option>
                        <option value={24}>24 horas antes (1 dia)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Days of Week - Individual Day Cards with Full Slot Management */}
                <div className="space-y-3">
                  {scheduleConfig.weeklySchedule.map((day) => {
                    const isExpanded = expandedDays[day.dayOfWeek] !== false;
                    const daySlots = day.customSlots || [];
                    const activeSlotsCount = daySlots.filter((s) => s.enabled !== false).length;
                    const isAddingForThisDay = addingSlotForDay === day.dayOfWeek;

                    return (
                      <div
                        key={day.dayOfWeek}
                        className={`border rounded-2xl transition-all ${
                          day.enabled
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
                            : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/60 opacity-75'
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleDay(day.dayOfWeek)}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                day.enabled
                                  ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title={day.enabled ? 'Desativar dia' : 'Ativar dia'}
                            >
                              {day.enabled ? (
                                <ToggleRight className="w-6 h-6" />
                              ) : (
                                <ToggleLeft className="w-6 h-6" />
                              )}
                            </button>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  day.enabled ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'
                                }`}
                              >
                                {day.dayName}
                              </span>

                              {day.enabled ? (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    daySlots.length > 0
                                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60'
                                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                  }`}
                                >
                                  {daySlots.length > 0
                                    ? `${activeSlotsCount} ${activeSlotsCount === 1 ? 'horário' : 'horários'}`
                                    : 'Sem horários'}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                  Fechado
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions for this Day */}
                          {day.enabled && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isExpanded) handleToggleExpandDay(day.dayOfWeek);
                                  handleOpenAddSlot(day.dayOfWeek);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800/60 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Horário</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setGeneratorModalDay(day.dayOfWeek)}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Gerar horários automaticamente para este dia"
                              >
                                <Wand2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span className="hidden sm:inline">Gerar</span>
                              </button>

                              {daySlots.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCopyingFromDay(day.dayOfWeek);
                                    setSelectedCopyTargets([1, 2, 3, 4, 5].filter((d) => d !== day.dayOfWeek));
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Copiar estes horários para outros dias"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Copiar</span>
                                </button>
                              )}

                              {daySlots.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleClearDaySlots(day.dayOfWeek)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                  title="Limpar todos os horários deste dia"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleExpandDay(day.dayOfWeek)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title={isExpanded ? 'Recolher horários' : 'Expandir horários'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Day Card Content (Expanded) */}
                        {day.enabled && isExpanded && (
                          <div className="p-3 sm:p-4 space-y-3">
                            {/* Inline Form: Add New Slot for this Day */}
                            {isAddingForThisDay && (
                              <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Cadastrar Novo Horário em {day.dayName}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setAddingSlotForDay(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                      Início:
                                    </span>
                                    <input
                                      type="time"
                                      value={newSlotStart}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setNewSlotStart(val);
                                        setNewSlotEnd(calculateEndTime(val, scheduleConfig.slotDurationMinutes || 45));
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                      Término:
                                    </span>
                                    <input
                                      type="time"
                                      value={newSlotEnd}
                                      onChange={(e) => setNewSlotEnd(e.target.value)}
                                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                  </div>

                                  {/* Quick duration presets */}
                                  <div className="flex items-center gap-1 pl-1">
                                    <span className="text-[10px] text-slate-500">Duração:</span>
                                    {[30, 40, 45, 50, 60].map((dur) => (
                                      <button
                                        key={dur}
                                        type="button"
                                        onClick={() => handleQuickAddSlotDuration(dur)}
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                                          calculateDurationInMinutes(newSlotStart, newSlotEnd) === dur
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        {dur}m
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-2 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveNewSlot(day.dayOfWeek)}
                                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Incluir Horário</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Registered Slots Chips / Grid */}
                            {daySlots.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {daySlots.map((slot) => {
                                  const isEditing =
                                    editingSlotInfo?.dayIndex === day.dayOfWeek && editingSlotInfo?.slotId === slot.id;
                                  const isSlotEnabled = slot.enabled !== false;
                                  const durationMin = calculateDurationInMinutes(slot.startTime, slot.endTime);

                                  if (isEditing) {
                                    return (
                                      <div
                                        key={slot.id}
                                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 space-y-2 col-span-1 sm:col-span-2"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="time"
                                            value={editSlotStart}
                                            onChange={(e) => setEditSlotStart(e.target.value)}
                                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                                          />
                                          <span className="text-xs text-slate-500">às</span>
                                          <input
                                            type="time"
                                            value={editSlotEnd}
                                            onChange={(e) => setEditSlotEnd(e.target.value)}
                                            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                                          />
                                          <div className="flex items-center gap-1 ml-auto">
                                            <button
                                              type="button"
                                              onClick={() => handleSaveEditSlot(day.dayOfWeek, slot.id)}
                                              className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                              title="Salvar alterações no horário"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingSlotInfo(null)}
                                              className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                              title="Cancelar edição"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={slot.id}
                                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                        isSlotEnabled
                                          ? 'bg-slate-50/80 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/80 hover:border-teal-300 dark:hover:border-teal-700'
                                          : 'bg-slate-100/50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-800 opacity-50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            isSlotEnabled ? 'bg-teal-500' : 'bg-slate-400'
                                          }`}
                                        />
                                        <div>
                                          <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                                            {slot.startTime} às {slot.endTime}
                                          </div>
                                          <div className="text-[10px] text-slate-500">
                                            {durationMin} min {isSlotEnabled ? '' : '• Pausado'}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditSlot(day.dayOfWeek, slot)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors cursor-pointer"
                                          title="Editar este horário"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleToggleSlot(day.dayOfWeek, slot.id)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
                                          title={isSlotEnabled ? 'Pausar horário temporariamente' : 'Ativar horário'}
                                        >
                                          {isSlotEnabled ? (
                                            <Eye className="w-3 h-3" />
                                          ) : (
                                            <EyeOff className="w-3 h-3" />
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSlot(day.dayOfWeek, slot.id)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                          title="Excluir este horário"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
                                <p className="text-xs text-slate-500">
                                  Nenhum horário cadastrado para {day.dayName}.
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddSlot(day.dayOfWeek)}
                                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Cadastrar Primeiro Horário</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setGeneratorModalDay(day.dayOfWeek)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Wand2 className="w-3.5 h-3.5" />
                                    <span>Gerar Grade Automática</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* MODAL: Automatic Slot Generator */}
                {generatorModalDay !== null && (
                  <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-teal-200/60 dark:border-teal-800/60">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <h4 className="text-xs font-bold text-teal-950 dark:text-teal-100">
                          {generatorModalDay === 'all'
                            ? '⚡ Gerador Automático de Grade (Segunda a Sexta)'
                            : `⚡ Gerador Automático de Horários para ${
                                scheduleConfig.weeklySchedule.find((d) => d.dayOfWeek === generatorModalDay)?.dayName
                              }`}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGeneratorModalDay(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Início do Expediente
                        </label>
                        <input
                          type="time"
                          value={genStart}
                          onChange={(e) => setGenStart(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Fim do Expediente
                        </label>
                        <input
                          type="time"
                          value={genEnd}
                          onChange={(e) => setGenEnd(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Pausa Almoço
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={genBreakStart}
                            onChange={(e) => setGenBreakStart(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                          />
                          <span className="text-[10px] text-slate-400">às</span>
                          <input
                            type="time"
                            value={genBreakEnd}
                            onChange={(e) => setGenBreakEnd(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Duração do Bloco
                        </label>
                        <select
                          value={genDuration}
                          onChange={(e) => setGenDuration(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                        >
                          <option value={15}>15 minutos</option>
                          <option value={20}>20 minutos</option>
                          <option value={30}>30 minutos</option>
                          <option value={40}>40 minutos</option>
                          <option value={45}>45 minutos (Padrão)</option>
                          <option value={50}>50 minutos</option>
                          <option value={60}>60 minutos</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-teal-800 dark:text-teal-300">
                        Exemplo de grade gerada: <code>08:00 às 08:45</code>, <code>08:45 às 09:30</code>...
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGeneratorModalDay(null)}
                          className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteGenerateSlots}
                          className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Gerar Horários Agora</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL: Copy Slots to Other Days */}
                {copyingFromDay !== null && (
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/60 dark:border-blue-800/60">
                      <div className="flex items-center gap-2">
                        <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="text-xs font-bold text-blue-950 dark:text-blue-100">
                          Copiar Horários de{' '}
                          {scheduleConfig.weeklySchedule.find((d) => d.dayOfWeek === copyingFromDay)?.dayName} para
                          Outros Dias
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCopyingFromDay(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Selecione os dias que devem receber exatamente a mesma lista de horários cadastrados:
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {scheduleConfig.weeklySchedule
                        .filter((d) => d.dayOfWeek !== copyingFromDay)
                        .map((targetDay) => {
                          const isSelected = selectedCopyTargets.includes(targetDay.dayOfWeek);
                          return (
                            <button
                              key={targetDay.dayOfWeek}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedCopyTargets(selectedCopyTargets.filter((d) => d !== targetDay.dayOfWeek));
                                } else {
                                  setSelectedCopyTargets([...selectedCopyTargets, targetDay.dayOfWeek]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{targetDay.dayName}</span>
                            </button>
                          );
                        })}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCopyTargets([1, 2, 3, 4, 5].filter((d) => d !== copyingFromDay))
                        }
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Selecionar todos os dias úteis (Seg-Sex)
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCopyingFromDay(null)}
                          className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExecuteCopySlots(copyingFromDay)}
                          disabled={selectedCopyTargets.length === 0}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiar Horários ({selectedCopyTargets.length})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SERVICES CATALOG */}
            {activeSubTab === 'services' && (
              <div className="space-y-4">
                {/* Add Service Card */}
                <form onSubmit={handleAddService} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <Plus className="w-4 h-4 text-teal-600" />
                    <span>Adicionar Novo Tipo de Atendimento / Serviço</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Nome do Serviço / Consulta <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Ex: Consulta Médica de Retorno, Sessão de Terapia..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Duração (Minutos) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      >
                        <option value={15}>15 min</option>
                        <option value={20}>20 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={50}>50 min</option>
                        <option value={60}>60 min (1h)</option>
                        <option value={90}>90 min (1h30)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Descrição / Instruções para o Paciente (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newServiceDesc}
                      onChange={(e) => setNewServiceDesc(e.target.value)}
                      placeholder="Ex: Trazer exames anteriores e cartão SUS..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Serviço</span>
                    </button>
                  </div>
                </form>

                {/* Services List */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Serviços do Profissional ({services.length})
                    </h4>
                    {services.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const suggested = getDefaultServicesForProfession(user.profession);
                          setServices(suggested);
                          onShowToast('info', `${suggested.length} procedimentos sugeridos carregados. Clique em "Salvar Configurações" para gravar no banco de dados.`, 'Sugestões Carregadas');
                        }}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Sugerir Procedimentos Padrão SUS</span>
                      </button>
                    )}
                  </div>

                  {services.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 text-center text-xs text-slate-500 border border-dashed border-slate-300 dark:border-slate-800">
                      Nenhum serviço cadastrado no banco de dados para este profissional. Cadastre um novo serviço no formulário acima para que pacientes possam selecionar.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      {services.map((serv) =>
                        editingServiceId === serv.id ? (
                          <div
                            key={serv.id}
                            className="p-4 bg-teal-50/40 dark:bg-teal-950/20 border-l-4 border-l-teal-500 space-y-3 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300">
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Editar Serviço</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">ID: {serv.id}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-6">
                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                  Nome do Serviço / Consulta <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editServiceName}
                                  onChange={(e) => setEditServiceName(e.target.value)}
                                  placeholder="Nome do serviço..."
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                  Duração (Minutos) <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  value={editServiceDuration}
                                  onChange={(e) => setEditServiceDuration(Number(e.target.value))}
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                  <option value={15}>15 min</option>
                                  <option value={20}>20 min</option>
                                  <option value={30}>30 min</option>
                                  <option value={45}>45 min</option>
                                  <option value={50}>50 min</option>
                                  <option value={60}>60 min (1h)</option>
                                  <option value={90}>90 min (1h30)</option>
                                </select>
                              </div>

                              <div className="sm:col-span-3">
                                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                  Valor (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editServicePrice}
                                  onChange={(e) => setEditServicePrice(Number(e.target.value))}
                                  placeholder="0.00"
                                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Descrição / Instruções para o Paciente (Opcional)
                              </label>
                              <input
                                type="text"
                                value={editServiceDesc}
                                onChange={(e) => setEditServiceDesc(e.target.value)}
                                placeholder="Instruções para o paciente..."
                                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={handleCancelEditService}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditService(serv.id)}
                                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Salvar Alterações</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={serv.id}
                            className={`p-3.5 flex items-center justify-between gap-3 ${
                              serv.active
                                ? 'bg-white dark:bg-slate-900'
                                : 'bg-slate-50 dark:bg-slate-950/60 opacity-60'
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {serv.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                                  {serv.durationMinutes} min
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                  {serv.price > 0 ? `R$ ${serv.price.toFixed(2)}` : 'SUS / Gratuito'}
                                </span>
                              </div>
                              {serv.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {serv.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditService(serv)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/60 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Editar serviço"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleServiceActive(serv.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                                  serv.active
                                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
                                    : 'text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                                }`}
                                title={serv.active ? 'Desativar serviço' : 'Ativar serviço'}
                              >
                                {serv.active ? 'Ativo' : 'Inativo'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteService(serv.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                title="Excluir serviço"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. GOOGLE CALENDAR & CHARGING */}
            {activeSubTab === 'calendar_sync' && (
              <div className="space-y-4">
                {/* Booking & Charging Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        Recebimento de Agendamentos Online
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ativa ou desativa a exibição do profissional no portal público e via WhatsApp n8n.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBookingEnabled(!isBookingEnabled)}
                      className="p-1 rounded-lg text-teal-600 dark:text-teal-400 cursor-pointer"
                    >
                      {isBookingEnabled ? (
                        <ToggleRight className="w-7 h-7" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Exigir Pagamento Obrigatório (PIX)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Se ativado e o serviço tiver valor, gera PIX automático antes de confirmar a vaga.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChargingEnabled(!isChargingEnabled)}
                      className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 cursor-pointer"
                    >
                      {isChargingEnabled ? (
                        <ToggleRight className="w-7 h-7" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Google Calendar ID Configuration - STRICT SECONDARY CALENDAR FLOW */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          Agenda Secundária do Google Calendar (Obrigatória)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Garante privacidade total separando seus compromissos particulares da agenda do consultório.
                        </p>
                      </div>
                    </div>

                    {isSecondaryValid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold shrink-0 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Agenda Secundária Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold shrink-0 border border-amber-300 dark:border-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Seleção Pendente
                      </span>
                    )}
                  </div>

                  {/* Clarification Rule Banner */}
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Regra de Privacidade & Integração com n8n / e-SUS PEC
                    </div>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300/80 leading-relaxed">
                      Para evitar a exposição de sua agenda pessoal, o sistema exige que você selecione uma <strong>agenda secundária</strong> (terminada em <code>@group.calendar.google.com</code>). Informe o e-mail da conta Google abaixo para buscarmos as agendas secundárias disponíveis.
                    </p>
                  </div>

                  {/* Admin Centralized Management Helper */}
                  {isOperatorAdmin && (
                    <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-2.5">
                      <div className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        Conexão Centralizada da Clínica (Painel do Administrador)
                      </div>
                      <p className="text-[11px] text-purple-800/90 dark:text-purple-200/90 leading-relaxed">
                        {isConfiguringOtherUser
                          ? `Como Administrador, você pode conectar a agenda de ${user.name} usando a conta Google da clínica. Se este profissional não possui conta Google, basta criar uma agenda secundária (ex: "Dr(a). ${user.name}") na sua conta Google e selecioná-la aqui. O profissional não precisa de conta Google!`
                          : 'Como Administrador, você pode usar a conta Google da clínica para buscar e gerenciar todas as agendas secundárias da equipe.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {currentUser?.email && (
                          <button
                            type="button"
                            onClick={() => {
                              setGoogleAccountEmail(currentUser.email);
                              setCalendarSearchError(null);
                              handleSearchSecondaryCalendars(currentUser.email);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Search className="w-3.5 h-3.5" />
                            Buscar na minha conta Google ({currentUser.email})
                          </button>
                        )}
                        {user.email && user.email !== currentUser?.email && (
                          <button
                            type="button"
                            onClick={() => {
                              setGoogleAccountEmail(user.email);
                              setCalendarSearchError(null);
                              handleSearchSecondaryCalendars(user.email);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 font-bold text-[11px] hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors cursor-pointer"
                          >
                            Usar e-mail do profissional ({user.email})
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 1: Email Input and Search Secondary Calendars Button */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      1. Informe o e-mail da conta Google (da clínica ou do profissional):
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="email"
                        value={googleAccountEmail}
                        onChange={(e) => {
                          setGoogleAccountEmail(e.target.value);
                          setCalendarSearchError(null);
                        }}
                        placeholder="ex: seu.email@gmail.com ou profissional@clinica.com.br"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />

                      <SpecularButton
                        type="button"
                        onClick={() => handleSearchSecondaryCalendars()}
                        disabled={isSearchingSecondaryCalendars || !googleAccountEmail.trim()}
                        size="sm"
                        radius={12}
                        className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 shadow-sm"
                      >
                        {isSearchingSecondaryCalendars ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Search className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {isSearchingSecondaryCalendars ? 'Buscando Agendas...' : 'Buscar Agendas Secundárias'}
                      </SpecularButton>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      O sistema fará login seguro via Google OAuth para listar apenas as agendas que você gerencia.
                    </p>
                  </div>

                  {/* Step 2: Returned List of Secondary Calendars */}
                  {isSearchingSecondaryCalendars && (
                    <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Consultando agendas da conta Google...
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Se abrir uma janela do Google para autorização, confirme o acesso para continuarmos.
                      </p>
                    </div>
                  )}

                  {calendarSearchError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <p className="font-bold">Não foi possível buscar as agendas automaticamente</p>
                          <p className="text-[11px] leading-relaxed">{calendarSearchError}</p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-rose-200 dark:border-rose-900 text-[11px] space-y-1.5">
                        <p className="font-semibold text-rose-900 dark:text-rose-200">
                          Como liberar o acesso ou vincular a agenda:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700 dark:text-slate-300">
                          <li>
                            <strong>Adicionar e-mail aos Usuários de Teste:</strong> No painel do Google Cloud (projeto <code>vocal-shuttle-g8chg</code>), adicione <code>{googleAccountEmail || 'seu e-mail'}</code> em <em>Usuários de Teste</em> na Tela de Consentimento OAuth.
                          </li>
                          <li>
                            <strong>Ou Inserir Manualmente:</strong> Copie o ID da agenda secundária no Google Calendar (terminado em <code>@group.calendar.google.com</code>) e cole no campo manual abaixo.
                          </li>
                        </ol>

                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <a
                            href="https://console.cloud.google.com/apis/credentials/consent?project=vocal-shuttle-g8chg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-500"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Abrir Consentimento no Google Cloud
                          </a>
                          <button
                            type="button"
                            onClick={() => handleSearchSecondaryCalendars()}
                            className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] hover:bg-slate-200 cursor-pointer"
                          >
                            Tentar Novamente
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {secondaryCalendarsList.length > 0 && (
                    <div className="space-y-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          2. Escolha a Agenda Secundária do Consultório ({secondaryCalendarsList.length} encontrada{secondaryCalendarsList.length > 1 ? 's' : ''}):
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Clique na agenda para selecionar
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                        {secondaryCalendarsList.map((cal) => {
                          const isSelected = googleCalendarId.trim() === cal.id;
                          return (
                            <div
                              key={cal.id}
                              onClick={() => handleSelectSecondaryCalendar(cal)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                isSelected
                                  ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 ring-1 ring-teal-500'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                    {cal.summary}
                                  </span>
                                  {isSelected && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white">
                                      Selecionada
                                    </span>
                                  )}
                                  {cal.accessRole && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      {cal.accessRole === 'owner' ? 'Proprietário' : cal.accessRole}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                  ID: {cal.id}
                                </p>
                                {cal.timeZone && (
                                  <p className="text-[10px] text-slate-400">
                                    Fuso horário: {cal.timeZone}
                                  </p>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSecondaryCalendar(cal);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-600 hover:text-white'
                                }`}
                              >
                                {isSelected ? 'Em Uso' : 'Selecionar'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Empty secondary calendars warning & guidance */}
                  {calendarSearchAttempted && !isSearchingSecondaryCalendars && secondaryCalendarsList.length === 0 && !calendarSearchError && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        Nenhuma agenda secundária encontrada em {googleAccountEmail}
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Sua conta Google possui apenas a agenda pessoal principal. Para habilitar os agendamentos online e proteger sua privacidade, você precisa criar uma agenda dedicada para o consultório:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1 font-medium text-amber-800/90 dark:text-amber-200/90">
                        <li>Acesse o Google Calendar pelo seu navegador;</li>
                        <li>No menu lateral esquerdo, clique no botão <strong>'+'</strong> ao lado de <em>'Outras agendas'</em>;</li>
                        <li>Escolha <strong>'Criar nova agenda'</strong> (ex.: <em>'Consultório e-SUS PEC'</em>);</li>
                        <li>Retorne aqui e clique em <strong>'Buscar Agendas Secundárias'</strong>.</li>
                      </ol>
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <a
                          href="https://calendar.google.com/calendar/u/0/r/settings/createcalendar"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-500 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Criar Agenda no Google Calendar
                        </a>
                        <button
                          type="button"
                          onClick={() => handleSearchSecondaryCalendars()}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-[11px] hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          Buscar Novamente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual secondary calendar ID fallback */}
                  <details className="group pt-1">
                    <summary className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer list-none flex items-center gap-1">
                      <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                      Já possui o ID da agenda secundária? Inserir manualmente
                    </summary>
                    <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        ID da Agenda Secundária (@group.calendar.google.com):
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          value={googleCalendarId}
                          onChange={(e) => {
                            setGoogleCalendarId(e.target.value);
                            setIsCalendarVerified(false);
                            setCalendarTestResult(null);
                          }}
                          placeholder="ex: c_b08fd64549d4e5f3... @group.calendar.google.com"
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                        />

                        <SpecularButton
                          type="button"
                          onClick={handleTestGoogleCalendar}
                          disabled={testingCalendar || !googleCalendarId.trim()}
                          size="sm"
                          radius={12}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0"
                        >
                          {testingCalendar ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          )}
                          Validar ID
                        </SpecularButton>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Atenção: E-mails comuns (@gmail.com) serão rejeitados pela validação.
                      </p>
                    </div>
                  </details>

                  {/* Active Selected Calendar Confirmation */}
                  {isSecondaryValid && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Agenda Secundária Pronta para Uso
                      </div>
                      <p className="text-[11px] text-emerald-800/90 dark:text-emerald-200/90">
                        {selectedSecondarySummary ? `Nome: "${selectedSecondarySummary}" • ` : ''}
                        ID: <code className="font-mono">{googleCalendarId}</code>
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        Os agendamentos confirmados via Portal Público e n8n/e-SUS serão sincronizados exclusivamente nesta agenda.
                      </p>
                    </div>
                  )}

                  {calendarTestResult && !isSecondaryValid && (
                    <div className="p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      <div className="space-y-0.5 flex-1">
                        <p className="font-bold">Aviso de Validação</p>
                        <p>{calendarTestResult.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Locked or Ready Save Banner */}
          {isSaveDisabled && (
            <div className="mx-6 mb-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Salvamento Bloqueado:</strong> Selecione e valide uma agenda secundária no Google Calendar para habilitar o botão <em>"Salvar Configurações da Agenda"</em>.
              </span>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="pt-4 mt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaveDisabled}
              className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isSaveDisabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 cursor-pointer'
              }`}
            >
              {isSaveDisabled ? (
                <Lock className="w-4 h-4 text-slate-400" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {isSaveDisabled
                  ? 'Salvar Configurações (Selecione a Agenda Secundária)'
                  : 'Salvar Configurações da Agenda'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
