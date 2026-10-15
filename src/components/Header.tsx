import React from 'react';
import {
  Activity,
  Zap,
  BookOpen,
  History,
  Users,
  Database,
  Settings,
  Moon,
  Sun,
  RotateCw,
  User as UserIcon,
  Lock,
  Pill,
  Calendar,
  Eye,
  FlaskConical,
  UserCheck,
} from 'lucide-react';
import { ProfessionId, AIModelId, User, Patient } from '../types';
import { PROFESSIONS, isUserAdmin } from '../data/professions';
import { AVAILABLE_MODELS } from '../types';
import { SpecularButton } from './SpecularButton';

interface HeaderProps {
  activeTab: 'generator' | 'patients' | 'appointments' | 'queue' | 'public_portal';
  onSelectTab: (tab: 'generator' | 'patients' | 'appointments' | 'queue' | 'public_portal') => void;
  currentUser: User;
  isAuthenticated: boolean;
  hasAccess?: boolean;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
  onOpenSystemSettings: () => void;
  selectedPatient: Patient | null;
  selectedProfession: ProfessionId;
  onSelectProfession: (id: ProfessionId) => void;
  selectedModel: AIModelId;
  onSelectModel: (model: AIModelId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenApiKeyModal: () => void;
  onOpenKnowledgeDrawer: () => void;
  onOpenMedicationsDrawer?: () => void;
  onOpenExamsDrawer?: () => void;
  onOpenHistoryDrawer: () => void;
  activeKnowledgeCount: number;
  medicationsCount?: number;
  examsCount?: number;
  historyCount: number;
  patientsCount?: number;
  appointmentsCount?: number;
  queueCount?: number;
  hasCallingPatient?: boolean;
  hasCustomApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  isAuthenticated,
  hasAccess = true,
  onOpenAuthModal,
  onLogout,
  onOpenSystemSettings,
  selectedPatient,
  selectedProfession,
  onSelectProfession,
  selectedModel,
  onSelectModel,
  isDarkMode,
  onToggleDarkMode,
  onOpenApiKeyModal,
  onOpenKnowledgeDrawer,
  onOpenMedicationsDrawer,
  onOpenExamsDrawer,
  onOpenHistoryDrawer,
  activeKnowledgeCount,
  medicationsCount = 0,
  examsCount = 0,
  historyCount,
  patientsCount = 0,
  appointmentsCount = 0,
  queueCount = 0,
  hasCallingPatient = false,
  hasCustomApiKey,
}) => {
  const currentProf =
    (currentUser?.profession && PROFESSIONS[currentUser.profession]) ||
    (selectedProfession && PROFESSIONS[selectedProfession]) ||
    PROFESSIONS.medico;
  const isAdmin = isUserAdmin(currentUser);

  const profName = currentProf?.name || 'Profissional de Saúde';
  const userName = currentUser?.name || 'Profissional';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';

  const handleRefreshPage = () => {
    window.location.reload();
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* 1. Sleek, Smaller & Professional Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 overflow-hidden">
              <img
                src="/assets/logo-caps.jpg"
                alt="Logo CAPS"
                className="w-full h-full object-contain p-0.5"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  Pec<span className="text-teal-600 dark:text-teal-400">AI</span>
                </h1>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden xs:block leading-none">
                {isAuthenticated ? 'Atenção Primária & RAPS' : 'Portal de Agendamento do Cidadão'}
              </p>
            </div>
          </div>

          {/* 2. Center Navigation Tabs */}
          {isAuthenticated ? (
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 gap-1">
              <SpecularButton
                type="button"
                id="nav-tab-generator"
                onClick={() => onSelectTab('generator')}
                size="sm"
                radius={12}
                className={`${
                  activeTab === 'generator'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Gerador PEC</span>
              </SpecularButton>

              <SpecularButton
                type="button"
                id="nav-tab-patients"
                onClick={() => onSelectTab('patients')}
                size="sm"
                radius={12}
                className={`${
                  activeTab === 'patients'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                }`}
                title={
                  !hasAccess && !isAdmin
                    ? 'Acesso bloqueado: requer assinatura de plano ativo'
                    : 'Acessar cadastro de pacientes e histórico da linha do tempo'
                }
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Pacientes</span>
                {!hasAccess && !isAdmin ? (
                  <Lock className="w-3 h-3 text-amber-500" />
                ) : patientsCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 text-[10px] font-extrabold border border-teal-200 dark:border-teal-700/60">
                    {patientsCount}
                  </span>
                ) : null}
              </SpecularButton>

              <SpecularButton
                type="button"
                id="nav-tab-queue"
                onClick={() => onSelectTab('queue')}
                size="sm"
                radius={12}
                className={`${
                  activeTab === 'queue'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                } ${hasCallingPatient ? 'animate-pulse ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200' : ''}`}
                title="Fila de Atendimento do Dia"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Fila Atendimento</span>
                {queueCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 text-[10px] font-extrabold border border-emerald-200 dark:border-emerald-700/60">
                    {queueCount}
                  </span>
                )}
              </SpecularButton>

              <SpecularButton
                type="button"
                id="nav-tab-appointments"
                onClick={() => onSelectTab('appointments')}
                size="sm"
                radius={12}
                className={`${
                  activeTab === 'appointments'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                }`}
                title="Central de agendamentos online e integração Google Calendar / WhatsApp"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Agendamentos</span>
                {appointmentsCount && appointmentsCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 text-[10px] font-extrabold border border-blue-200 dark:border-blue-700/60">
                    {appointmentsCount}
                  </span>
                ) : null}
              </SpecularButton>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-200 text-xs font-bold">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Portal de Agendamento do Cidadão • Acesso Livre & Sem Senha</span>
            </div>
          )}

          {/* 3. Right Toolbar Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Dedicated Page Refresh Button */}
            <SpecularButton
              type="button"
              id="header-refresh-page-btn"
              onClick={handleRefreshPage}
              size="icon"
              radius={12}
              className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 border-transparent group"
              title="Atualizar Página (Recarregar)"
              aria-label="Atualizar Página"
            >
              <RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            </SpecularButton>

            {/* Model Selector Dropdown (ADMIN ONLY) */}
            {isAuthenticated && isAdmin && (
              <div
                id="model-selector-group"
                className="hidden xl:flex items-center"
              >
                <select
                  value={selectedModel}
                  onChange={(e) => onSelectModel(e.target.value as AIModelId)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {(m?.name || m?.id || '').replace('Gemini 2.5 ', '')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Knowledge Base Button (ADMIN ONLY) */}
            {isAuthenticated && isAdmin && (
              <SpecularButton
                type="button"
                id="header-knowledge-btn"
                onClick={onOpenKnowledgeDrawer}
                size="icon"
                radius={12}
                className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent"
                title="Base de Conhecimento & Protocolos Municipais"
              >
                <BookOpen className="w-4 h-4" />
                {activeKnowledgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white shadow-xs">
                    {activeKnowledgeCount}
                  </span>
                )}
              </SpecularButton>
            )}

            {/* SUS / REMUME Medications Database Button */}
            {isAuthenticated && onOpenMedicationsDrawer && (
              <SpecularButton
                type="button"
                id="header-medications-btn"
                onClick={onOpenMedicationsDrawer}
                size="icon"
                radius={12}
                className="text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/50 dark:border-blue-800/40"
                title="Banco de Medicamentos SUS / REMUME"
              >
                <Pill className="w-4 h-4" />
                {medicationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs">
                    {medicationsCount > 99 ? '99+' : medicationsCount}
                  </span>
                )}
              </SpecularButton>
            )}

            {/* SUS Exams & Tests Catalog Button */}
            {isAuthenticated && onOpenExamsDrawer && (
              <SpecularButton
                type="button"
                id="header-exams-btn"
                onClick={onOpenExamsDrawer}
                size="icon"
                radius={12}
                className="text-violet-600 dark:text-violet-400 bg-violet-50/60 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/60 border border-violet-200/50 dark:border-violet-800/40"
                title="Catálogo de Exames SUS (Laboratório & Imagem)"
              >
                <FlaskConical className="w-4 h-4" />
                {examsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow-xs">
                    {examsCount > 99 ? '99+' : examsCount}
                  </span>
                )}
              </SpecularButton>
            )}

            {/* History Drawer Button */}
            {isAuthenticated && (
              <SpecularButton
                type="button"
                id="header-history-btn"
                onClick={onOpenHistoryDrawer}
                size="icon"
                radius={12}
                className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent"
                title="Histórico de Atendimentos Salvos"
              >
                <History className="w-4 h-4" />
                {historyCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white shadow-xs">
                    {historyCount}
                  </span>
                )}
              </SpecularButton>
            )}

            {/* System Configuration (ADMIN ONLY - Oculto para usuários comuns) */}
            {isAuthenticated && isAdmin && (
              <SpecularButton
                type="button"
                id="header-system-settings-btn"
                onClick={onOpenSystemSettings}
                size="icon"
                radius={12}
                className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                title="Configurações do Sistema & Gestão de Usuários (Admin)"
              >
                <Settings className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-600 text-[7px] font-black text-white">
                  ✓
                </span>
              </SpecularButton>
            )}

            {/* Dark Mode Toggle */}
            <SpecularButton
              type="button"
              id="header-dark-mode-toggle"
              onClick={onToggleDarkMode}
              size="icon"
              radius={12}
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent"
              aria-label="Alternar tema claro/escuro"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </SpecularButton>

            {/* User Profile or Login Button */}
            {isAuthenticated ? (
              <button
                type="button"
                id="header-user-avatar-btn"
                onClick={onOpenAuthModal}
                className="relative flex items-center justify-center w-9 h-9 rounded-full ring-2 ring-teal-500/40 hover:ring-teal-500 hover:scale-105 transition-all cursor-pointer shadow-sm bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-600 text-white font-black text-sm ml-1"
                title={`Perfil: ${userName} (${profName}) - Clique para expandir`}
              >
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={userName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
                {/* Online Session Active Dot */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              </button>
            ) : (
              <SpecularButton
                type="button"
                id="header-login-btn"
                onClick={onOpenAuthModal}
                size="sm"
                radius={12}
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs ml-1 flex items-center gap-1.5 cursor-pointer"
                title="Acesso de Médicos, Enfermeiros e Profissionais"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Acesso Profissional</span>
              </SpecularButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
