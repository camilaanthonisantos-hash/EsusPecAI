import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  X,
  Users,
  Key,
  ShieldCheck,
  ShieldAlert,
  Database,
  Building,
  UserCheck,
  UserX,
  PlusCircle,
  Trash2,
  FileEdit,
  Save,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  Check,
  Info,
  Sliders,
  FileText,
  UserPlus,
  RefreshCw,
  CreditCard,
  Calendar,
  Clock,
  Ban,
  DollarSign,
  Zap,
  AlertCircle,
  Edit3,
  MessageSquare,
  Send,
  Smartphone,
  Webhook,
  Copy,
  ExternalLink,
  Activity,
  ArrowRight,
  Radio,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Plus,
  Mic,
  TrendingUp,
  Award,
  Layers,
  Workflow,
  ListOrdered,
} from 'lucide-react';
import {
  User,
  UserRole,
  ProfessionId,
  ProfessionConfig,
  SystemSettings,
  AIModelId,
  Patient,
  Consultation,
  AVAILABLE_MODELS,
  ModelOption,
  SubscriptionPlan,
  AppAISectionsConfig,
  SectionAIOrchestrationConfig,
} from '../types';
import {
  CLINICAL_SECTIONS_META,
  ClinicalSectionKey,
  DEFAULT_SECTIONS_CONFIG,
  ensureSectionsConfig,
  getAvailableModelsForSection,
  sanitizeFallbackChain,
} from '../utils/aiOrchestrationConfig';
import {
  getFriendlyModelName,
  getModelProvider,
  getModelProviderBadge,
} from '../utils/aiModelHelper';
import {
  PROFESSIONS,
  ADMIN_MASTER_EMAIL,
  isUserAdmin,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_COUNCIL_BODIES,
  DEFAULT_WORKPLACE_PRESETS,
  parseProfessionalRegister,
  formatProfessionalRegister,
} from '../data/professions';
import { isProfessionalAvailableForBooking } from '../services/calendar';
import { resetUserSubscriptionAndPixForTesting } from '../services/firebase';
import { ProfessionalRegisterInputs } from './ProfessionalRegisterInputs';
import { WorkplaceSelectInput } from './WorkplaceSelectInput';
import { SpecularButton } from './SpecularButton';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  systemSettings: SystemSettings;
  patients: Patient[];
  consultations: Consultation[];
  plans?: SubscriptionPlan[];
  onUpdatePlan?: (plan: SubscriptionPlan) => void;
  onUpdateUserSubscription?: (
    userId: string,
    status: 'free' | 'pendente' | 'pago',
    durationDays: number,
    planName: string
  ) => void;
  onUpdateSystemSettings: (newSettings: SystemSettings) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (user: User) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  onEditConsultation: (consultation: Consultation) => void;
  onDeleteConsultation: (consultationId: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenKnowledgeBase?: () => void;
  activeKnowledgeCount?: number;
  onOpenScheduleSettings?: (targetUser: User, tab?: 'schedule' | 'services' | 'calendar_sync') => void;
  onSyncUsers?: () => Promise<void>;
}

