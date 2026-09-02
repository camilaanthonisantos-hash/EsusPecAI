import React, { useState, useEffect } from 'react';
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
  SubscriptionPlan,
} from '../types';
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
}

type TabType = 'overview' | 'users' | 'api_keys' | 'data_management' | 'pec_params' | 'plans';

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
}) => {
  const isAdmin = isUserAdmin(currentUser);

  const [activeTab, setActiveTab] = useState<TabType>('overview');

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
    systemSettings.n8nPixWebhookUrl || 'https://n8n.mentoriajrs.com/webhook/gerar_pix_bronze_camila'
  );
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
  const filteredModels = AVAILABLE_MODELS.filter(m =>
    m.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    m.badge.toLowerCase().includes(modelSearchQuery.toLowerCase())
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
      defaultCiapCode: defaultCiapCode.trim() || '-69',
      defaultSigtapCode: defaultSigtapCode.trim() || '0301080445',
      municipalityName: municipalityName.trim(),
      defaultUnitName: defaultUnitName.trim(),
      systemCustomInstructions: systemCustomInstructions.trim(),
      n8nPixWebhookUrl: n8nPixWebhookUrl.trim(),
      updatedAt: Date.now(),
      updatedBy: currentUser.email,
    };

    localStorage.setItem('pec_groq_api_key', groqApiKey.trim());
    onUpdateSystemSettings(updated);
    onShowToast('success', 'Configurações gerais do sistema salvas com sucesso!', 'Configurações Atualizadas');
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
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Dados do Profissional Ativo
                    </h4>
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
                        <span className="text-slate-400 block mb-1">Categoria SUS</span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {PROFESSIONS[currentUser.profession]?.name || currentUser.profession}
                        </strong>
                      </div>
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block mb-1">Unidade de Lotação</span>
                        <strong className="text-slate-900 dark:text-slate-100">
                          {currentUser.workplace}
                        </strong>
                      </div>
                    </div>
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
                          <span>Modelo Padrão do Sistema</span>
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
                                  {AVAILABLE_MODELS.find(m => m.id === defaultModel)?.name}
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                                    {AVAILABLE_MODELS.find(m => m.id === defaultModel)?.badge}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  {AVAILABLE_MODELS.find(m => m.id === defaultModel)?.description}
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
                                  placeholder="Pesquisar modelos (ex: GPT-4o, Llama, Gemini)..."
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
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span>URL do Webhook n8n para Gerar PIX</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Endpoint HTTP que recebe os dados do checkout (nome, e-mail, cpf, telefone, plano, valor) e retorna o QR Code do PagBank.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="url"
                        value={n8nPixWebhookUrl}
                        onChange={(e) => setN8nPixWebhookUrl(e.target.value)}
                        placeholder="https://seu-n8n.com/webhook/gerar_pix_bronze_camila"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...systemSettings,
                            n8nPixWebhookUrl: n8nPixWebhookUrl.trim(),
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
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
