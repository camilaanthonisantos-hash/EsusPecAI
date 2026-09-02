import React from 'react';
import {
  Activity,
  Zap,
  Cpu,
  Key,
  Moon,
  Sun,
  History,
  BookOpen,
  Users,
  FileText,
  UserCheck,
  Stethoscope,
  Sparkles,
  Cloud,
  Database,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { ProfessionId, AIModelId, User, Patient } from '../types';
import { PROFESSIONS, isUserAdmin } from '../data/professions';
import { AVAILABLE_MODELS } from '../types';
import { SpecularButton } from './SpecularButton';

interface HeaderProps {
  activeTab: 'generator' | 'patients';
  onSelectTab: (tab: 'generator' | 'patients') => void;
  currentUser: User;
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

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & System Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/20">
              <Activity className="w-5 h-5" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white ring-2 ring-white dark:ring-slate-900">
                +
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  e-SUS <span className="text-teal-600 dark:text-teal-400">PEC AI</span>
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-teal-500/10 dark:bg-teal-500/20 text-[10px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  Multiprofissional
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xs:block">
                Atenção Primária & RAPS • Prontuário 1-Clique
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Prontuário Rápido vs Pacientes & Timeline) */}
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
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>Pacientes & Linha do Tempo</span>
              {patientsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 text-[10px] font-extrabold border border-teal-200 dark:border-teal-700/60">
                  {patientsCount}
                </span>
              )}
            </SpecularButton>
          </div>

          {/* Right Actions: User Profile Badge, AI Model, Knowledge, System Settings, Theme */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* User Profile Badge (Click to open Profile / Switch User) */}
            <SpecularButton
              type="button"
              id="user-profile-button"
              onClick={onOpenAuthModal}
              size="sm"
              radius={16}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left"
              title="Meu Perfil Profissional / Acesso ao Sistema"
            >
              <div className={`p-1.5 rounded-xl text-xs font-bold border ${currentProf.accentBg}`}>
                <Stethoscope className="w-3.5 h-3.5" />
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {currentUser.name.split(' ')[0]} {currentUser.name.split(' ')[1] || ''}
                  </span>
                  {isAdmin ? (
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-extrabold border border-emerald-500/30">
                      ADMIN
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-semibold">
                      COMUM
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {currentProf.name} • {currentUser.workplace.split(' ')[0]}
                </div>
              </div>
            </SpecularButton>

            {/* Logout button */}
            {onLogout && (
              <SpecularButton
                type="button"
                id="header-logout-btn"
                onClick={onLogout}
                size="icon"
                radius={12}
                className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-transparent"
                title="Encerrar Sessão (Sair do Sistema)"
                aria-label="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </SpecularButton>
            )}

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

            {/* Model Selector Dropdown */}
            <div
              id="model-selector-group"
              className="hidden xl:flex items-center"
            >
              <select
                value={selectedModel}
                onChange={(e) => onSelectModel(e.target.value as AIModelId)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name.replace('Gemini 2.5 ', '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Knowledge Base Button */}
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

            {/* System Configuration & RBAC Modal Button */}
            <SpecularButton
              type="button"
              id="header-system-settings-btn"
              onClick={onOpenSystemSettings}
              size="icon"
              radius={12}
              className={`${
                isAdmin
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent'
              }`}
              title="Configurações do Sistema & Gestão de Usuários"
            >
              <Settings className="w-4 h-4" />
              {isAdmin && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-600 text-[7px] font-black text-white">
                  ✓
                </span>
              )}
            </SpecularButton>

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
          </div>
        </div>
      </div>
    </header>
  );
};

