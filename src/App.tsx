import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Stethoscope,
  Info,
  Check,
  User,
  Users,
  UserPlus,
  Calendar,
  HeartHandshake,
  ArrowLeft,
  Clock,
  PlusCircle,
  Settings,
} from 'lucide-react';
import {
  ProfessionId,
  AIModelId,
  AttachmentItem,
  KnowledgeItem,
  GeneratedPECRecord,
  ToastInfo,
  User as UserModel,
  UserRole,
  Patient,
  Consultation,
  EvolutionSummary,
  SystemSettings,
  SubscriptionPlan,
  PrescriptionData,
  ReferralData,
  PtsData,
  SUSMedication,
  SUSExam,
  ExamRequestData,
  MedicalReportData,
  Appointment,
  AppointmentStatus,
  ReceptionQueueItem,
  QueueItemStatus,
  RiskClassification,
  QueuePriorityCategory,
  MedicalCertificateData,
  AttendanceCertificateData,
  ExamMediaReportData,
} from './types';
import {
  PROFESSIONS,
  DEFAULT_KNOWLEDGE_BASE,
  DEFAULT_USERS,
  DEFAULT_PATIENTS,
  DEFAULT_CONSULTATIONS,
  DEFAULT_SYSTEM_SETTINGS,
  ADMIN_MASTER_EMAIL,
  LEGACY_MOCK_USER_IDS,
  LEGACY_MOCK_USER_NAMES,
  isUserAdmin,
  canIssueMedicalCertificate,
  canIssueAttendanceCertificate,
} from './data/professions';
import { OFFICIAL_SUS_MEDICATIONS } from './data/susMedications';
import { OFFICIAL_SUS_EXAMS } from './data/susExams';
import { generatePECRecord, GenerationStatusUpdate } from './services/gemini';
import { getFriendlyModelName } from './utils/aiModelHelper';
import { generateClinicalEvolution, getStoredClinicalEvolution } from './services/geminiEvolution';
import {
  subscribeToPatients,
  savePatientToFirestore,
  deletePatientFromFirestore,
  subscribeToConsultations,
  saveConsultationToFirestore,
  deleteConsultationFromFirestore,
  subscribeToKnowledgeItems,
  subscribeToUsers,
  fetchAllUsersFromFirestore,
  purgeLegacyMockDataFromFirestore,
  isMockUser,
  saveUserToFirestore,
  deleteUserFromFirestore,
  subscribeToSystemSettings,
  saveSystemSettingsToFirestore,
  seedFirestoreIfEmpty,
  subscribeToSubscriptionPlans,
  saveSubscriptionPlanToFirestore,
  seedSubscriptionPlansIfEmpty,
  updateUserFreeTrialUsed,
  updateUserSubscriptionDirectly,
  DEFAULT_SUBSCRIPTION_PLANS,
  subscribeToMedications,
  saveMedicationToFirestore,
  deleteMedicationFromFirestore,
  seedMedicationsIfEmpty,
  resetMedicationsToDefaults,
  subscribeToExams,
  saveExamToFirestore,
  deleteExamFromFirestore,
  seedExamsIfEmpty,
  resetExamsToDefaults,
  subscribeToAppointments,
  saveAppointmentToFirestore,
  updateAppointmentStatusInFirestore,
  deleteAppointmentFromFirestore,
  subscribeToReceptionQueue,
  saveQueueItemToFirestore,
  updateQueueItemStatusInFirestore,
  deleteQueueItemFromFirestore,
  cleanupExpiredSubscriptions,
} from './services/firebase';
import { calculateChronologicalAge, formatQueueDateTime } from './utils/dateCalculator';
import { isUserSubscriptionActive, normalizeSubscriptionExpiresAt } from './utils/pixExpiration';
import { ensureSectionsConfig } from './utils/aiOrchestrationConfig';
import { safeSetItem, safeGetItem, safeGetString, safeRemoveItem } from './utils/safeStorage';
import { Header } from './components/Header';
import { TriageForm } from './components/TriageForm';
import { MultimodalInput } from './components/MultimodalInput';
import { OutputCard } from './components/OutputCard';
import { KnowledgeBaseDrawer } from './components/KnowledgeBaseDrawer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ToastContainer } from './components/Toast';
import { PatientFormModal } from './components/PatientFormModal';
import { PatientTimeline } from './components/PatientTimeline';
import { ClinicalEvolutionModal } from './components/ClinicalEvolutionModal';
import { AuthModal } from './components/AuthModal';
import { PatientsListView } from './components/PatientsListView';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { EditConsultationModal } from './components/EditConsultationModal';
import { PatientDropdownSelector } from './components/PatientDropdownSelector';
import { SpecularButton } from './components/SpecularButton';
import { PaywallModal } from './components/PaywallModal';
import { PrescriptionModal } from './components/PrescriptionModal';
import { PrescriptionPrintSheet } from './components/PrescriptionPrintSheet';
import { PrescriptionPreviewModal } from './components/PrescriptionPreviewModal';
import { ReferralModal } from './components/ReferralModal';
import { PtsModal } from './components/PtsModal';
import { MedicationsDrawer } from './components/MedicationsDrawer';
import { ExamRequestModal } from './components/ExamRequestModal';
import { MedicalReportModal } from './components/MedicalReportModal';
import { MedicalCertificateModal } from './components/MedicalCertificateModal';
import { AttendanceCertificateModal } from './components/AttendanceCertificateModal';
import { ExamMediaModal } from './components/ExamMediaModal';
import { ExamsDrawer } from './components/ExamsDrawer';
import { openExamRequestInNewTab } from './utils/printExamRequest';
import { isDoctorConsultation, cleanDoctorConsultation } from './utils/doctorConsultationCleaner';
import { ProfessionalScheduleSettingsModal } from './components/ProfessionalScheduleSettingsModal';
import { AppointmentsManagementView } from './components/AppointmentsManagementView';
import { PublicBookingPortal } from './components/PublicBookingPortal';
import { ReceptionQueueView } from './components/ReceptionQueueView';
import { AddToQueueModal } from './components/AddToQueueModal';
import { CallPatientModal } from './components/CallPatientModal';
import { CompleteConsultationModal } from './components/CompleteConsultationModal';
import { PublicQueueCallScreen } from './components/PublicQueueCallScreen';
import { PublicVideoPlayerView } from './components/PublicVideoPlayerView';

// Helper functions to detect if current URL is for public citizen booking portal
function detectIsPublicPortalUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('portal') === 'agendar' ||
      params.get('portal') === 'publico' ||
      params.get('portal') === 'booking' ||
      params.get('agendar') === 'true' ||
      params.get('agendamento') === 'true' ||
      params.get('booking') === 'true' ||
      window.location.pathname.includes('/agendar') ||
      window.location.pathname.includes('/booking') ||
      window.location.hash.includes('agendar') ||
      window.location.hash.includes('booking')
    );
  } catch {
    return false;
  }
}

function detectPublicPortalUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('userId') || undefined;
  } catch {
    return undefined;
  }
}

function detectIsPublicQueueCallUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('painel') === 'chamada' ||
      params.get('painel') === 'tv' ||
      params.get('painel') === 'fila' ||
      params.get('chamada') === 'tv' ||
      params.get('chamada') === 'painel' ||
      params.get('chamada') === 'publica' ||
      params.get('view') === 'tv' ||
      params.get('view') === 'chamada' ||
      params.get('tela') === 'chamada' ||
      window.location.hash.includes('painel-chamada') ||
      window.location.hash.includes('painel-tv') ||
      window.location.hash.includes('chamar-publico')
    );
  } catch {
    return false;
  }
}

// Helper function to detect if current URL is for public video exam viewing (via QR code or shared link)
function detectIsPublicVideoWatchUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const path = window.location.pathname;
    const search = window.location.search;
    const hash = window.location.hash;
    const params = new URLSearchParams(search);
    return (
      path.includes('/watch-video') ||
      path.includes('/video/') ||
      path.includes('/assistir-video') ||
      params.get('portal') === 'video' ||
      params.has('watch-video') ||
      params.has('videoUrl') ||
      params.has('assistir') ||
      hash.includes('watch-video') ||
      hash.includes('assistir-video')
    );
  } catch {
    return false;
  }
}

