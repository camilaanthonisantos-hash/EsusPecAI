import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Zap,
  CreditCard,
  User,
  Mail,
  Phone,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { User as UserModel, SubscriptionPlan, SubscriptionRecord, SystemSettings } from '../types';
import { saveSubscriptionRecord, saveUserToFirestore } from '../services/firebase';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserModel;
  plans: SubscriptionPlan[];
  systemSettings?: SystemSettings;
  onPaymentSuccess?: () => void;
  onUpdateCurrentUser?: (user: UserModel) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  plans,
  systemSettings,
  onPaymentSuccess,
  onUpdateCurrentUser,
  onShowToast,
}) => {
  // Active step: 'select_plan' | 'fill_data' | 'pix_checkout'
  const [step, setStep] = useState<'select_plan' | 'fill_data' | 'pix_checkout'>('select_plan');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  // PIX state
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCodeUrl: string;
    copiaECola: string;
    idPix: string;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Filter only active plans
  const activePlans = plans.filter((p) => p.active);

  // Default to monthly plan or first active
  useEffect(() => {
    if (activePlans.length > 0 && !selectedPlan) {
      const defaultPlan = activePlans.find((p) => p.id === 'mensal') || activePlans[0];
      setSelectedPlan(defaultPlan);
    }
  }, [activePlans, selectedPlan]);

  // Pre-fill user existing data
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setCpf(currentUser.cpf || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // Determine which fields are missing from user profile
  const hasExistingName = Boolean(currentUser?.name?.trim());
  const hasExistingEmail = Boolean(currentUser?.email?.trim());
  const hasExistingCpf = Boolean(currentUser?.cpf?.trim());
  const hasExistingPhone = Boolean(currentUser?.phone?.trim());

  // Check if any required field is missing
  const needsToFillData = !hasExistingName || !hasExistingEmail || !hasExistingCpf || !hasExistingPhone;

  // Format CPF (000.000.000-00)
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setCpf(formatted);
  };

  // Format Phone ((00) 00000-0000)
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    } else if (raw.length > 6) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    } else if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    setPhone(formatted);
  };

  const handleSelectPlanAndProceed = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    if (needsToFillData) {
      setStep('fill_data');
    } else {
      generatePix(plan);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    // Validate CPF
    const rawCpf = cpf.replace(/\D/g, '');
    if (rawCpf.length !== 11) {
      onShowToast('error', 'Por favor, informe um CPF válido com 11 dígitos.', 'CPF Inválido');
      return;
    }

    // Validate Phone
    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      onShowToast('error', 'Por favor, informe um número de telefone com DDD.', 'Telefone Inválido');
      return;
    }

    generatePix(selectedPlan);
  };

  const generatePix = async (plan: SubscriptionPlan) => {
    setIsLoadingPix(true);
    setStep('pix_checkout');

    const webhookUrl =
      systemSettings?.n8nPixWebhookUrl?.trim() ||
      'https://n8n.mentoriajrs.com/webhook/gerar_pix_bronze_camila';

    const orderId = `sub_${currentUser.id}_${Date.now()}`;
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');

    // Payload expected by n8n (gerar_pix.md)
    const payload = {
      userName: fullName || currentUser.name,
      Email: email || currentUser.email,
      userCpf: cleanCpf,
      userPhone: cleanPhone,
      'Nome-servico': plan.name,
      Valor: Math.round(plan.price * 100), // PagBank amount in cents (e.g., 19.90 -> 1990)
      valorFormatado: plan.price.toFixed(2),
      duracaoDias: plan.durationDays,
      agendamento_id: currentUser.id, // reference_id mapped to user ID for direct update
      subscription_id: orderId,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro na comunicação com o servidor PagBank (HTTP ${response.status})`);
      }

      const data = await response.json();

      const qrCodeUrl = data['qr-code'] || data.qrCode || '';
      const copiaECola = data['chave-pix-copia-cola'] || data.copiaECola || '';
      const idPix = data['id-pix'] || data.id || '';

      if (!copiaECola && !qrCodeUrl) {
        throw new Error('O webhook não retornou a chave Pix esperada.');
      }

      setPixData({
        qrCodeUrl,
        copiaECola,
        idPix,
      });

      // Save pending subscription record in Firestore
      const newRecord: SubscriptionRecord = {
        id: orderId,
        userId: currentUser.id,
        userName: fullName || currentUser.name,
        userEmail: email || currentUser.email,
        userCpf: cleanCpf,
        userPhone: cleanPhone,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        durationDays: plan.durationDays,
        status: 'pendente',
        createdAt: Date.now(),
        pixQrCode: qrCodeUrl,
        pixCopiaECola: copiaECola,
        pixId: idPix,
      };

      await saveSubscriptionRecord(newRecord);

      // Salva CPF e Telefone no perfil do usuário no Firestore para nunca mais precisar pedir
      const updatedUser: UserModel = {
        ...currentUser,
        name: fullName || currentUser.name,
        cpf: cleanCpf,
        phone: cleanPhone,
      };
      await saveUserToFirestore(updatedUser);
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(updatedUser);
      }

      onShowToast('success', 'Chave PIX gerada com sucesso! Efetue o pagamento para liberar seu acesso.', 'PIX Gerado');
    } catch (err: any) {
      console.error('Erro ao gerar PIX:', err);
      onShowToast(
        'error',
        err.message || 'Não foi possível gerar o PIX no momento. Tente novamente em instantes.',
        'Falha no PIX'
      );
      setStep(needsToFillData ? 'fill_data' : 'select_plan');
    } finally {
      setIsLoadingPix(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixData?.copiaECola) return;
    navigator.clipboard.writeText(pixData.copiaECola);
    setCopiedPix(true);
    onShowToast('info', 'Código Copia e Cola copiado para a área de transferência!', 'Copiado');
    setTimeout(() => setCopiedPix(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`relative w-full ${
          step === 'select_plan' ? 'max-w-5xl' : 'max-w-lg'
        } overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh] transition-all`}
      >
        {/* Modal Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Desbloquear Acesso Completo</h2>
              <p className="text-xs text-emerald-100/90">
                {currentUser?.free_used
                  ? 'Você utilizou seu 1º prontuário grátis. Escolha um plano para continuar.'
                  : 'Assine um plano para ter prontuários clínicos ilimitados no e-SUS PEC.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: SELECT PLAN */}
          {step === 'select_plan' && (
            <div className="space-y-6">
              <div className="text-center max-w-lg mx-auto">
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 mb-2">
                  <Zap className="w-3.5 h-3.5 mr-1" /> Acesso Imediato via PIX
                </span>
                <h3 className="text-lg font-bold">Selecione o plano ideal para a sua rotina</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Atendimentos ilimitados, todas as profissões da APS e eMulti, áudio e auditoria clínica com IA.
                </p>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
                {activePlans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const isPopular = plan.id === 'mensal';

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative flex flex-col justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                      }`}
                    >
                      {plan.badge && (
                        <span
                          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs ${
                            isPopular
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{plan.name}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {plan.description}
                        </p>

                        <div className="my-3">
                          <div className="flex items-baseline">
                            <span className="text-xs text-slate-500 font-semibold mr-1">R$</span>
                            <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                              {plan.price.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1">
                              /{plan.durationDays < 1 ? 'hora' : plan.durationDays === 7 ? 'semana' : plan.durationDays === 15 ? '15 dias' : plan.durationDays === 30 ? 'mês' : 'ano'}
                            </span>
                          </div>
                        </div>

                        <ul className="space-y-1.5 mb-4 text-[11px] text-slate-600 dark:text-slate-300">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start space-x-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlanAndProceed(plan);
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm ${
                          isSelected
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white'
                        }`}
                      >
                        <span>Contratar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom CTA */}
              {selectedPlan && (
                <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Plano Selecionado: <span className="text-emerald-600 dark:text-emerald-400">{selectedPlan.name}</span> (R$ {selectedPlan.price.toFixed(2).replace('.', ',')})
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Liberação imediata assim que o Pix for processado.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectPlanAndProceed(selectedPlan)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: FILL DATA */}
          {step === 'fill_data' && selectedPlan && (
            <form onSubmit={handleFormSubmit} className="space-y-5 max-w-md mx-auto">
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 mb-2">
                  Passo 2 de 3: Identificação
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Informações para o PagBank ({selectedPlan.name})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Precisamos apenas dos dados complementares para gerar a cobrança oficial no Banco Central.
                </p>
              </div>

              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Nome Completo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Dra. Camila Santos"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail Válido <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@saude.gov.br"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CPF Válido (para nota e PIX) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={cpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(00) 90000-0000"
                      maxLength={15}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select_plan')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Voltar aos Planos
                </button>
                <button
                  type="submit"
                  disabled={isLoadingPix}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-md disabled:opacity-50"
                >
                  {isLoadingPix ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando PIX...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Gerar PIX de R$ {selectedPlan.price.toFixed(2).replace('.', ',')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PIX CHECKOUT */}
          {step === 'pix_checkout' && (
            <div className="space-y-6 max-w-md mx-auto text-center">
              {isLoadingPix ? (
                <div className="py-12 space-y-4">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Conectando ao PagBank e gerando seu PIX...
                  </h4>
                  <p className="text-xs text-slate-500">Por favor, aguarde alguns segundos.</p>
                </div>
              ) : pixData ? (
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>Aguardando Pagamento</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Plano: <strong>{selectedPlan?.name}</strong> • Valor: <strong>R$ {selectedPlan?.price.toFixed(2).replace('.', ',')}</strong>
                    </p>
                  </div>

                  {/* QR Code Display */}
                  {pixData.qrCodeUrl && (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto">
                      <img
                        src={pixData.qrCodeUrl}
                        alt="QR Code PIX PagBank"
                        className="w-56 h-56 mx-auto object-contain"
                      />
                    </div>
                  )}

                  {/* Copia e Cola */}
                  {pixData.copiaECola && (
                    <div className="space-y-2 text-left">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Código PIX Copia e Cola:
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={pixData.copiaECola}
                          className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono select-all truncate"
                        />
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors ${
                            copiedPix
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600'
                          }`}
                        >
                          {copiedPix ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-left text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Assim que o pagamento for concluído no aplicativo do seu banco, a liberação de acesso acontecerá automaticamente em instantes.
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('select_plan')}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Escolher outro plano
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Fechar e aguardar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
