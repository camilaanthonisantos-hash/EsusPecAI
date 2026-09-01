import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  Mail,
  Building,
  Shield,
  CheckCircle2,
  Users,
  Stethoscope,
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  LogOut,
  Sparkles,
  AlertCircle,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { User, ProfessionId, ProfessionConfig, WorkplaceType, UserRole, SystemSettings } from '../types';
import {
  PROFESSIONS,
  ADMIN_MASTER_EMAIL,
  isUserAdmin,
  DEFAULT_COUNCIL_BODIES,
  DEFAULT_WORKPLACE_PRESETS,
  formatProfessionalRegister,
} from '../data/professions';
import { ProfessionalRegisterInputs } from './ProfessionalRegisterInputs';
import { WorkplaceSelectInput } from './WorkplaceSelectInput';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  canClose: boolean;
  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];
  systemSettings?: SystemSettings;
  onUpdateSystemSettings?: (newSettings: SystemSettings) => void;
  onLogin: (user: User, remember: boolean) => void;
  onRegisterUser: (newUser: User, remember: boolean) => void;
  onLogout: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const WORKPLACE_PRESETS: WorkplaceType[] = [
  'UBS Central / ESF',
  'UBS Vila Esperança',
  'CAPS II Norte (Saúde Mental)',
  'CAPSi (Infantojuvenil)',
  'CAPS AD (Álcool e Drogas)',
  'eMulti Território Central',
  'Policlínica Municipal de Especialidades',
  'Polo Academia da Saúde',
  'Secretaria Municipal de Saúde / Coordenação PEC',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  canClose,
  currentUser,
  isAuthenticated,
  users,
  systemSettings,
  onUpdateSystemSettings,
  onLogin,
  onRegisterUser,
  onLogout,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'profile_view'>(
    isAuthenticated && currentUser ? 'profile_view' : 'login'
  );

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regProfession, setRegProfession] = useState<ProfessionId>('enfermeiro');
  const [regCouncilBody, setRegCouncilBody] = useState<string>('COREN');
  const [regCouncilNumber, setRegCouncilNumber] = useState<string>('');
  const [regCouncilUf, setRegCouncilUf] = useState<string>('SP');
  const [regWorkplace, setRegWorkplace] = useState<string>(
    systemSettings?.defaultUnitName || 'CAPS (Centro de Atenção Psicossocial)'
  );
  const [regError, setRegError] = useState<string | null>(null);

  // Dynamic professions, councils, and workplaces
  const allProfessionsMap: Record<string, ProfessionConfig> = {
    ...PROFESSIONS,
    ...(systemSettings?.customProfessions?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}) || {}),
  };

  const allCouncilBodies: string[] = Array.from(
    new Set([
      ...DEFAULT_COUNCIL_BODIES,
      ...(systemSettings?.customCouncilBodies || []),
    ])
  );

  const allWorkplaces: string[] = Array.from(
    new Set([
      ...DEFAULT_WORKPLACE_PRESETS,
      ...(systemSettings?.customWorkplaces || []),
    ])
  );

  const handleAddNewProfession = (newProf: ProfessionConfig) => {
    if (systemSettings && onUpdateSystemSettings) {
      const updated = [...(systemSettings.customProfessions || []), newProf];
      onUpdateSystemSettings({
        ...systemSettings,
        customProfessions: updated,
        updatedAt: Date.now(),
      });
    }
    onShowToast(
      'success',
      `Especialidade "${newProf.name}" adicionada ao sistema!`,
      'Especialidade Cadastrada'
    );
  };

  const handleAddNewCouncilBody = (newCouncil: string) => {
    const clean = newCouncil.trim().toUpperCase();
    if (systemSettings && onUpdateSystemSettings) {
      const updated = Array.from(
        new Set([...(systemSettings.customCouncilBodies || []), clean])
      );
      onUpdateSystemSettings({
        ...systemSettings,
        customCouncilBodies: updated,
        updatedAt: Date.now(),
      });
    }
    onShowToast('success', `Órgão "${clean}" adicionado à lista!`, 'Órgão Cadastrado');
  };

  const handleAddNewWorkplace = (newWorkplace: string) => {
    const clean = newWorkplace.trim();
    if (!clean) return;
    if (systemSettings && onUpdateSystemSettings) {
      const updated = Array.from(
        new Set([...(systemSettings.customWorkplaces || []), clean])
      );
      onUpdateSystemSettings({
        ...systemSettings,
        customWorkplaces: updated,
        updatedAt: Date.now(),
      });
    }
    onShowToast(
      'success',
      `Unidade "${clean}" cadastrada e salva no Banco de Dados!`,
      'Unidade Salva no BD'
    );
  };

  // Synchronize view mode when open/authenticated state changes
  useEffect(() => {
    if (isOpen) {
      setLoginError(null);
      setRegError(null);
      if (isAuthenticated && currentUser) {
        setMode('profile_view');
      } else {
        setMode('login');
      }
    }
  }, [isOpen, isAuthenticated, currentUser]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const emailClean = loginEmail.trim().toLowerCase();
    const passClean = loginPassword.trim();

    if (!emailClean) {
      setLoginError('Informe o e-mail de acesso.');
      return;
    }

    // Check if user exists in the registered users collection
    const existingUser = users.find((u) => u.email.trim().toLowerCase() === emailClean);

    if (!existingUser) {
      // Special check: Is this the master admin logging in for the first time?
      if (emailClean === ADMIN_MASTER_EMAIL.toLowerCase()) {
        const masterAdmin: User = {
          id: 'user-admin-master',
          name: 'Dr. Jerime Rêgo (Administrador Geral)',
          email: ADMIN_MASTER_EMAIL,
          password: passClean || 'admin',
          role: 'admin',
          professionalRegister: 'CRM/SP 998877',
          councilBody: 'CRM',
          councilNumber: '998877',
          councilUf: 'SP',
          profession: 'medico',
          workplace: 'Secretaria Municipal de Saúde / Coordenação PEC',
          createdAt: Date.now(),
        };
        onLogin(masterAdmin, rememberMe);
        onShowToast(
          'success',
          `Bem-vindo(a), ${masterAdmin.name}! Conectado como ADMINISTRADOR MASTER.`,
          'Acesso Liberado'
        );
        onClose();
        return;
      }

      setLoginError(
        'E-mail não encontrado no sistema. Se você ainda não possui cadastro, clique em "Novo Cadastro" abaixo.'
      );
      return;
    }

    // If existing user has password, check match (if user has set a password)
    if (existingUser.password && passClean && existingUser.password !== passClean) {
      setLoginError('Senha incorreta para este usuário. Tente novamente.');
      return;
    }

    // Ensure Master admin always has admin role
    const finalRole: UserRole =
      existingUser.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase()
        ? 'admin'
        : existingUser.role || 'user';

    const authenticatedUser: User = {
      ...existingUser,
      role: finalRole,
    };

    onLogin(authenticatedUser, rememberMe);
    onShowToast(
      'success',
      `Bem-vindo(a), ${authenticatedUser.name}! Conectado como ${
        finalRole === 'admin' ? 'ADMINISTRADOR' : 'USUÁRIO COMUM'
      }.`,
      'Login Realizado'
    );
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const nameClean = regName.trim();
    const emailClean = regEmail.trim().toLowerCase();
    const passClean = regPassword.trim();
    const confirmClean = regConfirmPassword.trim();

    if (!nameClean || !emailClean) {
      setRegError('Preencha os campos obrigatórios (Nome e E-mail).');
      return;
    }

    if (passClean && confirmClean && passClean !== confirmClean) {
      setRegError('A senha e a confirmação de senha não coincidem.');
      return;
    }

    // Check if email already registered
    const alreadyExists = users.some((u) => u.email.trim().toLowerCase() === emailClean);
    if (alreadyExists) {
      setRegError('Já existe um usuário cadastrado com este e-mail. Faça login.');
      return;
    }

    const isMaster = emailClean === ADMIN_MASTER_EMAIL.toLowerCase();
    const role: UserRole = isMaster ? 'admin' : 'user';

    const formattedRegister = formatProfessionalRegister(
      regCouncilBody,
      regCouncilNumber,
      regCouncilUf
    );

    const newUser: User = {
      id: `user-${regProfession}-${Date.now()}`,
      name: nameClean,
      email: emailClean,
      password: passClean || 'sus',
      role,
      profession: regProfession,
      councilBody: regCouncilBody,
      councilNumber: regCouncilNumber,
      councilUf: regCouncilUf,
      professionalRegister: formattedRegister,
      workplace: regWorkplace.trim() || 'UBS Central / ESF',
      createdAt: Date.now(),
    };

    onRegisterUser(newUser, rememberMe);
    const profLabel = allProfessionsMap[regProfession]?.name || regProfession;
    onShowToast(
      'success',
      `Cadastro realizado com sucesso! Bem-vindo(a), ${newUser.name} (${profLabel}).`,
      'Conta Criada'
    );
    onClose();
  };

  const handleFillAdminQuick = () => {
    setLoginEmail(ADMIN_MASTER_EMAIL);
    setLoginPassword('admin');
    setLoginError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="auth-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => {
            if (canClose) onClose();
          }}
        >
          <motion.div
            id="auth-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[92vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with SUS & e-SUS AI branding */}
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      e-SUS <span className="text-teal-600 dark:text-teal-400">PEC AI</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/10 dark:bg-teal-500/20 text-[10px] font-extrabold text-teal-700 dark:text-teal-300 border border-teal-500/20">
                      Acesso Seguro
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistema de Prontuário Multiprofissional (APS • RAPS • eMulti)
                  </p>
                </div>
              </div>

              {canClose && (
                <button
                  type="button"
                  id="close-auth-modal-btn"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fechar janela"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Profile View Mode (When already logged in) */}
            {mode === 'profile_view' && currentUser ? (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        Sessão Ativa
                      </span>
                    </div>
                    {isUserAdmin(currentUser) ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>ADMINISTRADOR</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold">
                        USUÁRIO COMUM
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {currentUser.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {currentUser.email}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[11px] font-bold border border-teal-300 dark:border-teal-800">
                        {PROFESSIONS[currentUser.profession]?.name || currentUser.profession}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {currentUser.professionalRegister}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {currentUser.workplace}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    id="switch-to-login-btn"
                    onClick={() => {
                      setLoginEmail('');
                      setLoginPassword('');
                      setMode('login');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Entrar com Outro E-mail</span>
                  </button>

                  <button
                    type="button"
                    id="switch-to-register-btn"
                    onClick={() => setMode('register')}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Novo Cadastro de Profissional</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <button
                    type="button"
                    id="logout-btn"
                    onClick={() => {
                      onLogout();
                      setMode('login');
                    }}
                    className="py-2 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Encerrar Sessão (Sair)</span>
                  </button>

                  {canClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                    >
                      Continuar no Sistema
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Mode Selector Tabs (Login vs Novo Cadastro) */}
                <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1.5 mb-5">
                  <button
                    type="button"
                    id="tab-login-btn"
                    onClick={() => {
                      setMode('login');
                      setLoginError(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Acessar com Login e Senha</span>
                  </button>

                  <button
                    type="button"
                    id="tab-register-btn"
                    onClick={() => {
                      setMode('register');
                      setRegError(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Novo Cadastro de Profissional</span>
                  </button>
                </div>

                {/* 1. LOGIN MODE */}
                {mode === 'login' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {loginError && (
                      <div
                        id="login-error-alert"
                        className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>{loginError}</div>
                      </div>
                    )}

                    {/* Email Input */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        E-mail de Acesso <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          id="login-email-input"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="ex: seu.email@saude.gov.br ou jerime.rego@gmail.com"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Senha de Acesso <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="login-password-input"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Digite sua senha"
                          className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember me & Quick Admin Access Box */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Lembrar meu acesso</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleFillAdminQuick}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Preencher Admin Master
                      </button>
                    </div>

                    {/* Quick Access Info Banner */}
                    <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 text-[11px] text-teal-900 dark:text-teal-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Acesso ao Sistema SUS</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        • <strong>Administrador Master:</strong>{' '}
                        <code className="font-mono text-teal-700 dark:text-teal-300">
                          {ADMIN_MASTER_EMAIL}
                        </code>{' '}
                        (senha: <code className="font-mono">admin</code>)
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        • <strong>Usuários da Equipe:</strong> Use seu e-mail cadastrado ou clique na aba{' '}
                        <strong>"Novo Cadastro"</strong> para cadastrar seu perfil profissional.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        id="login-submit-btn"
                        className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Entrar no Sistema e-SUS PEC</span>
                      </button>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('register');
                          setRegError(null);
                        }}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-semibold cursor-pointer"
                      >
                        Ainda não possui cadastro?{' '}
                        <span className="text-teal-600 dark:text-teal-400 font-bold underline">
                          Cadastre-se aqui
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. REGISTER MODE */}
                {mode === 'register' && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {regError && (
                      <div
                        id="register-error-alert"
                        className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>{regError}</div>
                      </div>
                    )}

                    {/* Full Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Nome Completo do Profissional <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="reg-name-input"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ex: Dra. Mariana Vasconcelos"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>

                    {/* Email and Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          E-mail Institucional ou Pessoal <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            id="reg-email-input"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="usuario@saude.gov.br"
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Senha de Acesso <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            id="reg-password-input"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Mínimo 4 caracteres"
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Confirmar Senha de Acesso
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          id="reg-confirm-password-input"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repita sua senha"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Professional Details: Especialidade (with Add) + Órgão (with Add) + Num/Cod (auto CBO or typed) + UF */}
                    <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80">
                      <ProfessionalRegisterInputs
                        selectedProfession={regProfession}
                        onProfessionChange={setRegProfession}
                        allProfessions={allProfessionsMap}
                        onAddNewProfession={handleAddNewProfession}
                        councilBody={regCouncilBody}
                        onCouncilBodyChange={setRegCouncilBody}
                        councilNumber={regCouncilNumber}
                        onCouncilNumberChange={setRegCouncilNumber}
                        councilUf={regCouncilUf}
                        onCouncilUfChange={setRegCouncilUf}
                        availableCouncilBodies={allCouncilBodies}
                        onAddNewCouncilBody={handleAddNewCouncilBody}
                      />
                    </div>

                    {/* Workplace */}
                    <WorkplaceSelectInput
                      value={regWorkplace}
                      onChange={setRegWorkplace}
                      availableWorkplaces={allWorkplaces}
                      onAddNewWorkplace={handleAddNewWorkplace}
                      label="Unidade de Lotação"
                      required
                      id="reg-workplace-select"
                    />

                    {/* RBAC Info Card */}
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300">
                      <p>
                        <strong>Permissões de Acesso (RBAC):</strong> Novos profissionais são cadastrados como{' '}
                        <strong>Usuários Comuns</strong> com autorização total para registrar e editar prontuários e pacientes da equipe.
                      </p>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setRegError(null);
                        }}
                        className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Voltar para Login
                      </button>

                      <button
                        type="submit"
                        id="register-submit-btn"
                        className="py-2.5 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Concluir Cadastro & Entrar</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
