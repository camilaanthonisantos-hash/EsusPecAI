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
  AlertTriangle,
  Unlock,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Stamp,
  FileCheck2,
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
import { formatName, formatEmail } from '../utils/textFormatters';
import { saveUserToFirestore } from '../services/firebase';

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
    const existingUser = users.find((u) => u.email && u.email.trim().toLowerCase() === emailClean);

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
      (existingUser.email || '').toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase()
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
    const alreadyExists = users.some((u) => u.email && u.email.trim().toLowerCase() === emailClean);
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
              <div className="space-y-4">
                {/* Main Profile Card (Matching Image 1) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#09152b] dark:bg-[#071124] border border-slate-700/80 shadow-lg text-white">
                  {/* Top Bar: SESSÃO ATIVA & Role Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                        SESSÃO ATIVA
                      </span>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-slate-800/90 text-slate-300 text-[11px] font-bold border border-slate-700">
                      {isUserAdmin(currentUser) ? 'ADMINISTRADOR' : 'USUÁRIO COMUM'}
                    </span>
                  </div>

                  {/* User Info with Avatar Upload */}
                  <div className="flex items-start gap-3.5 mb-3">
                    {/* User Avatar with Face Upload Option */}
                    <div className="relative group shrink-0">
                      <input
                        type="file"
                        id="user-avatar-upload-input"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              onShowToast('error', 'A imagem deve ter menos de 5MB.', 'Imagem Grande');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64 = reader.result as string;
                              const updated = { ...currentUser, avatarUrl: base64 };
                              onLogin(updated, true);
                              onShowToast('success', 'Foto de perfil atualizada com sucesso!', 'Foto Carregada');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => document.getElementById('user-avatar-upload-input')?.click()}
                        className="relative w-14 h-14 rounded-full ring-2 ring-teal-500/50 hover:ring-teal-400 overflow-hidden bg-gradient-to-tr from-teal-700 to-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md transition-all cursor-pointer group"
                        title="Clique para carregar ou alterar a foto de perfil"
                      >
                        {currentUser.avatarUrl ? (
                          <img
                            src={currentUser.avatarUrl}
                            alt={currentUser.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span>{currentUser.name?.trim().charAt(0).toUpperCase() || 'U'}</span>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-[9px] font-bold text-teal-300">
                          <span>Foto</span>
                        </div>
                      </button>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <h3 className="text-lg font-black text-white truncate tracking-tight">
                        {currentUser.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        {currentUser.email}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/40">
                          {PROFESSIONS[currentUser.profession]?.name || currentUser.profession}
                        </span>
                        <span className="text-xs text-slate-300">
                          {currentUser.professionalRegister || currentUser.cboCode || 'CBO 2516-05'}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-300 truncate">
                          {currentUser.workplace}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Status Banner */}
                  <div className="mt-4 pt-3.5 border-t border-slate-700/50">
                    {isUserAdmin(currentUser) ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-semibold">Plano Ativo (Acesso Vitalício Admin)</span>
                      </div>
                    ) : currentUser.subscription_status === 'pago' && currentUser.subscription_expires_at && currentUser.subscription_expires_at > Date.now() ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <div>
                          <span className="font-semibold block">Plano Ativo: {currentUser.plan_name || 'Assinatura'}</span>
                          <span className="text-emerald-500/80 text-[10px]">Expira em: {new Date(currentUser.subscription_expires_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    ) : currentUser.subscription_status === 'pago' && currentUser.subscription_expires_at && currentUser.subscription_expires_at < Date.now() ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">Plano Expirado</span>
                        </div>
                        <span className="text-rose-300/80 text-[10px]">Cota de uso bloqueada</span>
                      </div>
                    ) : currentUser.free_used ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">Acesso Inativo (Cota Grátis Esgotada)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-400 bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20">
                        <div className="flex items-center gap-2">
                          <Unlock className="w-4 h-4 shrink-0" />
                          <span className="font-semibold">Plano Free (1 Geração Grátis Restante)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Carimbo & Assinatura Digitalizada do Profissional (Documentos de Impressão) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 dark:bg-slate-950/90 border border-teal-500/30 shadow-md space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <Stamp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                          <span>Carimbo & Assinatura Digitalizada</span>
                          <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 text-[9px] font-extrabold uppercase">
                            Impressão A4
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Configure a imagem do seu carimbo profissional para substituir a caixa de texto em todas as impressões.
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="toggle-use-digital-stamp"
                          checked={Boolean(currentUser.useDigitalStamp)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            if (isChecked && !currentUser.digitalStampUrl) {
                              onShowToast(
                                'info',
                                'Carregue uma imagem de carimbo abaixo para habilitar o uso nos documentos impressos.',
                                'Carregar Imagem'
                              );
                            }
                            const updated = { ...currentUser, useDigitalStamp: isChecked };
                            saveUserToFirestore(updated).catch(() => {});
                            fetch('/api/db/users', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updated),
                            }).catch(() => {});
                            onLogin(updated, true);
                            onShowToast(
                              isChecked ? 'success' : 'info',
                              isChecked
                                ? 'Carimbo digital ativado! Será exibido em todas as impressões.'
                                : 'Carimbo digital desativado. O sistema usará os dados de texto padrão (Nome, CBO e Órgão de Classe).',
                              'Preferência de Impressão'
                            );
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                      </label>
                      <span className="text-[11px] font-bold text-slate-300">
                        {currentUser.useDigitalStamp ? 'Ativado' : 'Desativado'}
                      </span>
                    </div>
                  </div>

                  {/* Stamp Upload / Preview Area */}
                  <div>
                    <input
                      type="file"
                      id="digital-stamp-upload-input"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            onShowToast('error', 'A imagem do carimbo deve ter menos de 5MB.', 'Arquivo Grande');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const base64 = reader.result as string;
                            const updated = {
                              ...currentUser,
                              digitalStampUrl: base64,
                              useDigitalStamp: true,
                            };
                            saveUserToFirestore(updated).catch(() => {});
                            fetch('/api/db/users', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updated),
                            }).catch(() => {});
                            onLogin(updated, true);
                            onShowToast(
                              'success',
                              'Carimbo e assinatura digitalizada carregados com sucesso! Já está ativo para impressões.',
                              'Carimbo Atualizado'
                            );
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    {currentUser.digitalStampUrl ? (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-32 h-16 rounded-lg bg-white p-1 border border-slate-700/60 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                            <img
                              src={currentUser.digitalStampUrl}
                              alt="Carimbo cadastrado"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Carimbo cadastrado</span>
                            </div>
                            <p className="text-[10.5px] text-slate-400">
                              {currentUser.useDigitalStamp
                                ? 'Pronto para renderização em todos os relatórios e receituários A4.'
                                : 'Carimbo salvo, porém desativado. Ative a chave ao lado para utilizá-lo.'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => document.getElementById('digital-stamp-upload-input')?.click()}
                            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Trocar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...currentUser,
                                digitalStampUrl: undefined,
                                useDigitalStamp: false,
                              };
                              saveUserToFirestore(updated).catch(() => {});
                              fetch('/api/db/users', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updated),
                              }).catch(() => {});
                              onLogin(updated, true);
                              onShowToast('info', 'Carimbo digital removido. O sistema voltará a utilizar o texto padrão.', 'Carimbo Removido');
                            }}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs cursor-pointer transition-colors"
                            title="Remover imagem do carimbo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => document.getElementById('digital-stamp-upload-input')?.click()}
                        className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-teal-500/60 bg-slate-950/60 hover:bg-slate-950 transition-all flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-teal-500/10 group-hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0 transition-colors">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition-colors">
                            Carregar Imagem do Carimbo / Assinatura Digitalizada
                          </div>
                          <p className="text-[10.5px] text-slate-400 mt-0.5">
                            Formatos aceitos: PNG (com fundo transparente) ou JPG nítido (máx. 5MB)
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Middle Action Buttons */}
                <div className={`grid grid-cols-1 ${isUserAdmin(currentUser) ? 'sm:grid-cols-2' : ''} gap-3 pt-1`}>
                  <button
                    type="button"
                    id="switch-to-login-btn"
                    onClick={() => {
                      setLoginEmail('');
                      setLoginPassword('');
                      setMode('login');
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#0f1f3d] hover:bg-[#152a52] text-slate-200 border border-slate-700/70 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <LogIn className="w-4 h-4 text-slate-400" />
                    <span>Entrar com Outro E-mail</span>
                  </button>

                  {isUserAdmin(currentUser) && (
                    <button
                      type="button"
                      id="switch-to-register-btn"
                      onClick={() => setMode('register')}
                      className="w-full py-3.5 px-4 rounded-2xl bg-[#0f1738] hover:bg-[#172454] text-indigo-200 border border-indigo-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <UserPlus className="w-4 h-4 text-indigo-400" />
                      <span>Novo Cadastro de Profissional</span>
                    </button>
                  )}
                </div>

                {/* Bottom Footer Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <button
                    type="button"
                    id="logout-btn"
                    onClick={() => {
                      onLogout();
                      setMode('login');
                    }}
                    className="w-full sm:w-auto py-2.5 px-5 rounded-2xl bg-transparent hover:bg-rose-950/30 text-rose-500 hover:text-rose-400 border border-rose-600/60 hover:border-rose-500 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Encerrar Sessão (Sair)</span>
                  </button>

                  {canClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full sm:w-auto py-2.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold shadow-md shadow-teal-600/25 transition-all cursor-pointer flex items-center justify-center"
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
                          onBlur={(e) => setLoginEmail(formatEmail(e.target.value))}
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
                        onBlur={(e) => setRegName(formatName(e.target.value))}
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
                            onBlur={(e) => setRegEmail(formatEmail(e.target.value))}
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