type TabType = 'overview' | 'users' | 'webhooks' | 'api_keys' | 'data_management' | 'pec_params' | 'plans';

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  systemSettings,
  patients,
  consultations,
  plans = [],
  onUpdatePlan,
  onUpdateUserSubscription,
  onUpdateSystemSettings,
  onUpdateUser,
  onDeleteUser,
  onAddUser,
  onEditPatient,
  onDeletePatient,
  onEditConsultation,
  onDeleteConsultation,
  onShowToast,
  onOpenKnowledgeBase,
  activeKnowledgeCount,
  onOpenScheduleSettings,
  onSyncUsers,
}) => {
  const isAdmin = isUserAdmin(currentUser);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSyncing, setIsSyncing] = useState(false);

  // Search state for users and data management
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [dataSearchTerm, setDataSearchTerm] = useState('');
  const [dataFilterType, setDataFilterType] = useState<'all' | 'patients' | 'consultations'>('all');

  // Settings form state
  const [geminiApiKey, setGeminiApiKey] = useState(systemSettings.geminiApiKey || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(systemSettings.openaiApiKey || '');
  const [openrouterApiKey, setOpenrouterApiKey] = useState(systemSettings.openrouterApiKey || '');
  const [groqApiKey, setGroqApiKey] = useState(systemSettings.groqApiKey || '');
  const [defaultModel, setDefaultModel] = useState<AIModelId>(() => {
    const saved = systemSettings.defaultModel;
    if (saved === 'gemini-3.1-pro-preview' || saved === 'gemini-2.5-pro' || saved === 'gemini-pro') {
      return 'gemini-3.1-pro-preview';
    }
    return 'gemini-3.7-flash';
  });
  const [defaultCiapCode, setDefaultCiapCode] = useState(systemSettings.defaultCiapCode || '-69');
  const [defaultSigtapCode, setDefaultSigtapCode] = useState(
    systemSettings.defaultSigtapCode || '0301080445'
  );
  const [municipalityName, setMunicipalityName] = useState(
    systemSettings.municipalityName || 'Secretaria Municipal de Saúde'
  );
  const [defaultUnitName, setDefaultUnitName] = useState(
    systemSettings.defaultUnitName || 'UBS Central'
  );
  const [systemCustomInstructions, setSystemCustomInstructions] = useState(
    systemSettings.systemCustomInstructions || ''
  );
  const [n8nPixWebhookUrl, setN8nPixWebhookUrl] = useState(
    systemSettings.n8nPixWebhookUrl || ''
  );
  const [n8nAppointmentWebhookUrl, setN8nAppointmentWebhookUrl] = useState(
    systemSettings.n8nAppointmentWebhookUrl || ''
  );
  const [n8nSubscriptionWebhookUrl, setN8nSubscriptionWebhookUrl] = useState(
    systemSettings.n8nSubscriptionWebhookUrl || ''
  );
  const [n8nClinicalConsultationWebhookUrl, setN8nClinicalConsultationWebhookUrl] = useState(
    systemSettings.n8nClinicalConsultationWebhookUrl || ''
  );
  const [whatsappNotificationsEnabled, setWhatsappNotificationsEnabled] = useState(
    systemSettings.whatsappNotificationsEnabled !== false
  );
  const [evolutionApiUrl, setEvolutionApiUrl] = useState(
    systemSettings.evolutionApiUrl || 'https://evolutionapi24.mentoriajrs.com'
  );
  const [evolutionApiKey, setEvolutionApiKey] = useState(
    systemSettings.evolutionApiKey || '010F49F506A0-42AC-BE0F-B9AAAC4F5EAC'
  );
  const [evolutionInstanceName, setEvolutionInstanceName] = useState(
    systemSettings.evolutionInstanceName || 'Typebot_curso_tec'
  );
  const [dailyReminderHour, setDailyReminderHour] = useState(systemSettings.dailyReminderHour ?? 9);
  const [reminder30MinutesEnabled, setReminder30MinutesEnabled] = useState(systemSettings.reminder30MinutesEnabled !== false);
  const [reminder10MinutesEnabled, setReminder10MinutesEnabled] = useState(systemSettings.reminder10MinutesEnabled !== false);
  
  // Sections AI Orchestration & Fallback Cascade state
  const [sectionsConfig, setSectionsConfig] = useState<AppAISectionsConfig>(() =>
    ensureSectionsConfig(systemSettings.sectionsConfig)
  );
  const [activeSectionKey, setActiveSectionKey] = useState<ClinicalSectionKey>('soapPec');
  const [isAddingFallbackModel, setIsAddingFallbackModel] = useState(false);
  const [selectedFallbackCandidate, setSelectedFallbackCandidate] = useState('');

  // Custom models registered dynamically in system
  const [customModels, setCustomModels] = useState<ModelOption[]>(() => systemSettings.customModels || []);
  const [isRegisteringNewModelModalOpen, setIsRegisteringNewModelModalOpen] = useState(false);
  const [newModelIdInput, setNewModelIdInput] = useState('');
  const [newModelNameInput, setNewModelNameInput] = useState('');
  const [newModelProviderInput, setNewModelProviderInput] = useState<'openrouter' | 'gemini' | 'openai' | 'groq'>('openrouter');
  const [newModelBadgeInput, setNewModelBadgeInput] = useState('');
  const [newModelDescInput, setNewModelDescInput] = useState('');
  const [newModelTargetRole, setNewModelTargetRole] = useState<'primary' | 'fallback' | 'catalog_only'>('primary');

  // Keep in sync with systemSettings
  useEffect(() => {
    if (systemSettings.sectionsConfig) {
      setSectionsConfig(ensureSectionsConfig(systemSettings.sectionsConfig));
    }
    if (Array.isArray(systemSettings.customModels)) {
      setCustomModels(systemSettings.customModels);
    }
  }, [systemSettings.sectionsConfig, systemSettings.customModels]);
  
  // Test states for all webhooks
  const [isTestingPixWebhook, setIsTestingPixWebhook] = useState(false);
  const [pixTestResult, setPixTestResult] = useState<{
    success: boolean;
    message: string;
    durationMs?: number;
    hasPixKeys?: boolean;
    qrCode?: string;
    copiaECola?: string;
    idPix?: string;
    status?: number;
  } | null>(null);

  const [isTestingWhatsAppNotif, setIsTestingWhatsAppNotif] = useState(false);
  const [whatsAppTestResult, setWhatsAppTestResult] = useState<{ success: boolean; message: string; durationMs?: number } | null>(null);

  const [isTestingSubscriptionWebhook, setIsTestingSubscriptionWebhook] = useState(false);
  const [subscriptionTestResult, setSubscriptionTestResult] = useState<{ success: boolean; message: string; durationMs?: number } | null>(null);

  const [isTestingClinicalWebhook, setIsTestingClinicalWebhook] = useState(false);
  const [clinicalTestResult, setClinicalTestResult] = useState<{ success: boolean; message: string; durationMs?: number } | null>(null);

  const [isTestingEvolution, setIsTestingEvolution] = useState(false);
  const [evolutionTestResult, setEvolutionTestResult] = useState<{ success: boolean; message: string; state?: string; durationMs?: number } | null>(null);

  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const handleCopyEndpoint = (text: string, endpointId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(endpointId);
    onShowToast('info', 'URL copiada para a área de transferência!', 'Copiado');
    setTimeout(() => {
      setCopiedEndpoint((prev) => (prev === endpointId ? null : prev));
    }, 2500);
  };
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planSubscriberSearch, setPlanSubscriberSearch] = useState('');

  // User editing in modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editProfession, setEditProfession] = useState<ProfessionId>('enfermeiro');
  const [editCouncilBody, setEditCouncilBody] = useState<string>('COREN');
  const [editCouncilNumber, setEditCouncilNumber] = useState<string>('');
  const [editCouncilUf, setEditCouncilUf] = useState<string>('SP');

  const [isAddingUser, setIsAddingUser] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserProfession, setNewUserProfession] = useState<ProfessionId>('enfermeiro');
  const [newUserCouncilBody, setNewUserCouncilBody] = useState<string>('COREN');
  const [newUserCouncilNumber, setNewUserCouncilNumber] = useState<string>('');
  const [newUserCouncilUf, setNewUserCouncilUf] = useState<string>('SP');
  const [newUserWorkplace, setNewUserWorkplace] = useState(
    systemSettings.defaultUnitName || 'CAPS (Centro de Atenção Psicossocial)'
  );

  // Active user self-editing state
  const [isEditingMyProfile, setIsEditingMyProfile] = useState(false);
  const [myProfileName, setMyProfileName] = useState(currentUser.name || '');
  const [myProfileProfession, setMyProfileProfession] = useState<ProfessionId>(currentUser.profession || 'enfermeiro');
  const [myProfileCouncilBody, setMyProfileCouncilBody] = useState<string>(currentUser.councilBody || 'COREN');
  const [myProfileCouncilNumber, setMyProfileCouncilNumber] = useState<string>(currentUser.councilNumber || '');
  const [myProfileCouncilUf, setMyProfileCouncilUf] = useState<string>(currentUser.councilUf || 'SP');
  const [myProfileWorkplace, setMyProfileWorkplace] = useState<string>(currentUser.workplace || '');

  const handleStartEditingMyProfile = () => {
    setMyProfileName(currentUser.name || '');
    setMyProfileProfession(currentUser.profession || 'enfermeiro');
    const parsed = parseProfessionalRegister(currentUser.professionalRegister, currentUser.profession);
    setMyProfileCouncilBody(currentUser.councilBody || parsed.councilBody);
    setMyProfileCouncilNumber(currentUser.councilNumber || parsed.councilNumber);
    setMyProfileCouncilUf(currentUser.councilUf || parsed.councilUf);
    setMyProfileWorkplace(currentUser.workplace || '');
    setIsEditingMyProfile(true);
  };

  const handleSaveMyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedReg = formatProfessionalRegister(
      myProfileCouncilBody,
      myProfileCouncilNumber,
      myProfileCouncilUf
    );
    const updatedUser: User = {
      ...currentUser,
      name: myProfileName.trim() || currentUser.name,
      profession: myProfileProfession,
      professionalRegister: formattedReg,
      councilBody: myProfileCouncilBody.trim().toUpperCase(),
      councilNumber: myProfileCouncilNumber.trim(),
      councilUf: myProfileCouncilUf.trim().toUpperCase(),
      workplace: myProfileWorkplace.trim(),
    };
    onUpdateUser(updatedUser);
    setIsEditingMyProfile(false);
    onShowToast('success', 'Seus dados profissionais foram salvos e sincronizados com sucesso!', 'Perfil Atualizado');
  };

  // Dynamic lists of professions, council bodies, and workplaces with persistence in systemSettings & Firestore
  const allProfessionsMap: Record<string, ProfessionConfig> = {
    ...PROFESSIONS,
    ...(systemSettings.customProfessions?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}) || {}),
  };

  const allCouncilBodies: string[] = Array.from(
    new Set([
      ...DEFAULT_COUNCIL_BODIES,
      ...(systemSettings.customCouncilBodies || []),
    ])
  );

  const allWorkplacesList: string[] = Array.from(
    new Set([
      ...DEFAULT_WORKPLACE_PRESETS,
      ...(systemSettings.customWorkplaces || []),
    ])
  );

  // Start editing user with initial values cleanly populated
  const handleStartEditingUser = (u: User) => {
    setEditingUser(u);
    setEditProfession(u.profession);
    const parsed = parseProfessionalRegister(
      u.professionalRegister,
      u.profession
    );
    setEditCouncilBody(u.councilBody || parsed.councilBody);
    setEditCouncilNumber(u.councilNumber || parsed.councilNumber);
    setEditCouncilUf(u.councilUf || parsed.councilUf);
  };

  const handleAddNewProfession = (newProf: ProfessionConfig) => {
    const updatedCustom = [...(systemSettings.customProfessions || []), newProf];
    const updatedSettings: SystemSettings = {
      ...systemSettings,
      customProfessions: updatedCustom,
      updatedAt: Date.now(),
      updatedBy: currentUser.email,
    };
    onUpdateSystemSettings(updatedSettings);
    onShowToast(
      'success',
      `Especialidade "${newProf.name}" adicionada ao sistema!`,
      'Especialidade Cadastrada'
    );
  };

  const handleAddNewCouncilBody = (newCouncil: string) => {
    const clean = newCouncil.trim().toUpperCase();
    const updatedCustom = Array.from(
      new Set([...(systemSettings.customCouncilBodies || []), clean])
    );
    const updatedSettings: SystemSettings = {
      ...systemSettings,
      customCouncilBodies: updatedCustom,
      updatedAt: Date.now(),
      updatedBy: currentUser.email,
    };
    onUpdateSystemSettings(updatedSettings);
    onShowToast('success', `Órgão "${clean}" adicionado à lista!`, 'Órgão Cadastrado');
  };

  const handleAddNewWorkplace = (newWorkplace: string) => {
    const clean = newWorkplace.trim();
    if (!clean) return;
    const updatedCustom = Array.from(
      new Set([...(systemSettings.customWorkplaces || []), clean])
    );
    const updatedSettings: SystemSettings = {
      ...systemSettings,
      customWorkplaces: updatedCustom,
      updatedAt: Date.now(),
      updatedBy: currentUser.email,
    };
    onUpdateSystemSettings(updatedSettings);
    onShowToast(
      'success',
      `Unidade de saúde "${clean}" cadastrada e salva no Banco de Dados!`,
      'Unidade Salva no BD'
    );
  };

  // Testing API key state
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingGroqKey, setIsTestingGroqKey] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Model Dropdown state
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const allModelsCatalog = useMemo(() => {
    const map = new Map<string, ModelOption>();
    for (const m of AVAILABLE_MODELS) {
      map.set(m.id, m);
    }
    for (const cm of customModels) {
      if (cm && cm.id) map.set(cm.id, cm);
    }
    return Array.from(map.values());
  }, [customModels]);

  const filteredModels = allModelsCatalog.filter(m =>
    m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    m.badge.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const term = userSearchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.professionalRegister && u.professionalRegister.toLowerCase().includes(term)) ||
      (u.workplace && u.workplace.toLowerCase().includes(term)) ||
      (allProfessionsMap[u.profession]?.name.toLowerCase().includes(term))
    );
  });

  // Handlers for Sections AI Contingency Cascade Builder with instant persistence
  const handleSetSectionPrimary = (secKey: ClinicalSectionKey, newPrimaryId: string) => {
    setSectionsConfig((prev) => {
      const current = prev[secKey] || DEFAULT_SECTIONS_CONFIG[secKey];
      const oldPrimary = current.primaryModelId;
      // When primary changes, ensure previous primary is kept as 1st fallback so resilience is preserved
      const baseChain = (oldPrimary && oldPrimary !== newPrimaryId)
        ? [oldPrimary, ...current.fallbackChain.filter((m) => m !== newPrimaryId && m !== oldPrimary)]
        : current.fallbackChain.filter((m) => m !== newPrimaryId);
      const sanitized = sanitizeFallbackChain(newPrimaryId, baseChain);
      const updated = {
        ...prev,
        [secKey]: {
          ...current,
          primaryModelId: newPrimaryId,
          fallbackChain: sanitized,
        },
      };
      // Persist immediately in settings and Firestore
      const updatedSettings: SystemSettings = {
        ...systemSettings,
        sectionsConfig: ensureSectionsConfig(updated),
        customModels,
      };
      onUpdateSystemSettings(updatedSettings);
      return updated;
    });
    onShowToast('success', `Modelo primário da seção atualizado para "${getFriendlyModelName(newPrimaryId)}" e persistido na cascata resiliente!`, 'Modelo Primário Salvo');
  };

  const handleMoveFallbackItem = (secKey: ClinicalSectionKey, index: number, direction: 'up' | 'down') => {
    setSectionsConfig((prev) => {
      const current = prev[secKey] || DEFAULT_SECTIONS_CONFIG[secKey];
      const chain = [...current.fallbackChain];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= chain.length) return prev;
      const tmp = chain[index];
      chain[index] = chain[targetIdx];
      chain[targetIdx] = tmp;
      const updated = {
        ...prev,
        [secKey]: {
          ...current,
          fallbackChain: chain,
        },
      };
      // Persist immediately
      const updatedSettings: SystemSettings = {
        ...systemSettings,
        sectionsConfig: ensureSectionsConfig(updated),
        customModels,
      };
      onUpdateSystemSettings(updatedSettings);
      return updated;
    });
  };

  const handleRemoveFallbackItem = (secKey: ClinicalSectionKey, index: number) => {
    setSectionsConfig((prev) => {
      const current = prev[secKey] || DEFAULT_SECTIONS_CONFIG[secKey];
      const chain = current.fallbackChain.filter((_, i) => i !== index);
      const updated = {
        ...prev,
        [secKey]: {
          ...current,
          fallbackChain: chain,
        },
      };
      // Persist immediately
      const updatedSettings: SystemSettings = {
        ...systemSettings,
        sectionsConfig: ensureSectionsConfig(updated),
        customModels,
      };
      onUpdateSystemSettings(updatedSettings);
      return updated;
    });
  };

  const handleAddFallbackModel = (secKey: ClinicalSectionKey, modelId: string) => {
    if (!modelId) return;
    setSectionsConfig((prev) => {
      const current = prev[secKey] || DEFAULT_SECTIONS_CONFIG[secKey];
      if (modelId === current.primaryModelId || current.fallbackChain.includes(modelId)) {
        return prev;
      }
      const updated = {
        ...prev,
        [secKey]: {
          ...current,
          fallbackChain: [...current.fallbackChain, modelId],
        },
      };
      // Persist immediately
      const updatedSettings: SystemSettings = {
        ...systemSettings,
        sectionsConfig: ensureSectionsConfig(updated),
        customModels,
      };
      onUpdateSystemSettings(updatedSettings);
      return updated;
    });
    setSelectedFallbackCandidate('');
    setIsAddingFallbackModel(false);
    onShowToast('success', `Modelo "${getFriendlyModelName(modelId)}" adicionado e persistido na cascata de contingência!`, 'Fallback Adicionado');
  };

  const handleRestoreSectionDefaults = (secKey: ClinicalSectionKey) => {
    const def = DEFAULT_SECTIONS_CONFIG[secKey];
    setSectionsConfig((prev) => {
      const updated = {
        ...prev,
        [secKey]: {
          ...def,
          fallbackChain: [...def.fallbackChain],
        },
      };
      const updatedSettings: SystemSettings = {
        ...systemSettings,
        sectionsConfig: ensureSectionsConfig(updated),
        customModels,
      };
      onUpdateSystemSettings(updatedSettings);
      return updated;
    });
    onShowToast('info', `Configuração recomendada da seção restaurada e persistida!`, 'Padrão Restaurado');
  };

  const handleRegisterNewModel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawId = newModelIdInput.trim();
    if (!rawId) {
      onShowToast('error', 'Informe o identificador / slug do modelo (ex: inclusionai/ling-3.0-flash-sante:free).', 'Slug Obrigatório');
      return;
    }

    // Format ID with provider prefix if needed
    let fullId = rawId;
    if (newModelProviderInput === 'openrouter' && !fullId.startsWith('openrouter:')) {
      fullId = `openrouter:${fullId}`;
    } else if (newModelProviderInput === 'openai' && !fullId.startsWith('openai:')) {
      fullId = `openai:${fullId}`;
    } else if (newModelProviderInput === 'groq' && !fullId.startsWith('groq:')) {
      fullId = `groq:${fullId}`;
    }

    const friendlyName = newModelNameInput.trim() || getFriendlyModelName(fullId);
    const badge = newModelBadgeInput.trim() || (newModelProviderInput === 'openrouter' ? 'OpenRouter Free' : 'Personalizado');

    const newOption: ModelOption = {
      id: fullId,
      name: friendlyName,
      badge,
      description: newModelDescInput.trim() || `Modelo ${friendlyName} cadastrado no sistema.`,
      speed: 'Rápido',
      recommendedFor: 'Uso clínico e contingência',
      provider: newModelProviderInput,
      isAudioCapable: fullId.includes('whisper'),
    };

    const updatedCustomList = [...customModels.filter((m) => m.id !== fullId), newOption];
    setCustomModels(updatedCustomList);

    // Apply to current active section based on selected target role
    let updatedSections = { ...sectionsConfig };
    const current = sectionsConfig[activeSectionKey] || DEFAULT_SECTIONS_CONFIG[activeSectionKey];

    if (newModelTargetRole === 'primary') {
      const oldPrimary = current.primaryModelId;
      const baseChain = (oldPrimary && oldPrimary !== fullId)
        ? [oldPrimary, ...current.fallbackChain.filter((m) => m !== fullId && m !== oldPrimary)]
        : current.fallbackChain.filter((m) => m !== fullId);
      const sanitized = sanitizeFallbackChain(fullId, baseChain);
      updatedSections = {
        ...sectionsConfig,
        [activeSectionKey]: {
          ...current,
          primaryModelId: fullId,
          fallbackChain: sanitized,
        },
      };
      setSectionsConfig(updatedSections);
    } else {
      // Role is 'fallback' or 'catalog_only': persist in resilient cascade
      if (fullId !== current.primaryModelId && !current.fallbackChain.includes(fullId)) {
        updatedSections = {
          ...sectionsConfig,
          [activeSectionKey]: {
            ...current,
            fallbackChain: [...current.fallbackChain, fullId],
          },
        };
        setSectionsConfig(updatedSections);
      }
    }

    // Persist immediately in settings
    const updatedSettings: SystemSettings = {
      ...systemSettings,
      customModels: updatedCustomList,
      sectionsConfig: ensureSectionsConfig(updatedSections),
    };
    onUpdateSystemSettings(updatedSettings);

    setIsRegisteringNewModelModalOpen(false);
    setNewModelIdInput('');
    setNewModelNameInput('');
    setNewModelBadgeInput('');
    setNewModelDescInput('');

    onShowToast('success', `Modelo "${friendlyName}" incluído com sucesso no catálogo e na cascata resiliente!`, 'Modelo Adicionado');
  };

  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      onShowToast('error', 'Apenas administradores podem alterar configurações gerais.', 'Acesso Negado');
      return;
    }

    const updated: SystemSettings = {
      ...systemSettings,
      geminiApiKey: geminiApiKey.trim(),
      openaiApiKey: openaiApiKey.trim(),
      openrouterApiKey: openrouterApiKey.trim(),
      groqApiKey: groqApiKey.trim(),
      defaultModel,
      sectionsConfig: ensureSectionsConfig(sectionsConfig),
      customModels: customModels,
      defaultCiapCode: defaultCiapCode.trim() || '-69',
      defaultSigtapCode: defaultSigtapCode.trim() || '0301080445',
      municipalityName: municipalityName.trim(),
      defaultUnitName: defaultUnitName.trim(),
      systemCustomInstructions: systemCustomInstructions.trim(),
      n8nPixWebhookUrl: n8nPixWebhookUrl.trim(),
      n8nAppointmentWebhookUrl: n8nAppointmentWebhookUrl.trim(),
      n8nSubscriptionWebhookUrl: n8nSubscriptionWebhookUrl.trim(),
      n8nClinicalConsultationWebhookUrl: n8nClinicalConsultationWebhookUrl.trim(),
      whatsappNotificationsEnabled,
      evolutionApiUrl: evolutionApiUrl.trim(),
      evolutionApiKey: evolutionApiKey.trim(),
      evolutionInstanceName: evolutionInstanceName.trim(),
      dailyReminderHour: Number(dailyReminderHour) || 9,
      reminder30MinutesEnabled,
      reminder10MinutesEnabled,
      updatedAt: Date.now(),
      updatedBy: currentUser.email,
    };

    localStorage.setItem('pec_groq_api_key', groqApiKey.trim());
    onUpdateSystemSettings(updated);
    onShowToast('success', 'Configurações gerais e de Webhooks salvas com sucesso!', 'Configurações Atualizadas');
  };

  const handleTestPixWebhook = async () => {
    if (!n8nPixWebhookUrl.trim()) {
      onShowToast('error', 'Informe a URL do Webhook n8n para testar a geração de PIX.', 'URL Ausente');
      return;
    }

    setIsTestingPixWebhook(true);
    setPixTestResult(null);

    try {
      const res = await fetch('/api/webhook/test-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: n8nPixWebhookUrl.trim(),
          customPayload: {
            userName: `${currentUser.name || 'Usuário'} (Teste Conexão)`,
            Email: currentUser.email,
            userCpf: '11144477735',
            userPhone: '11999998888',
            'Nome-servico': 'Plano Mensal - Teste de Webhook n8n',
            Valor: 1990,
            valorFormatado: '19.90',
            duracaoDias: 30,
            agendamento_id: currentUser.id,
            subscription_id: `test_sub_${Date.now()}`,
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setPixTestResult({
          success: true,
          status: data.status || 200,
          durationMs: data.durationMs,
          hasPixKeys: data.hasPixKeys,
          qrCode: data.qrCode,
          copiaECola: data.copiaECola,
          idPix: data.idPix,
          message: data.message || `Webhook n8n respondeu com sucesso em ${data.durationMs || 0}ms!`,
        });
        onShowToast('success', `Webhook de PIX respondeu com sucesso (${data.durationMs || 0}ms)!`, 'PIX Validado');
      } else {
        const errorMsg = data?.message || data?.error || `Falha na comunicação HTTP ${res.status}`;
        setPixTestResult({
          success: false,
          status: res.status,
          durationMs: data?.durationMs,
          message: errorMsg,
        });
        onShowToast('error', errorMsg, 'Falha no Webhook PIX');
      }
    } catch (err: any) {
      setPixTestResult({
        success: false,
        message: `Erro ao contatar servidor de teste: ${err?.message || 'Falha de conexão'}`,
      });
      onShowToast('error', 'Erro ao disparar teste de Webhook PIX.', 'Erro de Conexão');
    } finally {
      setIsTestingPixWebhook(false);
    }
  };

  const handleTestSubscriptionWebhook = async () => {
    if (!n8nSubscriptionWebhookUrl.trim()) {
      onShowToast('error', 'Informe a URL do Webhook n8n para eventos de assinatura.', 'URL Ausente');
      return;
    }

    setIsTestingSubscriptionWebhook(true);
    setSubscriptionTestResult(null);

    try {
      const res = await fetch('/api/webhook/test-generic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: n8nSubscriptionWebhookUrl.trim(),
          serviceName: 'Eventos de Assinatura & Usuários SaaS',
          customPayload: {
            event: 'subscription_test_event',
            timestamp: Date.now(),
            user: {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role: currentUser.role,
              subscription_status: currentUser.subscription_status || 'free',
            },
            plan: {
              id: 'plano-mensal',
              name: 'Plano Profissional Mensal',
              price: 19.9,
              durationDays: 30,
            },
            message: 'Teste de disparo de evento de assinatura para n8n',
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setSubscriptionTestResult({
          success: true,
          durationMs: data.durationMs,
          message: data.message || 'Webhook de assinaturas respondeu com sucesso!',
        });
        onShowToast('success', 'Webhook de assinaturas validado com sucesso!', 'Assinatura n8n');
      } else {
        setSubscriptionTestResult({
          success: false,
          durationMs: data?.durationMs,
          message: data?.message || `Erro HTTP ${res.status}`,
        });
        onShowToast('error', 'Falha ao testar webhook de assinaturas.', 'Erro Webhook');
      }
    } catch (err: any) {
      setSubscriptionTestResult({
        success: false,
        message: `Falha na conexão: ${err?.message || 'Erro de rede'}`,
      });
      onShowToast('error', 'Erro ao conectar ao webhook.', 'Erro');
    } finally {
      setIsTestingSubscriptionWebhook(false);
    }
  };

  const handleTestClinicalWebhook = async () => {
    if (!n8nClinicalConsultationWebhookUrl.trim()) {
      onShowToast('error', 'Informe a URL do Webhook n8n para prontuários clínicos.', 'URL Ausente');
      return;
    }

    setIsTestingClinicalWebhook(true);
    setClinicalTestResult(null);

    try {
      const res = await fetch('/api/webhook/test-generic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: n8nClinicalConsultationWebhookUrl.trim(),
          serviceName: 'Exportação de Prontuários Clínicos e-SUS PEC',
          customPayload: {
            event: 'clinical_record_export_test',
            timestamp: Date.now(),
            professional: {
              name: currentUser.name,
              email: currentUser.email,
              profession: currentUser.profession,
              register: currentUser.professionalRegister,
            },
            patient: {
              name: 'Paciente Exemplo Teste',
              cns: '799999999990001',
              cpf: '123.456.789-00',
            },
            clinicalData: {
              soapType: 'SOAP Completo Multiprofissional',
              summary: 'Consulta de teste gerada pelo painel de controle de webhooks.',
            },
          },
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setClinicalTestResult({
          success: true,
          durationMs: data.durationMs,
          message: data.message || 'Webhook de prontuários respondeu com sucesso!',
        });
        onShowToast('success', 'Webhook de prontuários validado com sucesso!', 'Prontuários n8n');
      } else {
        setClinicalTestResult({
          success: false,
          durationMs: data?.durationMs,
          message: data?.message || `Erro HTTP ${res.status}`,
        });
        onShowToast('error', 'Falha ao testar webhook de prontuários.', 'Erro Webhook');
      }
    } catch (err: any) {
      setClinicalTestResult({
        success: false,
        message: `Falha na conexão: ${err?.message || 'Erro de rede'}`,
      });
      onShowToast('error', 'Erro ao conectar ao webhook.', 'Erro');
    } finally {
      setIsTestingClinicalWebhook(false);
    }
  };

  const handleTestEvolutionApi = async () => {
    if (!evolutionApiUrl.trim() || !evolutionApiKey.trim() || !evolutionInstanceName.trim()) {
      onShowToast('error', 'Preencha URL da Evolution API, API Key e Nome da Instância.', 'Campos Incompletos');
      return;
    }

    setIsTestingEvolution(true);
    setEvolutionTestResult(null);

    try {
      const res = await fetch('/api/evolution/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: evolutionApiUrl.trim(),
          apiKey: evolutionApiKey.trim(),
          instanceName: evolutionInstanceName.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setEvolutionTestResult({
          success: true,
          state: data.state,
          durationMs: data.durationMs,
          message: data.message || `Instância conectada na Evolution API (${data.state})!`,
        });
        onShowToast('success', `Evolution API conectada (Instância: ${data.state})!`, 'WhatsApp Conectado');
      } else {
        setEvolutionTestResult({
          success: false,
          durationMs: data?.durationMs,
          message: data?.message || `Erro HTTP ${res.status} ao consultar Evolution API`,
        });
        onShowToast('error', 'Falha na conexão com Evolution API.', 'Erro Evolution');
      }
    } catch (err: any) {
      setEvolutionTestResult({
        success: false,
        message: `Erro ao testar Evolution API: ${err?.message || 'Falha de rede'}`,
      });
      onShowToast('error', 'Erro ao contatar Evolution API.', 'Erro');
    } finally {
      setIsTestingEvolution(false);
    }
  };

  const handleTestWhatsAppWebhook = async () => {
    if (!n8nAppointmentWebhookUrl.trim()) {
      onShowToast('error', 'Informe a URL do Webhook n8n para testar a notificação.', 'URL Ausente');
      return;
    }

    setIsTestingWhatsAppNotif(true);
    setWhatsAppTestResult(null);

    try {
      const testPayload = {
        event: 'appointment_confirmed',
        payload: {
          event: 'appointment_confirmed',
          timestamp: Date.now(),
          appointmentId: `teste-${Date.now()}`,
          patient: {
            name: 'Paciente Teste (Sistema)',
            phone: '11999998888',
            phoneWhatsApp: '5511999998888',
          },
          appointment: {
            id: `teste-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            dateFormatted: new Date().toLocaleDateString('pt-BR'),
            startTime: '14:30',
            timeFormatted: '14:30',
            professionalName: currentUser.name || 'Profissional de Saúde',
            serviceName: 'Consulta Teste de Notificação',
            servicePrice: 0,
            servicePriceFormatted: 'R$ 0,00',
            location: defaultUnitName || 'Unidade Básica de Saúde',
            status: 'agendado',
          },
          buttons: [
            { id: 'btn_cancelar_teste', label: '❌ Cancelar', action: 'cancel' },
            { id: 'btn_reagendar_teste', label: '🔄 Reagendar', action: 'reschedule' },
            { id: 'btn_duvidas_teste', label: '❓ Dúvidas', action: 'help' },
          ],
          suggestedMessage: 'Teste de integração WhatsApp (Evo API / n8n) realizado com sucesso!',
        },
        webhookUrl: n8nAppointmentWebhookUrl.trim(),
        whatsappEnabled: true,
      };

      const res = await fetch('/api/appointments/notify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setWhatsAppTestResult({
          success: true,
          message: data.forwardedToN8n
            ? 'Webhook n8n disparado com sucesso! Resposta HTTP 200 recebida.'
            : 'Notificação processada internamente no servidor.',
        });
        onShowToast('success', 'Disparo de teste realizado com sucesso!', 'Teste WhatsApp');
      } else {
        setWhatsAppTestResult({
          success: false,
          message: data?.error || `Falha no envio HTTP ${res.status}`,
        });
        onShowToast('error', 'Falha ao testar webhook de notificação.', 'Erro Teste');
      }
    } catch (err: any) {
      setWhatsAppTestResult({
        success: false,
        message: `Erro ao contatar webhook: ${err?.message || 'Falha de rede'}`,
      });
      onShowToast('error', 'Erro ao disparar teste de notificação.', 'Erro');
    } finally {
      setIsTestingWhatsAppNotif(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!geminiApiKey.trim()) {
      onShowToast('error', 'Insira uma chave de API para realizar o teste.', 'Chave Vazia');
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: geminiApiKey.trim(),
          model: defaultModel || 'gemini-3.6-flash',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        setTestResult({
          success: true,
          message: data.message || 'Chave de API válida e conectada com sucesso à Gemini API!',
        });
        onShowToast('success', 'Chave de API validada com sucesso!', 'Conexão Bem-Sucedida');
      } else {
        const errMsg = data?.error || `Erro HTTP ${response.status}`;
        setTestResult({ success: false, message: `Falha na validação: ${errMsg}` });
        onShowToast('error', `Chave inválida: ${errMsg}`, 'Falha de Conexão');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Erro de rede: ${err?.message || 'Falha ao conectar'}` });
      onShowToast('error', 'Não foi possível contatar o servidor da Google AI.', 'Erro de Rede');
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleTestGroqKey = async () => {
    if (!groqApiKey.trim()) {
      onShowToast('error', 'Insira uma chave da Groq para realizar o teste.', 'Chave Vazia');
      return;
    }

    setIsTestingGroqKey(true);
    setGroqTestResult(null);

    try {
      const response = await fetch('/api/groq/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: groqApiKey.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        setGroqTestResult({
          success: true,
          message: data.message || 'Chave da Groq válida e conectada com sucesso!',
        });
        localStorage.setItem('pec_groq_api_key', groqApiKey.trim());
        onShowToast('success', 'Chave da Groq validada com sucesso!', 'Conexão Groq OK');
      } else {
        const errMsg = data?.error || `Erro HTTP ${response.status}`;
        setGroqTestResult({ success: false, message: `Falha na validação: ${errMsg}` });
        onShowToast('error', `Chave inválida: ${errMsg}`, 'Falha Groq');
      }
    } catch (err: any) {
      setGroqTestResult({ success: false, message: `Erro de rede: ${err?.message || 'Falha ao conectar'}` });
      onShowToast('error', 'Erro de conexão ao validar chave Groq.', 'Falha de Rede');
    } finally {
      setIsTestingGroqKey(false);
    }
  };

  const handleToggleUserRole = (targetUser: User) => {
    if (!isAdmin) {
      onShowToast('error', 'Apenas administradores podem alterar permissões de usuários.', 'Acesso Negado');
      return;
    }

    // Protection: Master admin email must remain admin
    if (
      targetUser.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase() &&
      targetUser.role === 'admin'
    ) {
      onShowToast(
        'error',
        'O administrador principal (jerime.rego@gmail.com) não pode ter seus privilégios removidos.',
        'Operação Proibida'
      );
      return;
    }

    const newRole: UserRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const updated: User = {
      ...targetUser,
      role: newRole,
    };

    onUpdateUser(updated);
    onShowToast(
      'success',
      `O usuário ${targetUser.name} agora é ${newRole === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO COMUM'}.`,
      'Perfil Atualizado'
    );
  };

  const handleToggleFreeTrial = (targetUser: User) => {
    if (!isAdmin) {
      onShowToast('error', 'Apenas administradores podem gerenciar cotas de teste.', 'Acesso Negado');
      return;
    }

    const isCurrentlyFreeAvailable = !targetUser.free_used;
    const newFreeUsed = isCurrentlyFreeAvailable ? true : false;

    const updated: User = {
      ...targetUser,
      free_used: newFreeUsed,
      subscription_status: targetUser.subscription_status === 'pago' ? 'pago' : 'free',
    };

    onUpdateUser(updated);

    if (newFreeUsed) {
      onShowToast(
        'info',
        `Cota de teste removida para ${targetUser.name}. O acesso foi bloqueado para exigir plano.`,
        'Cota Removida'
      );
    } else {
      onShowToast(
        'success',
        `Cota de teste renovada para ${targetUser.name}! Agora ele pode gerar mais 1 prontuário grátis.`,
        'Cota Renovada'
      );
    }
  };

  // State for in-app deletion confirmation (replacing window.confirm which is blocked in iframes)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    type: 'user' | 'patient' | 'consultation';
    id: string;
    title: string;
    description: string;
    targetName: string;
  } | null>(null);

  const handleDeleteUserClick = (targetUser: User) => {
    if (!isAdmin) {
      onShowToast('error', 'Apenas administradores podem excluir usuários.', 'Acesso Negado');
      return;
    }

    if (targetUser.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()) {
      onShowToast(
        'error',
        'O administrador principal (jerime.rego@gmail.com) não pode ser excluído do sistema.',
        'Operação Proibida'
      );
      return;
    }

    if (targetUser.id === currentUser.id) {
      onShowToast(
        'error',
        'Você não pode excluir o usuário com o qual está conectado no momento.',
        'Ação Não Permitida'
      );
      return;
    }

    setConfirmDeleteModal({
      type: 'user',
      id: targetUser.id,
      title: 'Excluir Usuário do Sistema',
      description: 'O usuário será permanentemente removido e não terá mais acesso à plataforma. Esta operação é sincronizada no Cloud Firestore.',
      targetName: `${targetUser.name} (${targetUser.email})`,
    });
  };

  const handleDeletePatientClick = (patient: Patient) => {
    if (!isAdmin) {
      onShowToast('error', 'Apenas administradores podem excluir registros de pacientes.', 'Acesso Negado');
      return;
    }

    setConfirmDeleteModal({
      type: 'patient',
      id: patient.id,
      title: 'Excluir Paciente & Histórico',
      description: 'Esta ação é irreversível e excluirá o cadastro do paciente e todo o seu histórico multiprofissional.',
      targetName: `${patient.fullName} (CNS: ${patient.cns || 'S/N'})`,
    });
  };

  const handleDeleteConsultationClick = (consultation: Consultation) => {
    if (!isAdmin) {
      onShowToast('error', 'Apenas administradores podem excluir registros de atendimentos.', 'Acesso Negado');
      return;
    }

    setConfirmDeleteModal({
      type: 'consultation',
      id: consultation.id,
      title: 'Excluir Atendimento Clínico',
      description: `Atendimento registrado em ${new Date(consultation.timestamp).toLocaleDateString('pt-BR')} por ${consultation.authorName}. Esta ação não pode ser desfeita.`,
      targetName: `Prontuário de ${consultation.patientName}`,
    });
  };

  const handleConfirmExecuteDelete = () => {
    if (!confirmDeleteModal) return;

    if (confirmDeleteModal.type === 'user') {
      onDeleteUser(confirmDeleteModal.id);
      onShowToast('success', `Usuário excluído com sucesso.`, 'Usuário Removido');
    } else if (confirmDeleteModal.type === 'patient') {
      onDeletePatient(confirmDeleteModal.id);
      onShowToast('success', `Paciente excluído com sucesso.`, 'Paciente Removido');
    } else if (confirmDeleteModal.type === 'consultation') {
      onDeleteConsultation(confirmDeleteModal.id);
      onShowToast('success', 'Atendimento excluído com sucesso.', 'Registro Removido');
    }

    setConfirmDeleteModal(null);
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!isAdmin) {
      onShowToast('error', 'Apenas administradores podem editar outros usuários.', 'Acesso Negado');
      return;
    }

    if (!editingUser.name.trim() || !editingUser.email.trim()) {
      onShowToast('error', 'Nome e e-mail não podem ficar vazios.', 'Campos Obrigatórios');
      return;
    }

    // If master admin email, force role admin
    const finalRole: UserRole =
      editingUser.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
        ? 'admin'
        : editingUser.role;

    const formattedRegister = formatProfessionalRegister(
      editCouncilBody,
      editCouncilNumber,
      editCouncilUf
    );

    const updated: User = {
      ...editingUser,
      name: editingUser.name.trim(),
      email: editingUser.email.trim().toLowerCase(),
      workplace: editingUser.workplace?.trim() || 'UBS Central',
      role: finalRole,
      profession: editProfession,
      councilBody: editCouncilBody,
      councilNumber: editCouncilNumber.trim(),
      councilUf: editCouncilUf.trim().toUpperCase(),
      professionalRegister: formattedRegister,
    };

    onUpdateUser(updated);
    setEditingUser(null);
    onShowToast('success', `Cadastro de ${updated.name} atualizado com sucesso!`, 'Usuário Atualizado');
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserName.trim() || !newUserEmail.trim()) {
      onShowToast('error', 'Nome e e-mail são obrigatórios.', 'Campos Vazios');
      return;
    }

    // Automatically enforce role rules: default to 'user', only admin if explicitly chosen
    const finalRole: UserRole =
      newUserEmail.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
        ? 'admin'
        : newUserRole || 'user';

    const formattedRegister = formatProfessionalRegister(
      newUserCouncilBody,
      newUserCouncilNumber,
      newUserCouncilUf
    );

    const newUser: User = {
      id: `user-${newUserProfession}-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: finalRole,
      profession: newUserProfession,
      councilBody: newUserCouncilBody,
      councilNumber: newUserCouncilNumber,
      councilUf: newUserCouncilUf,
      professionalRegister: formattedRegister,
      workplace: newUserWorkplace.trim() || 'UBS Central',
      createdAt: Date.now(),
    };

    onAddUser(newUser);
    setIsAddingUser(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserCouncilNumber('');
    onShowToast(
      'success',
      `Usuário ${newUser.name} cadastrado como ${newUser.role === 'admin' ? 'Administrador' : 'Usuário Comum'}.`,
      'Novo Usuário Criado'
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="system-settings-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            id="system-settings-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                      Configurações do Sistema & Gestão Geral
                    </h2>
                    {isAdmin ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Administrador Geral</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>Usuário Comum (Profissional)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gerenciamento de usuários, regras de acesso (RBAC), chaves de IA, pacientes e prontuários
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-system-settings-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1 sm:gap-2 overflow-x-auto">
              <button
                type="button"
                id="tab-settings-overview"
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Visão Geral & Meu Perfil</span>
              </button>

              <button
                type="button"
                id="tab-settings-users"
                onClick={() => setActiveTab('users')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Gestão de Usuários (RBAC)</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 rounded-md bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px]">
                    {users.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="tab-settings-api-keys"
                onClick={() => setActiveTab('api_keys')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'api_keys'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Chaves de API & Inteligência Artificial</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  id="tab-settings-webhooks"
                  onClick={() => setActiveTab('webhooks')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'webhooks'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Webhook className="w-4 h-4 text-amber-500" />
                  <span>Webhooks & n8n</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                    n8n
                  </span>
                </button>
              )}

              <button
                type="button"
                id="tab-settings-data-management"
                onClick={() => setActiveTab('data_management')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'data_management'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Gestão Global de Dados</span>
              </button>

              <button
                type="button"
                id="tab-settings-pec-params"
                onClick={() => setActiveTab('pec_params')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'pec_params'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Parâmetros SUS / PEC</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  id="tab-settings-plans"
                  onClick={() => setActiveTab('plans')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'plans'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>Planos & Assinaturas</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                    SaaS
                  </span>
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: VISÃO GERAL & MEU PERFIL */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Privilege Card */}
                  <div
                    className={`p-5 rounded-3xl border ${
                      isAdmin
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-2xl ${
                          isAdmin ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                          {isAdmin
                            ? 'Você possui Privilégios de Administrador Geral'
                            : 'Você está conectado como Usuário Comum (Profissional de Saúde)'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {isAdmin
                            ? `O usuário ${currentUser.email} possui controle total sobre o sistema: alteração de cargos de usuários (comum vs admin), configuração de chaves de API globais, exclusão ou edição irrestrita de usuários, pacientes e atendimentos.`
                            : `Como usuário comum, você pode criar e editar pacientes e atendimentos clínicos normalmente. As ações administrativas como alteração de papéis de usuários, configuração de chaves de API globais e exclusão de registros do sistema são restritas aos administradores.`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Admin REMUME / Protocolos Access */}
                  {isAdmin && onOpenKnowledgeBase && (
                    <div className="p-5 rounded-3xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-teal-900 dark:text-teal-100 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600" />
                          <span>Gerenciamento de REMUME & Protocolos Municipais</span>
                        </h4>
                        <p className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed max-w-xl">
                          Gerencie e injete diretrizes clínicas e medicamentos da REMUME municipal no assistente de IA. (Acessível exclusivamente a administradores do sistema).
                        </p>
                      </div>
                      <SpecularButton
                        type="button"
                        id="admin-open-knowledge-btn"
                        onClick={() => {
                          onClose();
                          onOpenKnowledgeBase();
                        }}
                        size="sm"
                        radius={12}
                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20 shrink-0 border-teal-500/40 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Abrir REMUME / Protocolos</span>
                        {activeKnowledgeCount !== undefined && activeKnowledgeCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                            {activeKnowledgeCount}
                          </span>
                        )}
                      </SpecularButton>
                    </div>
                  )}

                  {/* Active User Card Details */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span>Dados do Profissional Ativo</span>
                      </h4>
                      {!isEditingMyProfile && (
                        <button
                          type="button"
                          id="edit-my-profile-btn"
                          onClick={handleStartEditingMyProfile}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar Meus Dados</span>
                        </button>
                      )}
                    </div>

                    {!isEditingMyProfile ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block mb-1">Nome Completo</span>
                          <strong className="text-slate-900 dark:text-slate-100 text-sm font-bold">
                            {currentUser.name}
                          </strong>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block mb-1">E-mail Institucional</span>
                          <strong className="text-slate-900 dark:text-slate-100 font-mono">
                            {currentUser.email}
                          </strong>
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block mb-1">Categoria SUS & Registro</span>
                          <strong className="text-slate-900 dark:text-slate-100 block">
                            {PROFESSIONS[currentUser.profession]?.name || currentUser.profession}
                          </strong>
                          {currentUser.professionalRegister && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              {currentUser.professionalRegister}
                            </span>
                          )}
                        </div>
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 block mb-1">Unidade de Lotação</span>
                          <strong className="text-slate-900 dark:text-slate-100">
                            {currentUser.workplace || 'Não informada'}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleSaveMyProfile} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Nome Completo <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={myProfileName}
                              onChange={(e) => setMyProfileName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <WorkplaceSelectInput
                              value={myProfileWorkplace}
                              onChange={setMyProfileWorkplace}
                              availableWorkplaces={allWorkplacesList}
                              onAddNewWorkplace={handleAddNewWorkplace}
                              label="Unidade de Lotação"
                              required
                            />
                          </div>
                        </div>

                        {/* Especialidade + Órgão de Classe + Num/Cod + UF */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-indigo-100 dark:border-indigo-900/50">
                          <ProfessionalRegisterInputs
                            selectedProfession={myProfileProfession}
                            onProfessionChange={setMyProfileProfession}
                            allProfessions={allProfessionsMap}
                            onAddNewProfession={handleAddNewProfession}
                            councilBody={myProfileCouncilBody}
                            onCouncilBodyChange={setMyProfileCouncilBody}
                            councilNumber={myProfileCouncilNumber}
                            onCouncilNumberChange={setMyProfileCouncilNumber}
                            councilUf={myProfileCouncilUf}
                            onCouncilUfChange={setMyProfileCouncilUf}
                            availableCouncilBodies={allCouncilBodies}
                            onAddNewCouncilBody={handleAddNewCouncilBody}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingMyProfile(false)}
                            className="px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            id="save-my-profile-submit-btn"
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                          >
                            Salvar Meus Dados
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* System Architecture Matrix */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Matriz de Permissões SUS do Sistema (RBAC)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            <th className="py-2.5 px-3 font-bold">Funcionalidade / Módulo</th>
                            <th className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                              Administrador (jerime.rego@gmail.com / Admin)
                            </th>
                            <th className="py-2.5 px-3 font-bold text-slate-600 dark:text-slate-300">
                              Usuário Comum (Profissional)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              Criar e Editar Pacientes
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Permitido (Todos)</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Permitido</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              Criar e Editar Atendimentos Clínicos (PEC)
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Permitido (Todos)</td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Permitido</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              Excluir Pacientes e Atendimentos
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Permitido (Irrestrito)</td>
                            <td className="py-2.5 px-3 text-rose-500 font-bold">✕ Restrito ao Admin</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              Gerenciar Papéis de Usuários (Comum vs Admin)
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Permitido</td>
                            <td className="py-2.5 px-3 text-rose-500 font-bold">✕ Restrito ao Admin</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                              Configurar Chaves de API Globais & Modelos IA
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 font-bold">✓ Permitido</td>
                            <td className="py-2.5 px-3 text-rose-500 font-bold">✕ Restrito ao Admin</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GESTÃO DE USUÁRIOS (RBAC) */}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  {!isAdmin ? (
                    <div className="p-8 text-center bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl border border-amber-300 dark:border-amber-800 space-y-3">
                      <Lock className="w-10 h-10 text-amber-600 mx-auto" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Acesso Restrito ao Administrador do Sistema
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                        Apenas usuários administradores (como <strong className="font-mono text-indigo-600 dark:text-indigo-400">jerime.rego@gmail.com</strong>) podem visualizar a lista completa de profissionais, alterar papéis de usuários ou excluir contas.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Search and Action Bar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            placeholder="Buscar profissional por nome, e-mail, conselho ou unidade..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          {onSyncUsers && (
                            <button
                              type="button"
                              id="sync-users-firestore-btn"
                              disabled={isSyncing}
                              onClick={async () => {
                                setIsSyncing(true);
                                try {
                                  await onSyncUsers();
                                } finally {
                                  setIsSyncing(false);
                                }
                              }}
                              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Sincronizar profissionais registrados com o Cloud Firestore"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
                              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar BD'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            id="admin-add-user-btn"
                            onClick={() => setIsAddingUser(true)}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>+ Cadastrar Novo Usuário</span>
                          </button>
                        </div>
                      </div>

                      {/* Add User Modal / Inline Form */}
                      {isAddingUser && (
                        <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                              <UserPlus className="w-4 h-4" />
                              <span>Cadastrar Novo Profissional no Sistema</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => setIsAddingUser(false)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Fechar
                            </button>
                          </div>

                          <form onSubmit={handleCreateNewUser} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Nome Completo <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={newUserName}
                                  onChange={(e) => setNewUserName(e.target.value)}
                                  placeholder="Ex: Dra. Mariana Costa"
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  E-mail Institucional <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="email"
                                  required
                                  value={newUserEmail}
                                  onChange={(e) => setNewUserEmail(e.target.value)}
                                  placeholder="profissional@saude.gov.br"
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Papel no Sistema <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  value={newUserRole}
                                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
                                >
                                  <option value="user">Usuário Comum (Padrão - Sem Privilégios Admin)</option>
                                  <option value="admin">Administrador Geral</option>
                                </select>
                              </div>

                              <div className="sm:col-span-2 md:col-span-3">
                                <WorkplaceSelectInput
                                  value={newUserWorkplace}
                                  onChange={setNewUserWorkplace}
                                  availableWorkplaces={allWorkplacesList}
                                  onAddNewWorkplace={handleAddNewWorkplace}
                                  label="Unidade de Lotação"
                                  required
                                />
                              </div>
                            </div>

                            {/* Especialidade + Órgão de Classe + Num/Cod + UF */}
                            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/50">
                              <ProfessionalRegisterInputs
                                selectedProfession={newUserProfession}
                                onProfessionChange={setNewUserProfession}
                                allProfessions={allProfessionsMap}
                                onAddNewProfession={handleAddNewProfession}
                                councilBody={newUserCouncilBody}
                                onCouncilBodyChange={setNewUserCouncilBody}
                                councilNumber={newUserCouncilNumber}
                                onCouncilNumberChange={setNewUserCouncilNumber}
                                councilUf={newUserCouncilUf}
                                onCouncilUfChange={setNewUserCouncilUf}
                                availableCouncilBodies={allCouncilBodies}
                                onAddNewCouncilBody={handleAddNewCouncilBody}
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setIsAddingUser(false)}
                                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-400"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                              >
                                Salvar Usuário
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Edit User Modal */}
                      {editingUser && (
                        <div className="p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                              <FileEdit className="w-4 h-4 text-amber-600" />
                              <span>Editar Cadastro de Usuário: {editingUser.name}</span>
                            </h4>
                            <button
                              type="button"
                              onClick={() => setEditingUser(null)}
                              className="text-xs text-slate-400 hover:text-slate-600"
                            >
                              Fechar
                            </button>
                          </div>

                          <form onSubmit={handleSaveEditedUser} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Nome Completo
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={editingUser.name}
                                  onChange={(e) =>
                                    setEditingUser({ ...editingUser, name: e.target.value })
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  E-mail
                                </label>
                                <input
                                  type="email"
                                  required
                                  value={editingUser.email}
                                  onChange={(e) =>
                                    setEditingUser({ ...editingUser, email: e.target.value })
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Papel / Role
                                </label>
                                <select
                                  value={editingUser.role}
                                  onChange={(e) =>
                                    setEditingUser({
                                      ...editingUser,
                                      role: e.target.value as UserRole,
                                    })
                                  }
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
                                >
                                  <option value="user">Usuário Comum</option>
                                  <option value="admin">Administrador Geral</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Senha de Acesso
                                </label>
                                <input
                                  type="text"
                                  value={editingUser.password || ''}
                                  onChange={(e) =>
                                    setEditingUser({ ...editingUser, password: e.target.value })
                                  }
                                  placeholder="Digite a nova senha"
                                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div className="sm:col-span-2 md:col-span-3">
                                <WorkplaceSelectInput
                                  value={editingUser.workplace || 'CAPS (Centro de Atenção Psicossocial)'}
                                  onChange={(newWp) =>
                                    setEditingUser({
                                      ...editingUser,
                                      workplace: newWp,
                                    })
                                  }
                                  availableWorkplaces={allWorkplacesList}
                                  onAddNewWorkplace={handleAddNewWorkplace}
                                  label="Unidade de Lotação"
                                  required
                                />
                              </div>
                            </div>

                            {/* Especialidade + Órgão de Classe + Num/Cod + UF */}
                            <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800/60">
                              <ProfessionalRegisterInputs
                                selectedProfession={editProfession}
                                onProfessionChange={setEditProfession}
                                allProfessions={allProfessionsMap}
                                onAddNewProfession={handleAddNewProfession}
                                councilBody={editCouncilBody}
                                onCouncilBodyChange={setEditCouncilBody}
                                councilNumber={editCouncilNumber}
                                onCouncilNumberChange={setEditCouncilNumber}
                                councilUf={editCouncilUf}
                                onCouncilUfChange={setEditCouncilUf}
                                availableCouncilBodies={allCouncilBodies}
                                onAddNewCouncilBody={handleAddNewCouncilBody}
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-400"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs"
                              >
                                Salvar Alterações
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Users Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                              <th className="py-3 px-4 font-bold">Profissional / E-mail</th>
                              <th className="py-3 px-4 font-bold">Especialidade & Conselho</th>
                              <th className="py-3 px-4 font-bold">Unidade de Saúde</th>
                              <th className="py-3 px-4 font-bold">Papel (Role)</th>
                              <th className="py-3 px-4 font-bold">Cota / Teste</th>
                              <th className="py-3 px-4 font-bold text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filteredUsers.map((u) => {
                              const isTargetAdmin = isUserAdmin(u);
                              const isMaster =
                                u.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase();

                              return (
                                <tr
                                  key={u.id}
                                  id={`user-row-${u.id}`}
                                  className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40 transition-colors"
                                >
                                  <td className="py-3 px-4">
                                    <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                      <span>{u.name}</span>
                                      {isMaster && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                          Admin Master
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                      {PROFESSIONS[u.profession]?.name || u.profession}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      {u.professionalRegister}
                                    </div>
                                    {isProfessionalAvailableForBooking(u) ? (
                                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5" title={`Agenda secundária conectada: ${u.googleCalendarId || ''}`}>
                                        <CheckCircle2 className="w-3 h-3" /> Agenda Conectada
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5" title="Sem agenda secundária Google vinculada">
                                        <AlertCircle className="w-3 h-3" /> Sem Agenda Google
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                                    {u.workplace}
                                  </td>

                                  <td className="py-3 px-4">
                                    <button
                                      type="button"
                                      id={`toggle-role-btn-${u.id}`}
                                      disabled={isMaster}
                                      onClick={() => handleToggleUserRole(u)}
                                      title={
                                        isMaster
                                          ? 'Admin Master não pode ser alterado'
                                          : 'Clique para alternar o papel'
                                      }
                                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                        isTargetAdmin
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                      } ${isMaster ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                                    >
                                      {isTargetAdmin ? (
                                        <>
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Admin</span>
                                        </>
                                      ) : (
                                        <>
                                          <Users className="w-3.5 h-3.5 text-slate-400" />
                                          <span>Comum</span>
                                        </>
                                      )}
                                    </button>
                                  </td>

                                  {/* Coluna Cota / Teste Grátis */}
                                  <td className="py-3 px-4">
                                    {isTargetAdmin ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                        <Sparkles className="w-3 h-3" /> Vitalício
                                      </span>
                                    ) : u.subscription_status === 'pago' && u.subscription_expires_at && u.subscription_expires_at > Date.now() ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                                        <CheckCircle2 className="w-3 h-3" /> Ativo
                                      </span>
                                    ) : !u.free_used ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                                        <Sparkles className="w-3 h-3" /> 1 Grátis
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                                        <Lock className="w-3 h-3" /> Esgotada
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {/* Botão Alternador: Renovar Teste ou Remover Teste */}
                                      {!isTargetAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => handleToggleFreeTrial(u)}
                                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                            !u.free_used
                                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                          }`}
                                          title={
                                            !u.free_used
                                              ? `Remover cota de teste de ${u.name} (bloquear para exigir contratação de plano)`
                                              : `Renovar cota de teste para ${u.name} (concede mais 1 prontuário grátis)`
                                          }
                                        >
                                          {!u.free_used ? (
                                            <>
                                              <Ban className="w-3 h-3" />
                                              <span>Remover Teste</span>
                                            </>
                                          ) : (
                                            <>
                                              <RefreshCw className="w-3 h-3" />
                                              <span>Renovar Teste</span>
                                            </>
                                          )}
                                        </button>
                                      )}

                                      {onOpenScheduleSettings && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onClose();
                                            onOpenScheduleSettings(u);
                                          }}
                                          className="p-1.5 rounded-lg text-teal-600 hover:text-teal-800 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                                          title={`Configurar Grade & Agenda Google de ${u.name}`}
                                        >
                                          <Calendar className="w-4 h-4" />
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleStartEditingUser(u)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        title="Editar Usuário"
                                      >
                                        <FileEdit className="w-4 h-4" />
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isMaster}
                                        onClick={() => handleDeleteUserClick(u)}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                          isMaster
                                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                            : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                                        }`}
                                        title={
                                          isMaster
                                            ? 'Admin Master não pode ser excluído'
                                            : 'Excluir Usuário'
                                        }
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: CHAVES DE API & IA */}
              {activeTab === 'api_keys' && (
                <div className="space-y-6">
                  {!isAdmin ? (
                    <div className="p-8 text-center bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl border border-amber-300 dark:border-amber-800 space-y-3">
                      <Lock className="w-10 h-10 text-amber-600 mx-auto" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Configuração de Chaves Restrita ao Administrador
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                        O gerenciamento da chave Gemini API global e parametrização dos modelos de Inteligência Artificial é reservado ao administrador do sistema (<strong className="font-mono">jerime.rego@gmail.com</strong>).
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveGeneralSettings} className="space-y-5">
                      {/* API Key Input */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          <Key className="w-4 h-4 text-indigo-600" />
                          <span>Chave de API do Google AI Studio (Gemini)</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Esta chave será utilizada para alimentar o motor de inteligência clínica da plataforma (SOAP / PEC, taxonomias NANDA/NOC/NIC e análise longitudinal).
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="password"
                            id="system-gemini-api-key-input"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <button
                            type="button"
                            id="test-gemini-key-btn"
                            disabled={isTestingKey || !geminiApiKey.trim()}
                            onClick={handleTestApiKey}
                            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isTestingKey ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                            <span>{isTestingKey ? 'Testando...' : 'Testar Conexão'}</span>
                          </button>
                        </div>

                        {testResult && (
                          <div
                            className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                              testResult.success
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {testResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{testResult.message}</span>
                          </div>
                        )}
                      </div>

                      {/* OpenAI API Key Input */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          <Key className="w-4 h-4 text-indigo-600" />
                          <span>Chave de API da OpenAI</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Necessária para usar modelos como GPT-4o.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="password"
                            id="system-openai-api-key-input"
                            value={openaiApiKey}
                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* OpenRouter API Key Input */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          <Key className="w-4 h-4 text-indigo-600" />
                          <span>Chave de API da OpenRouter</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Necessária para usar modelos como Claude 3.5 Sonnet ou Llama.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="password"
                            id="system-openrouter-api-key-input"
                            value={openrouterApiKey}
                            onChange={(e) => setOpenrouterApiKey(e.target.value)}
                            placeholder="sk-or-..."
                            className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Groq API Key Input */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          <Key className="w-4 h-4 text-emerald-600" />
                          <span>Chave de API da Groq (Whisper Large v3)</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Utilizada para o ditado clínico por voz ultra-rápido com o modelo <strong className="text-emerald-600 dark:text-emerald-400 font-mono">whisper-large-v3</strong>.
                        </p>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <input
                            type="password"
                            id="system-groq-api-key-input"
                            value={groqApiKey}
                            onChange={(e) => {
                              setGroqApiKey(e.target.value);
                              localStorage.setItem('pec_groq_api_key', e.target.value.trim());
                            }}
                            placeholder="gsk_..."
                            className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <button
                            type="button"
                            id="test-groq-key-btn"
                            disabled={isTestingGroqKey || !groqApiKey.trim()}
                            onClick={handleTestGroqKey}
                            className="px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isTestingGroqKey ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{isTestingGroqKey ? 'Testando...' : 'Testar Conexão Groq'}</span>
                          </button>
                        </div>

                        {groqTestResult && (
                          <div
                            className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                              groqTestResult.success
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {groqTestResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{groqTestResult.message}</span>
                          </div>
                        )}
                      </div>

                      {/* Model Selector */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>Modelo Padrão Global do Sistema</span>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-left focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {defaultModel ? (
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  {allModelsCatalog.find(m => m.id === defaultModel)?.name || getFriendlyModelName(defaultModel)}
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                                    {allModelsCatalog.find(m => m.id === defaultModel)?.badge || 'Ativo'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  {allModelsCatalog.find(m => m.id === defaultModel)?.description || `Identificador do modelo: ${defaultModel}`}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500 dark:text-slate-400">Selecione um modelo...</span>
                            )}
                            <div className="text-slate-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </button>

                          {isModelDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-80 flex flex-col overflow-hidden">
                              <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 sticky top-0">
                                <input
                                  type="text"
                                  placeholder="Pesquisar modelos (ex: GPT-4o, Ling 3.0 Santé, Gemini)..."
                                  value={modelSearchQuery}
                                  onChange={(e) => setModelSearchQuery(e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="overflow-y-auto">
                                {filteredModels.length > 0 ? (
                                  filteredModels.map((model) => (
                                    <button
                                      key={model.id}
                                      type="button"
                                      onClick={() => {
                                        setDefaultModel(model.id);
                                        setIsModelDropdownOpen(false);
                                        setModelSearchQuery('');
                                      }}
                                      className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors ${
                                        defaultModel === model.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                                        <span>{model.name}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                                          {model.badge}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                        {model.description}
                                      </p>
                                    </button>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                                    Nenhum modelo encontrado.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CONSTRUTOR VISUAL DE FLUXO DE CONTINGÊNCIA (ORQUESTRAÇÃO POR SEÇÃO CLÍNICA) */}
                      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-indigo-200 dark:border-indigo-900/40 space-y-6">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                              <Workflow className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span>Orquestrador de IA por Seção Clínica & Cascata de Contingência</span>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                  Resiliente
                                </span>
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Mapeie o modelo prioritário e a lista sequencial de contingência para as 5 seções clínicas especializadas do sistema.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Section Selector Tabs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                          {CLINICAL_SECTIONS_META.map((sec) => {
                            const isSelected = activeSectionKey === sec.key;
                            return (
                              <button
                                key={sec.key}
                                type="button"
                                onClick={() => {
                                  setActiveSectionKey(sec.key);
                                  setIsAddingFallbackModel(false);
                                  setSelectedFallbackCandidate('');
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    {sec.key === 'soapPec' && <FileText className="w-3.5 h-3.5" />}
                                    {sec.key === 'timelineLongitudinal' && <TrendingUp className="w-3.5 h-3.5" />}
                                    {sec.key === 'officialReports' && <Award className="w-3.5 h-3.5" />}
                                    {sec.key === 'medicalCertificates' && <ShieldAlert className="w-3.5 h-3.5" />}
                                    {sec.key === 'audioTranscription' && <Mic className="w-3.5 h-3.5" />}
                                    <span className="text-xs font-bold leading-tight line-clamp-1">{sec.shortTitle}</span>
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block w-fit ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {sec.badge}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Active Section Editor */}
                        {(() => {
                          const currentSectionConfig = sectionsConfig[activeSectionKey] || DEFAULT_SECTIONS_CONFIG[activeSectionKey];
                          const currentSectionMeta = CLINICAL_SECTIONS_META.find((s) => s.key === activeSectionKey) || CLINICAL_SECTIONS_META[0];
                          const currentChain = currentSectionConfig.fallbackChain || [];
                          const sectionAvailableModels = getAvailableModelsForSection(
                            activeSectionKey,
                            customModels,
                            [currentSectionConfig.primaryModelId, ...currentChain]
                          );
                          const addableModels = sectionAvailableModels.filter(
                            (m) => m.id !== currentSectionConfig.primaryModelId && !currentChain.includes(m.id)
                          );

                          // Group models by category for clean, intuitive discovery
                          // 1. Especializados em Saúde & Medicina (inclui Ling 3.0 Flash Santé)
                          const medicalModels = sectionAvailableModels.filter(
                            (m) => m.id.includes('sante') || m.badge?.toLowerCase().includes('médico') || m.badge?.toLowerCase().includes('saúde')
                          );
                          // 2. OpenRouter - Todos os modelos OpenRouter (inclui Ling 3.0 Santé e Ling 3.0 Flash)
                          const openrouterModels = sectionAvailableModels.filter(
                            (m) => m.provider === 'openrouter' || m.id.startsWith('openrouter:') || m.id.includes('sante')
                          );
                          // Subdivisão OpenRouter para navegação ágil
                          const openrouterFreeModels = openrouterModels.filter(
                            (m) => m.id.endsWith(':free') || m.badge?.toLowerCase().includes('free') || m.id.includes('sante')
                          );
                          const openrouterProModels = openrouterModels.filter(
                            (m) => !openrouterFreeModels.includes(m)
                          );
                          // 3. Google Gemini (Nativo)
                          const geminiModels = sectionAvailableModels.filter(
                            (m) => (m.provider === 'gemini' || m.id.startsWith('gemini')) && !m.id.startsWith('openrouter:')
                          );
                          // 4. OpenAI (Nativo)
                          const openaiModels = sectionAvailableModels.filter(
                            (m) => (m.provider === 'openai' || m.id.startsWith('openai')) && !m.id.startsWith('openrouter:')
                          );
                          // 5. Groq (Áudio / Voz)
                          const groqModels = sectionAvailableModels.filter(
                            (m) => (m.provider === 'groq' || m.id.startsWith('groq') || m.id.includes('whisper'))
                          );
                          // 6. Modelos Personalizados cadastrados
                          const customOtherModels = sectionAvailableModels.filter(
                            (m) =>
                              !openrouterModels.includes(m) &&
                              !geminiModels.includes(m) &&
                              !openaiModels.includes(m) &&
                              !groqModels.includes(m)
                          );

                          // Same grouping for addable fallback models
                          const addableMedical = addableModels.filter((m) => medicalModels.includes(m));
                          const addableOpenRouterFree = addableModels.filter((m) => openrouterFreeModels.includes(m));
                          const addableOpenRouterPro = addableModels.filter((m) => openrouterProModels.includes(m));
                          const addableGemini = addableModels.filter((m) => geminiModels.includes(m));
                          const addableOpenAI = addableModels.filter((m) => openaiModels.includes(m));
                          const addableGroq = addableModels.filter((m) => groqModels.includes(m));
                          const addableCustom = addableModels.filter((m) => customOtherModels.includes(m));

                          return (
                            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
                              {/* Section Title & Description */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>{currentSectionMeta.title}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                                      {currentSectionMeta.badge}
                                    </span>
                                  </h5>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {currentSectionMeta.description}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewModelTargetRole('primary');
                                      setIsRegisteringNewModelModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Inserir Novo Modelo</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreSectionDefaults(activeSectionKey)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Restaurar Padrão da Seção</span>
                                  </button>
                                </div>
                              </div>

                              {/* 1. Primary Model Selector */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                    <span>Modelo Primário (1ª Tentativa de Execução)</span>
                                  </label>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {currentSectionConfig.primaryModelId}
                                  </span>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                                  <select
                                    value={currentSectionConfig.primaryModelId}
                                    onChange={(e) => {
                                      if (e.target.value === '__REGISTER_NEW__') {
                                        setNewModelTargetRole('primary');
                                        setIsRegisteringNewModelModalOpen(true);
                                        return;
                                      }
                                      handleSetSectionPrimary(activeSectionKey, e.target.value);
                                    }}
                                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                  >
                                    {medicalModels.length > 0 && (
                                      <optgroup label="🏥 Especializados em Saúde & Medicina (Recomendado)">
                                        {medicalModels.map((m) => (
                                          <option key={`primary-med-${m.id}`} value={m.id}>
                                            ⭐ {m.name} — [{m.badge}] ({(m.provider || 'openrouter').toUpperCase()})
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {openrouterFreeModels.length > 0 && (
                                      <optgroup label="🌐 OpenRouter — Gratuitos (Free Tier • Inclui Ling 3.0 Santé, Llama, DeepSeek)">
                                        {openrouterFreeModels.map((m) => (
                                          <option key={`primary-orf-${m.id}`} value={m.id}>
                                            {m.id.includes('sante') ? '⭐ ' : ''}{m.name} — [{m.badge}]
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {openrouterProModels.length > 0 && (
                                      <optgroup label="🌐 OpenRouter — Alta Performance & Raciocínio (Claude, Qwen, etc.)">
                                        {openrouterProModels.map((m) => (
                                          <option key={`primary-orp-${m.id}`} value={m.id}>
                                            {m.name} — [{m.badge}]
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {geminiModels.length > 0 && (
                                      <optgroup label="⚡ Google Gemini (Nativo)">
                                        {geminiModels.map((m) => (
                                          <option key={`primary-gem-${m.id}`} value={m.id}>
                                            {m.name} — [{m.badge}]
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {openaiModels.length > 0 && (
                                      <optgroup label="🧠 OpenAI (Nativo)">
                                        {openaiModels.map((m) => (
                                          <option key={`primary-oai-${m.id}`} value={m.id}>
                                            {m.name} — [{m.badge}]
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {groqModels.length > 0 && (
                                      <optgroup label="🎙️ Groq (Transcrição de Voz)">
                                        {groqModels.map((m) => (
                                          <option key={`primary-grq-${m.id}`} value={m.id}>
                                            {m.name} — [{m.badge}]
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    {customOtherModels.length > 0 && (
                                      <optgroup label="✨ Modelos Personalizados">
                                        {customOtherModels.map((m) => (
                                          <option key={`primary-cst-${m.id}`} value={m.id}>
                                            {m.name} — [{m.badge}]
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                    <optgroup label="➕ Cadastrar Novo Modelo">
                                      <option value="__REGISTER_NEW__">+ Cadastrar / Inserir Novo Modelo...</option>
                                    </optgroup>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewModelTargetRole('primary');
                                      setIsRegisteringNewModelModalOpen(true);
                                    }}
                                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-sm shadow-indigo-600/20"
                                    title="Inserir qualquer slug de modelo na lista"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Cadastrar Modelo</span>
                                  </button>
                                </div>

                                {/* Active Primary Model Info Card */}
                                {(() => {
                                  const modelInfo = sectionAvailableModels.find((m) => m.id === currentSectionConfig.primaryModelId);
                                  const isSante = currentSectionConfig.primaryModelId.includes('ling-3.0-flash-sante');
                                  return (
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {getFriendlyModelName(currentSectionConfig.primaryModelId)}
                                          </span>
                                          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono uppercase">
                                            {getModelProvider(currentSectionConfig.primaryModelId)}
                                          </span>
                                          {isSante && (
                                            <>
                                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                                Saúde / Médico
                                              </span>
                                              <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">
                                                Gratuito (OpenRouter)
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                          {modelInfo?.description || 'Modelo prioritário ativo para este módulo clínico.'}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* 2. Visual Contingency Cascade List */}
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                                    <span>Lista Visual de Contingência (Cascata Resiliente)</span>
                                  </label>
                                  <span className="text-[11px] text-slate-500">
                                    {currentChain.length} modelo(s) de contingência
                                  </span>
                                </div>

                                {currentChain.length === 0 ? (
                                  <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>
                                      Nenhum modelo de contingência configurado. Adicione modelos abaixo para garantir que o sistema não trave em caso de cota esgotada (429) ou instabilidade.
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {currentChain.map((modelId, idx) => {
                                      const isSante = modelId.includes('ling-3.0-flash-sante');
                                      return (
                                        <div
                                          key={`${modelId}-${idx}`}
                                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                              {idx + 1}º
                                            </span>
                                            <div className="min-w-0 space-y-0.5">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                                  {getFriendlyModelName(modelId)}
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono uppercase">
                                                  {getModelProvider(modelId)}
                                                </span>
                                                {isSante && (
                                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                                    Saúde / Gratuito
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                                {modelId}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Action Buttons: Move Up, Move Down, Delete */}
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              disabled={idx === 0}
                                              onClick={() => handleMoveFallbackItem(activeSectionKey, idx, 'up')}
                                              title="Subir Prioridade (tentar antes)"
                                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                                            >
                                              <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={idx === currentChain.length - 1}
                                              onClick={() => handleMoveFallbackItem(activeSectionKey, idx, 'down')}
                                              title="Descer Prioridade (tentar depois)"
                                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer"
                                            >
                                              <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveFallbackItem(activeSectionKey, idx)}
                                              title="Remover modelo da cascata"
                                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Add Model to Fallback Dropdown */}
                                <div className="pt-2">
                                  {!isAddingFallbackModel ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {addableModels.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setIsAddingFallbackModel(true)}
                                          className="px-3.5 py-2 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>+ Adicionar Modelo ao Fallback</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewModelTargetRole('fallback');
                                          setIsRegisteringNewModelModalOpen(true);
                                        }}
                                        className="px-3.5 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Cadastrar Outro Modelo na Cascata</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                                      <select
                                        value={selectedFallbackCandidate}
                                        onChange={(e) => {
                                          if (e.target.value === '__REGISTER_NEW_FALLBACK__') {
                                            setNewModelTargetRole('fallback');
                                            setIsRegisteringNewModelModalOpen(true);
                                            return;
                                          }
                                          setSelectedFallbackCandidate(e.target.value);
                                        }}
                                        className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
                                      >
                                        <option value="">Selecione um modelo para adicionar à cascata...</option>
                                        {addableMedical.length > 0 && (
                                          <optgroup label="🏥 Especializados em Saúde & Medicina">
                                            {addableMedical.map((m) => (
                                              <option key={`fb-med-${m.id}`} value={m.id}>
                                                ⭐ {m.name} — [{m.badge}]
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {addableOpenRouterFree.length > 0 && (
                                          <optgroup label="🌐 OpenRouter — Gratuitos (Free Tier • Inclui Ling 3.0 Santé, Llama, DeepSeek)">
                                            {addableOpenRouterFree.map((m) => (
                                              <option key={`fb-orf-${m.id}`} value={m.id}>
                                                {m.id.includes('sante') ? '⭐ ' : ''}{m.name} — [{m.badge}]
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {addableOpenRouterPro.length > 0 && (
                                          <optgroup label="🌐 OpenRouter — Alta Performance & Raciocínio (Claude, Qwen, etc.)">
                                            {addableOpenRouterPro.map((m) => (
                                              <option key={`fb-orp-${m.id}`} value={m.id}>
                                                {m.name} — [{m.badge}]
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {addableGemini.length > 0 && (
                                          <optgroup label="⚡ Google Gemini (Nativo)">
                                            {addableGemini.map((m) => (
                                              <option key={`fb-gem-${m.id}`} value={m.id}>
                                                {m.name} — [{m.badge}]
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {addableOpenAI.length > 0 && (
                                          <optgroup label="🧠 OpenAI (Nativo)">
                                            {addableOpenAI.map((m) => (
                                              <option key={`fb-oai-${m.id}`} value={m.id}>
                                                {m.name} — [{m.badge}]
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {addableGroq.length > 0 && (
                                          <optgroup label="🎙️ Groq (Transcrição de Voz)">
                                            {addableGroq.map((m) => (
                                              <option key={`fb-grq-${m.id}`} value={m.id}>
                                                {m.name} — [{m.badge}]
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        {addableCustom.length > 0 && (
                                          <optgroup label="✨ Modelos Personalizados">
                                            {addableCustom.map((m) => (
                                              <option key={`fb-cst-${m.id}`} value={m.id}>
                                                {m.name} — [{m.badge}]
                                              </option>
                                            ))}
                                          </optgroup>
                                        )}
                                        <optgroup label="➕ Outro">
                                          <option value="__REGISTER_NEW_FALLBACK__">+ Cadastrar Novo Modelo...</option>
                                        </optgroup>
                                      </select>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          disabled={!selectedFallbackCandidate}
                                          onClick={() => handleAddFallbackModel(activeSectionKey, selectedFallbackCandidate)}
                                          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                          Adicionar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIsAddingFallbackModel(false);
                                            setSelectedFallbackCandidate('');
                                          }}
                                          className="px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Custom Prompt Directives */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          Diretrizes Globais do Município (Injeção de Contexto no Prompt)
                        </label>
                        <textarea
                          rows={3}
                          value={systemCustomInstructions}
                          onChange={(e) => setSystemCustomInstructions(e.target.value)}
                          placeholder="Ex: Priorizar medicamentos padronizados na REMUME municipal vigente e protocolos da Secretaria Municipal de Saúde..."
                          className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          id="save-api-settings-btn"
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Salvar Configurações de IA</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB: WEBHOOKS & N8N AUTOMATIONS */}
              {activeTab === 'webhooks' && isAdmin && (
                <div className="space-y-6">
                  {/* Banner / Header */}
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 dark:border-amber-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-amber-600 text-white shadow-md shadow-amber-600/20">
                          <Webhook className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Hub Central de Webhooks & n8n</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              4 Serviços Ativos
                            </span>
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Configure e valide as URLs de integração para envio de dados do sistema para workflows do n8n e Evolution API com persistência no Firestore.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveGeneralSettings}
                          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Salvar Todos os Webhooks</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 1. WEBHOOK GERAR PIX (PAGBANK / N8N) */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>1. Webhook n8n: Geração de PIX (Checkout PagBank)</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              POST / JSON
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Disparado no checkout ao clicar em "Gerar Pagamento PIX". O n8n cria a cobrança no PagBank e devolve o Copia e Cola / QR Code.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        URL do Webhook n8n para Gerar PIX
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="url"
                          id="webhook-pix-url-input"
                          value={n8nPixWebhookUrl}
                          onChange={(e) => setN8nPixWebhookUrl(e.target.value)}
                          placeholder="https://seu-n8n.com/webhook/gerar-pix"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <button
                          type="button"
                          id="test-pix-webhook-btn"
                          disabled={isTestingPixWebhook || !n8nPixWebhookUrl.trim()}
                          onClick={handleTestPixWebhook}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          {isTestingPixWebhook ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5" />
                          )}
                          <span>{isTestingPixWebhook ? 'Testando...' : 'Testar Webhook PIX'}</span>
                        </button>
                      </div>

                      {/* PIX Webhook Test Feedback */}
                      {pixTestResult && (
                        <div
                          className={`p-4 rounded-2xl text-xs space-y-3 ${
                            pixTestResult.success
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold">
                              {pixTestResult.success ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span>{pixTestResult.message}</span>
                            </div>
                            {pixTestResult.durationMs !== undefined && (
                              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[10px] font-mono border border-current">
                                {pixTestResult.durationMs}ms
                              </span>
                            )}
                          </div>

                          {pixTestResult.success && (pixTestResult.copiaECola || pixTestResult.qrCode || pixTestResult.idPix) && (
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2 text-slate-800 dark:text-slate-200">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span>Dados PIX Retornados pelo n8n:</span>
                                {pixTestResult.idPix && (
                                  <span className="font-mono text-[10px] text-slate-500">ID: {pixTestResult.idPix}</span>
                                )}
                              </div>
                              {pixTestResult.copiaECola && (
                                <div className="space-y-1">
                                  <div className="text-[10px] text-slate-500 font-semibold">Chave Copia e Cola:</div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      readOnly
                                      value={pixTestResult.copiaECola}
                                      className="flex-1 px-2 py-1 text-[10px] font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg select-all"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleCopyEndpoint(pixTestResult.copiaECola || '', 'pix-test-copy')}
                                      className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 text-[10px] flex items-center gap-1 font-bold"
                                    >
                                      {copiedEndpoint === 'pix-test-copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                      <span>Copiar</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payload Spec details */}
                      <details className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <summary className="font-bold cursor-pointer hover:text-amber-600 flex items-center justify-between">
                          <span>Estrutura do Payload Enviado (JSON) & Retorno Esperado</span>
                          <span className="text-[10px] font-normal text-slate-400">Ver documentação</span>
                        </summary>
                        <div className="mt-3 space-y-2 font-mono text-[10px] leading-relaxed">
                          <p className="font-sans font-bold text-slate-700 dark:text-slate-300">Campos Enviados no POST:</p>
                          <pre className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-x-auto text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
{`{
  "userName": "Nome do Usuário",
  "Email": "usuario@exemplo.com",
  "userCpf": "00000000000",
  "userPhone": "11999998888",
  "Nome-servico": "Plano Profissional Mensal",
  "Valor": 1990,
  "valorFormatado": "19.90",
  "duracaoDias": 30,
  "agendamento_id": "user_id_aqui",
  "subscription_id": "sub_1740000000"
}`}
                          </pre>
                          <p className="font-sans font-bold text-slate-700 dark:text-slate-300 mt-2">Campos Esperados na Resposta:</p>
                          <pre className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-x-auto text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
{`{
  "qr-code": "https://api.pagseguro.com/qrcode/...",
  "chave-pix-copia-cola": "00020101021226880014br.gov.bcb.pix...",
  "id-pix": "ORDE_...",
  "expiration_date": "14/09/2026 às 23:59:59"
}`}
                          </pre>
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* 2. WEBHOOK NOTIFICAÇÕES WHATSAPP & EVOLUTION API */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>2. Webhook n8n: Notificações & Lembretes WhatsApp</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                              Evolution API
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Disparado em agendamentos, confirmações com botões interativos e lembretes com antecedência.
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={whatsappNotificationsEnabled}
                          onChange={(e) => setWhatsappNotificationsEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {whatsappNotificationsEnabled ? 'Ativo' : 'Pausado'}
                        </span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        URL do Webhook n8n para Disparo de Mensagens WhatsApp
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="url"
                          id="webhook-whatsapp-url-input"
                          value={n8nAppointmentWebhookUrl}
                          onChange={(e) => setN8nAppointmentWebhookUrl(e.target.value)}
                          placeholder="https://seu-n8n.com/webhook/agendamentos-eventos"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          id="test-whatsapp-webhook-btn"
                          disabled={isTestingWhatsAppNotif || !n8nAppointmentWebhookUrl.trim()}
                          onClick={handleTestWhatsAppWebhook}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          {isTestingWhatsAppNotif ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{isTestingWhatsAppNotif ? 'Enviando...' : 'Testar Disparo'}</span>
                        </button>
                      </div>

                      {whatsAppTestResult && (
                        <div
                          className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                            whatsAppTestResult.success
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {whatsAppTestResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{whatsAppTestResult.message}</span>
                          </div>
                        </div>
                      )}

                      {/* Evolution API Direct Parameters */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-600" />
                            <span>Parâmetros Diretos Evolution API (Gateway WhatsApp)</span>
                          </h5>
                          <button
                            type="button"
                            disabled={isTestingEvolution || !evolutionApiUrl.trim()}
                            onClick={handleTestEvolutionApi}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isTestingEvolution ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Radio className="w-3 h-3 text-emerald-600" />
                            )}
                            <span>Testar Conexão Direta</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                              URL Evolution API
                            </label>
                            <input
                              type="text"
                              value={evolutionApiUrl}
                              onChange={(e) => setEvolutionApiUrl(e.target.value)}
                              placeholder="https://evolutionapi24.mentoriajrs.com"
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                              API Key / Global Key
                            </label>
                            <input
                              type="password"
                              value={evolutionApiKey}
                              onChange={(e) => setEvolutionApiKey(e.target.value)}
                              placeholder="010F49F5..."
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                              Nome da Instância
                            </label>
                            <input
                              type="text"
                              value={evolutionInstanceName}
                              onChange={(e) => setEvolutionInstanceName(e.target.value)}
                              placeholder="Typebot_curso_tec"
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        {evolutionTestResult && (
                          <div
                            className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                              evolutionTestResult.success
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {evolutionTestResult.success ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              <span>{evolutionTestResult.message}</span>
                            </div>
                            {evolutionTestResult.state && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-[10px] font-bold uppercase">
                                {evolutionTestResult.state}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. WEBHOOK EVENTOS DE ASSINATURAS E USUÁRIOS */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>3. Webhook n8n: Eventos de Assinatura & Usuários SaaS</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                            SaaS Lifecycle
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Disparado quando um usuário é criado, aprovação de pagamento PIX, expiração de plano ou alteração de status.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        URL do Webhook n8n para Eventos de Assinatura
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="url"
                          id="webhook-subscription-url-input"
                          value={n8nSubscriptionWebhookUrl}
                          onChange={(e) => setN8nSubscriptionWebhookUrl(e.target.value)}
                          placeholder="https://seu-n8n.com/webhook/assinaturas-eventos"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button
                          type="button"
                          id="test-subscription-webhook-btn"
                          disabled={isTestingSubscriptionWebhook || !n8nSubscriptionWebhookUrl.trim()}
                          onClick={handleTestSubscriptionWebhook}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          {isTestingSubscriptionWebhook ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Activity className="w-3.5 h-3.5" />
                          )}
                          <span>{isTestingSubscriptionWebhook ? 'Testando...' : 'Testar Assinaturas'}</span>
                        </button>
                      </div>

                      {subscriptionTestResult && (
                        <div
                          className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                            subscriptionTestResult.success
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {subscriptionTestResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{subscriptionTestResult.message}</span>
                          </div>
                          {subscriptionTestResult.durationMs !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[10px] font-mono border border-current">
                              {subscriptionTestResult.durationMs}ms
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. WEBHOOK EXPORTAÇÃO DE PRONTUÁRIOS E CONSULTAS */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>4. Webhook n8n: Prontuários & Consultas Clínicas (e-SUS PEC)</span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                            SOAP / Prontuário
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Disparado para exportação e sincronização de evoluções clínicas SOAP, diagnósticos e planos terapêuticos com sistemas externos.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        URL do Webhook n8n para Prontuários Clínicos
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="url"
                          id="webhook-clinical-url-input"
                          value={n8nClinicalConsultationWebhookUrl}
                          onChange={(e) => setN8nClinicalConsultationWebhookUrl(e.target.value)}
                          placeholder="https://seu-n8n.com/webhook/prontuarios-clinicos"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <button
                          type="button"
                          id="test-clinical-webhook-btn"
                          disabled={isTestingClinicalWebhook || !n8nClinicalConsultationWebhookUrl.trim()}
                          onClick={handleTestClinicalWebhook}
                          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          {isTestingClinicalWebhook ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{isTestingClinicalWebhook ? 'Testando...' : 'Testar Prontuários'}</span>
                        </button>
                      </div>

                      {clinicalTestResult && (
                        <div
                          className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                            clinicalTestResult.success
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {clinicalTestResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <span>{clinicalTestResult.message}</span>
                          </div>
                          {clinicalTestResult.durationMs !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[10px] font-mono border border-current">
                              {clinicalTestResult.durationMs}ms
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. INBOUND CALLBACKS / ROTAS DE RETORNO DO SISTEMA PARA O N8N */}
                  <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Endpoints de Retorno do Sistema (Inbound Callbacks / Webhooks de Entrada)</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            Rotas da Aplicação
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Copie estas URLs para configurar nós HTTP Request no seu n8n para atualizar o e-SUS PEC AI em tempo real.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Inbound 1: Confirmação de PIX */}
                      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">
                            1. Confirmação de Pagamento PIX (n8n ➔ e-SUS PEC)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            POST
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          O n8n chama este endpoint quando o PagBank envia o webhook de PIX pago, liberando o plano e dias contratados no Firestore.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/pagbank-retorno-pix`}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyEndpoint(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/pagbank-retorno-pix`, 'inbound-pix')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-emerald-400"
                          >
                            {copiedEndpoint === 'inbound-pix' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedEndpoint === 'inbound-pix' ? 'Copiado!' : 'Copiar URL'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Inbound 2: Botões Interativos WhatsApp */}
                      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">
                            2. Ações de Botões WhatsApp (Cancelar / Reagendar)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            POST
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          O n8n encaminha o clique do paciente nos botões interativos enviados pelo WhatsApp (Evolution API).
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/appointments/button-action-callback`}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyEndpoint(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/appointments/button-action-callback`, 'inbound-buttons')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-emerald-400"
                          >
                            {copiedEndpoint === 'inbound-buttons' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedEndpoint === 'inbound-buttons' ? 'Copiado!' : 'Copiar URL'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Inbound 3: Consulta de Lembretes Pendentes (Cron) */}
                      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">
                            3. Consulta de Lembretes Pendentes (Cron / Schedule n8n)
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            GET
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Endpoint para nó Cron do n8n consultar os agendamentos que necessitam de lembrete diário ou de 30 minutos.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/appointments/pending-reminders`}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyEndpoint(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/appointments/pending-reminders`, 'inbound-reminders')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-emerald-400"
                          >
                            {copiedEndpoint === 'inbound-reminders' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedEndpoint === 'inbound-reminders' ? 'Copiado!' : 'Copiar URL'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save All Webhook Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveGeneralSettings}
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Todas as Configurações de Webhooks</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: GESTÃO GLOBAL DE DADOS (PACIENTES E ATENDIMENTOS) */}
              {activeTab === 'data_management' && (
                <div className="space-y-6">
                  {!isAdmin ? (
                    <div className="p-8 text-center bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl border border-amber-300 dark:border-amber-800 space-y-3">
                      <Lock className="w-10 h-10 text-amber-600 mx-auto" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Painel Global de Exclusão Restrito ao Administrador
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                        Usuários comuns podem cadastrar e editar pacientes e consultas nas telas principais. A exclusão definitiva ou expurgo de registros clínicos é restrita ao administrador geral.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Search and Filters */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={dataSearchTerm}
                            onChange={(e) => setDataSearchTerm(e.target.value)}
                            placeholder="Buscar paciente ou atendimento por nome, CNS, profissional ou termo clínico..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDataFilterType('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dataFilterType === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setDataFilterType('patients')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dataFilterType === 'patients'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Pacientes ({patients.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDataFilterType('consultations')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              dataFilterType === 'consultations'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Atendimentos ({consultations.length})
                          </button>
                        </div>
                      </div>

                      {/* Unified Data Table */}
                      <div className="space-y-6">
                        {/* Section: Patients */}
                        {(dataFilterType === 'all' || dataFilterType === 'patients') && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                              <span>Pacientes Registrados no SUS ({patients.length})</span>
                            </h4>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                    <th className="py-2.5 px-4 font-bold">Paciente</th>
                                    <th className="py-2.5 px-4 font-bold">CNS & CPF</th>
                                    <th className="py-2.5 px-4 font-bold">Nascimento</th>
                                    <th className="py-2.5 px-4 font-bold">Responsável</th>
                                    <th className="py-2.5 px-4 font-bold text-right">Ações do Admin</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {patients
                                    .filter((p) => {
                                      const term = dataSearchTerm.toLowerCase();
                                      return (
                                        p.fullName.toLowerCase().includes(term) ||
                                        (p.cns && p.cns.includes(term)) ||
                                        (p.cpf && p.cpf.includes(term))
                                      );
                                    })
                                    .map((p) => (
                                      <tr
                                        key={p.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40"
                                      >
                                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                                          {p.fullName}
                                        </td>
                                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                          {p.cns ? `CNS: ${p.cns}` : `CPF: ${p.cpf || '-'}`}
                                        </td>
                                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                                          {p.birthDate}
                                        </td>
                                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                                          {p.legalGuardianName || '-'}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                onClose();
                                                onEditPatient(p);
                                              }}
                                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                              title="Editar Cadastro do Paciente"
                                            >
                                              <FileEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeletePatientClick(p)}
                                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                              title="Excluir Paciente (Admin)"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Section: Consultations */}
                        {(dataFilterType === 'all' || dataFilterType === 'consultations') && (
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                              <span>Atendimentos Clínicos / Prontuários ({consultations.length})</span>
                            </h4>
                            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                    <th className="py-2.5 px-4 font-bold">Data & Paciente</th>
                                    <th className="py-2.5 px-4 font-bold">Profissional Responsável</th>
                                    <th className="py-2.5 px-4 font-bold">Unidade</th>
                                    <th className="py-2.5 px-4 font-bold">Resumo da Avaliação</th>
                                    <th className="py-2.5 px-4 font-bold text-right">Ações do Admin</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {consultations
                                    .filter((c) => {
                                      const term = dataSearchTerm.toLowerCase();
                                      return (
                                        c.patientName.toLowerCase().includes(term) ||
                                        c.authorName.toLowerCase().includes(term) ||
                                        c.avaliacao.toLowerCase().includes(term) ||
                                        c.plano.toLowerCase().includes(term)
                                      );
                                    })
                                    .map((c) => (
                                      <tr
                                        key={c.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-950/40"
                                      >
                                        <td className="py-2.5 px-4">
                                          <div className="font-bold text-slate-900 dark:text-slate-100">
                                            {c.patientName}
                                          </div>
                                          <div className="text-[11px] text-slate-500">
                                            {new Date(c.timestamp).toLocaleDateString('pt-BR')}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-4">
                                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                                            {c.authorName}
                                          </div>
                                          <div className="text-[11px] text-slate-400">
                                            {PROFESSIONS[c.authorProfession]?.name || c.authorProfession}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                                          {c.workplace}
                                        </td>
                                        <td className="py-2.5 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                                          {c.avaliacao.slice(0, 80)}...
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                onEditConsultation(c);
                                              }}
                                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                              title="Editar Atendimento (Admin)"
                                            >
                                              <FileEdit className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteConsultationClick(c)}
                                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                              title="Excluir Atendimento (Admin)"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 5: PARÂMETROS SUS & PEC */}
              {activeTab === 'pec_params' && (
                <div className="space-y-6">
                  {!isAdmin ? (
                    <div className="p-8 text-center bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl border border-amber-300 dark:border-amber-800 space-y-3">
                      <Lock className="w-10 h-10 text-amber-600 mx-auto" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        Parâmetros Oficiais do SUS Restritos ao Administrador
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                        Apenas administradores podem atualizar códigos oficiais de faturamento (CIAP-2, SIGTAP) e unidades de saúde municipais.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveGeneralSettings} className="space-y-5">
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Building className="w-4 h-4 text-indigo-600" />
                          <span>Identificação Institucional e Município</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Nome do Município / Órgão de Saúde
                            </label>
                            <input
                              type="text"
                              required
                              value={municipalityName}
                              onChange={(e) => setMunicipalityName(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <WorkplaceSelectInput
                              value={defaultUnitName}
                              onChange={setDefaultUnitName}
                              availableWorkplaces={allWorkplacesList}
                              onAddNewWorkplace={handleAddNewWorkplace}
                              label="Unidade de Saúde Padrão"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-indigo-600" />
                          <span>Códigos Padrão Obrigatórios do PEC SUS</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Código CIAP-2 de Finalização
                            </label>
                            <input
                              type="text"
                              required
                              value={defaultCiapCode}
                              onChange={(e) => setDefaultCiapCode(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                            />
                            <span className="text-[11px] text-slate-400 mt-1 block">
                              Padrão: <code>-69</code> (Educação em saúde / Orientações)
                            </span>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              Código de Procedimento SIGTAP
                            </label>
                            <input
                              type="text"
                              required
                              value={defaultSigtapCode}
                              onChange={(e) => setDefaultSigtapCode(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                            />
                            <span className="text-[11px] text-slate-400 mt-1 block">
                              Padrão: <code>0301080445</code> (Consulta / Orientação Individual)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          id="save-pec-params-btn"
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Salvar Parâmetros SUS</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 6: PLANOS & ASSINATURAS (SAAS ADMIN) */}
              {activeTab === 'plans' && isAdmin && (
                <div className="space-y-6">
                  {/* Header / Intro Card */}
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-300 dark:border-emerald-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Gestão de Planos, Preços e Assinantes
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Configure os valores do SaaS cobrados via PIX (PagBank/n8n) e gerencie o acesso dos usuários.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Fuso Horário Oficial: América/São Paulo (BRT)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Webhook Configuration */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span>URL do Webhook n8n para Gerar PIX (PagBank)</span>
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Configurável também na aba <strong>Webhooks & n8n</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Endpoint HTTP que recebe os dados do checkout (nome, e-mail, cpf, telefone, plano, valor) e retorna o QR Code do PagBank.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="url"
                        value={n8nPixWebhookUrl}
                        onChange={(e) => setN8nPixWebhookUrl(e.target.value)}
                        placeholder="https://seu-n8n.com/webhook/gerar-pix"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        disabled={isTestingPixWebhook || !n8nPixWebhookUrl.trim()}
                        onClick={handleTestPixWebhook}
                        className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {isTestingPixWebhook ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{isTestingPixWebhook ? 'Testando...' : 'Testar Webhook'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...systemSettings,
                            n8nPixWebhookUrl: n8nPixWebhookUrl.trim(),
                            n8nSubscriptionWebhookUrl: n8nSubscriptionWebhookUrl.trim(),
                            n8nClinicalConsultationWebhookUrl: n8nClinicalConsultationWebhookUrl.trim(),
                            updatedAt: Date.now(),
                            updatedBy: currentUser.email,
                          };
                          onUpdateSystemSettings(updated);
                          onShowToast('success', 'URL do webhook n8n salva com sucesso!', 'Webhook Atualizado');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Webhook</span>
                      </button>
                    </div>

                    {pixTestResult && (
                      <div
                        className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 ${
                          pixTestResult.success
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {pixTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>{pixTestResult.message}</span>
                        </div>
                        {pixTestResult.durationMs !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-[10px] font-mono border border-current">
                            {pixTestResult.durationMs}ms
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Notification Hub & Evolution API Configuration */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Régua de Notificações WhatsApp (Evolution API & n8n)
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Envio automático de PIX gerado, confirmação com botões interativos e lembretes inteligentes.
                          </p>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={whatsappNotificationsEnabled}
                          onChange={(e) => setWhatsappNotificationsEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {whatsappNotificationsEnabled ? 'Ativo' : 'Pausado'}
                        </span>
                      </label>
                    </div>

                    {/* Webhook URL Input & Test Button */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        URL do Webhook n8n para Disparo de Mensagens WhatsApp
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="url"
                          value={n8nAppointmentWebhookUrl}
                          onChange={(e) => setN8nAppointmentWebhookUrl(e.target.value)}
                          placeholder="https://seu-n8n.com/webhook/notificacoes_whatsapp_evo"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <button
                          type="button"
                          disabled={isTestingWhatsAppNotif || !n8nAppointmentWebhookUrl.trim()}
                          onClick={handleTestWhatsAppWebhook}
                          className="px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          {isTestingWhatsAppNotif ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>{isTestingWhatsAppNotif ? 'Enviando...' : 'Testar Disparo'}</span>
                        </button>
                      </div>

                      {whatsAppTestResult && (
                        <div
                          className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                            whatsAppTestResult.success
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {whatsAppTestResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>{whatsAppTestResult.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Evolution API Direct Parameters (Optional) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          URL Evolution API
                        </label>
                        <input
                          type="text"
                          value={evolutionApiUrl}
                          onChange={(e) => setEvolutionApiUrl(e.target.value)}
                          placeholder="https://api.whatsapp.exemplo.com"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          API Key / Global Key
                        </label>
                        <input
                          type="password"
                          value={evolutionApiKey}
                          onChange={(e) => setEvolutionApiKey(e.target.value)}
                          placeholder="evo_apikey_..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          Nome da Instância
                        </label>
                        <input
                          type="text"
                          value={evolutionInstanceName}
                          onChange={(e) => setEvolutionInstanceName(e.target.value)}
                          placeholder="esus_pec_atendimento"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Reminder Triggers Strategy */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Régua de Disparo Automático (Regras de Negócio)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">
                            <strong>PIX Imediato:</strong> Código copia e cola + aviso de 30min
                          </span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">
                            <strong>Confirmação:</strong> Resumo + Botões [Cancelar/Reagendar/Dúvidas]
                          </span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">
                            <strong>Lembretes:</strong> 1x ao dia (&gt;24h), 30 min antes e 10 min antes
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...systemSettings,
                            n8nAppointmentWebhookUrl: n8nAppointmentWebhookUrl.trim(),
                            whatsappNotificationsEnabled,
                            evolutionApiUrl: evolutionApiUrl.trim(),
                            evolutionApiKey: evolutionApiKey.trim(),
                            evolutionInstanceName: evolutionInstanceName.trim(),
                            dailyReminderHour: Number(dailyReminderHour) || 9,
                            reminder30MinutesEnabled,
                            reminder10MinutesEnabled,
                            updatedAt: Date.now(),
                            updatedBy: currentUser.email,
                          };
                          onUpdateSystemSettings(updated);
                          onShowToast('success', 'Configurações de WhatsApp & Evolution API salvas com sucesso!', 'WhatsApp Atualizado');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Configurações WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Plans Editor Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span>Tabela de Planos Disponíveis</span>
                      </h4>
                      <span className="text-xs text-slate-500">
                        Os valores salvos aqui refletem imediatamente na janela de pagamento dos usuários.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                {plan.id}
                              </span>
                              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={plan.active}
                                  onChange={(e) => {
                                    if (onUpdatePlan) {
                                      onUpdatePlan({ ...plan, active: e.target.checked });
                                      onShowToast('info', `Plano ${plan.name} ${e.target.checked ? 'ativado' : 'desativado'}.`);
                                    }
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>{plan.active ? 'Ativo' : 'Inativo'}</span>
                              </label>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Nome do Plano
                              </label>
                              <input
                                type="text"
                                value={plan.name}
                                onChange={(e) => {
                                  if (onUpdatePlan) {
                                    onUpdatePlan({ ...plan, name: e.target.value });
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Preço (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.10"
                                  min="0"
                                  value={plan.price}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (onUpdatePlan) {
                                      onUpdatePlan({ ...plan, price: val });
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Duração (Dias)
                                </label>
                                <input
                                  type="number"
                                  step="1"
                                  min="1"
                                  value={plan.durationDays}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 1;
                                    if (onUpdatePlan) {
                                      onUpdatePlan({ ...plan, durationDays: val });
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Descrição Curta
                              </label>
                              <textarea
                                rows={2}
                                value={plan.description}
                                onChange={(e) => {
                                  if (onUpdatePlan) {
                                    onUpdatePlan({ ...plan, description: e.target.value });
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white resize-none"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdatePlan) {
                                onUpdatePlan(plan);
                                onShowToast('success', `Plano ${plan.name} salvo com sucesso!`, 'Plano Salvo');
                              }
                            }}
                            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Salvar {plan.name}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subscribers Management & Manual Access Control */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>Controle de Acesso e Assinantes ({users.length})</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Visualize a vigência das assinaturas e conceda ou revogue acesso manual com um clique.
                        </p>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={planSubscriberSearch}
                          onChange={(e) => setPlanSubscriberSearch(e.target.value)}
                          placeholder="Buscar usuário ou email..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Users Subscription Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-3">Profissional</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">1º Free Usado?</th>
                            <th className="px-4 py-3">Vigência (Horário BR)</th>
                            <th className="px-4 py-3 text-right">Ações de Acesso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {users
                            .filter((u) => {
                              const term = planSubscriberSearch.toLowerCase();
                              return (
                                u.name.toLowerCase().includes(term) ||
                                u.email.toLowerCase().includes(term)
                              );
                            })
                            .map((u) => {
                              const isPaid = u.subscription_status === 'pago';
                              const isExpired =
                                isPaid && u.subscription_expires_at
                                  ? u.subscription_expires_at < Date.now()
                                  : false;
                              const formattedDate = u.subscription_expires_at
                                ? new Date(u.subscription_expires_at).toLocaleDateString('pt-BR', {
                                    timeZone: 'America/Sao_Paulo',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--';

                              return (
                                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                                    <div className="text-[11px] text-slate-500">{u.email}</div>
                                  </td>
                                  <td className="px-3 py-3">
                                    {isPaid && !isExpired ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 w-max">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Ativo ({u.plan_name || 'Assinante'})</span>
                                      </span>
                                    ) : isExpired ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1 w-max">
                                        <Clock className="w-3 h-3" />
                                        <span>Expirado</span>
                                      </span>
                                    ) : u.subscription_status === 'pendente' ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 w-max">
                                        <Clock className="w-3 h-3" />
                                        <span>Aguardando Pix</span>
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold w-max">
                                        Conta Free
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        u.free_used
                                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                                          : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                                      }`}
                                    >
                                      {u.free_used ? 'Já usou (Bloqueado)' : 'Disponível'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                    {formattedDate}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        title="Liberar 15 dias"
                                        onClick={() => {
                                          if (onUpdateUserSubscription) {
                                            onUpdateUserSubscription(u.id, 'pago', 15, 'Quinzenal Manual');
                                            onShowToast('success', `Acesso de 15 dias concedido para ${u.name}!`);
                                          }
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800"
                                      >
                                        +15d
                                      </button>
                                      <button
                                        type="button"
                                        title="Liberar 30 dias"
                                        onClick={() => {
                                          if (onUpdateUserSubscription) {
                                            onUpdateUserSubscription(u.id, 'pago', 30, 'Mensal Manual');
                                            onShowToast('success', `Acesso de 30 dias concedido para ${u.name}!`);
                                          }
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800"
                                      >
                                        +30d
                                      </button>
                                      <button
                                        type="button"
                                        title="Liberar 365 dias (Anual)"
                                        onClick={() => {
                                          if (onUpdateUserSubscription) {
                                            onUpdateUserSubscription(u.id, 'pago', 365, 'Anual Manual');
                                            onShowToast('success', `Acesso de 1 ano concedido para ${u.name}!`);
                                          }
                                        }}
                                        className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800"
                                      >
                                        +1 Ano
                                      </button>
                                      <button
                                        type="button"
                                        title="Bloquear ou Revogar Acesso"
                                        onClick={() => {
                                          if (onUpdateUserSubscription) {
                                            onUpdateUserSubscription(u.id, 'free', 0, '');
                                            onShowToast('info', `Acesso de ${u.name} revogado.`);
                                          }
                                        }}
                                        className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-300 dark:border-rose-800 flex items-center gap-1"
                                      >
                                        <Ban className="w-3 h-3" />
                                        <span>Bloquear</span>
                                      </button>
                                      <button
                                        type="button"
                                        title="Resetar Assinatura, PIX e Teste do Usuário (Reiniciar do Zero)"
                                        onClick={async () => {
                                          try {
                                            await resetUserSubscriptionAndPixForTesting(u.id, { resetFreeTrial: true });
                                            onShowToast('success', `Dados de PIX e plano de ${u.name} foram resetados do zero!`, 'Reset de Teste');
                                          } catch (err: any) {
                                            onShowToast('error', `Falha ao resetar usuário: ${err?.message || 'Erro'}`, 'Erro');
                                          }
                                        }}
                                        className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1 cursor-pointer"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Resetar p/ Teste</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* In-App Confirmation Modal for Deletions */}
            <AnimatePresence>
              {confirmDeleteModal && (
                <div
                  id="confirm-delete-backdrop"
                  className="absolute inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
                  onClick={() => setConfirmDeleteModal(null)}
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
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {confirmDeleteModal.title}
                      </h3>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
                      <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                        {confirmDeleteModal.targetName}
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {confirmDeleteModal.description}
                    </p>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteModal(null)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        id="confirm-delete-action-btn"
                        onClick={handleConfirmExecuteDelete}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Confirmar Exclusão</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
              {/* In-App Modal for Registering a New AI Model */}
              {isRegisteringNewModelModalOpen && (
                <div
                  id="register-new-model-modal-backdrop"
                  className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
                  onClick={() => setIsRegisteringNewModelModalOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-indigo-200 dark:border-indigo-900/50 space-y-4 max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>Cadastrar Novo Modelo de IA</span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                              Cascata Resiliente
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Insira qualquer modelo do OpenRouter, Gemini, OpenAI ou Groq para a seção <strong className="text-indigo-600 dark:text-indigo-400">{CLINICAL_SECTIONS_META.find(s => s.key === activeSectionKey)?.shortTitle || 'Ativa'}</strong>.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRegisteringNewModelModalOpen(false)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Quick presets for common models */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        Modelos Sugeridos / Populares (1-Clique para Preencher):
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setNewModelProviderInput('openrouter');
                            setNewModelIdInput('inclusionai/ling-3.0-flash-sante:free');
                            setNewModelNameInput('Ling 3.0 Flash Santé (Free)');
                            setNewModelBadgeInput('Saúde / Médico');
                            setNewModelDescInput('Especializado em medicina, terminologia de saúde, condutas clínicas e SOAP.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer"
                        >
                          ⭐ Ling 3.0 Flash Santé
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewModelProviderInput('openrouter');
                            setNewModelIdInput('inclusionai/ling-3.0-flash:free');
                            setNewModelNameInput('Ling 3.0 Flash (Free)');
                            setNewModelBadgeInput('Geral / Free');
                            setNewModelDescInput('Modelo ágil geral da família Ling 3.0 via OpenRouter Free.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold border border-indigo-300 dark:border-indigo-800 transition-all cursor-pointer"
                        >
                          Ling 3.0 Flash
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewModelProviderInput('openrouter');
                            setNewModelIdInput('deepseek/deepseek-r1:free');
                            setNewModelNameInput('DeepSeek R1 (OpenRouter Free)');
                            setNewModelBadgeInput('Raciocínio Clínico / Free');
                            setNewModelDescInput('Modelo avançado de raciocínio passo a passo gratuito.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 text-[10px] font-bold border border-purple-300 dark:border-purple-800 transition-all cursor-pointer"
                        >
                          DeepSeek R1
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewModelProviderInput('openrouter');
                            setNewModelIdInput('meta-llama/llama-3.3-70b-instruct:free');
                            setNewModelNameInput('Llama 3.3 70B Instruct (OpenRouter Free)');
                            setNewModelBadgeInput('Open Source / Free');
                            setNewModelDescInput('Llama 3.3 70B de alto desempenho gratuito via OpenRouter.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          Llama 3.3 70B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewModelProviderInput('gemini');
                            setNewModelIdInput('gemini-3.8-flash');
                            setNewModelNameInput('Gemini 3.8 Flash');
                            setNewModelBadgeInput('Nova Geração');
                            setNewModelDescInput('Nova geração Flash da Google com alto raciocínio clínico.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 text-[10px] font-bold border border-blue-300 dark:border-blue-800 transition-all cursor-pointer"
                        >
                          Gemini 3.8 Flash
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleRegisterNewModel} className="space-y-4">
                      {/* Provider */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          Provedor do Modelo
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['openrouter', 'gemini', 'openai', 'groq'] as const).map((prov) => (
                            <button
                              key={prov}
                              type="button"
                              onClick={() => setNewModelProviderInput(prov)}
                              className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                                newModelProviderInput === prov
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                              }`}
                            >
                              {prov === 'openrouter' && 'OpenRouter'}
                              {prov === 'gemini' && 'Google Gemini'}
                              {prov === 'openai' && 'OpenAI'}
                              {prov === 'groq' && 'Groq (Voz)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Slug / ID */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          Identificador / Slug do Modelo (API ID) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newModelIdInput}
                          onChange={(e) => setNewModelIdInput(e.target.value)}
                          placeholder={
                            newModelProviderInput === 'openrouter'
                              ? 'ex: inclusionai/ling-3.0-flash-sante:free'
                              : newModelProviderInput === 'openai'
                              ? 'ex: gpt-4o ou o3-mini'
                              : newModelProviderInput === 'groq'
                              ? 'ex: whisper-large-v3'
                              : 'ex: gemini-3.8-flash'
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-slate-400">
                          {newModelProviderInput === 'openrouter' && 'Dica: Você pode colar o slug direto do catálogo do openrouter.ai (ex: inclusionai/ling-3.0-flash-sante:free).'}
                        </p>
                      </div>

                      {/* Friendly Name & Badge */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            Nome Amigável
                          </label>
                          <input
                            type="text"
                            value={newModelNameInput}
                            onChange={(e) => setNewModelNameInput(e.target.value)}
                            placeholder="ex: Ling 3.0 Flash Santé"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            Badge / Etiqueta
                          </label>
                          <input
                            type="text"
                            value={newModelBadgeInput}
                            onChange={(e) => setNewModelBadgeInput(e.target.value)}
                            placeholder="ex: Saúde / Médico ou Free"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          Descrição / Finalidade Clínica
                        </label>
                        <input
                          type="text"
                          value={newModelDescInput}
                          onChange={(e) => setNewModelDescInput(e.target.value)}
                          placeholder="ex: Modelo médico especializado em condutas, medicamentos e SOAP."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Target Role in Resilient Cascade */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          Como aplicar este modelo na cascata resiliente da seção ativa?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewModelTargetRole('primary')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newModelTargetRole === 'primary'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Modelo Primário (1ª Tentativa)</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              Executado primeiro. O modelo anterior vira o 1º fallback da cascata.
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewModelTargetRole('fallback')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newModelTargetRole === 'fallback'
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-xs">
                              <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Cascata de Fallback (Contingência)</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              Acionado automaticamente em caso de timeout, falha ou cota 429.
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setIsRegisteringNewModelModalOpen(false)}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>Cadastrar e Persistir na Cascata</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
