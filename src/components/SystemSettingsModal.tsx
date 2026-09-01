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
} from 'lucide-react';
import {
  User,
  UserRole,
  ProfessionId,
  ProfessionConfig,
  SystemSettings,
  GeminiModelId,
  Patient,
  Consultation,
  AVAILABLE_MODELS,
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

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  systemSettings: SystemSettings;
  patients: Patient[];
  consultations: Consultation[];
  onUpdateSystemSettings: (newSettings: SystemSettings) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onAddUser: (user: User) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patientId: string) => void;
  onEditConsultation: (consultation: Consultation) => void;
  onDeleteConsultation: (consultationId: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

type TabType = 'overview' | 'users' | 'api_keys' | 'data_management' | 'pec_params';

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  systemSettings,
  patients,
  consultations,
  onUpdateSystemSettings,
  onUpdateUser,
  onDeleteUser,
  onAddUser,
  onEditPatient,
  onDeletePatient,
  onEditConsultation,
  onDeleteConsultation,
  onShowToast,
}) => {
  const isAdmin = isUserAdmin(currentUser);

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Search state for users and data management
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [dataSearchTerm, setDataSearchTerm] = useState('');
  const [dataFilterType, setDataFilterType] = useState<'all' | 'patients' | 'consultations'>('all');

  // Settings form state
  const [geminiApiKey, setGeminiApiKey] = useState(systemSettings.geminiApiKey || '');
  const [defaultModel, setDefaultModel] = useState<GeminiModelId>(() => {
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
      defaultModel,
      defaultCiapCode: defaultCiapCode.trim() || '-69',
      defaultSigtapCode: defaultSigtapCode.trim() || '0301080445',
      municipalityName: municipalityName.trim(),
      defaultUnitName: defaultUnitName.trim(),
      systemCustomInstructions: systemCustomInstructions.trim(),
      updatedAt: Date.now(),
      updatedBy: currentUser.email,
    };

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

                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditingUser(u)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

                      {/* Model Selector */}
                      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>Modelo Padrão do Sistema</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {AVAILABLE_MODELS.map((model) => (
                            <label
                              key={model.id}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                                defaultModel === model.id
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name="defaultModel"
                                value={model.id}
                                checked={defaultModel === model.id}
                                onChange={() => setDefaultModel(model.id)}
                                className="mt-1"
                              />
                              <div>
                                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                                  <span>{model.name}</span>
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px]">
                                    {model.badge}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  {model.description}
                                </p>
                              </div>
                            </label>
                          ))}
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
