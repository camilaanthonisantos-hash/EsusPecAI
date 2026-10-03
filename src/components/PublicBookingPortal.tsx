import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
  CalendarCheck,
  ShieldCheck,
  HeartPulse,
  Printer,
  Sparkles,
  ArrowRight,
  FileText,
  X,
  RefreshCw,
  MapPin,
  Stethoscope,
  UserCheck,
  UserPlus,
  BadgeCheck,
  AlertTriangle,
  Users,
  Info,
  Filter,
  MousePointerClick,
  Wallet,
  Timer,
  Check,
  Hourglass,
  RotateCcw,
} from 'lucide-react';
import { User, Appointment, ProfessionalService, AvailableTimeSlot, Patient, PixTransactionRecord, SystemSettings } from '../types';
import { PROFESSIONS } from '../data/professions';
import {
  calculateAvailableSlotsLocal,
  generateGoogleCalendarUrl,
  generateWhatsAppReminderLink,
  generateAppointmentPixOrder,
  isProfessionalAvailableForBooking,
} from '../services/calendar';
import { dispatchAppointmentNotification } from '../services/notifications';
import {
  saveAppointmentToFirestore,
  updateAppointmentStatusInFirestore,
  savePatientToFirestore,
  savePixTransaction,
  subscribeToPixTransaction,
  updatePixTransactionStatus,
  subscribeToSystemSettings,
  getPatientByCpf,
  creditPatientBalance,
  deductPatientBalance,
  db,
} from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SpecularButton } from './SpecularButton';

// Formatting Helpers
export function formatCPF(val: string): string {
  const digits = val.replace(/\D/g, '').substring(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.substring(0, 3)}.${digits.substring(3)}`;
  if (digits.length <= 9) return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6)}`;
  return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9)}`;
}

export function formatCNS(val: string): string {
  const digits = val.replace(/\D/g, '').substring(0, 15);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.substring(0, 3)} ${digits.substring(3)}`;
  if (digits.length <= 11) return `${digits.substring(0, 3)} ${digits.substring(3, 7)} ${digits.substring(7)}`;
  return `${digits.substring(0, 3)} ${digits.substring(3, 7)} ${digits.substring(7, 11)} ${digits.substring(11)}`;
}

