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
} from 'lucide-react';
import { ProfessionId, AIModelId, User, Patient } from '../types';
import { PROFESSIONS, isUserAdmin } from '../data/professions';
import { AVAILABLE_MODELS } from '../types';
import { SpecularButton } from './SpecularButton';

interface HeaderProps {
  activeTab: 'generator' | 'patients';
  onSelectTab: (tab: 'generator' | 'patients') => void;
  currentUser: User;
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
  onOpenHistoryDrawer: () => void;
  activeKnowledgeCount: number;
  historyCount: number;
  patientsCount?: number;
  hasCustomApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
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
  onOpenHistoryDrawer,
  activeKnowledgeCount,
  historyCount,
  patientsCount = 0,
  hasCustomApiKey,
}) => {
  const currentProf = PROFESSIONS[currentUser.profession] || PROFESSIONS[selectedProfession];
  const isAdmin = isUserAdmin(currentUser);

  // Helper for user initials
  const userInitial = currentUser.name?.trim().charAt(0).toUpperCase() || 'U';

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
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/20 shrink-0">
              <Activity className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  e-SUS <span className="text-teal-600 dark:text-teal-400">PEC AI</span>
                </h1>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden xs:block leading-none">
                Atenção Primária & RAPS
              </p>
            </div>
          </div>

          {/* 2. Center Navigation Tabs (Prontuário Rápido vs Pacientes & Timeline) */}
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
              <span>Pacientes & Linha do Tempo</span>
              {!hasAccess && !isAdmin ? (
                <Lock className="w-3 h-3 text-amber-500" />
              ) : patientsCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 text-[10px] font-extrabold border border-teal-200 dark:border-teal-700/60">
                  {patientsCount}
                </span>
              ) : null}
            </SpecularButton>
          </div>

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

            {/* Cloud Firestore Live Status */}
            <div
              id="header-cloud-status"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/30 text-[11px] font-semibold text-teal-700 dark:text-teal-300 shadow-2xs"
              title="Banco de dados Cloud Firestore em tempo real conectado"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Database className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span className="hidden xl:inline">Firestore</span>
            </div>

            {/* Model Selector Dropdown (ADMIN ONLY) */}
            {isAdmin && (
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
                      {m.name.replace('Gemini 2.5 ', '')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Knowledge Base Button (ADMIN ONLY) */}
            {isAdmin && (
              <SpecularButton
                type="button"
                id="header-knowledge-btn"
                onClick={onOpenKnowledgeDrawer}
                size="icon"
                radius={12}
                className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent"
                title="Base de Conhecimento & REMUME Municipal"
              >
                <BookOpen className="w-4 h-4" />
                {activeKnowledgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white shadow-xs">
                    {activeKnowledgeCount}
                  </span>
                )}
              </SpecularButton>
            )}

            {/* History Drawer Button */}
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

            {/* System Configuration (ADMIN ONLY - Oculto para usuários comuns) */}
            {isAdmin && (
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

            {/* 4. Sleek User Avatar Button (Top Right corner) */}
            <button
              type="button"
              id="header-user-avatar-btn"
              onClick={onOpenAuthModal}
              className="relative flex items-center justify-center w-9 h-9 rounded-full ring-2 ring-teal-500/40 hover:ring-teal-500 hover:scale-105 transition-all cursor-pointer shadow-sm bg-gradient-to-tr from-teal-700 via-teal-600 to-emerald-600 text-white font-black text-sm ml-1"
              title={`Perfil: ${currentUser.name} (${currentProf.name}) - Clique para expandir`}
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
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
          </div>
        </div>
      </div>
    </header>
  );
};
