import React, { useState, useEffect, useRef } from 'react';
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
  isUserAdmin,
} from './data/professions';
import { generatePECRecord } from './services/gemini';
import { generateClinicalEvolution } from './services/geminiEvolution';
import {
  subscribeToPatients,
  savePatientToFirestore,
  deletePatientFromFirestore,
  subscribeToConsultations,
  saveConsultationToFirestore,
  deleteConsultationFromFirestore,
  subscribeToKnowledgeItems,
  subscribeToUsers,
  saveUserToFirestore,
  deleteUserFromFirestore,
  subscribeToSystemSettings,
  saveSystemSettingsToFirestore,
  seedFirestoreIfEmpty,
} from './services/firebase';
import { calculateChronologicalAge } from './utils/dateCalculator';
import { Header } from './components/Header';
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

export default function App() {
  // Navigation tab: 'generator' | 'patients'
  const [activeTab, setActiveTab] = useState<'generator' | 'patients'>('generator');

  // Registered Users list (Multiprofessional team + RBAC)
  const [users, setUsers] = useState<UserModel[]>(() => {
    try {
      const saved = localStorage.getItem('pec_users_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleaned = parsed.filter((u: UserModel) => !LEGACY_MOCK_USER_IDS.includes(u.id));
        if (cleaned.length > 0) return cleaned;
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
        if (parsed && !LEGACY_MOCK_USER_IDS.includes(parsed.id)) {
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
      const saved = localStorage.getItem('pec_system_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SYSTEM_SETTINGS;
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  });

  // Patients registry (Real data)
  const [patients, setPatients] = useState<Patient[]>(() => {
    try {
      const saved = localStorage.getItem('pec_patients');
      if (saved) {
        const parsed: Patient[] = JSON.parse(saved);
        const cleaned = parsed.filter(
          (p) => !['pat-lucas-oliveira', 'pat-maria-aparecida', 'pat-gabriel-souza'].includes(p.id)
        );
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Active selected patient (for timeline and linked consultation generator)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Multiprofessional Consultations database (Real data)
  const [consultations, setConsultations] = useState<Consultation[]>(() => {
    try {
      const saved = localStorage.getItem('pec_consultations');
      if (saved) {
        const parsed: Consultation[] = JSON.parse(saved);
        const cleaned = parsed.filter((c) => !c.id.startsWith('cons-lucas-'));
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  });


  // Local storage state initialization
  const [selectedProfession, setSelectedProfession] = useState<ProfessionId>(() => {
    return currentUser.profession || 'enfermeiro';
  });

  const [selectedModel, setSelectedModel] = useState<AIModelId>(() => {
    const saved = localStorage.getItem('pec_model');
    if (saved === 'gemini-3.1-pro-preview' || saved === 'gemini-2.5-pro' || saved === 'gemini-pro') {
      return 'gemini-3.1-pro-preview';
    }
    return 'gemini-3.7-flash';
  });

  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem('pec_user_api_key') || '';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pec_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>(() => {
    try {
      const saved = localStorage.getItem('pec_knowledge_base');
      return saved ? JSON.parse(saved) : DEFAULT_KNOWLEDGE_BASE;
    } catch {
      return DEFAULT_KNOWLEDGE_BASE;
    }
  });

  const [history, setHistory] = useState<GeneratedPECRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pec_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Multimodal inputs state
  const [rawNotes, setRawNotes] = useState<string>('');
  const [isFirstConsultation, setIsFirstConsultation] = useState<boolean>(false);
  const [audioAttachment, setAudioAttachment] = useState<AttachmentItem | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<GeneratedPECRecord | null>(null);
  const [isRecordSavedToTimeline, setIsRecordSavedToTimeline] = useState(false);

  // Modals and Drawers
  const [isKnowledgeDrawerOpen, setIsKnowledgeDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pec_is_authenticated') === 'true';
    } catch {
      return false;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pec_is_authenticated') !== 'true';
    } catch {
      return true;
    }
  });
  const [isPatientFormModalOpen, setIsPatientFormModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isSystemSettingsOpen, setIsSystemSettingsOpen] = useState(false);
  const [isEditConsultationModalOpen, setIsEditConsultationModalOpen] = useState(false);
  const [consultationToEdit, setConsultationToEdit] = useState<Consultation | null>(null);

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
    localStorage.setItem('pec_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Keep selected profession automatically bound to current user's profession
  useEffect(() => {
    if (currentUser?.profession) {
      setSelectedProfession(currentUser.profession);
    }
  }, [currentUser?.profession]);

  // Real-time Cloud Firestore synchronization with offline fallback
  useEffect(() => {
    // 1. Seed initial standard data if Firestore is fresh
    seedFirestoreIfEmpty(
      DEFAULT_PATIENTS,
      DEFAULT_CONSULTATIONS,
      DEFAULT_KNOWLEDGE_BASE,
      DEFAULT_USERS,
      DEFAULT_SYSTEM_SETTINGS
    );

    // 2. Real-time subscription to Patients
    const unsubPatients = subscribeToPatients(
      (livePatients) => {
        const cleanedPatients = (livePatients || []).filter(
          (p) => !['pat-lucas-oliveira', 'pat-maria-aparecida', 'pat-gabriel-souza'].includes(p.id)
        );
        setPatients(cleanedPatients);
        setSelectedPatient((prev) => {
          if (!prev) return null;
          const updatedSelected = cleanedPatients.find((p) => p.id === prev.id);
          return updatedSelected || null;
        });
      },
      (err) => console.warn('Patients fallback to local:', err)
    );

    // 3. Real-time subscription to Multiprofessional Consultations
    const unsubConsultations = subscribeToConsultations(
      (liveConsultations) => {
        const cleanedConsultations = (liveConsultations || []).filter(
          (c) => !c.id.startsWith('cons-lucas-')
        );
        setConsultations(cleanedConsultations);
      },
      (err) => console.warn('Consultations fallback to local:', err)
    );


    // 4. Real-time subscription to Municipal Knowledge Base
    const unsubKnowledge = subscribeToKnowledgeItems(
      (liveKnowledge) => {
        if (liveKnowledge && liveKnowledge.length > 0) {
          setKnowledgeList(liveKnowledge);
        }
      },
      (err) => console.warn('Knowledge fallback to local:', err)
    );

    // 5. Real-time subscription to Users & Roles (RBAC)
    const unsubUsers = subscribeToUsers(
      (liveUsers) => {
        if (liveUsers && liveUsers.length > 0) {
          const cleanedUsers = liveUsers.filter(
            (u) => !LEGACY_MOCK_USER_IDS.includes(u.id)
          );
          const finalUsers = cleanedUsers.length > 0 ? cleanedUsers : DEFAULT_USERS;
          setUsers(finalUsers);
          setCurrentUser((prev) => {
            if (!prev) return finalUsers[0];
            const updatedUser = finalUsers.find(
              (u) =>
                u.id === prev.id ||
                (u.email && prev.email && u.email.toLowerCase().trim() === prev.email.toLowerCase().trim())
            );
            return updatedUser || prev;
          });
        }
      },
      (err) => console.warn('Users fallback to local:', err)
    );


    // 6. Real-time subscription to System Settings
    const unsubSettings = subscribeToSystemSettings(
      (liveSettings) => {
        if (liveSettings) {
          setSystemSettings(liveSettings);
          if (liveSettings.geminiApiKey && !userApiKey) {
            setUserApiKey(liveSettings.geminiApiKey);
          }
          if (liveSettings.defaultModel) {
            setSelectedModel(liveSettings.defaultModel);
          }
        }
      },
      (err) => console.warn('Settings fallback to local:', err)
    );

    return () => {
      unsubPatients();
      unsubConsultations();
      unsubKnowledge();
      unsubUsers();
      unsubSettings();
    };
  }, []);

  // Sync current user to localStorage
  useEffect(() => {
    localStorage.setItem('pec_current_user', JSON.stringify(currentUser));
    setSelectedProfession(currentUser.profession);
  }, [currentUser]);

  // Sync users list to localStorage
  useEffect(() => {
    localStorage.setItem('pec_users_list', JSON.stringify(users));
  }, [users]);

  // Sync system settings to localStorage
  useEffect(() => {
    localStorage.setItem('pec_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  // Sync patients to localStorage
  useEffect(() => {
    localStorage.setItem('pec_patients', JSON.stringify(patients));
  }, [patients]);

  // Sync consultations to localStorage
  useEffect(() => {
    localStorage.setItem('pec_consultations', JSON.stringify(consultations));
  }, [consultations]);

  // Sync selected model to localStorage
  useEffect(() => {
    localStorage.setItem('pec_model', selectedModel);
  }, [selectedModel]);

  // Sync knowledge list to localStorage
  useEffect(() => {
    localStorage.setItem('pec_knowledge_base', JSON.stringify(knowledgeList));
  }, [knowledgeList]);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('pec_history', JSON.stringify(history));
  }, [history]);

  // Custom user api key
  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    if (key) {
      localStorage.setItem('pec_user_api_key', key);
    } else {
      localStorage.removeItem('pec_user_api_key');
    }
  };

  // Toast helper
  const showToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Save / Edit Patient Handler (Accessible by all users)
  const handleSavePatient = (savedPatient: Patient) => {
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

    showToast('success', `Paciente ${savedPatient.fullName} salvo com sucesso!`, 'Cadastro Atualizado');
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

  // Update Full User Info (Admin only)
  const handleUpdateUser = async (updatedUser: UserModel) => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas administradores podem atualizar dados de usuários.', 'Acesso Negado');
      return;
    }

    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }

    await saveUserToFirestore(updatedUser);
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

    if (targetUser.email?.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase() && newRole !== 'admin') {
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

  // Delete User Handler (Admin only)
  const handleDeleteUser = async (userId: string) => {
    if (!isUserAdmin(currentUser)) {
      showToast('error', 'Apenas administradores podem excluir usuários.', 'Acesso Negado');
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (targetUser.email?.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()) {
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
      localStorage.setItem('pec_user_api_key', newSettings.geminiApiKey);
    }
    if (newSettings.defaultModel) {
      setSelectedModel(newSettings.defaultModel);
      localStorage.setItem('pec_model', newSettings.defaultModel);
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
      setUsers(DEFAULT_USERS);
      setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      setSelectedPatient(DEFAULT_PATIENTS[0] || null);

      await seedFirestoreIfEmpty(
        DEFAULT_PATIENTS,
        DEFAULT_CONSULTATIONS,
        DEFAULT_KNOWLEDGE_BASE,
        DEFAULT_USERS,
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
    if (remember) {
      localStorage.setItem('pec_is_authenticated', 'true');
      localStorage.setItem('pec_current_user', JSON.stringify(user));
    } else {
      sessionStorage.setItem('pec_is_authenticated', 'true');
      localStorage.removeItem('pec_is_authenticated');
    }
  };

  // User Registration handler
  const handleRegisterUser = (newUser: UserModel, remember: boolean) => {
    setCurrentUser(newUser);
    setSelectedProfession(newUser.profession);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    setUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== newUser.id);
      return [newUser, ...filtered];
    });
    saveUserToFirestore(newUser).catch((err) =>
      console.warn('Erro ao salvar usuário no Firestore:', err)
    );
    if (remember) {
      localStorage.setItem('pec_is_authenticated', 'true');
      localStorage.setItem('pec_current_user', JSON.stringify(newUser));
    } else {
      sessionStorage.setItem('pec_is_authenticated', 'true');
      localStorage.removeItem('pec_is_authenticated');
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
    setSelectedPatient(patient);
    setActiveTab('generator');
    setCurrentRecord(null);
    setIsRecordSavedToTimeline(false);
    showToast(
      'info',
      `Paciente ${patient.fullName} selecionado para o atendimento.`,
      'Paciente em Atendimento'
    );
  };

  // Trigger Longitudinal AI Evolution Analysis
  const handleGenerateEvolution = async (
    patient: Patient,
    patientConsultations: Consultation[]
  ) => {
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

  // Main Generation Action
  const handleGenerate = async () => {
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

      const generated = await generatePECRecord({
        professionId: selectedProfession,
        professionName: PROFESSIONS[selectedProfession].name,
        modelName: selectedModel,
        rawNotes,
        isFirstConsultation,
        patientHistory: patientHistoryData,
        audioAttachment,
        images: attachments,
        customContext: mergedCustomContext,
        userApiKey: systemSettings.geminiApiKey || userApiKey,
        openaiApiKey: systemSettings.openaiApiKey,
        openrouterApiKey: systemSettings.openrouterApiKey,
      });

      // Attach patient info if selected
      if (selectedPatient) {
        generated.patientId = selectedPatient.id;
        generated.patientName = selectedPatient.fullName;
      }

      setCurrentRecord(generated);

      // Prepend to history (keep max 50 items)
      setHistory((prev) => [generated, ...prev.slice(0, 49)]);

      showToast(
        'success',
        `Prontuário de ${PROFESSIONS[selectedProfession].name} gerado e validado com sucesso!`,
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
    }
  };

  // Save generated record directly to the patient's multi-professional timeline
  const handleSaveToPatientTimeline = (
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

    const newConsultation: Consultation = {
      id: `cons-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorProfession: selectedProfession,
      authorRegister: currentUser.professionalRegister,
      workplace: currentUser.workplace,
      timestamp: record.timestamp || Date.now(),
      isFirstConsultation: record.isFirstConsultation,
      clinicalAudit: record.clinicalAudit,
      avaliacao: updatedTexts?.avaliacao || record.avaliacao,
      plano: updatedTexts?.plano || record.plano,
      conduta: updatedTexts?.conduta || record.conduta,
      rawNotes,
      modelUsed: record.modelUsed,
      qualitativeChecks: record.qualitativeChecks,
    };

    setConsultations((prev) => [newConsultation, ...prev]);
    setIsRecordSavedToTimeline(true);

    // Persist to Cloud Firestore
    saveConsultationToFirestore(newConsultation).catch((err) => {
      console.warn('Erro ao salvar atendimento no Firestore:', err);
    });

    showToast(
      'success',
      `Atendimento salvo no Cloud Firestore e na linha do tempo de ${selectedPatient.fullName}!`,
      'Linha do Tempo Atualizada'
    );
  };

  // Reset current form
  const handleResetForm = () => {
    setRawNotes('');
    setAudioAttachment(null);
    setAttachments([]);
    setCurrentRecord(null);
    setIsRecordSavedToTimeline(false);
    showToast('info', 'Formulário limpo para um novo atendimento.');
  };

  const activeKnowledgeCount = knowledgeList.filter((k) => k.isActive).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
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
        onOpenHistoryDrawer={() => setIsHistoryDrawerOpen(true)}
        activeKnowledgeCount={activeKnowledgeCount}
        historyCount={history.length}
        patientsCount={patients.length}
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
                    Identificação do Paciente no Atendimento:
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
                    onSelectPatient={(pat) => setSelectedPatient(pat)}
                    onOpenNewPatientModal={() => {
                      setPatientToEdit(null);
                      setIsPatientFormModalOpen(true);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                {selectedPatient && (
                  <button
                    type="button"
                    id="banner-view-timeline-btn"
                    onClick={() => setActiveTab('patients')}
                    className="px-3.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Abrir linha do tempo e prontuário completo"
                  >
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Ver Prontuário / Linha do Tempo</span>
                  </button>
                )}

                <button
                  type="button"
                  id="banner-new-patient-btn"
                  onClick={() => {
                    setPatientToEdit(null);
                    setIsPatientFormModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
                  title="Cadastrar novo paciente no sistema"
                >
                  <UserPlus className="w-3.5 h-3.5 text-teal-600" />
                  <span>+ Novo Cadastro</span>
                </button>
              </div>
            </div>

            {/* Quick Context & Guide Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-teal-700/10 via-emerald-600/10 to-transparent p-4 sm:p-5 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Automação Inteligente de Prontuários e-SUS / PEC
                  </h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Gere registros clínicos padronizados com{' '}
                  <strong>sinais vitais qualitativos</strong>, diagnósticos apropriados (NANDA-I,
                  CIAP-2, CID-10) e códigos fixos obrigatórios{' '}
                  <code className="bg-slate-200/80 dark:bg-slate-800 px-1 py-0.5 rounded text-[11px] font-mono text-teal-700 dark:text-teal-300">
                    CIAP-2: -69 / SIGTAP: 0301080445
                  </code>
                  .
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {currentRecord && (
                  <button
                    type="button"
                    id="reset-form-btn"
                    onClick={handleResetForm}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Novo Atendimento
                  </button>
                )}
                <button
                  type="button"
                  id="open-knowledge-shortcut-btn"
                  onClick={() => setIsKnowledgeDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <span>REMUME / Protocolos</span>
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {activeKnowledgeCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Multimodal Input Area (Text + Web Audio Recorder + Image/PDF Attachments) */}
            <section id="section-multimodal-input">
              <MultimodalInput
                profession={PROFESSIONS[selectedProfession]}
                rawNotes={rawNotes}
                setRawNotes={setRawNotes}
                isFirstConsultation={isFirstConsultation}
                setIsFirstConsultation={setIsFirstConsultation}
                patientPreviousConsultationsCount={
                  selectedPatient
                    ? consultations.filter((c) => c.patientId === selectedPatient.id).length
                    : 0
                }
                audioAttachment={audioAttachment}
                setAudioAttachment={setAudioAttachment}
                attachments={attachments}
                setAttachments={setAttachments}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                onShowToast={showToast}
                activeKnowledgeCount={activeKnowledgeCount}
                onOpenKnowledgeBase={() => setIsKnowledgeDrawerOpen(true)}
                userApiKey={systemSettings.geminiApiKey || userApiKey}
                openaiApiKey={systemSettings.openaiApiKey}
                groqApiKey={systemSettings.groqApiKey}
              />
            </section>

            {/* 3. Output Ready for Copy (PEC Distinct Cards) */}
            <section id="section-output-results" ref={outputRef}>
              {currentRecord ? (
                <OutputCard
                  record={currentRecord}
                  profession={PROFESSIONS[currentRecord.professionId]}
                  patient={selectedPatient}
                  onSaveToTimeline={handleSaveToPatientTimeline}
                  isSavedToTimeline={isRecordSavedToTimeline}
                  onShowToast={showToast}
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
                      Digite as anotações do paciente, grave um áudio da consulta ou anexe fotos de
                      receitas médicas e clique em <strong>"Gerar Prontuário PEC ✨"</strong>.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          /* Patients & Timeline Tab View */
          <section id="section-patients-and-timeline">
            {selectedPatient ? (
              <div className="space-y-4">
                <button
                  type="button"
                  id="back-to-patients-list-btn"
                  onClick={() => setSelectedPatient(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ver Todos os Pacientes</span>
                </button>

                <PatientTimeline
                  patient={selectedPatient}
                  consultations={consultations}
                  currentUser={currentUser}
                  onNewConsultation={handleStartConsultationForPatient}
                  onGenerateEvolution={handleGenerateEvolution}
                  onEditPatient={(pat) => {
                    setPatientToEdit(pat);
                    setIsPatientFormModalOpen(true);
                  }}
                  onDeletePatient={handleDeletePatient}
                  onEditConsultation={handleEditConsultation}
                  onDeleteConsultation={handleDeleteConsultation}
                  onShowToast={showToast}
                />
              </div>
            ) : (
              <PatientsListView
                patients={patients}
                consultations={consultations}
                currentUser={currentUser}
                onSelectPatient={(pat) => setSelectedPatient(pat)}
                onOpenNewPatientModal={() => {
                  setPatientToEdit(null);
                  setIsPatientFormModalOpen(true);
                }}
                onEditPatient={(pat) => {
                  setPatientToEdit(pat);
                  setIsPatientFormModalOpen(true);
                }}
                onDeletePatient={handleDeletePatient}
                onNewConsultationForPatient={handleStartConsultationForPatient}
              />
            )}
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
        onShowToast={showToast}
      />

      {selectedPatient && (
        <ClinicalEvolutionModal
          isOpen={isEvolutionModalOpen}
          onClose={() => setIsEvolutionModalOpen(false)}
          evolution={evolutionSummary}
          patient={selectedPatient}
          isLoading={isLoadingEvolution}
          onRegenerate={() => {
            const patientConsultations = consultations.filter(
              (c) => c.patientId === selectedPatient.id
            );
            handleGenerateEvolution(selectedPatient, patientConsultations);
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
        onUpdateSystemSettings={handleSaveSystemSettings}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onAddUser={handleAddUser}
        onEditPatient={handleEditPatientFromModal}
        onDeletePatient={handleDeletePatient}
        onEditConsultation={handleEditConsultation}
        onDeleteConsultation={handleDeleteConsultation}
        onShowToast={showToast}
      />

      {/* Edit Consultation Modal */}
      <EditConsultationModal
        isOpen={isEditConsultationModalOpen}
        onClose={() => {
          setIsEditConsultationModalOpen(false);
          setConsultationToEdit(null);
        }}
        consultation={consultationToEdit}
        onSaveConsultation={handleSaveEditedConsultation}
        onShowToast={showToast}
      />
    </div>
  );
}