export function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '').substring(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
  if (digits.length <= 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
  return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
}

export function calculateAge(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

interface PublicBookingPortalProps {
  professionals: User[];
  appointments?: Appointment[];
  existingAppointments?: Appointment[];
  patients?: Patient[];
  preselectedUserId?: string;
  systemSettings?: SystemSettings;
  isAuthenticated?: boolean;
  onOpenAuthModal?: () => void;
  onClose?: () => void;
  onSelectedProfessionalChange?: (userId: string) => void;
  onAppointmentBooked?: (appointment: Appointment) => void;
  onSavePatient?: (patient: Patient) => void;
  onBackToInternalPanel?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const PublicBookingPortal: React.FC<PublicBookingPortalProps> = ({
  professionals,
  appointments,
  existingAppointments,
  patients = [],
  preselectedUserId,
  systemSettings,
  isAuthenticated = false,
  onOpenAuthModal,
  onClose,
  onSelectedProfessionalChange,
  onAppointmentBooked,
  onSavePatient,
  onBackToInternalPanel,
  onShowToast,
}) => {
  const [activeSettings, setActiveSettings] = useState<SystemSettings | null>(systemSettings || null);

  useEffect(() => {
    if (systemSettings) {
      setActiveSettings(systemSettings);
    }
  }, [systemSettings]);

  useEffect(() => {
    const unsub = subscribeToSystemSettings((s) => {
      if (s) {
        setActiveSettings(s);
      }
    });
    return () => unsub();
  }, []);

  const mergedAppointments = useMemo(() => {
    return existingAppointments || appointments || [];
  }, [existingAppointments, appointments]);

  const [activeTab, setActiveTab] = useState<'book' | 'my_appointments'>('book');

  // Booking Flow Steps: 1 = Service & Professional, 2 = Date & Slot, 3 = Patient Info, 4 = Payment/Confirm, 5 = Receipt
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Active Professionals that accept online booking AND have a valid, verified Google Calendar linked
  const availableProfessionals = useMemo(() => {
    return professionals.filter((p) => isProfessionalAvailableForBooking(p));
  }, [professionals]);

  // Step 1 Filter & Search
  const [profSearchQuery, setProfSearchQuery] = useState('');
  const [profCategoryFilter, setProfCategoryFilter] = useState<string>('all');

  // Step 1: Selected Professional & Service
  const [selectedProfId, setSelectedProfId] = useState<string>(() => {
    if (preselectedUserId) {
      const found = professionals.find((p) => p.id === preselectedUserId && isProfessionalAvailableForBooking(p));
      if (found) return found.id;
    }
    const available = professionals.filter((p) => isProfessionalAvailableForBooking(p));
    return available.length > 0 ? available[0].id : '';
  });

  // Track if user explicitly clicked/changed the professional so we NEVER revert their choice
  const userHasChosenRef = useRef<boolean>(false);
  const lastKnownPreselectedIdRef = useRef<string | undefined>(preselectedUserId);

  // Sync selectedProfId ONLY if preselectedUserId changed from outside OR if no professional is selected yet
  useEffect(() => {
    // If the external prop preselectedUserId changes from outside to something new, update it
    if (preselectedUserId !== lastKnownPreselectedIdRef.current) {
      lastKnownPreselectedIdRef.current = preselectedUserId;
      if (preselectedUserId) {
        const found = professionals.find((p) => p.id === preselectedUserId && isProfessionalAvailableForBooking(p));
        if (found) {
          setSelectedProfId(found.id);
          userHasChosenRef.current = false;
          return;
        }
      }
    }

    // If the user already made a manual choice, NEVER overwrite it!
    if (userHasChosenRef.current) {
      return;
    }

    // If selectedProfId is already valid in availableProfessionals list, keep it
    if (selectedProfId && availableProfessionals.some((p) => p.id === selectedProfId)) {
      return;
    }

    // Initial fallback if selectedProfId is empty or not found
    if (preselectedUserId) {
      const found = professionals.find((p) => p.id === preselectedUserId && isProfessionalAvailableForBooking(p));
      if (found) {
        setSelectedProfId(found.id);
        return;
      }
    }

    if (availableProfessionals.length > 0) {
      setSelectedProfId(availableProfessionals[0].id);
    }
  }, [preselectedUserId, availableProfessionals, professionals, selectedProfId]);

  // Handler to select any professional freely
  const handleSelectProfessional = (prof: User) => {
    userHasChosenRef.current = true;
    setSelectedProfId(prof.id);
    setSelectedServiceId('');
    setSelectedSlot(null);

    if (onSelectedProfessionalChange) {
      onSelectedProfessionalChange(prof.id);
    }

    // Update browser URL silently without reload
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('userId', prof.id);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }

    onShowToast(
      'info',
      `Profissional selecionado: ${prof.name} (${PROFESSIONS[prof.profession]?.name || prof.profession}). Agora escolha o serviço.`,
      'Profissional Selecionado'
    );
  };

  const handleClearPreselection = () => {
    userHasChosenRef.current = true;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('userId');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
    if (onSelectedProfessionalChange) {
      onSelectedProfessionalChange('');
    }
    setProfCategoryFilter('all');
    setProfSearchQuery('');
  };

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Step 2: Date & Slot
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr);
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null);

  // Step 3: Quick Search & Verification
  const [quickSearchType, setQuickSearchType] = useState<'cpf' | 'cns' | 'phone'>('cpf');
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  // Modals & Selection for Step 3
  const [identifiedPatient, setIdentifiedPatient] = useState<Patient | null>(null);
  const [multiplePatientsFound, setMultiplePatientsFound] = useState<Patient[]>([]);
  const [isNotFoundModalOpen, setIsNotFoundModalOpen] = useState(false);

  // Step 3 Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientCpf, setPatientCpf] = useState('');
  const [patientCns, setPatientCns] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [patientGender, setPatientGender] = useState<'Feminino' | 'Masculino' | 'Outro'>('Feminino');
  const [appointmentNotes, setAppointmentNotes] = useState('');

  // Verification status
  const [isPatientVerified, setIsPatientVerified] = useState(false);
  const [isNewPatientRegistration, setIsNewPatientRegistration] = useState(false);
  const [linkedPatientId, setLinkedPatientId] = useState<string | null>(null);

  // Step 4: Generated Appointment & PIX State
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [pixData, setPixData] = useState<{ pixQrCode?: string; pixCopiaECola?: string; pixId?: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  // Patient Wallet Balance State
  const [patientWalletBalance, setPatientWalletBalance] = useState<number>(0);
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(true);

  // PIX Prepayment & Expiration State (30 minutes)
  const [activePixOrder, setActivePixOrder] = useState<PixTransactionRecord | null>(null);
  const [pixTimeRemaining, setPixTimeRemaining] = useState<number>(1800); // 30 minutes = 1800s
  const [isPixExpired, setIsPixExpired] = useState<boolean>(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState<boolean>(false);
  const isProcessingPaymentRef = useRef<boolean>(false);

  // Slot Race Condition / Conflito State
  const [slotConflictInfo, setSlotConflictInfo] = useState<{
    wasConflict: boolean;
    originalSlot: AvailableTimeSlot | null;
    originalDate: string;
    balanceSecured: number;
  } | null>(null);

  // Desist confirmation modal
  const [showDesistModal, setShowDesistModal] = useState<boolean>(false);

  // Lookup Flow: My Appointments
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<Appointment[] | null>(null);
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);

  const preselectedUserObj = useMemo(() => {
    if (!preselectedUserId) return null;
    return professionals.find((p) => p.id === preselectedUserId) || null;
  }, [preselectedUserId, professionals]);

  const distinctProfessions = useMemo(() => {
    const map = new Map<string, { key: string; name: string; count: number }>();
    availableProfessionals.forEach((p) => {
      const profKey = p.profession;
      const profName = PROFESSIONS[p.profession]?.name || p.profession;
      if (!map.has(profKey)) {
        map.set(profKey, { key: profKey, name: profName, count: 1 });
      } else {
        map.get(profKey)!.count += 1;
      }
    });
    return Array.from(map.values());
  }, [availableProfessionals]);

  const selectedProfessional = useMemo(() => {
    return professionals.find((p) => p.id === selectedProfId) || availableProfessionals[0] || null;
  }, [professionals, selectedProfId, availableProfessionals]);

  // Filtered professionals list for Step 1
  const filteredProfessionals = useMemo(() => {
    return availableProfessionals.filter((prof) => {
      const matchesCategory =
        profCategoryFilter === 'all' ||
        prof.profession === profCategoryFilter ||
        (PROFESSIONS[prof.profession] && PROFESSIONS[prof.profession].category === profCategoryFilter);
      
      const q = (profSearchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        Boolean(prof.name && prof.name.toLowerCase().includes(q)) ||
        Boolean(prof.workplace && prof.workplace.toLowerCase().includes(q)) ||
        Boolean(PROFESSIONS[prof.profession] && PROFESSIONS[prof.profession].name && PROFESSIONS[prof.profession].name.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [availableProfessionals, profCategoryFilter, profSearchQuery]);

  // Services of selected professional
  const availableServices = useMemo(() => {
    if (!selectedProfessional) return [];
    if (selectedProfessional.customServices && selectedProfessional.customServices.length > 0) {
      return selectedProfessional.customServices.filter((s) => s.active !== false);
    }
    return [
      {
        id: 'serv-default',
        name: 'Consulta Multiprofissional',
        durationMinutes: 30,
        price: 0,
        description: 'Atendimento de saúde multiprofissional na Atenção Primária / SUS.',
        active: true,
      },
    ];
  }, [selectedProfessional]);

  const selectedService = useMemo(() => {
    return availableServices.find((s) => s.id === selectedServiceId) || availableServices[0] || null;
  }, [availableServices, selectedServiceId]);

  // Set default selected service when professional changes
  useEffect(() => {
    if (availableServices.length > 0 && !selectedServiceId) {
      setSelectedServiceId(availableServices[0].id);
    }
  }, [availableServices, selectedServiceId]);

  // Calculate available slots for selected professional and date
  const availableSlots = useMemo(() => {
    if (!selectedProfessional || !selectedDate) return [];
    const duration = selectedService ? selectedService.durationMinutes : 30;
    return calculateAvailableSlotsLocal(selectedProfessional, selectedDate, duration, mergedAppointments);
  }, [selectedProfessional, selectedDate, selectedService, mergedAppointments]);

  // Phone input mask handler
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientPhone(formatPhone(e.target.value));
  };

  // Helper to select an identified patient immediately, filling all data and marking ready to advance
  const handleSelectIdentifiedPatient = (patient: Patient) => {
    setPatientName(patient.fullName || '');
    setPatientCpf(formatCPF(patient.cpf || ''));
    setPatientCns(formatCNS(patient.cns || ''));
    setPatientPhone(formatPhone(patient.phone || ''));
    setPatientBirthDate(patient.birthDate || '');
    if (patient.gender) {
      setPatientGender(patient.gender as any);
    }
    setLinkedPatientId(patient.id);
    setIdentifiedPatient(patient);
    setIsPatientVerified(true);
    setIsNewPatientRegistration(false);
    setMultiplePatientsFound([]);

    onShowToast(
      'success',
      `Paciente ${patient.fullName} identificado com sucesso! Dados prontos para avançar.`,
      'Cadastro Localizado'
    );
  };

  // CPF input mask handler with auto-detection (1:1 strict rule)
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setPatientCpf(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 11 && !isPatientVerified) {
      const match = patients.find((p) => (p.cpf || '').replace(/\D/g, '') === clean);
      if (match) {
        handleSelectIdentifiedPatient(match);
      }
    }
  };

  // CNS input mask handler with auto-detection (1:1 strict rule)
  const handleCnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNS(e.target.value);
    setPatientCns(formatted);
    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 15 && !isPatientVerified) {
      const match = patients.find((p) => (p.cns || '').replace(/\D/g, '') === clean);
      if (match) {
        handleSelectIdentifiedPatient(match);
      }
    }
  };

  // Quick Search Mask Handler
  const handleQuickSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (quickSearchType === 'cpf') {
      setQuickSearchInput(formatCPF(raw));
    } else if (quickSearchType === 'cns') {
      setQuickSearchInput(formatCNS(raw));
    } else {
      setQuickSearchInput(formatPhone(raw));
    }
  };

  // Execute Quick Patient Verification
  const handleExecuteQuickSearch = () => {
    const cleanQuery = quickSearchInput.replace(/\D/g, '');
    if (cleanQuery.length < 3) {
      onShowToast('info', 'Digite um documento ou telefone para consultar.', 'Consulta SUS');
      return;
    }

    setIsSearchingPatient(true);
    setMultiplePatientsFound([]);

    let matches: Patient[] = [];

    if (quickSearchType === 'cpf') {
      // Regra estrita: 1 cadastro por CPF
      matches = patients.filter((p) => {
        const pCpf = (p.cpf || '').replace(/\D/g, '');
        return pCpf.length === 11 && pCpf === cleanQuery;
      });
    } else if (quickSearchType === 'cns') {
      // Regra estrita: 1 cadastro por Cartão SUS
      matches = patients.filter((p) => {
        const pCns = (p.cns || '').replace(/\D/g, '');
        return pCns.length === 15 && pCns === cleanQuery;
      });
    } else if (quickSearchType === 'phone') {
      // Telefone pode ser compartilhado por múltiplos pacientes (família / dependentes)
      matches = patients.filter((p) => {
        const pPhone = (p.phone || '').replace(/\D/g, '');
        if (!pPhone) return false;
        return (
          pPhone === cleanQuery ||
          pPhone.endsWith(cleanQuery) ||
          cleanQuery.endsWith(pPhone) ||
          (cleanQuery.length >= 8 && pPhone.slice(-8) === cleanQuery.slice(-8))
        );
      });
    }

    setIsSearchingPatient(false);

    if (matches.length === 1) {
      // Um único paciente localizado: mostrar já selecionado e pronto para avançar!
      handleSelectIdentifiedPatient(matches[0]);
    } else if (matches.length > 1) {
      // Múltiplos pacientes encontrados para este telefone: mostrar lista para o usuário selecionar o correto
      setMultiplePatientsFound(matches);
      setIsPatientVerified(false);
      setIdentifiedPatient(null);
      onShowToast(
        'info',
        `Encontramos ${matches.length} pacientes vinculados a este telefone. Selecione quem será atendido.`,
        'Múltiplos Cadastros'
      );
    } else {
      // Nenhum cadastro localizado
      setMultiplePatientsFound([]);
      setIsNotFoundModalOpen(true);
    }
  };

  // Trigger New Patient Registration from Floating Modal
  const handleStartNewPatientRegistration = () => {
    setIsNotFoundModalOpen(false);
    setMultiplePatientsFound([]);
    setIsNewPatientRegistration(true);
    setIsPatientVerified(false);
    setLinkedPatientId(null);
    setIdentifiedPatient(null);

    // Pre-fill the searched field
    if (quickSearchType === 'cpf' && quickSearchInput) {
      setPatientCpf(quickSearchInput);
    } else if (quickSearchType === 'cns' && quickSearchInput) {
      setPatientCns(quickSearchInput);
    } else if (quickSearchType === 'phone' && quickSearchInput) {
      setPatientPhone(quickSearchInput);
    }

    onShowToast('info', 'Preencha os dados abaixo para cadastrar o novo paciente.', 'Novo Paciente SUS');
  };

  // Clear patient data
  const handleClearPatientForm = () => {
    setPatientName('');
    setPatientPhone('');
    setPatientCpf('');
    setPatientCns('');
    setPatientEmail('');
    setPatientBirthDate('');
    setLinkedPatientId(null);
    setIdentifiedPatient(null);
    setMultiplePatientsFound([]);
    setIsPatientVerified(false);
    setIsNewPatientRegistration(false);
    setQuickSearchInput('');
  };

  // Form Validation
  const isCpfValid = useMemo(() => {
    return patientCpf.replace(/\D/g, '').length === 11;
  }, [patientCpf]);

  const isCnsValid = useMemo(() => {
    return patientCns.replace(/\D/g, '').length === 15;
  }, [patientCns]);

  const isPhoneValid = useMemo(() => {
    return patientPhone.replace(/\D/g, '').length >= 10;
  }, [patientPhone]);

  const isNameValid = useMemo(() => {
    return patientName.trim().length >= 3;
  }, [patientName]);

  const isFormValid = useMemo(() => {
    return isNameValid && isPhoneValid && isCpfValid && isCnsValid;
  }, [isNameValid, isPhoneValid, isCpfValid, isCnsValid]);

  // Slot availability verification in real time
  const checkSlotIsStillAvailable = (
    profId: string,
    date: string,
    startTime: string
  ): boolean => {
    return !mergedAppointments.some(
      (a) =>
        a.professionalId === profId &&
        a.date === date &&
        a.startTime === startTime &&
        a.status !== 'cancelado'
    );
  };

  // Financial calculations
  const servicePrice = useMemo(() => {
    return selectedService ? Number(selectedService.price || 0) : 0;
  }, [selectedService]);

  const isFreeService = useMemo(() => {
    if (!selectedProfessional?.isChargingEnabled) return true;
    return servicePrice <= 0;
  }, [selectedProfessional, servicePrice]);

  const effectiveBalanceApplied = useMemo(() => {
    if (isFreeService || !useWalletBalance) return 0;
    return Math.min(patientWalletBalance, servicePrice);
  }, [isFreeService, useWalletBalance, patientWalletBalance, servicePrice]);

  const amountToPayPix = useMemo(() => {
    if (isFreeService) return 0;
    return Math.max(0, servicePrice - effectiveBalanceApplied);
  }, [isFreeService, servicePrice, effectiveBalanceApplied]);

  // Auto-fetch patient balance when 11-digit CPF is input or identified
  useEffect(() => {
    const clean = patientCpf.replace(/\D/g, '');
    if (clean.length === 11) {
      getPatientByCpf(clean).then((p) => {
        if (p) {
          setLinkedPatientId(p.id);
          setPatientWalletBalance(Number(p.balance || 0));
        } else {
          setPatientWalletBalance(0);
        }
      });
    }
  }, [patientCpf]);

  // Format timer MM:SS
  const formatTimer = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Reset booking to zero (marco zero)
  const handleResetBookingToZero = () => {
    localStorage.removeItem('pending_pix_booking');
    setActivePixOrder(null);
    setIsPixExpired(false);
    setSlotConflictInfo(null);
    setShowDesistModal(false);
    setSelectedSlot(null);
    setStep(1);
  };

  // Handle PIX Expired (30 minutes)
  const handlePixExpired = async (order: PixTransactionRecord) => {
    setIsPixExpired(true);
    try {
      await updatePixTransactionStatus(order.id, 'expirado');
    } catch (e) {
      console.warn('Erro ao atualizar status expirado:', e);
    }
    localStorage.removeItem('pending_pix_booking');
    onShowToast(
      'error',
      'O prazo de 30 minutos para pagamento do PIX expirou. A vaga permanece disponível.',
      'PIX Expirado'
    );
  };

  // 30-Minute PIX Countdown Timer
  useEffect(() => {
    if (!activePixOrder || activePixOrder.status !== 'pendente') return;

    const interval = setInterval(() => {
      const diffMs = activePixOrder.expiresAt - Date.now();
      const remainingSec = Math.max(0, Math.floor(diffMs / 1000));
      setPixTimeRemaining(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        handlePixExpired(activePixOrder);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activePixOrder]);

  // Handle Payment Confirmed (Compensação do PIX antes da expiração)
  const handlePaymentConfirmed = async (order: PixTransactionRecord) => {
    if (isProcessingPaymentRef.current) return;
    isProcessingPaymentRef.current = true;
    setIsProcessingBooking(true);

    try {
      // 1. Credit the patient's wallet in Firestore unconditionally (valor vira saldo)
      const { newBalance, patientId } = await creditPatientBalance(
        order.patientCpf,
        order.amount,
        {
          fullName: order.patientName,
          phone: order.patientPhone,
          cns: patientCns,
          birthDate: patientBirthDate,
        }
      );
      setPatientWalletBalance(newBalance);
      setLinkedPatientId(patientId);

      // 2. Perform a fresh consultation on slot availability in real time
      const targetProfId = order.professionalId || selectedProfessional?.id || '';
      const targetDate = order.date || selectedDate;
      const targetStartTime = order.startTime || selectedSlot?.startTime || '';

      const isAvailable = checkSlotIsStillAvailable(targetProfId, targetDate, targetStartTime);

      if (isAvailable && selectedProfessional && selectedService && selectedSlot) {
        // 3. Slot is AVAILABLE: Deduct service amount from patient wallet and finalize booking
        await deductPatientBalance(patientId, selectedService.price);
        setPatientWalletBalance(Math.max(0, newBalance - selectedService.price));

        const appointmentId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newAppointment: Appointment = {
          id: appointmentId,
          patientId,
          patientName: order.patientName,
          patientPhone: order.patientPhone,
          patientCpf: formatCPF(order.patientCpf),
          patientCns: patientCns.replace(/\D/g, ''),
          patientEmail: order.patientEmail,
          patientBirthDate: patientBirthDate || undefined,
          professionalId: selectedProfessional.id,
          professionalName: selectedProfessional.name,
          professionalEmail: selectedProfessional.email,
          professionalProfession: selectedProfessional.profession,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceDurationMinutes: selectedService.durationMinutes,
          servicePrice: selectedService.price,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          timestamp: new Date(`${selectedDate}T${selectedSlot.startTime}:00`).getTime(),
          status: 'agendado',
          notes: appointmentNotes.trim() || undefined,
          paymentStatus: 'pago',
          paymentMethod: 'pix',
          balanceApplied: selectedService.price,
          pixOrderReferenceId: order.id,
          pixQrCode: order.pixQrCode,
          pixCopiaECola: order.pixCopiaECola,
          pixId: order.pixId,
          source: 'portal_publico',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await saveAppointmentToFirestore(newAppointment);
        await updatePixTransactionStatus(order.id, 'utilizado', {
          usedInAppointmentId: newAppointment.id,
        });

        // Trigger automatic WhatsApp confirmation notification via n8n/Evo API
        dispatchAppointmentNotification(
          'appointment_confirmed',
          { appointment: newAppointment },
          activeSettings || systemSettings
        ).catch((err) => {
          console.warn('Erro ao disparar notificação WhatsApp de confirmação:', err);
        });

        localStorage.removeItem('pending_pix_booking');
        setActivePixOrder(null);
        setConfirmedAppointment(newAppointment);
        if (onAppointmentBooked) {
          onAppointmentBooked(newAppointment);
        }

        setStep(5);
        onShowToast('success', 'Pagamento compensado e agendamento reservado com sucesso!', 'Agendamento Confirmado');
      } else {
        // 4. Slot is NOT AVAILABLE (Conflito - outro usuário reservou primeiro)
        await updatePixTransactionStatus(order.id, 'pago', {
          notes: 'Horário indisponível no momento da compensação. Valor creditado como saldo do paciente.',
        });
        localStorage.removeItem('pending_pix_booking');
        setActivePixOrder(null);

        setSlotConflictInfo({
          wasConflict: true,
          originalSlot: selectedSlot,
          originalDate: selectedDate,
          balanceSecured: order.amount,
        });

        // Direct user to Step 2 (Data & Horário)
        setSelectedSlot(null);
        setStep(2);
        onShowToast(
          'info',
          `Seu pagamento de R$ ${order.amount.toFixed(2)} foi confirmado e já está salvo na sua carteira! O horário anterior foi ocupado, por favor escolha uma nova data.`,
          'Saldo Seguro na Carteira'
        );
      }
    } catch (err) {
      console.error('Erro ao processar confirmação de pagamento:', err);
      onShowToast('error', 'Ocorreu um erro ao processar o pagamento. Seu saldo está seguro.', 'Atenção');
    } finally {
      setIsProcessingBooking(false);
      isProcessingPaymentRef.current = false;
    }
  };

  // Real-time Firestore listener & polling for active PIX Order
  useEffect(() => {
    if (!activePixOrder || activePixOrder.status !== 'pendente') return;

    const unsubscribe = subscribeToPixTransaction(activePixOrder.id, (tx) => {
      if (tx) {
        if (tx.status === 'pago') {
          handlePaymentConfirmed(tx);
        } else if (tx.status === 'expirado') {
          setIsPixExpired(true);
        }
      }
    });

    const pollInterval = setInterval(async () => {
      try {
        const docRef = doc(db, 'subscriptions', activePixOrder.id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const tx = snap.data() as PixTransactionRecord;
          if (tx.status === 'pago') {
            handlePaymentConfirmed(tx);
          }
        }
      } catch (err) {
        // silent
      }
    }, 3500);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [activePixOrder]);

  // Restore pending PIX session from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pending_pix_booking');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data && data.orderId && data.expiresAt) {
        if (Date.now() < data.expiresAt) {
          const docRef = doc(db, 'subscriptions', data.orderId);
          getDoc(docRef).then((snap) => {
            if (snap.exists()) {
              const tx = snap.data() as PixTransactionRecord;
              if (tx.status === 'pago') {
                handlePaymentConfirmed(tx);
              } else if (tx.status === 'pendente') {
                setActivePixOrder(tx);
                setPixData({
                  pixQrCode: tx.pixQrCode,
                  pixCopiaECola: tx.pixCopiaECola,
                  pixId: tx.pixId,
                });
                if (data.selectedProfId) setSelectedProfId(data.selectedProfId);
                if (data.selectedServiceId) setSelectedServiceId(data.selectedServiceId);
                if (data.selectedDate) setSelectedDate(data.selectedDate);
                if (data.selectedSlot) setSelectedSlot(data.selectedSlot);
                if (data.patientName) setPatientName(data.patientName);
                if (data.patientPhone) setPatientPhone(data.patientPhone);
                if (data.patientCpf) setPatientCpf(data.patientCpf);
                if (data.patientCns) setPatientCns(data.patientCns);
                if (data.patientEmail) setPatientEmail(data.patientEmail);
                if (data.patientBirthDate) setPatientBirthDate(data.patientBirthDate);
                if (data.patientGender) setPatientGender(data.patientGender);
                if (data.appointmentNotes) setAppointmentNotes(data.appointmentNotes);
                setStep(4);
              }
            }
          });
        } else {
          localStorage.removeItem('pending_pix_booking');
        }
      }
    } catch (err) {
      console.warn('Erro ao restaurar sessão PIX:', err);
    }
  }, []);

  // Generate PIX Order (30 min window)
  const handleGeneratePixOrder = async () => {
    if (!selectedProfessional || !selectedService || !selectedSlot) {
      onShowToast('error', 'Selecione profissional, serviço e horário.', 'Dados Incompletos');
      return;
    }
    if (!isFormValid) {
      onShowToast('error', 'Preencha todos os dados obrigatórios do paciente.', 'Campos Obrigatórios');
      return;
    }

    setIsProcessingBooking(true);
    try {
      const orderId = `ord_pix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

      const tempAppointment: any = {
        id: orderId,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientCpf: formatCPF(patientCpf),
        patientEmail: patientEmail.trim() || undefined,
        professionalId: selectedProfessional.id,
        professionalName: selectedProfessional.name,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };

      const targetWebhook = activeSettings?.n8nPixWebhookUrl?.trim() || systemSettings?.n8nPixWebhookUrl?.trim();
      const pixRes = await generateAppointmentPixOrder(
        tempAppointment,
        targetWebhook,
        amountToPayPix
      );

      const pixOrder: PixTransactionRecord = {
        id: orderId,
        type: 'appointment',
        patientCpf: formatCPF(patientCpf),
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientEmail: patientEmail.trim() || undefined,
        patientId: linkedPatientId || undefined,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        amount: amountToPayPix,
        amountCents: Math.round(amountToPayPix * 100),
        status: 'pendente',
        createdAt: Date.now(),
        expiresAt,
        pixQrCode: pixRes.pixQrCode,
        pixCopiaECola: pixRes.pixCopiaECola,
        pixId: pixRes.pixId,
        professionalId: selectedProfessional.id,
        professionalName: selectedProfessional.name,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };

      await savePixTransaction(pixOrder);

      localStorage.setItem(
        'pending_pix_booking',
        JSON.stringify({
          orderId,
          expiresAt,
          amountToPayPix,
          effectiveBalanceApplied,
          selectedProfId: selectedProfessional.id,
          selectedServiceId: selectedService.id,
          selectedDate,
          selectedSlot,
          patientName,
          patientPhone,
          patientCpf,
          patientCns,
          patientEmail,
          patientBirthDate,
          patientGender,
          appointmentNotes,
        })
      );

      setActivePixOrder(pixOrder);
      setPixData(pixRes);
      setPixTimeRemaining(1800);
      setIsPixExpired(false);

      // Trigger automatic WhatsApp notification for PIX generated via n8n/Evo API
      dispatchAppointmentNotification(
        'pix_created',
        {
          pixOrder,
          appointment: tempAppointment,
        },
        activeSettings || systemSettings
      ).catch((err) => {
        console.warn('Erro ao disparar notificação WhatsApp de PIX:', err);
      });

      onShowToast('info', 'QR Code PIX gerado! Você tem 30 minutos para efetuar o pagamento.', 'PIX Gerado');
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      onShowToast('error', 'Falha ao gerar o código PIX. Tente novamente.', 'Erro PIX');
    } finally {
      setIsProcessingBooking(false);
    }
  };

  // Confirm Free or Full Balance Booking
  const handleConfirmFreeOrBalanceBooking = async () => {
    if (!selectedProfessional || !selectedService || !selectedSlot) {
      onShowToast('error', 'Selecione profissional, serviço e horário.', 'Dados Incompletos');
      return;
    }
    if (!isFormValid) {
      onShowToast('error', 'Preencha todos os dados obrigatórios do paciente.', 'Campos Obrigatórios');
      return;
    }

    setIsProcessingBooking(true);
    try {
      // Real-time slot availability check
      const isAvailable = checkSlotIsStillAvailable(
        selectedProfessional.id,
        selectedDate,
        selectedSlot.startTime
      );

      if (!isAvailable) {
        onShowToast('error', 'Desculpe, este horário acabou de ser reservado por outro usuário. Por favor, escolha outro horário.', 'Horário Ocupado');
        setStep(2);
        setSelectedSlot(null);
        return;
      }

      let finalPatientId = linkedPatientId;
      if (!finalPatientId) {
        const cleanCpf = patientCpf.replace(/\D/g, '');
        const newPatient: Patient = {
          id: `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fullName: patientName.trim(),
          cpf: formatCPF(cleanCpf),
          cns: patientCns.replace(/\D/g, ''),
          phone: patientPhone.trim(),
          birthDate: patientBirthDate || todayStr,
          gender: patientGender || 'Feminino',
          balance: patientWalletBalance,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        finalPatientId = newPatient.id;
        setLinkedPatientId(newPatient.id);
        await savePatientToFirestore(newPatient);
        if (onSavePatient) onSavePatient(newPatient);
      }

      // If using wallet balance, deduct from Firestore
      if (!isFreeService && effectiveBalanceApplied > 0) {
        const newBal = await deductPatientBalance(finalPatientId, effectiveBalanceApplied);
        setPatientWalletBalance(newBal);
      }

      const appointmentId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newAppointment: Appointment = {
        id: appointmentId,
        patientId: finalPatientId,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientCpf: formatCPF(patientCpf),
        patientCns: patientCns.replace(/\D/g, ''),
        patientEmail: patientEmail.trim() || undefined,
        patientBirthDate: patientBirthDate || undefined,
        professionalId: selectedProfessional.id,
        professionalName: selectedProfessional.name,
        professionalEmail: selectedProfessional.email,
        professionalProfession: selectedProfessional.profession,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceDurationMinutes: selectedService.durationMinutes,
        servicePrice: selectedService.price,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        timestamp: new Date(`${selectedDate}T${selectedSlot.startTime}:00`).getTime(),
        status: 'agendado',
        notes: appointmentNotes.trim() || undefined,
        paymentStatus: isFreeService ? 'isento' : 'pago',
        paymentMethod: isFreeService ? 'gratuito' : 'pix',
        balanceApplied: effectiveBalanceApplied,
        source: 'portal_publico',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveAppointmentToFirestore(newAppointment);
      if (onAppointmentBooked) onAppointmentBooked(newAppointment);

      setConfirmedAppointment(newAppointment);
      setStep(5);
      onShowToast('success', 'Agendamento confirmado com sucesso!', 'Confirmado');
    } catch (err) {
      console.error('Erro ao agendar:', err);
      onShowToast('error', 'Ocorreu um erro ao salvar o agendamento.', 'Erro');
    } finally {
      setIsProcessingBooking(false);
    }
  };

  // Simulate Payment (instantaneous test and verification)
  const handleSimulatePixPayment = async () => {
    if (!activePixOrder) return;
    setIsSimulatingPayment(true);
    try {
      await updatePixTransactionStatus(activePixOrder.id, 'pago');
      onShowToast('success', 'Simulação: Pagamento PIX compensado com sucesso!', 'PIX Compensado');
    } catch (err) {
      console.error('Erro na simulação PIX:', err);
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // Cancel PIX Order
  const handleCancelPixOrder = async () => {
    if (activePixOrder) {
      try {
        await updatePixTransactionStatus(activePixOrder.id, 'expirado');
      } catch (e) {}
    }
    localStorage.removeItem('pending_pix_booking');
    setActivePixOrder(null);
    setIsPixExpired(false);
    onShowToast('info', 'Pedido PIX cancelado.', 'Cancelado');
  };

  const handleCopyPix = () => {
    if (pixData?.pixCopiaECola) {
      navigator.clipboard.writeText(pixData.pixCopiaECola);
      setPixCopied(true);
      onShowToast('success', 'Código PIX Copia e Cola copiado!', 'PIX Copiado');
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  // Lookup Search Handler
  const handleSearchLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const query = (lookupQuery || '').trim().replace(/\D/g, '');
    const cleanRaw = (lookupQuery || '').trim().toLowerCase();

    if (!lookupQuery || !lookupQuery.trim()) {
      setLookupResults(null);
      return;
    }

    setIsSearchingLookup(true);
    const results = mergedAppointments.filter((app) => {
      const appPhoneClean = (app.patientPhone || '').replace(/\D/g, '');
      const appCpfClean = (app.patientCpf || '').replace(/\D/g, '');
      const appCnsClean = (app.patientCns || '').replace(/\D/g, '');
      const appNameClean = (app.patientName || '').toLowerCase();

      return (
        (query.length >= 4 && appPhoneClean.includes(query)) ||
        (query.length >= 4 && appCpfClean.includes(query)) ||
        (query.length >= 4 && appCnsClean.includes(query)) ||
        appNameClean.includes(cleanRaw)
      );
    });

    setLookupResults(results);
    setIsSearchingLookup(false);
  };

  const handleCancelMyAppointment = async (appointmentId: string) => {
    if (window.confirm('Deseja realmente cancelar este agendamento?')) {
      try {
        await updateAppointmentStatusInFirestore(appointmentId, 'cancelado', {
          cancelReason: 'Cancelado pelo paciente no portal público.',
        });
        onShowToast('info', 'Agendamento cancelado com sucesso.', 'Cancelado');
      } catch (err) {
        onShowToast('error', 'Falha ao cancelar agendamento.', 'Erro');
      }
    }
  };

  return (
    <div id="public-booking-portal" className="w-full max-w-5xl mx-auto py-4 sm:py-8 px-3 sm:px-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Portal de Agendamento Online
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 text-[10px] font-extrabold border border-teal-200 dark:border-teal-800">
                  SUS • e-SUS PEC Multiprofissional
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Agendamento inteligente multiprofissional integrado com Google Calendar e WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              (onClose || onBackToInternalPanel) && (
                <SpecularButton
                  type="button"
                  onClick={onClose || onBackToInternalPanel}
                  size="sm"
                  radius={12}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4 mr-1" />
                  Voltar ao Painel Interno
                </SpecularButton>
              )
            ) : onOpenAuthModal ? (
              <SpecularButton
                type="button"
                onClick={onOpenAuthModal}
                size="sm"
                radius={12}
                className="bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300 hover:bg-slate-200 text-xs font-bold border border-teal-200 dark:border-teal-800 cursor-pointer"
                title="Acesso restrito a profissionais de saúde e administradores"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Acesso Profissional / Login
              </SpecularButton>
            ) : null}
          </div>
        </div>

        {/* Public Citizen Guarantee Callout */}
        <div className="mt-4 px-4 py-2.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-medium">
            <BadgeCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              <strong>Portal Aberto a Todos os Cidadãos:</strong> Agende sua consulta gratuitamente sem necessidade de login ou senha.
            </span>
          </div>
          <span className="hidden md:inline-flex px-2 py-0.5 rounded-full bg-teal-200/60 dark:bg-teal-900/80 text-teal-900 dark:text-teal-200 text-[10px] font-extrabold">
            100% Público & Gratuito
          </span>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 mt-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('book');
              if (step === 5) setStep(1);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'book'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Agendar Consulta</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_appointments')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'my_appointments'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Consultar Meus Agendamentos</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AGENDAR CONSULTA (WIZARD) */}
      {activeTab === 'book' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200 dark:border-slate-800">
          {/* Wizard Progress Bar */}
          {step < 5 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[
                  { num: 1, label: 'Profissional & Serviço' },
                  { num: 2, label: 'Data & Horário' },
                  { num: 3, label: 'Seus Dados' },
                  { num: 4, label: 'Confirmação' },
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`flex items-center gap-2 ${
                      step >= s.num
                        ? 'text-teal-700 dark:text-teal-300 font-bold'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                        step === s.num
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-4 ring-teal-100 dark:ring-teal-900/50'
                          : step > s.num
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                    </span>
                    <span className="hidden md:inline text-xs">{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${((step - 1) / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 1: PROFISSIONAL & SERVIÇO */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Informative Multi-professional Freedom Banner */}
              {preselectedUserObj && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-slate-900 border border-teal-200/80 dark:border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-start sm:items-center gap-2.5 text-teal-950 dark:text-teal-200">
                    <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      {selectedProfId === preselectedUserObj.id ? (
                        <>
                          <p className="font-bold text-teal-900 dark:text-teal-100">
                            Você abriu o link com indicação para {preselectedUserObj.name} ({PROFESSIONS[preselectedUserObj.profession]?.name || preselectedUserObj.profession})
                          </p>
                          <p className="text-[11px] text-teal-700 dark:text-teal-300">
                            Você pode agendar com ele(a) ou <strong>clicar em qualquer outro profissional da equipe</strong> abaixo para agendar com o especialista que preferir.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-teal-900 dark:text-teal-100">
                            Você selecionou {selectedProfessional?.name} ({selectedProfessional && (PROFESSIONS[selectedProfessional.profession]?.name || selectedProfessional.profession)})
                          </p>
                          <p className="text-[11px] text-teal-700 dark:text-teal-300">
                            O link indicava inicialmente {preselectedUserObj.name}, mas sua escolha para {selectedProfessional?.name} foi confirmada e está pronta para agendamento!
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {selectedProfId !== preselectedUserObj.id && (
                      <button
                        type="button"
                        onClick={() => handleSelectProfessional(preselectedUserObj)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-700 font-bold text-[11px] hover:bg-teal-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Voltar para {(preselectedUserObj.name || 'Profissional').split(' ')[0]}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearPreselection}
                      className="px-3 py-1.5 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 font-bold text-[11px] hover:bg-teal-200 dark:hover:bg-teal-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Ver Todos ({availableProfessionals.length})
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-600" />
                    1. Escolha o Profissional de Saúde
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione livremente qualquer membro da equipe multiprofissional com agenda online ativa.
                  </p>
                </div>

                {/* Search / Filter Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar profissional ou especialidade..."
                      value={profSearchQuery}
                      onChange={(e) => setProfSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Specialty / Profession Filter Pills */}
              {distinctProfessions.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setProfCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      profCategoryFilter === 'all'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    Todos ({availableProfessionals.length})
                  </button>
                  {distinctProfessions.map((dp) => (
                    <button
                      key={dp.key}
                      type="button"
                      onClick={() => setProfCategoryFilter(dp.key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        profCategoryFilter === dp.key
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {dp.name} ({dp.count})
                    </button>
                  ))}
                </div>
              )}

              {availableProfessionals.length === 0 ? (
                <div className="p-8 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 mx-auto flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      Nenhum profissional com agenda Google Calendar sincronizada no momento
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 max-w-lg mx-auto">
                      Para garantir a disponibilidade real de vagas e o bloqueio automático de horários ocupados, o sistema exige que a agenda do Google Calendar de cada profissional esteja vinculada e validada.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredProfessionals.map((prof) => {
                    const profData = PROFESSIONS[prof.profession];
                    const isSelected = selectedProfId === prof.id;
                    const isPreselected = preselectedUserId === prof.id;

                    return (
                      <div
                        key={prof.id}
                        id={`card-prof-${prof.id}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectProfessional(prof);
                          }
                        }}
                        onClick={() => handleSelectProfessional(prof)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative group flex flex-col justify-between select-none ${
                          isSelected
                            ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 shadow-md shadow-teal-500/10 ring-2 ring-teal-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'
                        }`}
                      >
                        {/* Top badges */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-[10px] font-extrabold">
                              {profData?.name || prof.profession}
                            </span>
                            {isPreselected && (
                              <span className="inline-block px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[9px] font-bold">
                                Indicado no link
                              </span>
                            )}
                          </div>

                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold shrink-0 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3" />
                              Selecionado
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-teal-600 transition-colors shrink-0 flex items-center gap-0.5">
                              <MousePointerClick className="w-3 h-3" />
                              Escolher
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {prof.avatarUrl ? (
                            <img
                              src={prof.avatarUrl}
                              alt={prof.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                              {prof.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                              {prof.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {prof.workplace || 'Unidade Básica de Saúde / CAPS'}
                            </p>
                          </div>
                        </div>

                        {/* Google Calendar status badge */}
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-200/70 dark:border-emerald-800/70">
                          <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            Google Calendar Vinculado ({prof.googleCalendarType === 'secondary_group' ? 'Agenda Secundária' : 'Gmail/Workspace'})
                          </span>
                        </div>

                        {/* Card bottom hint */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium">
                            {prof.customServices && prof.customServices.length > 0
                              ? `${prof.customServices.filter(s => s.active !== false).length} serviço(s) disponível(is)`
                              : 'Atendimento SUS disponível'}
                          </span>
                          <span className={`font-bold ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500'}`}>
                            {isSelected ? 'Pronto para agendar' : 'Clique para selecionar'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Service Selection */}
              {selectedProfessional && (
                <div className="space-y-3 pt-5 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mb-0.5">
                        2. Selecione o Tipo de Consulta / Atendimento
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Serviços oferecidos por <strong className="text-teal-700 dark:text-teal-300">{selectedProfessional.name}</strong> ({PROFESSIONS[selectedProfessional.profession]?.name || selectedProfessional.profession})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Trocar Profissional
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableServices.map((serv) => {
                      const isSelected = selectedService?.id === serv.id;
                      return (
                        <div
                          key={serv.id}
                          onClick={() => {
                            setSelectedServiceId(serv.id);
                            setSelectedSlot(null);
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 shadow-md shadow-teal-500/10'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                {serv.name}
                              </h5>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                              )}
                            </div>
                            {serv.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {serv.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-teal-600" />
                              {serv.durationMinutes} min
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              {serv.price > 0 ? `R$ ${serv.price.toFixed(2)}` : 'SUS / Gratuito'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Next Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <SpecularButton
                  type="button"
                  disabled={!selectedProfessional || !selectedService}
                  onClick={() => setStep(2)}
                  size="md"
                  radius={14}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20"
                >
                  Continuar para Data e Horário
                  <ChevronRight className="w-4 h-4 ml-1" />
                </SpecularButton>
              </div>
            </motion.div>
          )}

          {/* STEP 2: DATA & HORÁRIO */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Slot Conflict Banner (Se outro paciente finalizou o horário antes da compensação PIX) */}
              {slotConflictInfo?.wasConflict && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600 space-y-3 shadow-md shadow-amber-500/10">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5 text-xs text-amber-900 dark:text-amber-100 flex-1">
                      <h4 className="font-black text-sm text-amber-950 dark:text-amber-200">
                        Horário anterior indisponível — Seu pagamento está 100% seguro!
                      </h4>
                      <p>
                        O horário das <strong>{slotConflictInfo.originalSlot?.startTime}</strong> do dia{' '}
                        <strong>{slotConflictInfo.originalDate}</strong> acabou de ser finalizado por outro usuário momentos antes da compensação.
                      </p>
                      <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-slate-800 dark:text-slate-200 text-xs">
                          O valor pago de{' '}
                          <strong className="text-emerald-700 dark:text-emerald-300 font-mono font-black">
                            R$ {slotConflictInfo.balanceSecured.toFixed(2)}
                          </strong>{' '}
                          já consta como <strong>saldo integral na sua carteira</strong> vinculada ao seu CPF.
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] pt-1">
                        Escolha uma nova data e horário abaixo para concluir seu agendamento imediatamente com seu saldo, ou desista do agendamento por agora se preferir.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/80">
                    <button
                      type="button"
                      onClick={() => setShowDesistModal(true)}
                      className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Desistir do agendamento por agora
                    </button>
                  </div>
                </div>
              )}

              {/* Wallet Balance Banner if patient has credit */}
              {patientWalletBalance > 0 && !slotConflictInfo?.wasConflict && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5 text-teal-950 dark:text-teal-100">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-teal-900 dark:text-teal-100">
                        Saldo disponível na carteira:{' '}
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                          R$ {patientWalletBalance.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-[11px] text-teal-700 dark:text-teal-300">
                        Este saldo poderá ser abatido integralmente na etapa de confirmação.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDesistModal(true)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer self-end sm:self-auto"
                  >
                    Desistir do agendamento
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
                    Escolha o Dia e o Horário
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Atendimento com <strong>{selectedProfessional?.name}</strong> •{' '}
                    <strong>{selectedService?.name}</strong> ({selectedService?.durationMinutes} min)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Data:
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Available Slots Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Horários Disponíveis ({availableSlots.filter((s) => s.available).length} vagas livres)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Sincronizado em tempo real com Google Calendar & Grade Clínica
                  </span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nenhum horário de atendimento disponível para a data selecionada.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      O profissional não possui expediente neste dia da semana. Selecione outra data no calendário acima.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;

                      if (!slot.available) {
                        return (
                          <div
                            key={slot.startTime}
                            title={slot.reason || 'Horário indisponível'}
                            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center opacity-40 cursor-not-allowed select-none"
                          >
                            <span className="text-xs font-bold font-mono text-slate-500 block line-through">
                              {slot.startTime}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">
                              {slot.reason ? slot.reason.split(':')[0] : 'Ocupado'}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/30 scale-102'
                              : 'bg-white dark:bg-slate-900 border-teal-200 dark:border-teal-800/60 text-slate-900 dark:text-slate-100 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30'
                          }`}
                        >
                          <span
                            className={`text-xs font-black font-mono block ${
                              isSelected ? 'text-white' : 'text-teal-900 dark:text-teal-200'
                            }`}
                          >
                            {slot.startTime}
                          </span>
                          <span
                            className={`text-[10px] block ${
                              isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            até {slot.endTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>

                <SpecularButton
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                  size="md"
                  radius={14}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20"
                >
                  Continuar com Dados do Paciente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </SpecularButton>
              </div>
            </motion.div>
          )}

          {/* STEP 3: DADOS DO PACIENTE */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                  3. Identificação do Paciente
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Consulte seu cadastro prévio no SUS ou preencha as informações obrigatórias para o agendamento.
                </p>
              </div>

              {/* Summary of selection */}
              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  <span className="text-slate-700 dark:text-slate-300">
                    <strong>{selectedDate}</strong> às <strong>{selectedSlot?.startTime}</strong>
                  </span>
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  {selectedProfessional?.name} • <strong>{selectedService?.name}</strong>
                </div>
                <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {selectedService && selectedService.price > 0
                    ? `R$ ${selectedService.price.toFixed(2)}`
                    : 'SUS / Gratuito'}
                </div>
              </div>

              {/* SECTION: Quick Search & Verification Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-teal-200 dark:border-teal-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Consulta Rápida de Cadastro SUS
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Verifique se já possui cadastro no e-SUS PEC
                  </span>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-700/60 max-w-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSearchType('cpf');
                      setQuickSearchInput('');
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      quickSearchType === 'cpf'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    CPF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSearchType('cns');
                      setQuickSearchInput('');
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      quickSearchType === 'cns'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Cartão SUS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSearchType('phone');
                      setQuickSearchInput('');
                    }}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      quickSearchType === 'phone'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    WhatsApp / Telefone
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={quickSearchInput}
                      onChange={handleQuickSearchInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleExecuteQuickSearch();
                        }
                      }}
                      placeholder={
                        quickSearchType === 'cpf'
                          ? 'Digite o CPF (000.000.000-00)'
                          : quickSearchType === 'cns'
                          ? 'Digite o Cartão SUS (15 dígitos)'
                          : 'Digite o Telefone/WhatsApp com DDD'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                    />
                  </div>

                  <SpecularButton
                    type="button"
                    disabled={isSearchingPatient || !quickSearchInput.trim()}
                    onClick={handleExecuteQuickSearch}
                    size="sm"
                    radius={12}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 whitespace-nowrap"
                  >
                    {isSearchingPatient ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 mr-1" />
                        Confirmar Dado
                      </>
                    )}
                  </SpecularButton>
                </div>
              </div>

              {/* Multiple Patients Found with Same Phone Number Selector */}
              {multiplePatientsFound.length > 1 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/90 dark:bg-teal-950/40 border-2 border-teal-500 shadow-md space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                          {multiplePatientsFound.length} Pacientes encontrados para este telefone
                        </h4>
                        <p className="text-xs text-teal-800 dark:text-teal-200">
                          O número informado possui mais de um cadastro vinculado. Selecione o cidadão que receberá o atendimento:
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMultiplePatientsFound([])}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {multiplePatientsFound.map((pat) => (
                      <div
                        key={pat.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectIdentifiedPatient(pat);
                          }
                        }}
                        onClick={() => handleSelectIdentifiedPatient(pat)}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group select-none"
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center font-black text-base group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
                              {pat.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-teal-700 dark:group-hover:text-teal-300">
                                {pat.fullName}
                              </h5>
                              <span className="text-[11px] text-teal-700 dark:text-teal-400 font-bold block">
                                {pat.gender || 'Paciente'} {pat.birthDate && calculateAge(pat.birthDate) !== null ? `• ${calculateAge(pat.birthDate)} anos` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                            <div className="flex justify-between">
                              <span className="text-[10px] text-slate-400 font-bold">CPF:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCPF(pat.cpf)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-slate-400 font-bold">Cartão SUS:</span>
                              <span className="font-mono text-slate-800 dark:text-slate-200">{formatCNS(pat.cns)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Clique para escolher</span>
                          <span className="text-xs font-black text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selecionar Cidadão
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                      O paciente a ser atendido não está na lista acima?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMultiplePatientsFound([]);
                        handleStartNewPatientRegistration();
                      }}
                      className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Cadastrar outro dependente com este telefone
                    </button>
                  </div>
                </div>
              )}

              {/* Status Banner when patient is verified - Showing citizen selected and ready to advance */}
              {isPatientVerified && identifiedPatient && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-2 border-emerald-500 shadow-md shadow-emerald-500/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/80 dark:border-emerald-800/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Cadastro Localizado no e-SUS PEC
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            Pronto para Avançar
                          </span>
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                          {patientName}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleClearPatientForm}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Alterar Paciente
                      </button>

                      <SpecularButton
                        type="button"
                        onClick={() => setStep(4)}
                        size="sm"
                        radius={12}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                      >
                        Avançar para Próxima Etapa
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </SpecularButton>
                    </div>
                  </div>

                  {/* Patient Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/70 dark:bg-slate-950/40 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">CPF:</span>
                      <strong className="font-mono text-slate-900 dark:text-slate-100">{patientCpf}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Cartão SUS (CNS):</span>
                      <strong className="font-mono text-slate-900 dark:text-slate-100">{patientCns}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Telefone / WhatsApp:</span>
                      <strong className="font-mono text-slate-900 dark:text-slate-100">{patientPhone}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Nascimento / Idade:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {patientBirthDate || 'Não informado'}
                        {patientBirthDate && calculateAge(patientBirthDate) !== null && (
                          <span className="text-slate-500 font-normal"> ({calculateAge(patientBirthDate)} anos)</span>
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Banner when registering a new patient */}
              {isNewPatientRegistration && !isPatientVerified && (
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    <strong>Novo Paciente:</strong> Preencha os dados abaixo. Seu cadastro será registrado automaticamente no prontuário do e-SUS PEC após a conclusão.
                  </span>
                </div>
              )}

              {/* Complete Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nome Completo do Paciente <span className="text-rose-500 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ex: Maria dos Santos Silva"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none ${
                      patientName.trim() && !isNameValid
                        ? 'border-rose-400 dark:border-rose-700'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {!isNameValid && patientName.trim().length > 0 && (
                    <span className="text-[10px] text-rose-500 mt-1 block">
                      Digite o nome completo do paciente.
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    WhatsApp / Telefone de Contato <span className="text-rose-500 font-extrabold">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 98765-4321"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none ${
                      patientPhone && !isPhoneValid
                        ? 'border-rose-400 dark:border-rose-700'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {!isPhoneValid && patientPhone.length > 0 && (
                    <span className="text-[10px] text-rose-500 mt-1 block">
                      Telefone com DDD obrigatório (mínimo 10 dígitos).
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    CPF (Cadastro de Pessoa Física) <span className="text-rose-500 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientCpf}
                    onChange={handleCpfChange}
                    placeholder="000.000.000-00"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none ${
                      patientCpf && !isCpfValid
                        ? 'border-rose-400 dark:border-rose-700'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {!isCpfValid && patientCpf.length > 0 && (
                    <span className="text-[10px] text-rose-500 mt-1 block">
                      O CPF deve conter exatamente 11 dígitos numéricos.
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cartão Nacional de Saúde (CNS / SUS) <span className="text-rose-500 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientCns}
                    onChange={handleCnsChange}
                    placeholder="000 0000 0000 0000 (15 dígitos)"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none ${
                      patientCns && !isCnsValid
                        ? 'border-rose-400 dark:border-rose-700'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                  {!isCnsValid && patientCns.length > 0 && (
                    <span className="text-[10px] text-rose-500 mt-1 block">
                      O Cartão SUS deve conter 15 dígitos numéricos.
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={patientBirthDate}
                    onChange={(e) => setPatientBirthDate(e.target.value)}
                    max={todayStr}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  {patientBirthDate && calculateAge(patientBirthDate) !== null && (
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1 block">
                      Idade: {calculateAge(patientBirthDate)} anos
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Sexo / Gênero
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Motivo da Consulta / Observações Clínicas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    placeholder="Ex: Acompanhamento de rotina, sintomas recentes, retorno com exames laboratoriais..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Mandatory fields alert if form is invalid */}
              {!isFormValid && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Para prosseguir, preencha <strong>Nome Completo</strong>, <strong>WhatsApp</strong>, <strong>CPF (11 dígitos)</strong> e <strong>Cartão SUS (15 dígitos)</strong>.
                  </span>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>

                <SpecularButton
                  type="button"
                  disabled={!isFormValid}
                  onClick={() => setStep(4)}
                  size="md"
                  radius={14}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 disabled:opacity-50"
                >
                  Revisar e Confirmar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </SpecularButton>
              </div>
            </motion.div>
          )}

          {/* STEP 4: REVISÃO, SALDO EM CARTEIRA & PAGAMENTO ANTECIPADO PIX */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
                  4. Confirmação & Pagamento Antecipado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Revise os dados da consulta e realize o pagamento antecipado para garantir a sua vaga na grade do profissional.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Paciente
                    </span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {patientName}
                    </p>
                    <p className="text-slate-500 font-mono">WhatsApp: {patientPhone}</p>
                    <p className="text-slate-500 font-mono">CPF: {patientCpf}</p>
                    <p className="text-slate-500 font-mono">Cartão SUS: {patientCns}</p>
                    {patientBirthDate && (
                      <p className="text-slate-500">
                        Nasc.: {patientBirthDate} ({calculateAge(patientBirthDate)} anos)
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Profissional & Local
                    </span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {selectedProfessional?.name}
                    </p>
                    <p className="text-teal-700 dark:text-teal-300 font-semibold">
                      {selectedProfessional && PROFESSIONS[selectedProfessional.profession]?.name}
                    </p>
                    <p className="text-slate-500">{selectedProfessional?.workplace || 'Unidade de Saúde'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Data e Horário
                    </span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {selectedDate}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 font-mono">
                      {selectedSlot?.startTime} às {selectedSlot?.endTime} ({selectedService?.durationMinutes} min)
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Serviço Selecionado
                    </span>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {selectedService?.name}
                    </p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                      {servicePrice > 0
                        ? `R$ ${servicePrice.toFixed(2)}`
                        : 'Atendimento SUS / Isento'}
                    </p>
                  </div>
                </div>

                {appointmentNotes && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Observações / Motivo
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 italic">{appointmentNotes}</p>
                  </div>
                )}
              </div>

              {/* PAYMENT & WALLET FLOW */}
              {isFreeService ? (
                /* FREE SUS SERVICE */
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-sm block mb-0.5">Atendimento Gratuito / SUS</span>
                    <span>
                      Este serviço é isento de cobrança financeira. Sua vaga será confirmada imediatamente na grade clínica do profissional.
                    </span>
                  </div>
                </div>
              ) : (
                /* PAID SERVICE FLOW (Prepayment via PIX or Wallet Balance) */
                <div className="space-y-4">
                  {/* Patient Wallet Card */}
                  {patientWalletBalance > 0 && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-slate-900 border border-teal-200 dark:border-teal-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          <span className="text-xs font-black text-teal-950 dark:text-teal-100">
                            Saldo Disponível em Carteira:
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
                          R$ {patientWalletBalance.toFixed(2)}
                        </span>
                      </div>

                      <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useWalletBalance}
                          onChange={(e) => setUseWalletBalance(e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                        />
                        <span className="font-medium">
                          Utilizar meu saldo disponível para abater no valor desta consulta
                        </span>
                      </label>

                      {useWalletBalance && (
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-teal-100 dark:border-teal-900/60 text-xs space-y-1.5 font-mono">
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Valor total do serviço:</span>
                            <span>R$ {servicePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                            <span>Saldo da carteira aplicado:</span>
                            <span>- R$ {effectiveBalanceApplied.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-black text-sm">
                            <span>Restante a pagar via PIX:</span>
                            <span className={amountToPayPix === 0 ? 'text-emerald-600' : 'text-teal-700 dark:text-teal-300'}>
                              R$ {amountToPayPix.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* If balance covers 100% */}
                  {amountToPayPix === 0 ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="block text-sm">Saldo Suficiente!</strong>
                        <p>
                          Seu saldo de <strong>R$ {patientWalletBalance.toFixed(2)}</strong> cobre integralmente o valor desta consulta (<strong>R$ {servicePrice.toFixed(2)}</strong>).
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          Nenhum pagamento PIX é necessário. O valor será debitado do seu saldo após a confirmação.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* PIX Prepayment needed */
                    <div className="space-y-4">
                      {!activePixOrder ? (
                        /* Initial State: Prompt to generate PIX */
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-sm text-amber-950 dark:text-amber-100">
                            <CreditCard className="w-4 h-4 text-amber-600" />
                            <span>Pagamento Antecipado Obrigatório via PIX</span>
                          </div>
                          <p>
                            Para concluir o agendamento, é necessário o pagamento antecipado de{' '}
                            <strong className="text-emerald-700 dark:text-emerald-300 font-mono text-sm">
                              R$ {amountToPayPix.toFixed(2)}
                            </strong>{' '}
                            via PIX.
                          </p>
                          <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 border border-amber-300/80 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
                            <p>
                              ⏱️ <strong>Prazo de 30 minutos:</strong> Após gerar o PIX, você terá 30 minutos para efetuar o pagamento antes que ele expire.
                            </p>
                            <p>
                              🛡️ <strong>Garantia de vaga:</strong> A vaga selecionada ficará disponível para outros pacientes até que o seu PIX seja compensado pelo banco.
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Active PIX Order: 30-Minute Timer & Payment UI */
                        <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/60 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 space-y-5 shadow-lg">
                          {/* Timer & Expiration Warning Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <QrCode className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                                  Pague via PIX para Confirmar o Agendamento
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Valor a pagar: <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">R$ {activePixOrder.amount.toFixed(2)}</strong>
                                </p>
                              </div>
                            </div>

                            {/* Digital Countdown Timer */}
                            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-400 shadow-sm self-start sm:self-auto">
                              <Timer className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
                              <div className="text-xs">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">Tempo restante:</span>
                                <span className="font-mono font-black text-base text-amber-700 dark:text-amber-300">
                                  {formatTimer(pixTimeRemaining)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 30-min Visual Progress Bar */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                              <span>30m expiração</span>
                              <span>{Math.floor(pixTimeRemaining / 60)} min restantes</span>
                            </div>
                            <div className="w-full bg-amber-200/60 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-500 h-full transition-all duration-1000 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, (pixTimeRemaining / 1800) * 100))}%` }}
                              />
                            </div>
                          </div>

                          {/* Important Notice */}
                          <div className="p-3 rounded-xl bg-amber-100/70 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200">
                            <strong>Atenção:</strong> O horário das <strong>{selectedSlot?.startTime}</strong> permanece disponível até a compensação bancária do PIX. Se outro paciente compensar o pagamento antes, seu valor será convertido em <strong>saldo 100% garantido</strong> na sua carteira para reagendamento.
                          </div>

                          {/* QR Code and Copia e Cola */}
                          <div className="flex flex-col sm:flex-row items-center gap-5">
                            {activePixOrder.pixQrCode ? (
                              <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-md shrink-0">
                                <img
                                  src={activePixOrder.pixQrCode}
                                  alt="QR Code PIX"
                                  className="w-44 h-44 object-contain rounded-lg"
                                />
                              </div>
                            ) : (
                              <div className="w-44 h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 p-4 text-center shrink-0 border border-dashed border-slate-300">
                                <QrCode className="w-10 h-10 mb-2 opacity-40" />
                                <span className="text-[10px] font-mono">Abra o App do seu banco para pagar via Copia e Cola</span>
                              </div>
                            )}

                            <div className="space-y-3 flex-1 w-full text-xs">
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                                  PIX Copia e Cola
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={activePixOrder.pixCopiaECola || ''}
                                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 select-all truncate outline-none"
                                  />
                                  <SpecularButton
                                    type="button"
                                    onClick={() => {
                                      if (activePixOrder.pixCopiaECola) {
                                        navigator.clipboard.writeText(activePixOrder.pixCopiaECola);
                                        setPixCopied(true);
                                        onShowToast('success', 'Código PIX copiado para a área de transferência!', 'PIX Copiado');
                                        setTimeout(() => setPixCopied(false), 3000);
                                      }
                                    }}
                                    size="sm"
                                    radius={12}
                                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs whitespace-nowrap shadow-xs"
                                  >
                                    {pixCopied ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-200" />
                                        Copiado!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                        Copiar
                                      </>
                                    )}
                                  </SpecularButton>
                                </div>
                              </div>

                              {/* Real-time Listening Animation */}
                              <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                                  <span className="text-[11px] font-bold text-amber-950 dark:text-amber-200">
                                    Aguardando compensação do banco...
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">Atualização automática</span>
                              </div>

                              {/* Test Simulation Button & Cancel */}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={isSimulatingPayment}
                                  onClick={handleSimulatePixPayment}
                                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-950 dark:text-amber-200 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                                  title="Simula a confirmação bancária imediata do PIX para fins de teste e demonstração"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  {isSimulatingPayment ? 'Simulando...' : '⚡ Simular Compensação PIX (Teste)'}
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCancelPixOrder}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  Cancelar este PIX
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (activePixOrder) {
                      if (confirm('Você possui um pedido PIX em andamento. Deseja cancelar e voltar?')) {
                        handleCancelPixOrder();
                        setStep(3);
                      }
                    } else {
                      setStep(3);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>

                {isFreeService || amountToPayPix === 0 ? (
                  <SpecularButton
                    type="button"
                    disabled={isProcessingBooking}
                    onClick={handleConfirmFreeOrBalanceBooking}
                    size="md"
                    radius={14}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20"
                  >
                    {isProcessingBooking ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {isFreeService
                          ? 'Finalizar e Confirmar Agendamento (Gratuito)'
                          : `Confirmar Agendamento com meu Saldo`}
                      </>
                    )}
                  </SpecularButton>
                ) : !activePixOrder ? (
                  <SpecularButton
                    type="button"
                    disabled={isProcessingBooking}
                    onClick={handleGeneratePixOrder}
                    size="md"
                    radius={14}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20"
                  >
                    {isProcessingBooking ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar QR Code PIX de R$ {amountToPayPix.toFixed(2)}
                      </>
                    )}
                  </SpecularButton>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessingBooking}
                      onClick={() => activePixOrder && handlePaymentConfirmed(activePixOrder)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Já paguei / Verificar agora
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 5: COMPROVANTE & TICKET RECEIPT */}
          {step === 5 && confirmedAppointment && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 max-w-xl mx-auto"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  Agendamento Confirmado!
                </h3>
                <p className="text-xs text-slate-500">
                  Código do Agendamento: <strong className="font-mono">{confirmedAppointment.id}</strong>
                </p>
              </div>

              {/* PIX Payment Section (If applicable) */}
              {confirmedAppointment.paymentStatus === 'pendente' && (
                <div className="p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/40 border-2 border-amber-400/80 dark:border-amber-700 space-y-4">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <QrCode className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-black">Pagamento PIX da Consulta</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {pixData?.pixQrCode ? (
                      <img
                        src={pixData.pixQrCode}
                        alt="PIX QR Code"
                        className="w-36 h-36 rounded-2xl bg-white p-2 border border-slate-200 dark:border-slate-700 shadow-md"
                      />
                    ) : (
                      <div className="w-36 h-36 rounded-2xl bg-white flex items-center justify-center p-3 border text-center text-xs text-slate-400">
                        QR Code PIX
                      </div>
                    )}

                    <div className="space-y-2 flex-1 text-xs">
                      <p className="text-slate-700 dark:text-slate-300">
                        Valor: <strong className="text-emerald-600 text-sm">R$ {confirmedAppointment.servicePrice?.toFixed(2)}</strong>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Abra o app do seu banco, escaneie o QR Code ou copie o código PIX abaixo:
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                      >
                        {pixCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {pixCopied ? 'Código PIX Copiado!' : 'Copiar Código PIX (Copia e Cola)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Printable Ticket Receipt Card */}
              <div
                id="booking-ticket-receipt"
                className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 space-y-4 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider block">
                      Comprovante de Agendamento SUS
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {confirmedAppointment.serviceName}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold">
                    {confirmedAppointment.paymentStatus === 'pendente' ? 'Aguardando PIX' : 'Confirmado'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Paciente</span>
                    <strong className="text-slate-800 dark:text-slate-200">{confirmedAppointment.patientName}</strong>
                    <span className="block text-[11px] text-slate-500 font-mono">CPF: {confirmedAppointment.patientCpf}</span>
                    <span className="block text-[11px] text-slate-500 font-mono">CNS: {confirmedAppointment.patientCns}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Profissional</span>
                    <strong className="text-slate-800 dark:text-slate-200">{confirmedAppointment.professionalName}</strong>
                    <span className="block text-[11px] text-teal-600">
                      {PROFESSIONS[confirmedAppointment.professionalProfession || '']?.name || confirmedAppointment.professionalProfession}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Data & Horário</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {confirmedAppointment.date} às {confirmedAppointment.startTime}
                    </strong>
                    <span className="block text-[11px] text-slate-500">
                      Duração: {confirmedAppointment.serviceDurationMinutes} minutos
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Canal de Origem</span>
                    <strong className="text-slate-800 dark:text-slate-200">Portal Público SUS</strong>
                    <span className="block text-[11px] text-slate-500">e-SUS PEC Multiprofissional</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Step 5 */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={generateWhatsAppReminderLink(confirmedAppointment)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20"
                  >
                    <Phone className="w-4 h-4" />
                    Enviar para meu WhatsApp
                  </a>

                  <a
                    href={generateGoogleCalendarUrl(confirmedAppointment)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-300 dark:border-slate-700"
                  >
                    <CalendarCheck className="w-4 h-4 text-teal-600" />
                    Adicionar ao Google Calendar
                  </a>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Comprovante
                  </button>

                  <SpecularButton
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setConfirmedAppointment(null);
                      setSelectedSlot(null);
                      handleClearPatientForm();
                    }}
                    size="sm"
                    radius={12}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs"
                  >
                    Novo Agendamento
                  </SpecularButton>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 2: CONSULTAR MEUS AGENDAMENTOS */}
      {activeTab === 'my_appointments' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Search className="w-5 h-5 text-teal-600" />
              Localizar Meus Agendamentos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite seu CPF, Cartão SUS, WhatsApp ou Nome para consultar histórico, status de atendimento e comprovantes.
            </p>
          </div>

          <form onSubmit={handleSearchLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Ex: CPF, Cartão SUS, Telefone com DDD ou Nome Completo..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <SpecularButton
              type="submit"
              disabled={isSearchingLookup || !lookupQuery.trim()}
              size="md"
              radius={16}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm px-5 shadow-md shadow-teal-600/20"
            >
              {isSearchingLookup ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Consultar'}
            </SpecularButton>
          </form>

          {/* Results Area */}
          {lookupResults !== null && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Resultados Encontrados ({lookupResults.length})
                </h4>
                {lookupResults.length > 0 && (
                  <span className="text-[11px] text-slate-500">
                    Clique em um agendamento para ver detalhes
                  </span>
                )}
              </div>

              {lookupResults.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nenhum agendamento localizado com o termo informado.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Verifique os números digitados (CPF, Cartão SUS ou WhatsApp) e tente novamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lookupResults.map((app) => {
                    const isUpcoming = new Date(`${app.date}T${app.startTime}`).getTime() > Date.now();
                    const isCancelled = app.status === 'cancelado';

                    return (
                      <div
                        key={app.id}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider block">
                              Código: {app.id}
                            </span>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {app.serviceName}
                            </h5>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                isCancelled
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : app.status === 'finalizado'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                              }`}
                            >
                              {app.status.toUpperCase()}
                            </span>

                            {isUpcoming && !isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleCancelMyAppointment(app.id)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                              >
                                Cancelar Agendamento
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Profissional</span>
                            <strong className="text-slate-800 dark:text-slate-200">{app.professionalName}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Data e Horário</span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {app.date} às {app.startTime}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Paciente</span>
                            <span className="text-slate-700 dark:text-slate-300">{app.patientName}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* ========================================================================= */}
      {/* FLOATING MODAL 2: NENHUM CADASTRO ENCONTRADO                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isNotFoundModalOpen && (
          <div
            id="modal-patient-not-found"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 sm:p-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-md shadow-amber-500/20">
                  <UserPlus className="w-7 h-7" />
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  Nenhum Cadastro Localizado
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Não encontramos nenhum paciente cadastrado no e-SUS PEC com o dado informado{' '}
                  <strong className="font-mono text-slate-900 dark:text-slate-100">"{quickSearchInput}"</strong>.
                </p>

                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 text-left">
                  <span>
                    💡 Não se preocupe! Você pode realizar seu cadastro agora mesmo. O formulário abaixo criará seu registro automaticamente no prontuário.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsNotFoundModalOpen(false)}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Tentar Outro Dado
                  </button>

                  <SpecularButton
                    type="button"
                    onClick={handleStartNewPatientRegistration}
                    size="md"
                    radius={14}
                    className="w-full sm:flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Cadastrar Paciente
                  </SpecularButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* FLOATING MODAL 3: PRAZO DE PAGAMENTO PIX EXPIRADO */}
        {isPixExpired && (
          <div
            id="modal-pix-expired"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-rose-500/80 overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
                  <Timer className="w-8 h-8 animate-pulse" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Prazo de Pagamento Expirado
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                    O tempo limite de 30 minutos para compensação do PIX expirou.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 text-left space-y-2">
                  <p>
                    O agendamento <strong>não foi finalizado</strong> e o horário que você havia selecionado foi liberado para a agenda pública.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Caso deseje, você pode iniciar um novo agendamento escolhendo uma nova data e horário disponíveis.
                  </p>
                </div>

                <div className="pt-2">
                  <SpecularButton
                    type="button"
                    onClick={handleResetBookingToZero}
                    size="md"
                    radius={14}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Iniciar Novo Agendamento
                  </SpecularButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* FLOATING MODAL 4: DESISTIR DO AGENDAMENTO E MANTER SALDO EM CARTEIRA */}
        {showDesistModal && (
          <div
            id="modal-desist-booking"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-500/40 overflow-hidden"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
                  <Wallet className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Desistir do Agendamento
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Seu saldo continuará 100% seguro na sua carteira!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-left space-y-2">
                  <div className="flex items-center justify-between border-b border-teal-200/60 dark:border-teal-800/60 pb-2">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Saldo garantido:</span>
                    <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                      R$ {patientWalletBalance.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    O valor pago fica registrado na sua carteira vinculada ao CPF{' '}
                    <strong className="font-mono text-slate-900 dark:text-slate-100">{patientCpf || 'cadastrado'}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Você poderá retornar a qualquer momento para agendar uma consulta utilizando esse crédito.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDesistModal(false)}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Continuar Agendando
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDesistModal(false);
                      handleResetBookingToZero();
                      onShowToast('info', 'Seu saldo permanece guardado na sua carteira.', 'Até breve!');
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Guardar Saldo e Sair
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