// Helper for robust name matching
function normalizePersonName(name?: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export default function App() {
  const isInitiallyPortal = detectIsPublicPortalUrl();
  const initialPortalUserId = detectPublicPortalUserId();
  const isInitiallyPublicCallTv = detectIsPublicQueueCallUrl();
  const isInitiallyPublicVideo = detectIsPublicVideoWatchUrl();

  // Navigation tab: 'generator' | 'patients' | 'appointments' | 'queue' | 'public_portal' | 'public_video'
  const [activeTab, setActiveTab] = useState<'generator' | 'patients' | 'appointments' | 'queue' | 'public_portal' | 'public_video'>(
    isInitiallyPortal ? 'public_portal' : isInitiallyPublicVideo ? 'public_video' : 'generator'
  );

  // TV Screen State for Waiting Room (Chamar Público)
  const [isPublicCallScreenOpen, setIsPublicCallScreenOpen] = useState(isInitiallyPublicCallTv);

  // Reception Queue State
  const [queueItems, setQueueItems] = useState<ReceptionQueueItem[]>([]);
  const [isAddToQueueModalOpen, setIsAddToQueueModalOpen] = useState(false);
  const [patientForQueue, setPatientForQueue] = useState<Patient | null>(null);
  const [isCallPatientModalOpen, setIsCallPatientModalOpen] = useState(false);
  const [patientToCall, setPatientToCall] = useState<ReceptionQueueItem | null>(null);
  const [isCompleteConsultationModalOpen, setIsCompleteConsultationModalOpen] = useState(false);
  const [consultationDraftTexts, setConsultationDraftTexts] = useState<{
    avaliacao: string;
    plano: string;
    conduta: string;
  } | null>(null);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isScheduleSettingsOpen, setIsScheduleSettingsOpen] = useState(false);
  const [scheduleSettingsTargetUser, setScheduleSettingsTargetUser] = useState<UserModel | null>(null);
  const [scheduleSettingsInitialTab, setScheduleSettingsInitialTab] = useState<'schedule' | 'services' | 'calendar_sync'>('schedule');
  const [publicPortalTargetUserId, setPublicPortalTargetUserId] = useState<string | undefined>(initialPortalUserId);

  // Helper to check if a user is one of the legacy mock profiles (imported isMockUser from services/firebase)

  // Registered Users list (Strictly from Firestore 'users' collection)
  const [users, setUsers] = useState<UserModel[]>(() => {
    try {
      const saved = localStorage.getItem('pec_users_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasFabricated = Array.isArray(parsed) && parsed.some(
          (u) =>
            u.customServices?.some((s: any) => s.id === 'serv-as-1' || s.id === 'serv-psi-1' || s.id === 'serv-psi-2' || s.id === 'serv-psp-1') ||
            isMockUser(u)
        );
        if (!hasFabricated) {
          const cleaned = (Array.isArray(parsed) ? parsed : []).filter((u: UserModel) => !isMockUser(u));
          if (cleaned.length > 0) return cleaned;
        }
      }
      return DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  // Active healthcare professional (User / Auth)
  const [currentUser, setCurrentUser] = useState<UserModel>(() => {
    try {
      const saved = localStorage.getItem('pec_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && !isMockUser(parsed)) {
          return parsed;
        }
      }
      return DEFAULT_USERS[0];
    } catch {
      return DEFAULT_USERS[0];
    }
  });

  // Global System Settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const saved = safeGetItem<any>('pec_system_settings', null);
      if (saved) {
        return {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...saved,
          sectionsConfig: ensureSectionsConfig(saved?.sectionsConfig),
        };
      }
      return DEFAULT_SYSTEM_SETTINGS;
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  });

  // Patients registry (Real data)
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = safeGetItem<Patient[]>('pec_patients', []);
      const cleaned = (saved || []).filter(
        (p) => !['pat-lucas-oliveira', 'pat-maria-aparecida', 'pat-gabriel-souza'].includes(p.id)
      );
      return cleaned;
    } catch {
      return [];
    }
  });

  // Active selected patient (for timeline and linked consultation generator)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Multiprofessional Consultations database (Real data)
  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    try {
      const saved = safeGetItem<Consultation[]>('pec_consultations', []);
      const cleaned = (saved || []).filter((c) => !c.id.startsWith('cons-lucas-'));
      return cleaned;
    } catch {
      return [];
    }
  });

  // Local storage state initialization
  const [selectedProfession, setSelectedProfession] = useState<ProfessionId>(() => {
    return currentUser.profession || 'enfermeiro';
  });

  const [selectedModel, setSelectedModel] = useState<AIModelId>(() => {
    const saved = safeGetString('pec_model', 'gemini-3.7-flash');
    if (saved === 'gemini-3.1-pro-preview' || saved === 'gemini-2.5-pro' || saved === 'gemini-pro') {
      return 'gemini-3.1-pro-preview';
    }
    return 'gemini-3.7-flash';
  });

  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return safeGetString('pec_user_api_key', '');
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = safeGetString('pec_dark_mode', '');
    if (saved) return saved === 'true';
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  });

  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>(() => {
    return safeGetItem<KnowledgeItem[]>('pec_knowledge_base', DEFAULT_KNOWLEDGE_BASE);
  });

  // SUS / REMUME Public Health Medications catalog
  const [medications, setMedications] = useState<SUSMedication[]>(() => {
    return safeGetItem<SUSMedication[]>('pec_medications', OFFICIAL_SUS_MEDICATIONS);
  });
  const [isMedicationsDrawerOpen, setIsMedicationsDrawerOpen] = useState(false);

  const [history, setHistory] = useState<GeneratedPECRecord[]>(() => {
    return safeGetItem<GeneratedPECRecord[]>('pec_history', []);
  });

  // Multimodal inputs state
  const [rawNotes, setRawNotes] = useState<string>('');
  const [isFirstConsultation, setIsFirstConsultation] = useState<boolean>(false);
  const [audioAttachment, setAudioAttachment] = useState<AttachmentItem | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatusUpdate | null>(null);
  const [currentRecord, setCurrentRecord] = useState<GeneratedPECRecord | null>(null);
  const [isRecordSavedToTimeline, setIsRecordSavedToTimeline] = useState(false);

  // Modals and Drawers
  const [isKnowledgeDrawerOpen, setIsKnowledgeDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('pec_is_authenticated') === 'true' ||
        sessionStorage.getItem('pec_is_authenticated') === 'true'
      );
    } catch {
      return false;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    // If opening directly on public citizen booking portal, TV call screen, or video player, DO NOT open the auth modal!
    if (isInitiallyPortal || isInitiallyPublicCallTv || isInitiallyPublicVideo) {
      return false;
    }
    try {
      return (
        localStorage.getItem('pec_is_authenticated') !== 'true' &&
        sessionStorage.getItem('pec_is_authenticated') !== 'true'
      );
    } catch {
      return true;
    }
  });
  const [isPatientFormModalOpen, setIsPatientFormModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  const [isEditConsultationModalOpen, setIsEditConsultationModalOpen] = useState(false);
  const [consultationToEdit, setConsultationToEdit] = useState<Consultation | null>(null);
  const [savedConsultationId, setSavedConsultationId] = useState<string | null>(null);

  // Prescription / Transcription State (Enfermeiro & Médico)
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [prescriptionTargetPatient, setPrescriptionTargetPatient] = useState<Patient | null>(null);
  const [prescriptionTargetConsultation, setPrescriptionTargetConsultation] = useState<Consultation | null>(null);
  const [prescriptionInitialPlanText, setPrescriptionInitialPlanText] = useState<string | undefined>(undefined);
  const [prescriptionToPrint, setPrescriptionToPrint] = useState<PrescriptionData | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [prescriptionForPreview, setPrescriptionForPreview] = useState<PrescriptionData | null>(null);

  const handleOpenPrescriptionPreview = (prescription: PrescriptionData) => {
    setPrescriptionForPreview(prescription);
    setPrescriptionToPrint(prescription);
    setIsPreviewModalOpen(true);
  };

  // Referral State (Guia de Encaminhamento e Referência SUS - A4 Retrato)
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralTargetPatient, setReferralTargetPatient] = useState<Patient | null>(null);
  const [referralTargetConsultation, setReferralTargetConsultation] = useState<Consultation | null>(null);
  const [referralInitialData, setReferralInitialData] = useState<ReferralData | undefined>(undefined);
  const [referralInitialPlanText, setReferralInitialPlanText] = useState<string | undefined>(undefined);
  const [referralInitialNotesText, setReferralInitialNotesText] = useState<string | undefined>(undefined);

  // PTS State (Projeto Terapêutico Singular Multiprofissional - Ficha A4 Retrato)
  const [isPtsModalOpen, setIsPtsModalOpen] = useState(false);
  const [ptsTargetPatient, setPtsTargetPatient] = useState<Patient | null>(null);
  const [ptsTargetConsultation, setPtsTargetConsultation] = useState<Consultation | null>(null);
  const [ptsInitialData, setPtsInitialData] = useState<PtsData | undefined>(undefined);
  const [ptsInitialPlanText, setPtsInitialPlanText] = useState<string | undefined>(undefined);
  const [ptsInitialNotesText, setPtsInitialNotesText] = useState<string | undefined>(undefined);

  // SUS Exams & Complementary Tests Catalog & Request Modal State
  const [exams, setExams] = useState<SUSExam[]>(() => {
    try {
      const saved = localStorage.getItem('pec_exams');
      return saved ? JSON.parse(saved) : OFFICIAL_SUS_EXAMS;
    } catch {
      return OFFICIAL_SUS_EXAMS;
    }
  });
  const [isExamsDrawerOpen, setIsExamsDrawerOpen] = useState(false);
  const [isExamRequestModalOpen, setIsExamRequestModalOpen] = useState(false);
  const [examRequestTargetPatient, setExamRequestTargetPatient] = useState<Patient | null>(null);
  const [examRequestTargetConsultation, setExamRequestTargetConsultation] = useState<Consultation | null>(null);
  const [examRequestInitialData, setExamRequestInitialData] = useState<ExamRequestData | undefined>(undefined);
  const [examRequestInitialPlanText, setExamRequestInitialPlanText] = useState<string | undefined>(undefined);
  const [examRequestInitialNotesText, setExamRequestInitialNotesText] = useState<string | undefined>(undefined);

  // Medical Report State (Laudo Médico Pericial / Clínico SUS - A4 Retrato)
  const [isMedicalReportModalOpen, setIsMedicalReportModalOpen] = useState(false);
  const [medicalReportTargetPatient, setMedicalReportTargetPatient] = useState<Patient | null>(null);
  const [medicalReportTargetConsultation, setMedicalReportTargetConsultation] = useState<Consultation | null>(null);
  const [medicalReportInitialData, setMedicalReportInitialData] = useState<MedicalReportData | undefined>(undefined);
  const [medicalReportInitialClinicalContext, setMedicalReportInitialClinicalContext] = useState<string | undefined>(undefined);

  // Medical Certificate State (Atestado Médico Oficial SUS - A4 Retrato com dias de afastamento e CID)
  const [isMedicalCertificateModalOpen, setIsMedicalCertificateModalOpen] = useState(false);
  const [medicalCertificateTargetPatient, setMedicalCertificateTargetPatient] = useState<Patient | null>(null);
  const [medicalCertificateTargetConsultation, setMedicalCertificateTargetConsultation] = useState<Consultation | null>(null);
  const [medicalCertificateInitialData, setMedicalCertificateInitialData] = useState<MedicalCertificateData | undefined>(undefined);

  // Attendance Certificate State (Atestado de Comparecimento SUS - A4 Retrato para Nível Superior)
  const [isAttendanceCertificateModalOpen, setIsAttendanceCertificateModalOpen] = useState(false);
  const [attendanceCertificateTargetPatient, setAttendanceCertificateTargetPatient] = useState<Patient | null>(null);
  const [attendanceCertificateTargetConsultation, setAttendanceCertificateTargetConsultation] = useState<Consultation | null>(null);
  const [attendanceCertificateInitialData, setAttendanceCertificateInitialData] = useState<AttendanceCertificateData | undefined>(undefined);

  // Exam Media State (Anexo Iconográfico de Imagens e QR Code de Vídeos - Folha A4)
  const [isExamMediaModalOpen, setIsExamMediaModalOpen] = useState(false);
  const [examMediaTargetPatient, setExamMediaTargetPatient] = useState<Patient | null>(null);
  const [examMediaTargetConsultation, setExamMediaTargetConsultation] = useState<Consultation | null>(null);
  const [examMediaInitialData, setExamMediaInitialData] = useState<ExamMediaReportData | undefined>(undefined);

  // Subscription Plans & Paywall
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_SUBSCRIPTION_PLANS);
  const [isPaywallModalOpen, setIsPaywallModalOpen] = useState(false);

  // Access control validation considering Brazil Timezone
  const hasValidAccess = (): boolean => {
    // Admin master has full unrestricted access
    if (isUserAdmin(currentUser)) return true;

    // Check paid subscription
    if (isUserSubscriptionActive(currentUser)) {
      return true;
    }

    // Check free trial (1 free consultation)
    if (!currentUser.free_used) {
      return true;
    }

    return false;
  };

  const verifyAccessOrOpenPaywall = (action?: () => void): boolean => {
    if (hasValidAccess()) {
      action?.();
      return true;
    }

    setIsPaywallModalOpen(true);
    showToast(
      'info',
      'Você utilizou seu teste gratuito de 1 prontuário. Escolha um plano para continuar utilizando todas as funções.',
      'Acesso Restrito'
    );
    return false;
  };

  // Longitudinal Evolution Modal state
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [evolutionSummary, setEvolutionSummary] = useState<EvolutionSummary | null>(null);
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);

  // Toast feedback
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const outputRef = useRef<HTMLDivElement | null>(null);

  // Sync Dark Mode class on document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    safeSetItem('pec_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Keep selected profession automatically bound to current user's profession
  useEffect(() => {
    if (currentUser?.profession) {
      setSelectedProfession(currentUser.profession);
    }
  }, [currentUser?.profession]);

  // Proteção da aba de pacientes: se usuário comum estiver inativo, redireciona para 'generator' e abre Paywall
  useEffect(() => {
    if (activeTab === 'patients' && !hasValidAccess() && !isUserAdmin(currentUser)) {
      setActiveTab('generator');
      setIsPaywallModalOpen(true);
    }
  }, [currentUser, activeTab]);

  // Detect URL parameter for public booking portal or public TV call screen
  useEffect(() => {
    const handleCheckUrl = () => {
      try {
        const isPortal = detectIsPublicPortalUrl();
        const uId = detectPublicPortalUserId();
        if (uId) {
          setPublicPortalTargetUserId(uId);
        }
        if (isPortal) {
          setActiveTab('public_portal');
          setIsAuthModalOpen(false);
        }

        const isTv = detectIsPublicQueueCallUrl();
        if (isTv) {
          setIsPublicCallScreenOpen(true);
          setIsAuthModalOpen(false);
        }

        const isVideo = detectIsPublicVideoWatchUrl();
        if (isVideo) {
          setActiveTab('public_video');
          setIsAuthModalOpen(false);
        }
      } catch (e) {
        console.warn('URL parsing error:', e);
      }
    };

    handleCheckUrl();
    window.addEventListener('popstate', handleCheckUrl);
    return () => window.removeEventListener('popstate', handleCheckUrl);
  }, []);

  // Immediate purge of mock data from browser localStorage on startup
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem('pec_users_list');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        const hasFabricated = Array.isArray(parsed) && parsed.some(
          (u) =>
            u.customServices?.some((s: any) => s.id === 'serv-as-1' || s.id === 'serv-psi-1' || s.id === 'serv-psi-2' || s.id === 'serv-psp-1') ||
            isMockUser(u)
        );
        if (hasFabricated) {
          localStorage.removeItem('pec_users_list');
        } else {
          const cleaned = (Array.isArray(parsed) ? parsed : []).filter((u: UserModel) => !isMockUser(u));
          if (cleaned.length > 0) {
            setUsers(cleaned);
          }
        }
      }
      const savedCurrent = safeGetItem<any>('pec_current_user', null);
      if (savedCurrent) {
        if (isMockUser(savedCurrent)) {
          safeSetItem('pec_current_user', DEFAULT_USERS[0]);
          setCurrentUser(DEFAULT_USERS[0]);
        }
      }
    } catch (err) {
      console.warn('LocalStorage sanitize error:', err);
    }
  }, []);

  // Real-time Cloud Firestore synchronization with offline fallback
  useEffect(() => {
    // 1. Seed initial standard data if Firestore is fresh (NEVER seeds mock users)
    seedFirestoreIfEmpty(
      DEFAULT_PATIENTS,
      DEFAULT_CONSULTATIONS,
      DEFAULT_KNOWLEDGE_BASE,
      DEFAULT_USERS,
      DEFAULT_SYSTEM_SETTINGS
    );
    seedSubscriptionPlansIfEmpty();
    seedMedicationsIfEmpty();
    seedExamsIfEmpty();
    cleanupExpiredSubscriptions().catch(() => {});

    // 2. Real-time subscription to Subscription Plans (SaaS)
    const unsubPlans = subscribeToSubscriptionPlans(
      (livePlans) => {
        if (livePlans && livePlans.length > 0) {
          setPlans(livePlans);
        }
      }
    );

    // 3. Real-time subscription to Patients
    const unsubPatients = subscribeToPatients(
      (livePatients) => {
        const cleanedPatients = (livePatients || []).filter(
          (p) => !['pat-lucas-oliveira', 'pat-maria-aparecida', 'pat-gabriel-souza'].includes(p.id)
        );
        setPatients((prevLocal) => {
          const liveIds = new Set(cleanedPatients.map((p) => p.id));
          const localOnly = (prevLocal || []).filter((p) => !liveIds.has(p.id));
          return [...cleanedPatients, ...localOnly];
        });
        setSelectedPatient((prev) => {
          if (!prev) return null;
          const updatedSelected = cleanedPatients.find((p) => p.id === prev.id);
          return updatedSelected || prev;
        });
      }
    );

    // 3. Real-time subscription to Multiprofessional Consultations
    const unsubConsultations = subscribeToConsultations(
      (liveConsultations) => {
        const cleanedConsultations = (liveConsultations || []).filter(
          (c) => !c.id.startsWith('cons-lucas-')
        );
        setConsultations((prev) => {
          const map = new Map<string, Consultation>();
          // 1. Add server/firestore consultations
          cleanedConsultations.forEach((c) => {
            if (c && c.id) map.set(c.id, c);
          });
          // 2. Preserve any local consultation already in memory or localStorage
          (prev || []).forEach((c) => {
            if (c && c.id && !map.has(c.id)) {
              map.set(c.id, c);
              saveConsultationToFirestore(c).catch(() => {});
            }
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)
          );
          safeSetItem('pec_consultations', merged);
          return merged;
        });
      }
    );


    // 4. Real-time subscription to Municipal Knowledge Base
    const unsubKnowledge = subscribeToKnowledgeItems(
      (liveKnowledge) => {
        if (liveKnowledge && liveKnowledge.length > 0) {
          setKnowledgeList(liveKnowledge);
        }
      }
    );

    // 5. Real-time subscription to Users & Roles (RBAC) - Strictly from Firestore 'users' collection
    const unsubUsers = subscribeToUsers(
      (liveUsers) => {
        if (liveUsers && liveUsers.length > 0) {
          const cleanedUsers = liveUsers.filter((u) => !isMockUser(u));
          if (cleanedUsers.length > 0) {
            setUsers(cleanedUsers);
            safeSetItem('pec_users_list', cleanedUsers);
            setCurrentUser((prev) => {
              if (!prev || isMockUser(prev)) return cleanedUsers[0];
              const updatedUser = cleanedUsers.find(
                (u) =>
                  u.id === prev.id ||
                  (typeof u.email === 'string' && typeof prev.email === 'string' && u.email.toLowerCase().trim() === prev.email.toLowerCase().trim())
              );
              if (updatedUser) {
                // Safeguard: Never lose local stamp if liveUsers doesn't have it yet
                return {
                  ...updatedUser,
                  digitalStampUrl: updatedUser.digitalStampUrl || prev.digitalStampUrl,
                  useDigitalStamp: updatedUser.useDigitalStamp !== undefined ? updatedUser.useDigitalStamp : prev.useDigitalStamp,
                };
              }
              return prev;
            });
          }
        }
      }
    );


    // 6. Real-time subscription to System Settings
    const unsubSettings = subscribeToSystemSettings(
      (liveSettings) => {
        if (liveSettings) {
          const safeSettings = {
            ...liveSettings,
            sectionsConfig: ensureSectionsConfig(liveSettings.sectionsConfig),
          };
          setSystemSettings(safeSettings);
          if (liveSettings.geminiApiKey && !userApiKey) {
            setUserApiKey(liveSettings.geminiApiKey);
          }
          if (liveSettings.defaultModel) {
            setSelectedModel(liveSettings.defaultModel);
          }
        }
      }
    );

    // 7. Real-time subscription to SUS / REMUME Medications
    const unsubMeds = subscribeToMedications(
      (liveMeds) => {
        if (liveMeds && liveMeds.length > 0) {
          setMedications(liveMeds);
        }
      }
    );

    // 8. Real-time subscription to SUS Exams Catalog
    const unsubExams = subscribeToExams(
      (liveExams) => {
        if (liveExams && liveExams.length > 0) {
          setExams(liveExams);
        }
      }
    );

    // 9. Real-time subscription to Appointments (Agendamentos Clínicos)
    const unsubAppointments = subscribeToAppointments(
      (liveAppointments) => {
        if (liveAppointments) {
          setAppointments(liveAppointments);
        }
      }
    );

    // 10. Real-time subscription to Reception Queue (Fila de Atendimento)
    const unsubQueue = subscribeToReceptionQueue(
      (liveQueue) => {
        if (liveQueue) {
          setQueueItems(liveQueue);
        }
      }
    );

    return () => {
      unsubPlans();
      unsubPatients();
      unsubConsultations();
      unsubKnowledge();
      unsubUsers();
      unsubSettings();
      unsubMeds();
      unsubExams();
      unsubAppointments();
      unsubQueue();
    };
  }, []);

  // Sync current user to localStorage
  useEffect(() => {
    safeSetItem('pec_current_user', currentUser);
    setSelectedProfession(currentUser.profession);
  }, [currentUser]);

  // Sync users list to localStorage
  useEffect(() => {
    safeSetItem('pec_users_list', users);
  }, [users]);

  // Sync system settings to localStorage
  useEffect(() => {
    safeSetItem('pec_system_settings', systemSettings);
  }, [systemSettings]);

  // Sync patients to localStorage
  useEffect(() => {
    safeSetItem('pec_patients', patients);
  }, [patients]);

  // Sync consultations to localStorage
  useEffect(() => {
    safeSetItem('pec_consultations', consultations);
  }, [consultations]);

  // Sync selected model to localStorage
  useEffect(() => {
    safeSetItem('pec_model', selectedModel);
  }, [selectedModel]);

  // Sync knowledge list to localStorage
  useEffect(() => {
    safeSetItem('pec_knowledge_base', knowledgeList);
  }, [knowledgeList]);

  // Sync history to localStorage
  useEffect(() => {
    safeSetItem('pec_history', history);
  }, [history]);

  // Sync medications to localStorage
  useEffect(() => {
    safeSetItem('pec_medications', medications);
  }, [medications]);

  // Sync exams to localStorage
  useEffect(() => {
    safeSetItem('pec_exams', exams);
  }, [exams]);

  // Medication CRUD handlers
  const handleSaveMedication = async (med: SUSMedication) => {
    try {
      setMedications((prev) => {
        const idx = prev.findIndex((m) => m.id === med.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = med;
          return clone;
        }
        return [med, ...prev];
      });
      await saveMedicationToFirestore(med);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      setMedications((prev) => prev.filter((m) => m.id !== id));
      await deleteMedicationFromFirestore(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetMedications = async () => {
    try {
      setMedications(OFFICIAL_SUS_MEDICATIONS);
      await resetMedicationsToDefaults();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Exam catalog CRUD handlers
  const handleSaveExam = async (exam: SUSExam) => {
    try {
      setExams((prev) => {
        const idx = prev.findIndex((e) => e.id === exam.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = exam;
          return clone;
        }
        return [exam, ...prev];
      });
      await saveExamToFirestore(exam);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExam = async (id: string) => {
    try {
      setExams((prev) => prev.filter((e) => e.id !== id));
      await deleteExamFromFirestore(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetExams = async () => {
    try {
      setExams(OFFICIAL_SUS_EXAMS);
      await resetExamsToDefaults();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Custom user api key
  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    if (key) {
      safeSetItem('pec_user_api_key', key);
    } else {
      safeSetItem('pec_user_api_key', '');
    }
  };

  // Toast helper (memoized and deduplicated against rapid event firing)
  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => {
      const isDuplicate = prev.some(
        (t) => t.type === type && t.message === message && t.title === title
      );
      if (isDuplicate) return prev;
      return [...prev, { id, type, message, title }];
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Save / Edit Patient Handler (Accessible by all users)
  const handleSavePatient = (savedPatient: Patient) => {
    // Uniqueness validation (CNS and CPF must be unique per patient)
    const rawCns = (savedPatient.cns || '').replace(/\D/g, '');
    const rawCpf = (savedPatient.cpf || '').replace(/\D/g, '');

    if (rawCns) {
      const duplicateCns = patients.find(
        (p) => p.id !== savedPatient.id && (p.cns || '').replace(/\D/g, '') === rawCns
      );
      if (duplicateCns) {
        showToast(
          'error',
          `O Cartão SUS ${savedPatient.cns} já pertence ao paciente "${duplicateCns.fullName}". O CNS deve ser único.`,
          'Cartão SUS Duplicado'
        );
        return false;
      }
    }

    if (rawCpf) {
      const duplicateCpf = patients.find(
        (p) => p.id !== savedPatient.id && (p.cpf || '').replace(/\D/g, '') === rawCpf
      );
      if (duplicateCpf) {
        showToast(
          'error',
          `O CPF ${savedPatient.cpf} já pertence ao paciente "${duplicateCpf.fullName}". O CPF deve ser único.`,
          'CPF Duplicado'
        );
        return false;
      }
    }

    setPatients((prev) => {
      const exists = prev.some((p) => p.id === savedPatient.id);
      if (exists) {
        return prev.map((p) => (p.id === savedPatient.id ? savedPatient : p));
      }
      return [savedPatient, ...prev];
    });
    setSelectedPatient(savedPatient);

    // Persist to Cloud Firestore
    savePatientToFirestore(savedPatient).catch((err) => {
      console.warn('Erro ao salvar paciente no Firestore:', err);
    });

    showToast('success', `Paciente ${savedPatient.fullName} salvo no banco de dados!`, 'Cadastro Atualizado');

    // Direciona para a Fila de Atendimento (Acolhimento / Triagem / Consulta)
    handleAddPatientToQueue(savedPatient);
    return true;
  };

  // Delete Patient Handler (RESTRICTED TO ADMIN)
  const handleDeletePatient = async (patientOrId: Patient | string) => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas Administradores do sistema podem excluir pacientes.', 'Acesso Negado');
      return;
    }

    const patientId = typeof patientOrId === 'string' ? patientOrId : patientOrId.id;
    const targetPatient = patients.find((p) => p.id === patientId);

    try {
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }

      await deletePatientFromFirestore(patientId);
      showToast('info', `Paciente ${targetPatient ? targetPatient.fullName : ''} excluído com sucesso.`, 'Paciente Removido');
    } catch (err: any) {
      console.error('Erro ao excluir paciente:', err);
      showToast('error', 'Falha ao excluir paciente no Firestore.', 'Erro');
    }
  };

  // Delete Consultation Handler (RESTRICTED TO ADMIN)
  const handleDeleteConsultation = async (consultationOrId: Consultation | string) => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas Administradores do sistema podem excluir atendimentos.', 'Acesso Negado');
      return;
    }

    const consultationId = typeof consultationOrId === 'string' ? consultationOrId : consultationOrId.id;
    const targetConsultation = consultations.find((c) => c.id === consultationId);

    try {
      setConsultations((prev) => prev.filter((c) => c.id !== consultationId));
      await deleteConsultationFromFirestore(consultationId);
      showToast('info', `Atendimento ${targetConsultation ? `de ${targetConsultation.authorName}` : ''} excluído.`, 'Atendimento Removido');
    } catch (err: any) {
      console.error('Erro ao excluir atendimento:', err);
      showToast('error', 'Falha ao excluir atendimento no Firestore.', 'Erro');
    }
  };

  // Edit Patient from Management Modal
  const handleEditPatientFromModal = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsPatientFormModalOpen(true);
  };

  // Edit Consultation Handler (OPEN TO ALL USERS)
  const handleEditConsultation = (consultation: Consultation) => {
    setConsultationToEdit(consultation);
    setIsEditConsultationModalOpen(true);
  };

  const handleSaveEditedConsultation = async (updated: Consultation) => {
    try {
      setConsultations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await saveConsultationToFirestore(updated);
      showToast('success', 'Prontuário atualizado no Cloud Firestore!', 'Atendimento Salvo');
    } catch (err: any) {
      console.error('Erro ao editar atendimento:', err);
      showToast('error', 'Falha ao salvar modificações no atendimento.', 'Erro');
    }
  };

  // Update Full User Info (Admin or self-update for profile, schedule and services, or password reset)
  const handleUpdateUser = async (updatedUser: UserModel) => {
    const isSelf =
      (currentUser && currentUser.id === updatedUser.id) ||
      (currentUser &&
        currentUser.email &&
        updatedUser.email &&
        currentUser.email.toLowerCase().trim() === updatedUser.email.toLowerCase().trim());

    // Preserve role if non-admin is editing own profile
    let safeUpdatedUser = updatedUser;
    if (!isUserAdmin(currentUser) && isSelf) {
      safeUpdatedUser = {
        ...updatedUser,
        role: currentUser.role,
      };
    }

    setUsers((prev) => {
      const idx = prev.findIndex(
        (u) =>
          u.id === safeUpdatedUser.id ||
          (u.email &&
            safeUpdatedUser.email &&
            u.email.toLowerCase().trim() === safeUpdatedUser.email.toLowerCase().trim())
      );
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], ...safeUpdatedUser };
        return clone;
      }
      return [safeUpdatedUser, ...prev];
    });

    if (isSelf) {
      setCurrentUser((prev) => ({ ...prev, ...safeUpdatedUser }));
      safeSetItem('pec_current_user', { ...currentUser, ...safeUpdatedUser });
    }

    try {
      const list = safeGetItem<UserModel[]>('pec_users_list', []);
      const idx = list.findIndex(
        (u) =>
          u.id === safeUpdatedUser.id ||
          (u.email &&
            safeUpdatedUser.email &&
            u.email.toLowerCase().trim() === safeUpdatedUser.email.toLowerCase().trim())
      );
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...safeUpdatedUser };
      } else {
        list.unshift(safeUpdatedUser);
      }
      safeSetItem('pec_users_list', list);
    } catch {}

    try {
      await saveUserToFirestore(safeUpdatedUser);
    } catch (err: any) {
      console.error('Erro ao salvar dados do usuário no Firestore:', err);
    }
  };

  // Add User Directly (Admin only)
  const handleAddUser = async (newUser: UserModel) => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas administradores podem cadastrar novos usuários diretamente.', 'Acesso Negado');
      return;
    }

    setUsers((prev) => [newUser, ...prev]);
    await saveUserToFirestore(newUser);
  };

  // RBAC User Role Management (Admin only)
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas administradores podem alterar papéis de usuários.', 'Acesso Negado');
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (typeof targetUser.email === 'string' && targetUser.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase() && newRole !== 'admin') {
      showToast('error', `O usuário master ${ADMIN_MASTER_EMAIL} deve permanecer como Administrador.`, 'Ação Bloqueada');
      return;
    }

    const updatedUser: UserModel = { ...targetUser, role: newRole };
    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (currentUser.id === userId) {
      setCurrentUser(updatedUser);
    }

    await saveUserToFirestore(updatedUser);
    showToast(
      'success',
      `Usuário ${targetUser.name} atualizado para ${newRole === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO COMUM'}.`,
      'Permissão Atualizada'
    );
  };

  // Sync / Refresh Users directly from Cloud Firestore (Admin tool)
  const handleSyncUsersFromFirestore = async () => {
    try {
      showToast('info', 'Sincronizando usuários com o Cloud Firestore...', 'Sincronizando');
      await purgeLegacyMockDataFromFirestore();
      const liveList = await fetchAllUsersFromFirestore();
      if (liveList && liveList.length > 0) {
        setUsers(liveList);
        safeSetItem('pec_users_list', liveList);
        showToast('success', `${liveList.length} usuário(s) carregado(s) do banco de dados!`, 'Sincronização Concluída');
      } else {
        const adminMaster = DEFAULT_USERS[0];
        await saveUserToFirestore(adminMaster);
        setUsers([adminMaster]);
        safeSetItem('pec_users_list', [adminMaster]);
        showToast('success', '1 Administrador Master sincronizado com o banco de dados.', 'Sincronização Concluída');
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar usuários:', err);
      showToast('error', 'Falha ao sincronizar usuários do banco de dados.', 'Erro');
    }
  };

  // Delete User Handler (Admin only)
  const handleDeleteUser = async (userId: string) => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas administradores podem excluir usuários.', 'Acesso Negado');
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (typeof targetUser.email === 'string' && targetUser.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()) {
      showToast('error', `O usuário master ${ADMIN_MASTER_EMAIL} não pode ser excluído.`, 'Ação Bloqueada');
      return;
    }

    if (targetUser.id === currentUser.id) {
      showToast('error', 'Você não pode excluir o usuário atualmente conectado.', 'Ação Bloqueada');
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    await deleteUserFromFirestore(userId);
    showToast('info', `Usuário ${targetUser.name} foi excluído do sistema.`, 'Usuário Excluído');
  };

  // Save System Settings (Admin / System-wide updates like workplaces/professions)
  const handleSaveSystemSettings = async (newSettings: SystemSettings) => {
    setSystemSettings(newSettings);
    if (newSettings.geminiApiKey) {
      setUserApiKey(newSettings.geminiApiKey);
      safeSetItem('pec_user_api_key', newSettings.geminiApiKey);
    }
    if (newSettings.defaultModel) {
      setSelectedModel(newSettings.defaultModel);
      safeSetItem('pec_model', newSettings.defaultModel);
    }

    try {
      await saveSystemSettingsToFirestore(newSettings);
    } catch (err) {
      console.warn('Erro ao sincronizar configurações com o Firestore:', err);
    }
  };

  // Reset Database (Admin only)
  const handleResetDatabase = async () => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas administradores podem redefinir o banco de dados.', 'Acesso Negado');
      return;
    }

    try {
      setPatients(DEFAULT_PATIENTS);
      setConsultations(DEFAULT_CONSULTATIONS);
      setKnowledgeList(DEFAULT_KNOWLEDGE_BASE);
      setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      setSelectedPatient(DEFAULT_PATIENTS[0] || null);

      await seedFirestoreIfEmpty(
        DEFAULT_PATIENTS,
        DEFAULT_CONSULTATIONS,
        DEFAULT_KNOWLEDGE_BASE,
        undefined,
        DEFAULT_SYSTEM_SETTINGS
      );

      showToast('success', 'Banco de dados redefinido para a base padrão!', 'Redefinição Concluída');
    } catch (err: any) {
      console.error('Erro ao redefinir banco:', err);
      showToast('error', 'Falha ao redefinir banco de dados.', 'Erro');
    }
  };

  // User Login handler
  const handleLoginUser = (user: UserModel, remember: boolean) => {
    setCurrentUser(user);
    setSelectedProfession(user.profession);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    if (user.profession === 'administrativo') {
      setActiveTab('appointments');
    }
    // Update local users array with latest profile data (stamp, preferences, etc.)
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...user } : u)));
    saveUserToFirestore(user).catch(() => {});
    fetch('/api/db/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    }).catch(() => {});
    if (remember) {
      safeSetItem('pec_is_authenticated', 'true');
      safeSetItem('pec_current_user', user);
    } else {
      sessionStorage.setItem('pec_is_authenticated', 'true');
      safeRemoveItem('pec_is_authenticated');
    }
  };

  // User Registration handler
  const handleRegisterUser = (newUser: UserModel, remember: boolean) => {
    setCurrentUser(newUser);
    setSelectedProfession(newUser.profession);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    if (newUser.profession === 'administrativo') {
      setActiveTab('appointments');
    }
    setUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== newUser.id);
      return [newUser, ...filtered];
    });
    saveUserToFirestore(newUser).catch((err) =>
      console.warn('Erro ao salvar usuário no Firestore:', err)
    );
    if (remember) {
      safeSetItem('pec_is_authenticated', 'true');
      safeSetItem('pec_current_user', newUser);
    } else {
      sessionStorage.setItem('pec_is_authenticated', 'true');
      safeRemoveItem('pec_is_authenticated');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pec_is_authenticated');
    sessionStorage.removeItem('pec_is_authenticated');
    setIsAuthModalOpen(true);
    showToast('info', 'Sessão encerrada com sucesso. Faça login para acessar o sistema.', 'Desconectado');
  };

  // Start new consultation for a specific patient
  const handleStartConsultationForPatient = (patient: Patient) => {
    verifyAccessOrOpenPaywall(() => {
      setSelectedPatient(patient);
      setActiveTab('generator');
      setCurrentRecord(null);
      setIsRecordSavedToTimeline(false);
      showToast(
        'info',
        `Paciente ${patient.fullName} selecionado para o atendimento.`,
        'Paciente em Atendimento'
      );
    });
  };

  // Add patient to reception queue (with queue presence verification)
  const handleAddPatientToQueue = (patient: Patient) => {
    verifyAccessOrOpenPaywall(() => {
      const queued = queueItems.find(
        (q) => q.patientId === patient.id && (q.status === 'waiting' || q.status === 'in_service')
      );
      if (queued) {
        showToast(
          'info',
          `${patient.fullName} já se encontra na Fila de Atendimento (${queued.status === 'in_service' ? 'Em Atendimento' : 'Aguardando'})!`,
          'Paciente na Fila'
        );
        setActiveTab('queue');
      } else {
        setPatientForQueue(patient);
        setIsAddToQueueModalOpen(true);
      }
    });
  };

  // Trigger Longitudinal AI Evolution Analysis: Loads last saved or triggers generation
  const handleGenerateEvolution = async (
    patient: Patient,
    patientConsultations: Consultation[]
  ) => {
    if (!verifyAccessOrOpenPaywall()) return;

    if (!patientConsultations || patientConsultations.length === 0) {
      showToast('error', 'Nenhum atendimento registrado para este paciente para analisar.');
      return;
    }

    setIsEvolutionModalOpen(true);

    // 1. Try loading last saved evolution from database first
    setIsLoadingEvolution(true);
    try {
      const stored = await getStoredClinicalEvolution(patient.id);
      if (stored) {
        setEvolutionSummary(stored);
        setIsLoadingEvolution(false);
        return;
      }
    } catch {
      // proceed to generate if not found or on error
    }

    // 2. If no prior evolution is saved, generate immediately
    try {
      const evolution = await generateClinicalEvolution({
        patient,
        consultations: patientConsultations,
        userApiKey,
        forceRegenerate: false,
      });
      setEvolutionSummary(evolution);
      showToast(
        'success',
        'Auditoria clínica longitudinal estruturada com sucesso!',
        'Análise Concluída'
      );
    } catch (err: any) {
      console.error('Erro na evolução clínica:', err);
      showToast(
        'error',
        err.message || 'Falha ao processar relatório de evolução clínica com a IA.',
        'Erro na Auditoria'
      );
    } finally {
      setIsLoadingEvolution(false);
    }
  };

  // Force on-demand regeneration of Longitudinal Clinical Evolution (Evolução IA Now)
  const handleRegenerateEvolutionNow = async (
    patient: Patient,
    patientConsultations: Consultation[],
    forceFullReanalysis: boolean = false
  ) => {
    if (!verifyAccessOrOpenPaywall()) return;

    if (!patientConsultations || patientConsultations.length === 0) {
      showToast('error', 'Nenhum atendimento registrado para este paciente para analisar.');
      return;
    }

    setIsLoadingEvolution(true);
    setIsEvolutionModalOpen(true);

    try {
      const evolution = await generateClinicalEvolution({
        patient,
        consultations: patientConsultations,
        userApiKey,
        forceRegenerate: true,
        forceFullReanalysis,
      });
      setEvolutionSummary(evolution);
      if (evolution.alreadyUpToDate) {
        showToast(
          'info',
          'O prontuário deste paciente já está 100% atualizado. Nenhum atendimento novo pendente de IA.',
          'Prontuário em Dia'
        );
      } else if (evolution.isIncrementalUpdate) {
        showToast(
          'success',
          `Evolução longitudinal atualizada focando exclusivamente em ${evolution.pendingConsultationsAnalyzed || 1} atendimento(s) pendente(s). Tokens de IA economizados!`,
          'Atualização Incremental Concluída'
        );
      } else {
        showToast(
          'success',
          'Análise longitudinal completa processada com sucesso!',
          'Evolução IA Atualizada'
        );
      }
    } catch (err: any) {
      console.error('Erro na evolução clínica:', err);
      showToast(
        'error',
        err.message || 'Falha ao processar relatório de evolução clínica com a IA.',
        'Erro na Auditoria'
      );
    } finally {
      setIsLoadingEvolution(false);
    }
  };

  // Main Generation Action
  const handleGenerate = async () => {
    // Check SaaS access permission
    if (!hasValidAccess()) {
      setIsPaywallModalOpen(true);
      showToast(
        'error',
        'Seu teste gratuito de 1 prontuário foi concluído. Escolha um plano para continuar gerando.',
        'Acesso Restrito'
      );
      return;
    }

    if (!rawNotes.trim() && !audioAttachment && attachments.length === 0) {
      showToast(
        'error',
        'Por favor, digite um relato, grave um áudio ou anexe uma foto/receita médica.',
        'Dados Insuficientes'
      );
      return;
    }

    setIsGenerating(true);
    setIsRecordSavedToTimeline(false);
    setGenerationStatus({
      model: selectedModel,
      modelName: getFriendlyModelName(selectedModel),
      message: `Processando com ${getFriendlyModelName(selectedModel)}...`,
      isTransitioning: false,
    });

    try {
      // Collect active knowledge items (REMUME, Municipal Protocols, RAPS)
      const activeKnowledge = knowledgeList
        .filter((k) => k.isActive)
        .map((k) => `[${k.title.toUpperCase()}]\n${k.content}`)
        .join('\n\n');

      // Include patient context if selected
      let patientContext = '';
      if (selectedPatient) {
        const age = calculateChronologicalAge(selectedPatient.birthDate);
        patientContext = `DADOS DO PACIENTE IDENTIFICADO:
Nome: ${selectedPatient.fullName}
Idade Cronológica Exata: ${age.formatted}
CNS: ${selectedPatient.cns || '--'}
CPF: ${selectedPatient.cpf || '--'}
Responsável Legal: ${selectedPatient.legalGuardianName ? `${selectedPatient.legalGuardianName} (${selectedPatient.guardianKinship || 'Responsável'})` : 'Próprio paciente'}
${selectedPatient.address ? `Endereço: ${selectedPatient.address}` : ''}`;
      }

      // Include patient history if it's a Retorno/Reavaliação consultation
      let patientHistoryData: any = undefined;
      if (!isFirstConsultation && selectedPatient) {
        const patientConsultations = consultations
          .filter((c) => c.patientId === selectedPatient.id)
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        if (patientConsultations.length > 0) {
          patientHistoryData = patientConsultations.map((c) => ({
            date: new Date(c.timestamp).toLocaleDateString('pt-BR'),
            author: c.authorName,
            profession: PROFESSIONS[c.authorProfession]?.name || c.authorProfession,
            avaliacao: c.avaliacao,
            plano: c.plano,
            conduta: c.conduta,
          }));
        }
      }

      const mergedCustomContext = [patientContext, activeKnowledge].filter(Boolean).join('\n\n');

      const targetProfKey = selectedProfession || currentUser?.profession || 'medico';
      const profConfig =
        (selectedProfession && PROFESSIONS[selectedProfession]) ||
        (currentUser?.profession && PROFESSIONS[currentUser.profession]) ||
        PROFESSIONS.medico;
      const targetProfName = profConfig?.name || targetProfKey;

      const generated = await generatePECRecord({
        professionId: targetProfKey,
        professionName: targetProfName,
        modelName: selectedModel || 'gemini-3.7-flash',
        rawNotes,
        isFirstConsultation,
        patientHistory: patientHistoryData,
        audioAttachment,
        images: attachments,
        customContext: mergedCustomContext,
        userApiKey: systemSettings.geminiApiKey || userApiKey,
        openaiApiKey: systemSettings.openaiApiKey,
        openrouterApiKey: systemSettings.openrouterApiKey,
        sectionConfig: systemSettings.sectionsConfig?.soapPec,
        onStatusUpdate: (status) => {
          setGenerationStatus(status);
        },
      });

      // Attach patient info if selected
      if (selectedPatient) {
        generated.patientId = selectedPatient.id;
        generated.patientName = selectedPatient.fullName;
      }

      setCurrentRecord(generated);

      // Consume 1-time trial if user is on free tier and not admin
      if (currentUser?.subscription_status !== 'pago' && !currentUser?.free_used && !isUserAdmin(currentUser)) {
        if (currentUser?.id) {
          updateUserFreeTrialUsed(currentUser.id).catch((err) =>
            console.warn('Erro ao atualizar free_used no Firestore:', err)
          );
        }
        setCurrentUser((prev) => (prev ? { ...prev, free_used: true } : prev));
        showToast(
          'info',
          'Você utilizou seu 1º prontuário grátis de teste! Para os próximos atendimentos, escolha um plano.',
          'Teste Gratuito Concluído'
        );
      }

      // Prepend to history (keep max 50 items)
      setHistory((prev) => [generated, ...prev.slice(0, 49)]);

      showToast(
        'success',
        `Prontuário de ${targetProfName} gerado e validado com sucesso!`,
        'PEC Pronto para Cópia'
      );

      // Smooth scroll to output cards
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err: any) {
      console.error('Erro na geração do prontuário:', err);
      showToast(
        'error',
        err.message || 'Falha ao processar prontuário com o Gemini. Tente novamente.',
        'Erro na Geração'
      );
    } finally {
      setIsGenerating(false);
      setGenerationStatus(null);
    }
  };

  // Save generated record directly to the patient's multi-professional timeline
  const handleSaveToPatientTimeline = async (
    record: GeneratedPECRecord,
    updatedTexts?: { avaliacao?: string; plano?: string; conduta?: string }
  ) => {
    if (!selectedPatient) {
      showToast(
        'info',
        'Selecione ou cadastre um paciente para vincular este atendimento à linha do tempo.',
        'Vincular Paciente'
      );
      setIsPatientFormModalOpen(true);
      return;
    }

    const isDoc = isDoctorConsultation(
      record.professionId || selectedProfession,
      currentUser.professionalRegister
    );
    let finalAvaliacao = updatedTexts?.avaliacao || record.avaliacao;
    let finalPlano = updatedTexts?.plano || record.plano;
    let finalConduta = updatedTexts?.conduta || record.conduta;

    if (isDoc) {
      const cleaned = cleanDoctorConsultation(finalAvaliacao, finalPlano, finalConduta);
      finalAvaliacao = cleaned.avaliacao;
      finalPlano = cleaned.plano;
      finalConduta = '';
    }

    const consultationId = savedConsultationId || `cons-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newConsultation: Consultation = {
      id: consultationId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorProfession: record.professionId || selectedProfession,
      authorRegister: currentUser.professionalRegister,
      authorDigitalStampUrl: currentUser.digitalStampUrl,
      authorUseDigitalStamp: currentUser.useDigitalStamp,
      workplace: currentUser.workplace,
      timestamp: record.timestamp || Date.now(),
      isFirstConsultation: record.isFirstConsultation,
      clinicalAudit: record.clinicalAudit,
      avaliacao: finalAvaliacao,
      plano: finalPlano,
      conduta: finalConduta,
      rawNotes: record.isTriage ? 'Triagem de Sinais Vitais e Antropometria' : rawNotes,
      modelUsed: record.modelUsed,
      qualitativeChecks: record.qualitativeChecks,
      prescription: record.prescription,
      referral: record.referral,
      pts: record.pts,
      examRequest: record.examRequest,
      medicalReport: record.medicalReport,
      medicalCertificate: record.medicalCertificate,
      attendanceCertificate: record.attendanceCertificate,
      examMedia: record.examMedia,
      isTriage: record.isTriage,
      triageData: record.triageData,
    };

    setSavedConsultationId(consultationId);
    setConsultations((prev) => {
      const filtered = prev.filter((c) => c.id !== consultationId);
      const updated = [newConsultation, ...filtered];
      safeSetItem('pec_consultations', updated);
      return updated;
    });
    setIsRecordSavedToTimeline(true);

    // Persist to Cloud Firestore and Server Store
    try {
      await saveConsultationToFirestore(newConsultation);
    } catch (err) {
      console.warn('Erro ao salvar atendimento no Firestore:', err);
    }

    showToast(
      'success',
      `Atendimento salvo e registrado na linha do tempo de ${selectedPatient.fullName}!`,
      'Linha do Tempo Atualizada'
    );
  };

  // Handle completion of Triage by Nursing Technician / Assistant
  const handleFinishTriage = (triageRecord: GeneratedPECRecord) => {
    setCurrentRecord(triageRecord);
    setIsRecordSavedToTimeline(false);

    // Auto-save to timeline if patient is selected
    if (selectedPatient) {
      handleSaveToPatientTimeline(triageRecord);
    }

    // Prepend to local history
    setHistory((prev) => [triageRecord, ...prev.slice(0, 49)]);

    showToast(
      'success',
      'Atendimento de Triagem finalizado com sucesso e pronto para cópia!',
      'Triagem Concluída'
    );

    // Smooth scroll to output card
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  // Save or update prescription linked to consultation or timeline
  const handleSavePrescription = async (prescription: PrescriptionData, targetConsultationId?: string) => {
    const activeConsId = targetConsultationId || savedConsultationId || prescriptionTargetConsultation?.id;
    
    // Case 1: Updating an existing consultation in the timeline or saved in session
    if (activeConsId) {
      const target = consultations.find((c) => c.id === activeConsId);
      if (target) {
        const safeRx: PrescriptionData = {
          ...prescription,
          consultationId: activeConsId,
        };
        const updatedConsultation: Consultation = {
          ...target,
          prescription: safeRx,
        };
        setConsultations((prev) => {
          const updated = prev.map((c) => (c.id === activeConsId ? updatedConsultation : c));
          safeSetItem('pec_consultations', updated);
          return updated;
        });
        if (currentRecord) {
          setCurrentRecord((prev) => (prev ? { ...prev, prescription: safeRx } : prev));
        }
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Prescrição atualizada e anexada ao atendimento com sucesso!', 'Receita Salva');
        handleOpenPrescriptionPreview(safeRx);
        return;
      }
    }

    const patientForRx = prescriptionTargetPatient || selectedPatient;

    // Case 2: Active drafted consultation on screen with selected patient
    if (currentRecord && patientForRx) {
      const consId = savedConsultationId || `cons-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const safeRx: PrescriptionData = {
        ...prescription,
        patientId: patientForRx.id,
        patientName: patientForRx.fullName,
        consultationId: consId,
      };

      const updatedRecord = { ...currentRecord, prescription: safeRx };
      setCurrentRecord(updatedRecord);
      setSavedConsultationId(consId);

      const isDoc = isDoctorConsultation(
        updatedRecord.professionId || selectedProfession,
        currentUser.professionalRegister
      );
      let finalAvaliacao = updatedRecord.avaliacao;
      let finalPlano = updatedRecord.plano;
      let finalConduta = updatedRecord.conduta;
      if (isDoc) {
        const cleaned = cleanDoctorConsultation(finalAvaliacao, finalPlano, finalConduta);
        finalAvaliacao = cleaned.avaliacao;
        finalPlano = cleaned.plano;
        finalConduta = '';
      }

      const newConsultation: Consultation = {
        id: consId,
        patientId: patientForRx.id,
        patientName: patientForRx.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: updatedRecord.professionId || selectedProfession,
        authorRegister: currentUser.professionalRegister,
        workplace: safeRx.header?.unitName || currentUser.workplace,
        timestamp: updatedRecord.timestamp || Date.now(),
        isFirstConsultation: updatedRecord.isFirstConsultation,
        clinicalAudit: updatedRecord.clinicalAudit,
        avaliacao: finalAvaliacao,
        plano: finalPlano,
        conduta: finalConduta,
        rawNotes: updatedRecord.isTriage ? 'Triagem de Sinais Vitais e Antropometria' : rawNotes,
        modelUsed: updatedRecord.modelUsed || selectedModel,
        qualitativeChecks: updatedRecord.qualitativeChecks || {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
        prescription: safeRx,
        referral: updatedRecord.referral,
        pts: updatedRecord.pts,
        examRequest: updatedRecord.examRequest,
        medicalReport: updatedRecord.medicalReport,
        medicalCertificate: updatedRecord.medicalCertificate,
        attendanceCertificate: updatedRecord.attendanceCertificate,
        examMedia: updatedRecord.examMedia,
        isTriage: updatedRecord.isTriage,
        triageData: updatedRecord.triageData,
      };

      setConsultations((prev) => {
        const filtered = prev.filter((c) => c.id !== consId);
        const updated = [newConsultation, ...filtered];
        safeSetItem('pec_consultations', updated);
        return updated;
      });
      setIsRecordSavedToTimeline(true);

      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Prescrição salva e vinculada ao atendimento na linha do tempo!', 'Receita Salva');
      handleOpenPrescriptionPreview(safeRx);
      return;
    }

    // Case 3: Standalone prescription issued for patient
    if (patientForRx) {
      const generatedConsId = `cons-rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const safeRx: PrescriptionData = {
        ...prescription,
        consultationId: generatedConsId,
      };

      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForRx.id,
        patientName: patientForRx.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        workplace: safeRx.header?.unitName || currentUser.workplace,
        timestamp: safeRx.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `ATENDIMENTO PARA ${safeRx.type.toUpperCase()}:\nPaciente compareceu à unidade para emissão de receituário institucional em 2 vias A4.\nRevisadas dosagens, histórico terapêutico e estabilidade clínica do usuário.`,
        plano: `PRESCRIÇÃO / TRANSCRIÇÃO DE MEDICAMENTOS EM 2 VIAS IDÊNTICAS:\nVia de Administração: ${safeRx.defaultRoute || 'USO ORAL'}\n` +
          safeRx.items.map((it, i) => `${i + 1}- ${it.medicationName} | ${it.posology} ${it.duration ? `| ${it.duration}` : ''} ${it.scheduleInstructions ? `| ${it.scheduleInstructions}` : ''}`).join('\n') +
          `\n\nOrientações prestadas quanto ao regime posológico. Entregue receituário institucional impresso em 2 vias A4 com carimbo e assinatura.`,
        conduta: `1. Entregue receituário em 2 vias idênticas em folha A4 paisagem (1ª via farmácia / 2ª via paciente/arquivo).\n2. Usuário/responsável orientado quanto à administração e armazenamento correto.\n3. Agendado acompanhamento continuado.`,
        rawNotes: `Prescrição de medicamentos emitida via formulário institucional em 2 vias A4.`,
        modelUsed: selectedModel,
        prescription: safeRx,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => {
        const updated = [newConsultation, ...prev];
        safeSetItem('pec_consultations', updated);
        return updated;
      });
      await saveConsultationToFirestore(newConsultation);
      showToast('success', `${safeRx.type} registrada com sucesso na linha do tempo!`, 'Receita Emitida');
      handleOpenPrescriptionPreview(safeRx);
    }
  };

  // Save or update referral linked to consultation or timeline
  const handleSaveReferral = async (referral: ReferralData, targetConsultationId?: string) => {
    if (targetConsultationId) {
      const target = consultations.find((c) => c.id === targetConsultationId);
      if (target) {
        const updatedConsultation: Consultation = {
          ...target,
          referral,
        };
        setConsultations((prev) => prev.map((c) => (c.id === targetConsultationId ? updatedConsultation : c)));
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Guia de Encaminhamento atualizada e anexada ao atendimento!', 'Encaminhamento Salvo');
        return;
      }
    }

    if (currentRecord && !isRecordSavedToTimeline) {
      setCurrentRecord((prev) => (prev ? { ...prev, referral } : prev));
      showToast('success', 'Guia de Encaminhamento vinculada ao prontuário atual!', 'Encaminhamento Vinculado');
      return;
    }

    const patientForRef = referralTargetPatient || selectedPatient;
    if (patientForRef) {
      const generatedConsId = `cons-ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForRef.id,
        patientName: patientForRef.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        workplace: referral.workplace || currentUser.workplace,
        timestamp: referral.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `EMISSÃO DE GUIA DE ENCAMINHAMENTO / REFERÊNCIA SUS:\nDestino: ${referral.destination} (Prioridade: ${referral.priority})\nJustificativa: ${referral.clinicalIndication}`,
        plano: `CONDUTAS E PROCEDIMENTOS SOLICITADOS:\n${referral.proceduresRequested || 'Avaliação e seguimento especializado.'}\nHipóteses Diagnósticas: ${referral.hypotheses}`,
        conduta: `1. Emitida Guia de Encaminhamento em folha A4 Retrato para regulação/agendamento.\n2. Usuário/familiar orientado quanto aos fluxos do SISREG/Central de Marcação.\n3. Paciente mantido sob acompanhamento longitudinal na UBS.`,
        rawNotes: `Encaminhamento especializado emitido para ${referral.destination}.`,
        modelUsed: selectedModel,
        referral,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => [newConsultation, ...prev]);
      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Guia de Encaminhamento registrada na linha do tempo!', 'Encaminhamento Emitido');
    }
  };

  const handleDeleteReferral = async (consultation: Consultation) => {
    const updatedConsultation: Consultation = {
      ...consultation,
      referral: undefined,
    };
    setConsultations((prev) => prev.map((c) => (c.id === consultation.id ? updatedConsultation : c)));
    await saveConsultationToFirestore(updatedConsultation);
    showToast('info', 'Guia de Encaminhamento removida do atendimento.', 'Encaminhamento Excluído');
  };

  // Save or update PTS linked to consultation or timeline
  const handleSavePts = async (pts: PtsData, targetConsultationId?: string) => {
    if (targetConsultationId) {
      const target = consultations.find((c) => c.id === targetConsultationId);
      if (target) {
        const updatedConsultation: Consultation = {
          ...target,
          pts,
        };
        setConsultations((prev) => prev.map((c) => (c.id === targetConsultationId ? updatedConsultation : c)));
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Projeto Terapêutico Singular (PTS) atualizado com sucesso!', 'PTS Salvo');
        return;
      }
    }

    if (currentRecord && !isRecordSavedToTimeline) {
      setCurrentRecord((prev) => (prev ? { ...prev, pts } : prev));
      showToast('success', 'PTS vinculado ao prontuário gerado!', 'PTS Vinculado');
      return;
    }

    const patientForPts = ptsTargetPatient || selectedPatient;
    if (patientForPts) {
      const generatedConsId = `cons-pts-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForPts.id,
        patientName: patientForPts.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        workplace: pts.workplace || currentUser.workplace,
        timestamp: pts.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `ELABORAÇÃO DE PROJETO TERAPÊUTICO SINGULAR (PTS):\nProfissional de Referência: ${pts.referenceProfessional}\nEquipe: ${pts.teamMembers || 'Multiprofissional'}\nDiagnóstico Situacional / Vulnerabilidades:\n${pts.diagnosisVulnerability}`,
        plano: `METAS PACTUADAS (PTS):\nCurto Prazo: ${pts.shortTermGoals}\nMédio/Longo Prazo: ${pts.mediumLongTermGoals || 'Fortalecimento da autonomia e reinserção social.'}\n\nPACTUAÇÃO E RESPONSABILIDADES:\n${pts.agreedActions}`,
        conduta: `1. Elaborada e pactuada Ficha de PTS em folha A4 com usuário e família.\n2. Articulação com equipe eMulti e rede intersetorial.\n3. Reavaliação prevista para: ${pts.reassessmentDate}.`,
        rawNotes: `Reunião e pactuação de Projeto Terapêutico Singular multiprofissional.`,
        modelUsed: selectedModel,
        pts,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => [newConsultation, ...prev]);
      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Projeto Terapêutico Singular registrado na linha do tempo!', 'PTS Registrado');
    }
  };

  const handleDeletePts = async (consultation: Consultation) => {
    const updatedConsultation: Consultation = {
      ...consultation,
      pts: undefined,
    };
    setConsultations((prev) => prev.map((c) => (c.id === consultation.id ? updatedConsultation : c)));
    await saveConsultationToFirestore(updatedConsultation);
    showToast('info', 'PTS removido do atendimento.', 'PTS Excluído');
  };

  // Open exam request printable preview / print window
  const handleOpenExamRequestPreview = (examReq: ExamRequestData) => {
    openExamRequestInNewTab(examReq);
  };

  // Save or update exam request linked to consultation or timeline
  const handleSaveExamRequest = async (examReq: ExamRequestData, targetConsultationId?: string) => {
    if (targetConsultationId) {
      const target = consultations.find((c) => c.id === targetConsultationId);
      if (target) {
        const safeReq: ExamRequestData = {
          ...examReq,
          consultationId: targetConsultationId,
        };
        const updatedConsultation: Consultation = {
          ...target,
          examRequest: safeReq,
        };
        setConsultations((prev) => prev.map((c) => (c.id === targetConsultationId ? updatedConsultation : c)));
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Solicitação de Exames atualizada no atendimento com sucesso!', 'Exames Salvos');
        handleOpenExamRequestPreview(safeReq);
        return;
      }
    }

    if (currentRecord && !isRecordSavedToTimeline) {
      const safeReq: ExamRequestData = {
        ...examReq,
        consultationId: null,
      };
      setCurrentRecord((prev) => (prev ? { ...prev, examRequest: safeReq } : prev));
      showToast('success', 'Solicitação de Exames vinculada ao prontuário gerado! Salve o atendimento na Linha do Tempo.', 'Exames Vinculados');
      handleOpenExamRequestPreview(safeReq);
      return;
    }

    const patientForExam = examRequestTargetPatient || selectedPatient;
    if (patientForExam) {
      const generatedConsId = `cons-exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const safeReq: ExamRequestData = {
        ...examReq,
        consultationId: generatedConsId,
      };

      const sortedItems = [...safeReq.items].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForExam.id,
        patientName: patientForExam.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        workplace: safeReq.header?.unitName || currentUser.workplace,
        timestamp: safeReq.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `SOLICITAÇÃO DE EXAMES COMPLEMENTARES / DIAGNÓSTICOS:\nIndicação Clínica / Hipótese Diagnóstica: ${safeReq.clinicalIndicationGeneral || 'Investigação e acompanhamento de rotina no SUS.'}`,
        plano: `RELAÇÃO DE EXAMES SOLICITADOS (ORDEM ALFABÉTICA - 2 VIAS A4):\n` +
          sortedItems.map((it, i) => `${i + 1}. [${(it.category || 'EXAME').toUpperCase()}] ${it.name}${it.clinicalIndication ? ` - Indicação: ${it.clinicalIndication}` : ''}`).join('\n'),
        conduta: `1. Emitida Solicitação de Exames em 2 vias idênticas em folha A4 paisagem (1ª via laboratório/serviço / 2ª via usuário/prontuário).\n2. Paciente orientado sobre preparo, jejum e agendamento na rede regulada.\n3. Retorno agendado com os laudos e resultados.`,
        rawNotes: `Solicitação de exames emitida via formulário institucional em 2 vias A4.`,
        modelUsed: selectedModel,
        examRequest: safeReq,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => [newConsultation, ...prev]);
      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Solicitação de Exames registrada com sucesso na linha do tempo!', 'Exames Solicitados');
      handleOpenExamRequestPreview(safeReq);
    }
  };

  const handleDeleteExamRequest = async (consultation: Consultation) => {
    const updatedConsultation: Consultation = {
      ...consultation,
      examRequest: undefined,
    };
    setConsultations((prev) => prev.map((c) => (c.id === consultation.id ? updatedConsultation : c)));
    await saveConsultationToFirestore(updatedConsultation);
    showToast('info', 'Solicitação de Exames removida do atendimento.', 'Exames Excluídos');
  };

  // Save or update medical report linked to consultation or timeline
  const handleSaveMedicalReport = async (report: MedicalReportData, targetConsultationId?: string) => {
    if (currentUser.profession !== 'medico') {
      showToast('error', 'Apenas profissionais da classe médica têm autorização para salvar ou emitir laudos médicos.', 'Acesso Restrito');
      return;
    }

    if (targetConsultationId) {
      const target = consultations.find((c) => c.id === targetConsultationId);
      if (target) {
        const updatedConsultation: Consultation = {
          ...target,
          medicalReport: report,
        };
        setConsultations((prev) => prev.map((c) => (c.id === targetConsultationId ? updatedConsultation : c)));
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Laudo Médico Oficial atualizado e anexado ao atendimento!', 'Laudo Médico Salvo');
        return;
      }
    }

    if (currentRecord && !isRecordSavedToTimeline) {
      setCurrentRecord((prev) => (prev ? { ...prev, medicalReport: report } : prev));
      showToast('success', 'Laudo Médico vinculado ao prontuário gerado! Salve o atendimento na Linha do Tempo.', 'Laudo Vinculado');
      return;
    }

    const patientForReport = medicalReportTargetPatient || selectedPatient;
    if (patientForReport) {
      const generatedConsId = `cons-report-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForReport.id,
        patientName: patientForReport.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        workplace: report.workplace || currentUser.workplace,
        timestamp: report.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `EMISSÃO DE LAUDO MÉDICO OFICIAL (A4):\nFinalidade: ${report.purpose || 'Acompanhamento Clínico'}\nCID-10: ${report.cid10 || 'Informado em laudo'}\n\nParecer e Descrição Clínica:\n${report.description}`,
        plano: `CONDUTA PERICIAL / ASSISTENCIAL:\n1. Fornecido Laudo Médico pericial em folha timbrada oficial ao paciente/responsável legal.\n2. Esclarecidas dúvidas sobre o diagnóstico e recomendações.\n3. Seguimento clínico regular na UBS.`,
        conduta: `1. Entregue via original impressa e assinada de Laudo Médico em conformidade com as normas éticas do CFM.\n2. Manutenção do plano terapêutico e acompanhamento ambulatorial.`,
        rawNotes: `Emissão de Laudo Médico: ${report.purpose || 'Acompanhamento Clínico'} - CID-10: ${report.cid10}`,
        modelUsed: selectedModel,
        medicalReport: report,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => [newConsultation, ...prev]);
      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Laudo Médico Oficial registrado na linha do tempo!', 'Laudo Emitido');
    }
  };

  const handleDeleteMedicalReport = async (consultation: Consultation) => {
    if (currentUser.profession !== 'medico') {
      showToast('error', 'Apenas médicos têm autorização para excluir laudos médicos emitidos.', 'Acesso Restrito');
      return;
    }

    const updatedConsultation: Consultation = {
      ...consultation,
      medicalReport: undefined,
    };
    setConsultations((prev) => prev.map((c) => (c.id === consultation.id ? updatedConsultation : c)));
    await saveConsultationToFirestore(updatedConsultation);
    showToast('info', 'Laudo Médico removido do atendimento.', 'Laudo Excluído');
  };

  // Save or update medical certificate linked to consultation or timeline
  const handleSaveMedicalCertificate = async (certificate: MedicalCertificateData, targetConsultationId?: string) => {
    if (!canIssueMedicalCertificate(currentUser.profession) && !isUserAdmin(currentUser)) {
      showToast('error', 'Apenas profissionais médicos têm autorização legal para emitir Atestado Médico com afastamento por dias.', 'Acesso Restrito');
      return;
    }

    if (targetConsultationId) {
      const target = consultations.find((c) => c.id === targetConsultationId);
      if (target) {
        const updatedConsultation: Consultation = {
          ...target,
          medicalCertificate: certificate,
        };
        setConsultations((prev) => prev.map((c) => (c.id === targetConsultationId ? updatedConsultation : c)));
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Atestado Médico atualizado e anexado ao atendimento!', 'Atestado Salvo');
        return;
      }
    }

    if (currentRecord && !isRecordSavedToTimeline) {
      setCurrentRecord((prev) => (prev ? { ...prev, medicalCertificate: certificate } : prev));
      showToast('success', 'Atestado Médico vinculado ao prontuário gerado! Salve o atendimento na Linha do Tempo.', 'Atestado Vinculado');
      return;
    }

    const patientForCert = medicalCertificateTargetPatient || selectedPatient;
    if (patientForCert) {
      const generatedConsId = `cons-cert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForCert.id,
        patientName: patientForCert.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        workplace: certificate.workplace || currentUser.workplace,
        timestamp: certificate.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `EMISSÃO DE ATESTADO MÉDICO (A4):\nFinalidade: ${certificate.purpose || 'Justificativa de Repouso e Afastamento Laboral/Escolar'}\nPeríodo de Afastamento: ${certificate.daysOff} (${certificate.daysOffExtenso}) a partir de ${certificate.startDateFormatted || certificate.startDate}.${certificate.includeCid && certificate.cid10 ? `\nDiagnóstico Codificado (CID-10): ${certificate.cid10}` : ''}`,
        plano: `CONDUTA ASSISTENCIAL E AFASTAMENTO:\n1. Concedido repouso e afastamento de atividades por ${certificate.daysOff} (${certificate.daysOffExtenso}).\n2. Prescritas orientações terapêuticas e repouso domiciliar.\n3. Entregue Atestado Médico original impresso em folha A4 com carimbo e assinatura.`,
        conduta: `1. Entregue via original impressa de Atestado Médico em conformidade com as normas do CFM.\n2. Usuário/familiar orientado sobre retorno aos sintomas de alerta.`,
        rawNotes: `Atestado Médico de ${certificate.daysOff} dias emitido.`,
        modelUsed: selectedModel,
        medicalCertificate: certificate,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => [newConsultation, ...prev]);
      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Atestado Médico registrado na linha do tempo com sucesso!', 'Atestado Emitido');
    }
  };

  const handleDeleteMedicalCertificate = async (consultation: Consultation) => {
    if (!canIssueMedicalCertificate(currentUser.profession) && !isUserAdmin(currentUser)) {
      showToast('error', 'Apenas o médico emissor ou administrador tem permissão para excluir este atestado.', 'Acesso Restrito');
      return;
    }

    const updatedConsultation: Consultation = {
      ...consultation,
      medicalCertificate: undefined,
    };
    setConsultations((prev) => prev.map((c) => (c.id === consultation.id ? updatedConsultation : c)));
    await saveConsultationToFirestore(updatedConsultation);
    showToast('info', 'Atestado Médico removido do atendimento.', 'Atestado Excluído');
  };

  // Save or update attendance certificate linked to consultation or timeline
  const handleSaveAttendanceCertificate = async (certificate: AttendanceCertificateData, targetConsultationId?: string) => {
    if (!canIssueAttendanceCertificate(currentUser.profession, currentUser.cbo) && !isUserAdmin(currentUser)) {
      showToast('error', 'Apenas profissionais de nível superior têm autorização para emitir Atestado de Comparecimento.', 'Acesso Restrito');
      return;
    }

    if (targetConsultationId) {
      const target = consultations.find((c) => c.id === targetConsultationId);
      if (target) {
        const updatedConsultation: Consultation = {
          ...target,
          attendanceCertificate: certificate,
        };
        setConsultations((prev) => prev.map((c) => (c.id === targetConsultationId ? updatedConsultation : c)));
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Atestado de Comparecimento atualizado e anexado ao atendimento!', 'Comparecimento Salvo');
        return;
      }
    }

    if (currentRecord && !isRecordSavedToTimeline) {
      setCurrentRecord((prev) => (prev ? { ...prev, attendanceCertificate: certificate } : prev));
      showToast('success', 'Atestado de Comparecimento vinculado ao prontuário gerado! Salve o atendimento na Linha do Tempo.', 'Comparecimento Vinculado');
      return;
    }

    const patientForCert = attendanceCertificateTargetPatient || selectedPatient;
    if (patientForCert) {
      const generatedConsId = `cons-att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForCert.id,
        patientName: patientForCert.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        authorDigitalStampUrl: currentUser.digitalStampUrl,
        authorUseDigitalStamp: currentUser.useDigitalStamp,
        workplace: certificate.workplace || currentUser.workplace,
        timestamp: certificate.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `EMISSÃO DE ATESTADO DE COMPARECIMENTO (A4):\nData de Atendimento: ${certificate.attendanceDateFormatted}\nPeríodo/Turno: ${certificate.periodLabel}\nTipo de Atendimento: ${certificate.attendanceType}${certificate.isCompanion ? `\nDeclaração para Acompanhante: ${certificate.companionName} (${certificate.companionKinship})` : ''}`,
        plano: `REGISTRO DE PRESENÇA:\n1. Fornecido Atestado de Comparecimento para justificativa de ausência no dia ${certificate.attendanceDateFormatted}.\n2. Realizadas intervenções e orientações profissionais pertinentes.`,
        conduta: `1. Entregue Atestado de Comparecimento impresso em folha A4 com carimbo e assinatura profissional.\n2. Continuidade do plano de cuidado individualizado na unidade.`,
        rawNotes: `Atestado de Comparecimento emitido para o dia ${certificate.attendanceDateFormatted}.`,
        modelUsed: selectedModel,
        attendanceCertificate: certificate,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => [newConsultation, ...prev]);
      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Atestado de Comparecimento registrado na linha do tempo!', 'Comparecimento Emitido');
    }
  };

  const handleDeleteAttendanceCertificate = async (consultation: Consultation) => {
    if (!canIssueAttendanceCertificate(currentUser.profession, currentUser.cbo) && !isUserAdmin(currentUser)) {
      showToast('error', 'Apenas profissionais de nível superior têm permissão para excluir este atestado.', 'Acesso Restrito');
      return;
    }

    const updatedConsultation: Consultation = {
      ...consultation,
      attendanceCertificate: undefined,
    };
    setConsultations((prev) => prev.map((c) => (c.id === consultation.id ? updatedConsultation : c)));
    await saveConsultationToFirestore(updatedConsultation);
    showToast('info', 'Atestado de Comparecimento removido do atendimento.', 'Atestado Excluído');
  };

  // Save or update Exam Media linked to consultation or timeline
  const handleSaveExamMedia = async (mediaReport: ExamMediaReportData, targetConsultationId?: string) => {
    if (targetConsultationId) {
      const target = consultations.find((c) => c.id === targetConsultationId);
      if (target) {
        const updatedConsultation: Consultation = {
          ...target,
          examMedia: mediaReport,
        };
        setConsultations((prev) => prev.map((c) => (c.id === targetConsultationId ? updatedConsultation : c)));
        await saveConsultationToFirestore(updatedConsultation);
        showToast('success', 'Anexo iconográfico salvo e vinculado ao atendimento com sucesso!', 'Imagens e Vídeos Salvos');
        return;
      }
    }

    if (currentRecord && !isRecordSavedToTimeline) {
      setCurrentRecord((prev) => (prev ? { ...prev, examMedia: mediaReport } : prev));
      showToast('success', 'Anexo iconográfico vinculado ao prontuário gerado! Salve o atendimento na Linha do Tempo.', 'Mídias Vinculadas');
      return;
    }

    const patientForMedia = examMediaTargetPatient || selectedPatient;
    if (patientForMedia) {
      const generatedConsId = `cons-media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newConsultation: Consultation = {
        id: generatedConsId,
        patientId: patientForMedia.id,
        patientName: patientForMedia.fullName,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorProfession: currentUser.profession,
        authorRegister: currentUser.professionalRegister,
        workplace: mediaReport.workplace || currentUser.workplace,
        timestamp: mediaReport.createdAt || Date.now(),
        isFirstConsultation: false,
        avaliacao: `ANEXO ICONOGRÁFICO DE IMAGENS E VÍDEOS (FOLHA A4):\nTotal de Registros: ${mediaReport.items.length} mídia(s)\nPeríodo de Retenção Legal: Até ${mediaReport.validUntilFormatted} (Art. 6º Lei Federal nº 13.787/2018)\n\nItens Documentados:\n` +
          mediaReport.items.map((it, idx) => `${idx + 1}. [${it.type === 'video' ? 'VÍDEO / QR CODE' : 'IMAGEM'}] ${it.title} - ${it.description}`).join('\n'),
        plano: `DOCUMENTAÇÃO ICONOGRÁFICA / COMPLEMENTAR:\n1. Registro de imagens/vídeos de exames adicionado ao prontuário eletrônico.\n2. Impresso anexo iconográfico oficial com QR Code para reprodução e consulta segura.\n3. Arquivado digitalmente em conformidade com as diretrizes do CFM e Lei 13.787/2018.`,
        conduta: `1. Entregue anexo iconográfico com QR code e laudo ao paciente/responsável.\n2. Orientada leitura do QR Code pelo celular para reprodução dos vídeos do exame.`,
        rawNotes: `Anexo de imagens e vídeos (${mediaReport.items.length} mídias).`,
        modelUsed: selectedModel,
        examMedia: mediaReport,
        qualitativeChecks: {
          hasQualitativeVitals: true,
          hasFixedCiapSigtap: true,
        },
      };

      setConsultations((prev) => [newConsultation, ...prev]);
      await saveConsultationToFirestore(newConsultation);
      showToast('success', 'Anexo iconográfico registrado na linha do tempo com sucesso!', 'Mídias Emitidas');
    }
  };

  const handleDeleteExamMedia = async (consultation: Consultation) => {
    const updatedConsultation: Consultation = {
      ...consultation,
      examMedia: undefined,
    };
    setConsultations((prev) => prev.map((c) => (c.id === consultation.id ? updatedConsultation : c)));
    await saveConsultationToFirestore(updatedConsultation);
    showToast('info', 'Anexo iconográfico removido do atendimento.', 'Mídias Excluídas');
  };

  // Handle start consultation directly from Appointment (Atender)
  const handleStartConsultationFromAppointment = async (appointment: Appointment) => {
    // 1. Update status to 'em_atendimento'
    try {
      await updateAppointmentStatusInFirestore(appointment.id, 'em_atendimento');
    } catch (e) {
      console.warn('Erro ao atualizar status do agendamento:', e);
    }

    // 2. Look for existing patient by exact ID first, then exact normalized name
    const appCpfClean = (appointment.patientCpf || '').replace(/\D/g, '');
    const appCnsClean = (appointment.patientCns || '').replace(/\D/g, '');
    const appPhoneClean = (appointment.patientPhone || '').replace(/\D/g, '');
    const appNameNorm = normalizePersonName(appointment.patientName);
    const appFirstToken = appNameNorm ? appNameNorm.split(' ')[0] : '';

    let targetPatient = patients.find((p) => {
      const pNameNorm = normalizePersonName(p.fullName);
      const pFirstToken = pNameNorm ? pNameNorm.split(' ')[0] : '';
      // Priority 1: Exact ID match if candidate name matches or is compatible
      if (appointment.patientId && p.id === appointment.patientId) {
        if (!appNameNorm || !pNameNorm || pNameNorm === appNameNorm || (appFirstToken && pNameNorm.includes(appFirstToken)) || (pFirstToken && appNameNorm.includes(pFirstToken))) {
          return true;
        }
      }
      // Priority 2: Exact Name Match
      if (appNameNorm && pNameNorm === appNameNorm) return true;
      return false;
    });

    // Fallback: If not found, try documents ONLY if names are compatible (never cross-match different individuals)
    if (!targetPatient) {
      targetPatient = patients.find((p) => {
        const pNameNorm = normalizePersonName(p.fullName);
        const pFirstToken = pNameNorm ? pNameNorm.split(' ')[0] : '';
        const namesCompatible = !appNameNorm || !pNameNorm || pNameNorm === appNameNorm || (appFirstToken && pNameNorm.includes(appFirstToken)) || (pFirstToken && appNameNorm.includes(pFirstToken));
        if (!namesCompatible) return false;

        if (appCpfClean.length === 11 && (p.cpf || '').replace(/\D/g, '') === appCpfClean) return true;
        if (appCnsClean.length >= 10 && (p.cns || '').replace(/\D/g, '') === appCnsClean) return true;
        if (appPhoneClean.length >= 8 && (p.phone || '').replace(/\D/g, '') === appPhoneClean) return true;
        return false;
      });
    }

    // If patient does not exist in database, create one automatically
    if (!targetPatient) {
      const newPatient: Patient = {
        id: appointment.patientId && !patients.some((p) => p.id === appointment.patientId)
          ? appointment.patientId
          : `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fullName: appointment.patientName || 'Paciente Agendado',
        birthDate: '1990-01-01',
        gender: 'Outro',
        cpf: appointment.patientCpf || '',
        cns: appointment.patientCns || '',
        phone: appointment.patientPhone || '',
        address: 'Cadastrado via Agendamento',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      targetPatient = newPatient;
      setPatients((prev) => [newPatient, ...prev.filter((p) => p.id !== newPatient.id)]);
      await savePatientToFirestore(newPatient);
    }

    // 3. Set as active patient & prepare SOAP generator
    setSelectedPatient(targetPatient);
    if (appointment.professionalProfession) {
      setSelectedProfession(appointment.professionalProfession);
    }
    setRawNotes(`[ATENDIMENTO AGENDADO]\nServiço: ${appointment.serviceName}\nHorário: ${appointment.date} às ${appointment.startTime}\n${appointment.notes ? 'Queixa/Observações prévias: ' + appointment.notes : ''}\n\n`);
    setActiveTab('generator');
    showToast('success', `Iniciando atendimento de ${appointment.patientName}!`, 'Prontuário Ativo');
  };

  // Save new or edited appointment
  const handleSaveAppointment = async (appointment: Appointment) => {
    await saveAppointmentToFirestore(appointment);
    setAppointments((prev) => {
      const idx = prev.findIndex((a) => a.id === appointment.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = appointment;
        return copy;
      }
      return [appointment, ...prev];
    });
  };

  // Delete appointment
  const handleDeleteAppointment = async (appointmentId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
    await deleteAppointmentFromFirestore(appointmentId);
    showToast('info', 'Agendamento excluído do sistema.', 'Excluído');
  };

  // Update appointment status
  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus, updatedAt: Date.now() } : a))
    );
    await updateAppointmentStatusInFirestore(appointmentId, newStatus);
    const labels: Record<AppointmentStatus, string> = {
      agendado: 'Marcado como Agendado',
      em_atendimento: 'Em Atendimento Clínico',
      finalizado: 'Atendimento Finalizado',
      cancelado: 'Agendamento Cancelado / Desistência',
    };
    showToast('success', labels[newStatus], 'Status Atualizado');
  };

  // --- RECEPTION QUEUE HANDLERS ---
  const handleSaveQueueItem = async (queueItem: ReceptionQueueItem) => {
    try {
      await saveQueueItemToFirestore(queueItem);
      setQueueItems((prev) => {
        const idx = prev.findIndex((q) => q.id === queueItem.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = queueItem;
          return copy;
        }
        return [queueItem, ...prev];
      });
      showToast('success', `${queueItem.patientName} inserido na fila de ${queueItem.professionalName}!`, 'Fila Atualizada');
    } catch (err) {
      console.warn('Erro ao salvar item da fila no Supabase:', err);
      showToast('error', 'Falha ao adicionar paciente na fila.');
    }
  };

  const handleUpdateQueueItemStatus = async (queueItemId: string, newStatus: QueueItemStatus) => {
    try {
      await updateQueueItemStatusInFirestore(queueItemId, newStatus);
      setQueueItems((prev) => {
        const item = prev.find((q) => q.id === queueItemId);
        if (item) {
          return prev.map((q) => (q.id === queueItemId ? { ...q, status: newStatus, updatedAt: Date.now() } : q));
        }
        // If not present in queueItems, it was an appointment mapped dynamically
        const app = appointments.find((a) => a.id === queueItemId);
        if (app) {
          const mappedQueueItem: ReceptionQueueItem = {
            id: app.id,
            patientId: app.patientId || `pat-${app.id}`,
            patientName: app.patientName || 'Paciente Agendado',
            patientCpf: app.patientCpf,
            patientCns: app.patientCns,
            patientBirthDate: app.patientBirthDate,
            patientPhone: app.patientPhone,
            professionalId: app.professionalId || '',
            professionalName: app.professionalName || 'Profissional da Unidade',
            professionalProfession: app.professionalProfession || 'enfermeiro',
            scheduledDate: app.date,
            scheduledTime: app.startTime || '08:00',
            timestamp: app.timestamp || Date.now(),
            formattedDateTime: formatQueueDateTime(app.date, app.startTime || '08:00'),
            status: newStatus,
            origin: 'agendamento',
            priorityCategory: 'padrao',
            appointmentId: app.id,
            notes: app.serviceName ? `Serviço: ${app.serviceName}${app.notes ? ` • ${app.notes}` : ''}` : app.notes,
            createdAt: app.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
          return [mappedQueueItem, ...prev];
        }
        return prev;
      });

      // Also sync corresponding appointment if applicable
      const matchingApp = appointments.find((a) => a.id === queueItemId);
      if (matchingApp) {
        let appStatus: AppointmentStatus = 'agendado';
        if (newStatus === 'in_consultation' || newStatus === 'in_service') appStatus = 'em_atendimento';
        else if (newStatus === 'completed') appStatus = 'finalizado';
        else if (newStatus === 'cancelled' || newStatus === 'abandoned') appStatus = 'cancelado';
        else if (newStatus === 'waiting' || newStatus === 'calling') appStatus = 'agendado';

        setAppointments((prev) =>
          prev.map((a) => (a.id === queueItemId ? { ...a, status: appStatus, updatedAt: Date.now() } : a))
        );
        updateAppointmentStatusInFirestore(queueItemId, appStatus).catch(console.warn);
      }

      const statusLabels: Record<QueueItemStatus, string> = {
        waiting: 'Retornado para Aguardando',
        calling: 'Chamando Paciente no Painel',
        in_consultation: 'Em Atendimento Clínico',
        in_service: 'Em Atendimento Clínico',
        completed: 'Atendimento Concluído',
        cancelled: 'Fila Cancelada',
        abandoned: 'Marcado como Desistência',
      };
      showToast('info', statusLabels[newStatus] || 'Status da fila atualizado.', 'Fila de Atendimento');
    } catch (err) {
      console.warn('Erro ao atualizar status do item da fila:', err);
    }
  };

  const handleDeleteQueueItem = async (queueItemId: string) => {
    try {
      // 1. Remove from local queueItems state
      setQueueItems((prev) => prev.filter((q) => q.id !== queueItemId && q.appointmentId !== queueItemId));

      // 2. Also check and remove from appointments state if it originated from appointments
      const isApp = appointments.some((a) => a.id === queueItemId);
      if (isApp) {
        setAppointments((prev) => prev.filter((a) => a.id !== queueItemId));
        await deleteAppointmentFromFirestore(queueItemId).catch(console.warn);
      }

      // 3. Delete from Firestore queue collection
      await deleteQueueItemFromFirestore(queueItemId).catch(console.warn);

      showToast('success', 'Item removido da fila de atendimento com sucesso.', 'Fila Atualizada');
    } catch (err: any) {
      console.error('Erro ao excluir item da fila:', err);
      showToast('error', `Não foi possível remover o item da fila: ${err?.message || 'Erro de conexão'}`);
    }
  };

  // Reorder queue items (Drag and drop / repositioning for all professionals)
  const handleReorderQueueItems = async (reorderedItems: ReceptionQueueItem[]) => {
    try {
      const reorderedMap = new Map(reorderedItems.map((item) => [item.id, item]));

      // Optimistically update local queue state
      setQueueItems((prev) => {
        return prev.map((item) => {
          const updated = reorderedMap.get(item.id);
          return updated ? { ...item, ...updated } : item;
        });
      });

      // Also sync corresponding appointment if applicable
      setAppointments((prev) => {
        return prev.map((app) => {
          const updated = reorderedMap.get(app.id);
          if (updated && updated.orderIndex !== undefined) {
            return { ...app, orderIndex: updated.orderIndex, updatedAt: Date.now() };
          }
          return app;
        });
      });

      // Persist reordered queue items to Firestore asynchronously
      for (const item of reorderedItems) {
        if (item.id) {
          saveQueueItemToFirestore(item).catch(console.warn);
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar reposicionamento da fila:', err);
    }
  };

  // Start consultation from Reception Queue ("Atender")
  const handleStartConsultationFromQueue = async (item: ReceptionQueueItem) => {
    // 1. Update queue item to 'in_service'
    await handleUpdateQueueItemStatus(item.id, 'in_service');

    // 2. Find or restore patient (Prioritize exact ID, then exact normalized name)
    const itemCpfClean = (item.patientCpf || '').replace(/\D/g, '');
    const itemCnsClean = (item.patientCns || '').replace(/\D/g, '');
    const itemNameNorm = normalizePersonName(item.patientName);
    const itemFirstToken = itemNameNorm ? itemNameNorm.split(' ')[0] : '';

    let targetPatient = patients.find((p) => {
      const pNameNorm = normalizePersonName(p.fullName);
      const pFirstToken = pNameNorm ? pNameNorm.split(' ')[0] : '';
      // Priority 1: Exact ID Match (with name compatibility check)
      if (item.patientId && p.id === item.patientId) {
        if (!itemNameNorm || !pNameNorm || pNameNorm === itemNameNorm || (itemFirstToken && pNameNorm.includes(itemFirstToken)) || (pFirstToken && itemNameNorm.includes(pFirstToken))) {
          return true;
        }
      }
      // Priority 2: Normalized Exact Name Match
      if (itemNameNorm && pNameNorm === itemNameNorm) return true;
      return false;
    });

    // Fallback: If not found, try documents ONLY if names are compatible (never cross-match different individuals)
    if (!targetPatient) {
      targetPatient = patients.find((p) => {
        const pNameNorm = normalizePersonName(p.fullName);
        const pFirstToken = pNameNorm ? pNameNorm.split(' ')[0] : '';
        const namesCompatible = !itemNameNorm || !pNameNorm || pNameNorm === itemNameNorm || (itemFirstToken && pNameNorm.includes(itemFirstToken)) || (pFirstToken && itemNameNorm.includes(pFirstToken));
        if (!namesCompatible) return false;

        // CPF Match (11 digits)
        if (itemCpfClean.length === 11 && (p.cpf || '').replace(/\D/g, '') === itemCpfClean) return true;
        // CNS Match (>= 10 digits)
        if (itemCnsClean.length >= 10 && (p.cns || '').replace(/\D/g, '') === itemCnsClean) return true;
        return false;
      });
    }

    if (!targetPatient) {
      const newPatient: Patient = {
        id: item.patientId && !patients.some((p) => p.id === item.patientId)
          ? item.patientId
          : `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fullName: item.patientName || 'Paciente da Fila',
        birthDate: item.patientBirthDate || '1990-01-01',
        gender: (item.patientGender as 'Outro' | 'Feminino' | 'Masculino') || 'Outro',
        cpf: item.patientCpf || '',
        cns: item.patientCns || '',
        phone: item.patientPhone || '',
        address: 'Cadastrado via Fila de Atendimento',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      targetPatient = newPatient;
      setPatients((prev) => [newPatient, ...prev.filter((p) => p.id !== newPatient.id)]);
      savePatientToFirestore(newPatient).catch(console.warn);
    }

    // 3. Set as active patient & professional
    setSelectedPatient(targetPatient);
    if (item.professionalProfession) {
      setSelectedProfession(item.professionalProfession);
    }

    // 4. Pre-fill initial notes if triage notes or summary exist
    const dateTimeStr = (item.formattedDateTime || item.scheduledTime || '').trim();
    let prefilledNotes = dateTimeStr ? `${dateTimeStr}\n` : '';
    if (item.riskClassification) {
      prefilledNotes += `Classificação de Risco (Manchester): ${item.riskClassification.toUpperCase()}\n`;
    }
    if (item.priorityCategory && item.priorityCategory !== 'padrao') {
      prefilledNotes += `Prioridade: ${item.priorityCategory.toUpperCase()}\n`;
    }
    if (item.triageSummary) {
      prefilledNotes += `Sinais Vitais Registrados na Triagem: ${item.triageSummary}\n`;
    }
    if (item.notes) {
      prefilledNotes += `Observações da Recepção/Acolhimento: ${item.notes}\n`;
    }
    prefilledNotes += '\n';

    setRawNotes(prefilledNotes);
    setActiveTab('generator');
    showToast('success', `Iniciando atendimento de ${item.patientName}!`, 'Prontuário Ativo');

    // Smooth scroll to top of consultation
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  // Complete consultation modal actions (clinical output)
  const handleFinalizeConsultationModal = async (
    targetProfessional?: UserModel,
    scheduledDate?: string,
    scheduledTime?: string,
    conductText?: string
  ) => {
    if (!currentRecord || !selectedPatient) return;

    // Update conduct text if target queue conduct was generated
    const updatedTexts = consultationDraftTexts || {
      avaliacao: currentRecord.avaliacao,
      plano: currentRecord.plano,
      conduta: currentRecord.conduta,
    };

    if (conductText && targetProfessional) {
      const mergedConduta = updatedTexts.conduta
        ? `${updatedTexts.conduta.trim()}\n\n${conductText.trim()}`
        : conductText.trim();
      updatedTexts.conduta = mergedConduta;
    }

    // Save to timeline
    await handleSaveToPatientTimeline(currentRecord, updatedTexts);

    // If directed to add to queue
    if (targetProfessional && scheduledDate && scheduledTime) {
      const parsedTime = new Date(`${scheduledDate}T${scheduledTime}:00`).getTime();
      const itemTimestamp = isNaN(parsedTime) ? Date.now() : parsedTime;

      const queueItem: ReceptionQueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        patientCpf: selectedPatient.cpf,
        patientCns: selectedPatient.cns,
        patientBirthDate: selectedPatient.birthDate,
        patientGender: selectedPatient.gender,
        patientPhone: selectedPatient.phone,
        professionalId: targetProfessional.id,
        professionalName: targetProfessional.name,
        professionalProfession: targetProfessional.profession,
        scheduledDate,
        scheduledTime,
        timestamp: itemTimestamp,
        formattedDateTime: formatQueueDateTime(scheduledDate, scheduledTime),
        status: 'waiting',
        priorityCategory: 'padrao',
        origin: 'conclusao_atendimento',
        notes: `Encaminhado por ${currentUser.name} (${PROFESSIONS[currentUser.profession]?.name || currentUser.profession})`,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await handleSaveQueueItem(queueItem);
    }

    // Check if patient had an active 'in_service' item in queue for currentUser and mark as 'completed'
    const activeQueueItem = queueItems.find(
      (q) =>
        q.patientId === selectedPatient.id &&
        q.professionalId === currentUser.id &&
        q.status === 'in_service'
    );
    if (activeQueueItem) {
      await handleUpdateQueueItemStatus(activeQueueItem.id, 'completed');
    }

    setIsCompleteConsultationModalOpen(false);
    setConsultationDraftTexts(null);
  };

  // Reset current form
  const handleResetForm = () => {
    setRawNotes('');
    setAudioAttachment(null);
    setAttachments([]);
    setCurrentRecord(null);
    setSavedConsultationId(null);
    setIsRecordSavedToTimeline(false);
    showToast('info', 'Formulário limpo para um novo atendimento.');
  };

  const activeKnowledgeCount = knowledgeList.filter((k) => k.isActive).length;

  // Standalone Public Video Exam Player (No login needed, direct access for citizens scanning printed QR Code)
  if (activeTab === 'public_video' || isInitiallyPublicVideo) {
    return (
      <PublicVideoPlayerView
        onBackToHome={() => {
          if (isAuthenticated) {
            setActiveTab('generator');
          } else {
            window.location.href = '/';
          }
        }}
      />
    );
  }

  // Standalone Public TV Call Screen (No login needed, direct view for TV or QR code access)
  if (isInitiallyPublicCallTv || (isPublicCallScreenOpen && (!currentUser || !isAuthenticated))) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <PublicQueueCallScreen
          queueItems={queueItems}
          appointments={appointments}
          professionals={users}
          systemSettings={systemSettings}
          onClose={() => {
            if (isInitiallyPublicCallTv) {
              window.location.href = window.location.pathname;
            } else {
              setIsPublicCallScreenOpen(false);
            }
          }}
          isStandalone={true}
          onUpdateQueueItemStatus={handleUpdateQueueItemStatus}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'public_portal') {
            setActiveTab('public_portal');
            return;
          }
          if (!isAuthenticated) {
            setIsAuthModalOpen(true);
            showToast('info', 'Faça login para acessar o painel de atendimento dos profissionais.', 'Acesso Profissional');
            return;
          }
          if (tab === 'patients') {
            verifyAccessOrOpenPaywall(() => setActiveTab('patients'));
          } else {
            setActiveTab(tab);
          }
        }}
        isAuthenticated={isAuthenticated}
        hasAccess={hasValidAccess()}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenSystemSettings={() => setIsSystemSettingsOpen(true)}
        selectedPatient={selectedPatient}
        selectedProfession={selectedProfession}
        onSelectProfession={setSelectedProfession}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenKnowledgeDrawer={() => setIsKnowledgeDrawerOpen(true)}
        onOpenMedicationsDrawer={() => setIsMedicationsDrawerOpen(true)}
        onOpenExamsDrawer={() => setIsExamsDrawerOpen(true)}
        onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
        activeKnowledgeCount={activeKnowledgeCount}
        medicationsCount={medications.length}
        examsCount={exams.length}
        historyCount={history.length}
        patientsCount={patients.length}
        appointmentsCount={
          appointments.filter(
            (a) => a.date === new Date().toISOString().split('T')[0] && a.status === 'agendado'
          ).length
        }
        queueCount={
          queueItems.filter(
            (q) =>
              q.status === 'waiting' ||
              q.status === 'calling'
          ).length
        }
        hasCallingPatient={
          queueItems.some(
            (q) => q.status === 'calling' && q.professionalId === currentUser.id
          )
        }
        hasCustomApiKey={!!userApiKey}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'generator' ? (
          <>
            {/* Active Patient Selector Banner (Linked Patient Context with Searchable Dropdown) */}
            <div
              id="active-patient-banner"
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    SELECIONAR CIDADÃO:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                    {patients.length} no banco
                  </span>
                </div>

                <div className="pt-1.5 max-w-lg">
                  <PatientDropdownSelector
                    patients={patients}
                    consultations={consultations}
                    selectedPatient={selectedPatient}
                    queueItems={queueItems}
                    onSelectPatient={(pat) => {
                      verifyAccessOrOpenPaywall(() => {
                        setSelectedPatient(pat);
                      });
                    }}
                    onAddToQueue={handleAddPatientToQueue}
                    onOpenNewPatientModal={() => {
                      verifyAccessOrOpenPaywall(() => {
                        setPatientToEdit(null);
                        setIsPatientFormModalOpen(true);
                      });
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                {currentRecord && (
                  <SpecularButton
                    type="button"
                    id="reset-form-btn"
                    onClick={handleResetForm}
                    size="sm"
                    radius={12}
                    className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Novo Atendimento</span>
                  </SpecularButton>
                )}

                {selectedPatient && (
                  <SpecularButton
                    type="button"
                    id="banner-view-timeline-btn"
                    onClick={() => setActiveTab('patients')}
                    size="sm"
                    radius={12}
                    className="px-3.5 py-2 bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 shadow-xs"
                    title="Abrir linha do tempo e prontuário completo"
                  >
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Ver Prontuário / Linha do Tempo</span>
                  </SpecularButton>
                )}

                <SpecularButton
                  type="button"
                  id="banner-new-patient-btn"
                  onClick={() => {
                    verifyAccessOrOpenPaywall(() => {
                      setPatientToEdit(null);
                      setIsPatientFormModalOpen(true);
                    });
                  }}
                  size="sm"
                  radius={12}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
                  title="Cadastrar novo paciente no sistema"
                >
                  <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                  <span>+ Novo Cadastro</span>
                </SpecularButton>
              </div>
            </div>

            {/* Input Area (Triage Form for Nursing Tech/Aux OR Multimodal Input for other clinicians) - ONLY WHEN CITIZEN IS SELECTED */}
            {selectedPatient ? (
              <>
                <section id="section-clinical-input">
                  {PROFESSIONS[selectedProfession]?.isAdministrativeOnly || selectedProfession === 'administrativo' ? (
                    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 text-center space-y-4 shadow-sm">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <div className="max-w-lg mx-auto space-y-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          Perfil Administrativo • Recepção & Agendamento
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          O perfil <strong>Administrativo</strong> é exclusivo para marcação, recepção e gestão de horários e agendamentos da equipe multiprofissional. Esta função não gera evolução ou prontuário clínico.
                        </p>
                      </div>
                      <div className="pt-2">
                        <SpecularButton
                          type="button"
                          id="btn-goto-appointments-admin"
                          onClick={() => setActiveTab('appointments')}
                          size="md"
                          radius={14}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 mx-auto inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>Ir para Central de Agendamentos</span>
                        </SpecularButton>
                      </div>
                    </div>
                  ) : PROFESSIONS[selectedProfession]?.isTriageOnly ||
                  selectedProfession === 'tecnico_enfermagem' ||
                  selectedProfession === 'auxiliar_enfermagem' ? (
                    <TriageForm
                      profession={PROFESSIONS[selectedProfession] || PROFESSIONS.enfermeiro}
                      patient={selectedPatient}
                      currentUser={currentUser}
                      professionals={users}
                      onFinishTriage={handleFinishTriage}
                      onAddToQueueItem={handleSaveQueueItem}
                      onShowToast={showToast}
                    />
                  ) : (
                    <MultimodalInput
                      profession={PROFESSIONS[selectedProfession] || PROFESSIONS.medico}
                      rawNotes={rawNotes}
                      setRawNotes={setRawNotes}
                      isFirstConsultation={isFirstConsultation}
                      setIsFirstConsultation={setIsFirstConsultation}
                      patientPreviousConsultationsCount={
                        consultations.filter((c) => c.patientId === selectedPatient.id).length
                      }
                      audioAttachment={audioAttachment}
                      setAudioAttachment={setAudioAttachment}
                      attachments={attachments}
                      setAttachments={setAttachments}
                      isGenerating={isGenerating}
                      generationStatus={generationStatus}
                      selectedModel={selectedModel}
                      onGenerate={handleGenerate}
                      onShowToast={showToast}
                      activeKnowledgeCount={activeKnowledgeCount}
                      onOpenKnowledgeBase={() => setIsKnowledgeDrawerOpen(true)}
                      userApiKey={systemSettings.geminiApiKey || userApiKey}
                      openaiApiKey={systemSettings.openaiApiKey}
                      groqApiKey={systemSettings.groqApiKey}
                    />
                  )}
                </section>

                {/* 3. Output Ready for Copy (PEC Distinct Cards) */}
                <section id="section-output-results" ref={outputRef}>
                  {currentRecord ? (
                    <OutputCard
                      record={currentRecord}
                      profession={PROFESSIONS[currentRecord.professionId] || PROFESSIONS[selectedProfession] || PROFESSIONS.medico}
                      patient={selectedPatient}
                      onSaveToTimeline={handleSaveToPatientTimeline}
                      isSavedToTimeline={isRecordSavedToTimeline}
                      onOpenCompleteModal={(drafts) => {
                        setConsultationDraftTexts(drafts);
                        setIsCompleteConsultationModalOpen(true);
                      }}
                      onShowToast={showToast}
                      onOpenPrescription={(planText) => {
                        verifyAccessOrOpenPaywall(() => {
                          setPrescriptionTargetPatient(selectedPatient);
                          const activeCons = savedConsultationId
                            ? consultations.find((c) => c.id === savedConsultationId) || null
                            : null;
                          setPrescriptionTargetConsultation(activeCons);
                          setPrescriptionInitialPlanText(planText);
                          setIsPrescriptionModalOpen(true);
                        });
                      }}
                      onOpenReferral={(planText, notesText) => {
                        verifyAccessOrOpenPaywall(() => {
                          setReferralTargetPatient(selectedPatient);
                          setReferralTargetConsultation(null);
                          setReferralInitialData(currentRecord?.referral);
                          setReferralInitialPlanText(planText);
                          setReferralInitialNotesText(notesText);
                          setIsReferralModalOpen(true);
                        });
                      }}
                      onOpenPts={(planText, notesText) => {
                        verifyAccessOrOpenPaywall(() => {
                          setPtsTargetPatient(selectedPatient);
                          setPtsTargetConsultation(null);
                          setPtsInitialData(currentRecord?.pts);
                          setPtsInitialPlanText(planText);
                          setPtsInitialNotesText(notesText);
                          setIsPtsModalOpen(true);
                        });
                      }}
                      onOpenExamRequest={(planText, notesText) => {
                        verifyAccessOrOpenPaywall(() => {
                          setExamRequestTargetPatient(selectedPatient);
                          setExamRequestTargetConsultation(null);
                          setExamRequestInitialData(currentRecord?.examRequest);
                          setExamRequestInitialPlanText(planText);
                          setExamRequestInitialNotesText(notesText);
                          setIsExamRequestModalOpen(true);
                        });
                      }}
                      onOpenMedicalReport={() => {
                        if (currentUser.profession !== 'medico') {
                          showToast('error', 'A emissão de laudo médico é restrita à classe médica.', 'Acesso Restrito');
                          return;
                        }
                        verifyAccessOrOpenPaywall(() => {
                          setMedicalReportTargetPatient(selectedPatient);
                          setMedicalReportTargetConsultation(null);
                          setMedicalReportInitialData(currentRecord?.medicalReport);
                          setMedicalReportInitialClinicalContext(
                            `AVALIAÇÃO:\n${currentRecord.avaliacao}\n\nPLANO & CONDUTA:\n${currentRecord.plano}\n${currentRecord.conduta || ''}`
                          );
                          setIsMedicalReportModalOpen(true);
                        });
                      }}
                      onOpenMedicalCertificate={() => {
                        if (!canIssueMedicalCertificate(currentUser.profession) && !isUserAdmin(currentUser)) {
                          showToast('error', 'A emissão de atestado médico é restrita a médicos.', 'Acesso Restrito');
                          return;
                        }
                        verifyAccessOrOpenPaywall(() => {
                          setMedicalCertificateTargetPatient(selectedPatient);
                          setMedicalCertificateTargetConsultation(null);
                          setMedicalCertificateInitialData(currentRecord?.medicalCertificate);
                          setIsMedicalCertificateModalOpen(true);
                        });
                      }}
                      onOpenAttendanceCertificate={() => {
                        if (!canIssueAttendanceCertificate(currentUser.profession, currentUser.cbo) && !isUserAdmin(currentUser)) {
                          showToast('error', 'Apenas profissionais de nível superior podem emitir Atestado de Comparecimento.', 'Acesso Restrito');
                          return;
                        }
                        verifyAccessOrOpenPaywall(() => {
                          setAttendanceCertificateTargetPatient(selectedPatient);
                          setAttendanceCertificateTargetConsultation(null);
                          setAttendanceCertificateInitialData(currentRecord?.attendanceCertificate);
                          setIsAttendanceCertificateModalOpen(true);
                        });
                      }}
                      onOpenExamMedia={() => {
                        verifyAccessOrOpenPaywall(() => {
                          setExamMediaTargetPatient(selectedPatient);
                          setExamMediaTargetConsultation(null);
                          setExamMediaInitialData(currentRecord?.examMedia);
                          setIsExamMediaModalOpen(true);
                        });
                      }}
                    />
                  ) : (
                    /* Placeholder / Empty State */
                    <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center border border-teal-200 dark:border-teal-800/40 shadow-xs">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          Pronto para gerar o prontuário eletrônico
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                          Digite as anotações do cidadão, grave um áudio da consulta ou anexe fotos de
                          receitas médicas e clique em <strong>"Gerar Prontuário"</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : (
              /* Awaiting Citizen Selection Notice */
              <div className="p-10 sm:p-12 rounded-3xl border-2 border-dashed border-teal-500/25 dark:border-teal-500/20 bg-gradient-to-b from-teal-500/5 to-transparent text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center border border-teal-500/30 shadow-sm">
                  <User className="w-7 h-7" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Selecione um Cidadão ou Acesse a Fila de Atendimento
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Escolha um cidadão no seletor acima para direcioná-lo à <strong>Fila de Atendimento</strong>, ou acesse a fila para chamar e atender o próximo cidadão aguardando.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('queue')}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        Ver Fila de Atendimento ({queueItems.filter((q) => q.status === 'waiting').length} aguardando)
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'patients' ? (
          /* Patients & Timeline Tab View */
          <section id="section-patients-and-timeline">
            {selectedPatient ? (
              <div className="space-y-4">
                <button
                  type="button"
                  id="back-to-patients-list-btn"
                  onClick={() => setSelectedPatient(null)}
                  className="sticky top-[62px] sm:top-[74px] z-20 px-3.5 py-1.5 rounded-xl bg-[#070775] hover:bg-[#070775]/90 text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg border border-white/20"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ver Todos os Pacientes</span>
                </button>

                <PatientTimeline
                  patient={selectedPatient}
                  consultations={consultations}
                  currentUser={currentUser}
                  hasValidAccess={hasValidAccess()}
                  queueItems={queueItems}
                  onAddToQueue={handleAddPatientToQueue}
                  onNewConsultation={handleStartConsultationForPatient}
                  onGenerateEvolution={handleGenerateEvolution}
                  onRegenerateEvolutionNow={handleRegenerateEvolutionNow}
                  onEditPatient={(pat) => {
                    verifyAccessOrOpenPaywall(() => {
                      setPatientToEdit(pat);
                      setIsPatientFormModalOpen(true);
                    });
                  }}
                  onDeletePatient={handleDeletePatient}
                  onEditConsultation={handleEditConsultation}
                  onDeleteConsultation={handleDeleteConsultation}
                  onShowToast={showToast}
                  onNewPrescription={(pat, cons) => {
                    verifyAccessOrOpenPaywall(() => {
                      setPrescriptionTargetPatient(pat);
                      setPrescriptionTargetConsultation(cons || null);
                      setPrescriptionInitialPlanText(cons ? `${cons.plano}\n${cons.conduta || ''}` : undefined);
                      setIsPrescriptionModalOpen(true);
                    });
                  }}
                  onPrintPrescription={handleOpenPrescriptionPreview}
                  onOpenReferral={(pat, cons, existing) => {
                    verifyAccessOrOpenPaywall(() => {
                      setReferralTargetPatient(pat);
                      setReferralTargetConsultation(cons || null);
                      setReferralInitialData(existing);
                      setReferralInitialPlanText(cons ? `${cons.plano}\n${cons.conduta || ''}` : undefined);
                      setReferralInitialNotesText(cons?.avaliacao);
                      setIsReferralModalOpen(true);
                    });
                  }}
                  onOpenPts={(pat, cons, existing) => {
                    verifyAccessOrOpenPaywall(() => {
                      setPtsTargetPatient(pat);
                      setPtsTargetConsultation(cons || null);
                      setPtsInitialData(existing);
                      setPtsInitialPlanText(cons ? `${cons.plano}\n${cons.conduta || ''}` : undefined);
                      setPtsInitialNotesText(cons?.avaliacao);
                      setIsPtsModalOpen(true);
                    });
                  }}
                  onOpenExamRequest={(pat, cons, existing) => {
                    verifyAccessOrOpenPaywall(() => {
                      setExamRequestTargetPatient(pat);
                      setExamRequestTargetConsultation(cons || null);
                      setExamRequestInitialData(existing);
                      setExamRequestInitialPlanText(cons ? `${cons.plano}\n${cons.conduta || ''}` : undefined);
                      setExamRequestInitialNotesText(cons?.avaliacao);
                      setIsExamRequestModalOpen(true);
                    });
                  }}
                  onPrintExamRequest={handleOpenExamRequestPreview}
                  onDeleteReferral={handleDeleteReferral}
                  onDeletePts={handleDeletePts}
                  onDeleteExamRequest={handleDeleteExamRequest}
                  onOpenMedicalReport={(pat, cons, existing) => {
                    if (!existing && currentUser.profession !== 'medico') {
                      showToast('error', 'A emissão de laudo médico é restrita à classe médica.', 'Acesso Restrito');
                      return;
                    }
                    verifyAccessOrOpenPaywall(() => {
                      setMedicalReportTargetPatient(pat);
                      setMedicalReportTargetConsultation(cons || null);
                      setMedicalReportInitialData(existing);
                      setMedicalReportInitialClinicalContext(
                        cons ? `AVALIAÇÃO:\n${cons.avaliacao}\n\nPLANO & CONDUTA:\n${cons.plano}\n${cons.conduta || ''}` : undefined
                      );
                      setIsMedicalReportModalOpen(true);
                    });
                  }}
                  onDeleteMedicalReport={handleDeleteMedicalReport}
                  onOpenMedicalCertificate={(pat, cons, existing) => {
                    if (!existing && !canIssueMedicalCertificate(currentUser.profession) && !isUserAdmin(currentUser)) {
                      showToast('error', 'A emissão de atestado médico é restrita a médicos.', 'Acesso Restrito');
                      return;
                    }
                    verifyAccessOrOpenPaywall(() => {
                      setMedicalCertificateTargetPatient(pat);
                      setMedicalCertificateTargetConsultation(cons || null);
                      setMedicalCertificateInitialData(existing);
                      setIsMedicalCertificateModalOpen(true);
                    });
                  }}
                  onDeleteMedicalCertificate={handleDeleteMedicalCertificate}
                  onOpenAttendanceCertificate={(pat, cons, existing) => {
                    if (!existing && !canIssueAttendanceCertificate(currentUser.profession, currentUser.cbo) && !isUserAdmin(currentUser)) {
                      showToast('error', 'Apenas profissionais de nível superior podem emitir Atestado de Comparecimento.', 'Acesso Restrito');
                      return;
                    }
                    verifyAccessOrOpenPaywall(() => {
                      setAttendanceCertificateTargetPatient(pat);
                      setAttendanceCertificateTargetConsultation(cons || null);
                      setAttendanceCertificateInitialData(existing);
                      setIsAttendanceCertificateModalOpen(true);
                    });
                  }}
                  onDeleteAttendanceCertificate={handleDeleteAttendanceCertificate}
                  onOpenExamMedia={(pat, cons, existing) => {
                    verifyAccessOrOpenPaywall(() => {
                      setExamMediaTargetPatient(pat);
                      setExamMediaTargetConsultation(cons || null);
                      setExamMediaInitialData(existing);
                      setIsExamMediaModalOpen(true);
                    });
                  }}
                  onDeleteExamMedia={handleDeleteExamMedia}
                />
              </div>
            ) : (
              <PatientsListView
                patients={patients}
                consultations={consultations}
                currentUser={currentUser}
                onSelectPatient={(pat) => {
                  verifyAccessOrOpenPaywall(() => setSelectedPatient(pat));
                }}
                onOpenNewPatientModal={() => {
                  verifyAccessOrOpenPaywall(() => {
                    setPatientToEdit(null);
                    setIsPatientFormModalOpen(true);
                  });
                }}
                onEditPatient={(pat) => {
                  verifyAccessOrOpenPaywall(() => {
                    setPatientToEdit(pat);
                    setIsPatientFormModalOpen(true);
                  });
                }}
                onDeletePatient={handleDeletePatient}
                onNewConsultationForPatient={handleStartConsultationForPatient}
                onAddToQueue={handleAddPatientToQueue}
              />
            )}
          </section>
        ) : activeTab === 'queue' ? (
          /* Reception Queue View (Fila de Atendimento) */
          <section id="section-reception-queue">
            <ReceptionQueueView
              currentUser={currentUser}
              professionals={users}
              queueItems={queueItems}
              appointments={appointments}
              patients={patients}
              onOpenAddToQueue={() => {
                verifyAccessOrOpenPaywall(() => {
                  setPatientForQueue(null);
                  setIsAddToQueueModalOpen(true);
                });
              }}
              onCallPatient={(item) => {
                handleUpdateQueueItemStatus(item.id, 'calling');
                setPatientToCall(item);
              }}
              onOpenCallModal={(item) => {
                setPatientToCall(item);
                setIsCallPatientModalOpen(true);
              }}
              onStartConsultation={handleStartConsultationFromQueue}
              onStartConsultationForPatient={handleStartConsultationFromQueue}
              onMarkAbandonment={(item) => {
                handleUpdateQueueItemStatus(item.id, 'abandoned');
              }}
              onCancelQueueItem={(item) => {
                handleUpdateQueueItemStatus(item.id, 'cancelled');
              }}
              onUpdateQueueItemStatus={handleUpdateQueueItemStatus}
              onDeleteQueueItem={handleDeleteQueueItem}
              onReorderQueue={handleReorderQueueItems}
              onOpenPublicCallScreen={() => setIsPublicCallScreenOpen(true)}
              onOpenTimeline={(patient) => {
                verifyAccessOrOpenPaywall(() => {
                  setSelectedPatient(patient);
                  setActiveTab('patients');
                });
              }}
              onShowToast={showToast}
            />
          </section>
        ) : activeTab === 'appointments' ? (
          /* Appointments Management View */
          <section id="section-appointments-management">
            <AppointmentsManagementView
              currentUser={currentUser}
              professionals={users}
              appointments={appointments}
              patients={patients}
              onAddUser={handleAddUser}
              onOpenScheduleSettings={(target, tab) => {
                setScheduleSettingsTargetUser(target || currentUser);
                setScheduleSettingsInitialTab(tab || 'schedule');
                setIsScheduleSettingsOpen(true);
              }}
              onOpenPublicPortal={(userId) => {
                setPublicPortalTargetUserId(userId || currentUser.id);
                setActiveTab('public_portal');
              }}
              onStartConsultationForPatient={handleStartConsultationFromAppointment}
              onShowToast={showToast}
              onDeleteAppointment={handleDeleteAppointment}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            />
          </section>
        ) : (
          /* Public Patient Booking Portal View */
          <section id="section-public-booking-portal">
            <PublicBookingPortal
              professionals={users}
              preselectedUserId={publicPortalTargetUserId}
              existingAppointments={appointments}
              patients={patients}
              systemSettings={systemSettings}
              isAuthenticated={isAuthenticated}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
              onSelectedProfessionalChange={(newId) => {
                setPublicPortalTargetUserId(newId);
              }}
              onAppointmentBooked={handleSaveAppointment}
              onSavePatient={handleSavePatient}
              onBackToInternalPanel={() => {
                if (isAuthenticated) {
                  setActiveTab('appointments');
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              onShowToast={showToast}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 mt-12 bg-white dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              e-SUS PEC Multiprofissional AI
            </span>
            <span>• Atenção Primária, RAPS e eMulti do SUS</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Inteligência Clínica Longitudinal • Gemini 2.5 Flash
          </div>
        </div>
      </footer>

      {/* Drawers and Modals */}
      <KnowledgeBaseDrawer
        isOpen={isKnowledgeDrawerOpen}
        onClose={() => setIsKnowledgeDrawerOpen(false)}
        knowledgeList={knowledgeList}
        setKnowledgeList={setKnowledgeList}
        onShowToast={showToast}
      />

      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        history={history}
        onSelectRecord={(rec) => {
          setSelectedProfession(rec.professionId);
          setSelectedModel(rec.modelUsed);
          setCurrentRecord(rec);
          setActiveTab('generator');
          showToast('info', 'Prontuário restaurado do histórico.');
        }}
        onClearHistory={() => {
          setHistory([]);
          showToast('info', 'Histórico de prontuários limpo.');
        }}
        onDeleteRecord={(id) => {
          setHistory((prev) => prev.filter((h) => h.id !== id));
          showToast('info', 'Registro removido do histórico.');
        }}
        onShowToast={showToast}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        userApiKey={userApiKey}
        onSaveApiKey={handleSaveApiKey}
        onShowToast={showToast}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (isAuthenticated) {
            setIsAuthModalOpen(false);
          }
        }}
        canClose={isAuthenticated}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        users={users}
        systemSettings={systemSettings}
        onUpdateSystemSettings={handleSaveSystemSettings}
        onLogin={handleLoginUser}
        onRegisterUser={handleRegisterUser}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
        onShowToast={showToast}
      />

      <PatientFormModal
        isOpen={isPatientFormModalOpen}
        onClose={() => {
          setIsPatientFormModalOpen(false);
          setPatientToEdit(null);
        }}
        onSavePatient={handleSavePatient}
        patientToEdit={patientToEdit}
        patients={patients}
        onShowToast={showToast}
      />

      {selectedPatient && (
        <ClinicalEvolutionModal
          isOpen={isEvolutionModalOpen}
          onClose={() => setIsEvolutionModalOpen(false)}
          evolution={evolutionSummary}
          patient={selectedPatient}
          isLoading={isLoadingEvolution}
          onRegenerate={(forceFull?: boolean) => {
            const patientConsultations = consultations.filter(
              (c) => c.patientId === selectedPatient.id
            );
            handleRegenerateEvolutionNow(selectedPatient, patientConsultations, Boolean(forceFull));
          }}
          onShowToast={showToast}
        />
      )}

      {/* System Settings & RBAC Management Modal */}
      <SystemSettingsModal
        isOpen={isSystemSettingsOpen}
        onClose={() => setIsSystemSettingsOpen(false)}
        currentUser={currentUser}
        users={users}
        patients={patients}
        consultations={consultations}
        systemSettings={systemSettings}
        plans={plans}
        onUpdatePlan={(plan) => saveSubscriptionPlanToFirestore(plan)}
        onUpdateUserSubscription={updateUserSubscriptionDirectly}
        onUpdateSystemSettings={handleSaveSystemSettings}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onAddUser={handleAddUser}
        onSyncUsers={handleSyncUsersFromFirestore}
        onEditPatient={handleEditPatientFromModal}
        onDeletePatient={handleDeletePatient}
        onEditConsultation={handleEditConsultation}
        onDeleteConsultation={handleDeleteConsultation}
        onShowToast={showToast}
        onOpenKnowledgeBase={() => setIsKnowledgeDrawerOpen(true)}
        activeKnowledgeCount={activeKnowledgeCount}
        onOpenScheduleSettings={(targetUser, tab) => {
          setScheduleSettingsTargetUser(targetUser);
          setScheduleSettingsInitialTab(tab || 'schedule');
          setIsScheduleSettingsOpen(true);
        }}
      />

      {/* Edit Consultation Modal */}
      <EditConsultationModal
        isOpen={isEditConsultationModalOpen}
        onClose={() => {
          setIsEditConsultationModalOpen(false);
          setConsultationToEdit(null);
        }}
        consultation={consultationToEdit}
        currentUser={currentUser}
        onSave={handleSaveEditedConsultation}
        onSaveConsultation={handleSaveEditedConsultation}
        onShowToast={showToast}
      />

      {/* Paywall & PIX Subscription Modal */}
      <PaywallModal
        isOpen={isPaywallModalOpen}
        onClose={() => setIsPaywallModalOpen(false)}
        currentUser={currentUser}
        plans={plans}
        systemSettings={systemSettings}
        onUpdateCurrentUser={setCurrentUser}
        onShowToast={showToast}
        onPaymentSuccess={() => {
          setIsPaywallModalOpen(false);
        }}
      />

      {/* Prescription / Transcription Modal (Enfermeiro & Médico) */}
      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => {
          setIsPrescriptionModalOpen(false);
          setPrescriptionTargetConsultation(null);
          setPrescriptionInitialPlanText(undefined);
        }}
        patient={prescriptionTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={
          prescriptionTargetConsultation ||
          (savedConsultationId ? consultations.find((c) => c.id === savedConsultationId) : undefined)
        }
        initialConsultationPlanText={prescriptionInitialPlanText}
        existingPrescription={
          prescriptionTargetConsultation?.prescription ||
          (savedConsultationId ? consultations.find((c) => c.id === savedConsultationId)?.prescription : undefined) ||
          currentRecord?.prescription
        }
        onSavePrescription={(rx) =>
          handleSavePrescription(
            rx,
            prescriptionTargetConsultation?.id || savedConsultationId || undefined
          )
        }
        onShowToast={showToast}
        medications={medications}
        onSaveNewMedicationToDb={handleSaveMedication}
      />

      {/* SUS / REMUME Medications Database Catalog Drawer */}
      <MedicationsDrawer
        isOpen={isMedicationsDrawerOpen}
        onClose={() => setIsMedicationsDrawerOpen(false)}
        medications={medications}
        onSaveMedication={handleSaveMedication}
        onDeleteMedication={handleDeleteMedication}
        onResetToDefaults={handleResetMedications}
        onShowToast={showToast}
        isAdmin={isUserAdmin(currentUser)}
      />

      {/* Dedicated Preview Modal with Zoom & Encaminhar para Impressão */}
      <PrescriptionPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPrescriptionForPreview(null);
        }}
        prescription={prescriptionForPreview}
        currentUser={currentUser}
        onShowToast={showToast}
        onEditPrescription={(rx) => {
          setIsPreviewModalOpen(false);
          setPrescriptionTargetPatient(patients.find((p) => p.id === rx.patientId) || selectedPatient || null);
          const relatedCons = consultations.find((c) => c.id === rx.consultationId);
          setPrescriptionTargetConsultation(relatedCons || null);
          setIsPrescriptionModalOpen(true);
        }}
      />

      {/* Módulo de Guia de Encaminhamento e Referência SUS (A4 Retrato) */}
      <ReferralModal
        isOpen={isReferralModalOpen}
        onClose={() => {
          setIsReferralModalOpen(false);
          setReferralTargetConsultation(null);
          setReferralInitialData(undefined);
          setReferralInitialPlanText(undefined);
          setReferralInitialNotesText(undefined);
        }}
        patient={referralTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={referralTargetConsultation || undefined}
        initialPlanText={referralInitialPlanText}
        initialNotesText={referralInitialNotesText}
        existingReferral={referralInitialData || referralTargetConsultation?.referral}
        onSave={(ref) => handleSaveReferral(ref, referralTargetConsultation?.id)}
        onSaveReferral={(ref) => handleSaveReferral(ref, referralTargetConsultation?.id)}
        onShowToast={showToast}
      />

      {/* Módulo de Projeto Terapêutico Singular - PTS (A4 Retrato) */}
      <PtsModal
        isOpen={isPtsModalOpen}
        onClose={() => {
          setIsPtsModalOpen(false);
          setPtsTargetConsultation(null);
          setPtsInitialData(undefined);
          setPtsInitialPlanText(undefined);
          setPtsInitialNotesText(undefined);
        }}
        patient={ptsTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={ptsTargetConsultation || undefined}
        initialPlanText={ptsInitialPlanText}
        initialNotesText={ptsInitialNotesText}
        existingPts={ptsInitialData || ptsTargetConsultation?.pts}
        onSave={(pts) => handleSavePts(pts, ptsTargetConsultation?.id)}
        onSavePts={(pts) => handleSavePts(pts, ptsTargetConsultation?.id)}
        onShowToast={showToast}
      />

      {/* SUS Exams & Tests Database Catalog Drawer */}
      <ExamsDrawer
        isOpen={isExamsDrawerOpen}
        onClose={() => setIsExamsDrawerOpen(false)}
        exams={exams}
        onSaveExam={handleSaveExam}
        onDeleteExam={handleDeleteExam}
        onResetToDefaults={handleResetExams}
        onShowToast={showToast}
        isAdmin={isUserAdmin(currentUser)}
      />

      {/* Módulo de Solicitação de Exames Complementares e Imagem (2 Vias A4 Paisagem) */}
      <ExamRequestModal
        isOpen={isExamRequestModalOpen}
        onClose={() => {
          setIsExamRequestModalOpen(false);
          setExamRequestTargetConsultation(null);
          setExamRequestInitialData(undefined);
          setExamRequestInitialPlanText(undefined);
          setExamRequestInitialNotesText(undefined);
        }}
        patient={examRequestTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={examRequestTargetConsultation || undefined}
        initialPlanText={examRequestInitialPlanText}
        initialNotesText={examRequestInitialNotesText}
        existingExamRequest={examRequestInitialData || examRequestTargetConsultation?.examRequest}
        exams={exams}
        onSaveExamRequest={(req) => handleSaveExamRequest(req, examRequestTargetConsultation?.id)}
        onSaveNewExamToDb={handleSaveExam}
        onShowToast={showToast}
      />

      {/* Módulo de Laudo Médico Oficial (A4 Retrato) */}
      <MedicalReportModal
        isOpen={isMedicalReportModalOpen}
        onClose={() => {
          setIsMedicalReportModalOpen(false);
          setMedicalReportTargetConsultation(null);
          setMedicalReportInitialData(undefined);
          setMedicalReportInitialClinicalContext(undefined);
        }}
        patient={medicalReportTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={medicalReportTargetConsultation || undefined}
        initialClinicalContext={medicalReportInitialClinicalContext}
        existingReport={medicalReportInitialData || medicalReportTargetConsultation?.medicalReport}
        onSave={(report) => handleSaveMedicalReport(report, medicalReportTargetConsultation?.id)}
        onSaveReport={(report) => handleSaveMedicalReport(report, medicalReportTargetConsultation?.id)}
        onShowToast={showToast}
        userApiKey={userApiKey}
        consultations={consultations}
      />

      {/* Módulo de Atestado Médico Oficial SUS (A4 Retrato - Dias de Afastamento e CID-10) */}
      <MedicalCertificateModal
        isOpen={isMedicalCertificateModalOpen}
        onClose={() => {
          setIsMedicalCertificateModalOpen(false);
          setMedicalCertificateTargetConsultation(null);
          setMedicalCertificateInitialData(undefined);
        }}
        patient={medicalCertificateTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={medicalCertificateTargetConsultation || undefined}
        existingCertificate={medicalCertificateInitialData || medicalCertificateTargetConsultation?.medicalCertificate}
        onSave={(cert) => handleSaveMedicalCertificate(cert, medicalCertificateTargetConsultation?.id)}
        onShowToast={showToast}
        userApiKey={userApiKey}
        consultations={consultations}
      />

      {/* Módulo de Atestado de Comparecimento SUS (A4 Retrato - Nível Superior / Justificativa do Dia) */}
      <AttendanceCertificateModal
        isOpen={isAttendanceCertificateModalOpen}
        onClose={() => {
          setIsAttendanceCertificateModalOpen(false);
          setAttendanceCertificateTargetConsultation(null);
          setAttendanceCertificateInitialData(undefined);
        }}
        patient={attendanceCertificateTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={attendanceCertificateTargetConsultation || undefined}
        existingCertificate={attendanceCertificateInitialData || attendanceCertificateTargetConsultation?.attendanceCertificate}
        onSave={(cert) => handleSaveAttendanceCertificate(cert, attendanceCertificateTargetConsultation?.id)}
        onShowToast={showToast}
      />

      {/* Módulo de Anexo Iconográfico de Imagens e QR Code de Vídeos (A4) */}
      <ExamMediaModal
        isOpen={isExamMediaModalOpen}
        onClose={() => {
          setIsExamMediaModalOpen(false);
          setExamMediaTargetConsultation(null);
          setExamMediaInitialData(undefined);
        }}
        patient={examMediaTargetPatient || selectedPatient}
        currentUser={currentUser}
        initialConsultation={examMediaTargetConsultation || undefined}
        existingReport={examMediaInitialData || examMediaTargetConsultation?.examMedia}
        onSave={(report) => handleSaveExamMedia(report, examMediaTargetConsultation?.id)}
        onShowToast={showToast}
      />

      {/* Professional Schedule & Service Catalog Settings Modal */}
      {isScheduleSettingsOpen && (
        <ProfessionalScheduleSettingsModal
          isOpen={isScheduleSettingsOpen}
          onClose={() => {
            setIsScheduleSettingsOpen(false);
            setScheduleSettingsTargetUser(null);
            setScheduleSettingsInitialTab('schedule');
          }}
          user={scheduleSettingsTargetUser || currentUser}
          currentUser={currentUser}
          initialTab={scheduleSettingsInitialTab}
          onSaveUser={async (updatedUser) => {
            await handleUpdateUser(updatedUser);
            if (currentUser && currentUser.id === updatedUser.id) {
              setCurrentUser(updatedUser);
            }
          }}
          onShowToast={showToast}
        />
      )}

      {/* Add Patient to Reception Queue Modal */}
      <AddToQueueModal
        isOpen={isAddToQueueModalOpen}
        onClose={() => {
          setIsAddToQueueModalOpen(false);
          setPatientForQueue(null);
        }}
        patient={patientForQueue || selectedPatient}
        patients={patients}
        professionals={users}
        currentUserId={currentUser.id}
        initialProfessionalId={currentUser.id}
        onAddToQueue={(item) => {
          handleSaveQueueItem(item);
          setActiveTab('queue');
        }}
        onOpenNewPatient={() => {
          setIsAddToQueueModalOpen(false);
          setPatientToEdit(null);
          setIsPatientFormModalOpen(true);
        }}
        onShowToast={showToast}
      />

      {/* Call Patient Screen Modal */}
      <CallPatientModal
        isOpen={isCallPatientModalOpen}
        onClose={() => {
          setIsCallPatientModalOpen(false);
          setPatientToCall(null);
        }}
        queueItem={patientToCall}
        onStartConsultation={(item) => {
          handleStartConsultationFromQueue(item);
          setIsCallPatientModalOpen(false);
          setPatientToCall(null);
        }}
        onMarkAbandonment={(item) => {
          handleUpdateQueueItemStatus(item.id, 'abandoned');
          setIsCallPatientModalOpen(false);
          setPatientToCall(null);
        }}
        onCancelQueue={(item) => {
          handleUpdateQueueItemStatus(item.id, 'cancelled');
          setIsCallPatientModalOpen(false);
          setPatientToCall(null);
        }}
      />

      {/* Complete Consultation & Dispatch Modal */}
      <CompleteConsultationModal
        isOpen={isCompleteConsultationModalOpen}
        onClose={() => {
          setIsCompleteConsultationModalOpen(false);
          setConsultationDraftTexts(null);
        }}
        patient={selectedPatient}
        currentProfessional={currentUser}
        professionals={users}
        onFinalizeOnly={() => {
          handleFinalizeConsultationModal();
        }}
        onFinalizeAndAddToQueue={(targetProfessional, scheduledDate, scheduledTime, conductText) => {
          handleFinalizeConsultationModal(targetProfessional, scheduledDate, scheduledTime, conductText);
        }}
      />

      {/* Tela Chamar Público - Painel de TV da Sala de Espera */}
      {isPublicCallScreenOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
          <PublicQueueCallScreen
            queueItems={queueItems}
            appointments={appointments}
            professionals={users}
            systemSettings={systemSettings}
            onClose={() => setIsPublicCallScreenOpen(false)}
            onBackToPanel={() => setIsPublicCallScreenOpen(false)}
            isStandalone={false}
            onUpdateQueueItemStatus={handleUpdateQueueItemStatus}
          />
        </div>
      )}

      {/* Fallback Direct Print Sheet for A4 Landscape 2-Copy Prescription */}
      {prescriptionToPrint && !isPreviewModalOpen && !isPrescriptionModalOpen && (
        <div className="printable-prescription-target hidden print:block w-full">
          <PrescriptionPrintSheet prescription={prescriptionToPrint} isPrintOnly />
        </div>
      )}
    </div>
  );
}
