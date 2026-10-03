import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus,
  X,
  Calendar,
  CreditCard,
  User,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Baby,
  ShieldAlert,
} from 'lucide-react';
import { Patient, KinshipType } from '../types';
import {
  calculateChronologicalAge,
  formatCPF,
  validateCPF,
  formatCNS,
  validateCNS,
} from '../utils/dateCalculator';
import { formatName } from '../utils/textFormatters';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (patient: Patient) => void;
  patientToEdit?: Patient | null;
  patients?: Patient[];
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const KINSHIP_OPTIONS: KinshipType[] = [
  'Mãe',
  'Pai',
  'Avó / Avô',
  'Tia / Tio',
  'Irmã / Irmão',
  'Cônjuge / Companheiro(a)',
  'Tutor(a) Legal / Curador(a)',
  'Outro',
];

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  onSavePatient,
  patientToEdit,
  patients = [],
  onShowToast,
}) => {
  const [fullName, setFullName] = useState('');
  const [cns, setCns] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Feminino' | 'Masculino' | 'Outro'>('Feminino');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [legalGuardianName, setLegalGuardianName] = useState('');
  const [guardianKinship, setGuardianKinship] = useState<KinshipType>('Mãe');
  const [guardianKinshipCustom, setGuardianKinshipCustom] = useState('');

  // Validation states
  const [cnsTouched, setCnsTouched] = useState(false);
  const [cpfTouched, setCpfTouched] = useState(false);

  // Synchronize when editing or opening
  useEffect(() => {
    if (patientToEdit) {
      setFullName(patientToEdit.fullName || '');
      setCns(patientToEdit.cns || '');
      setCpf(patientToEdit.cpf || '');
      setBirthDate(patientToEdit.birthDate || '');
      setGender(patientToEdit.gender || 'Feminino');
      setPhone(patientToEdit.phone || '');
      setAddress(patientToEdit.address || '');
      setLegalGuardianName(patientToEdit.legalGuardianName || '');
      setGuardianKinship(patientToEdit.guardianKinship || 'Mãe');
      setGuardianKinshipCustom(patientToEdit.guardianKinshipCustom || '');
    } else {
      // Default initial state
      setFullName('');
      setCns('');
      setCpf('');
      setBirthDate('');
      setGender('Feminino');
      setPhone('');
      setAddress('');
      setLegalGuardianName('');
      setGuardianKinship('Mãe');
      setGuardianKinshipCustom('');
      setCnsTouched(false);
      setCpfTouched(false);
    }
  }, [patientToEdit, isOpen]);

  // Real-time chronological age calculation
  const calculatedAge = calculateChronologicalAge(birthDate);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleCnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCns(formatCNS(e.target.value));
  };

  const isCnsValid = validateCNS(cns);
  const isCpfValid = validateCPF(cpf);

  // Uniqueness validation (CNS and CPF cannot be duplicated across patients)
  const duplicateCnsPatient = useMemo(() => {
    const rawDigits = cns.replace(/\D/g, '');
    if (!rawDigits) return null;
    return (patients || []).find((p) => {
      if (patientToEdit?.id && p.id === patientToEdit.id) return false;
      const pCns = (p.cns || '').replace(/\D/g, '');
      return pCns && pCns === rawDigits;
    });
  }, [cns, patients, patientToEdit]);

  const duplicateCpfPatient = useMemo(() => {
    const rawDigits = cpf.replace(/\D/g, '');
    if (!rawDigits) return null;
    return (patients || []).find((p) => {
      if (patientToEdit?.id && p.id === patientToEdit.id) return false;
      const pCpf = (p.cpf || '').replace(/\D/g, '');
      return pCpf && pCpf === rawDigits;
    });
  }, [cpf, patients, patientToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      onShowToast('error', 'Informe o nome completo do paciente.', 'Campo Obrigatório');
      return;
    }

    if (!birthDate) {
      onShowToast('error', 'Informe a data de nascimento para o cálculo da idade.', 'Campo Obrigatório');
      return;
    }

    if (cns.trim() && !isCnsValid && cns.replace(/\D/g, '').length !== 15) {
      onShowToast('error', 'O Cartão Nacional de Saúde (CNS) deve ter 15 dígitos.', 'CNS Incompleto');
      return;
    }

    // Uniqueness blocking checks
    if (duplicateCnsPatient) {
      onShowToast(
        'error',
        `O Cartão SUS (CNS) ${cns} já está cadastrado para o paciente "${duplicateCnsPatient.fullName}". O Cartão SUS deve ser único para cada paciente.`,
        'Cartão SUS Duplicado'
      );
      return;
    }

    if (duplicateCpfPatient) {
      onShowToast(
        'error',
        `O CPF ${cpf} já está cadastrado para o paciente "${duplicateCpfPatient.fullName}". O CPF deve ser único para cada paciente.`,
        'CPF Duplicado'
      );
      return;
    }

    const patient: Patient = {
      id: patientToEdit?.id || `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fullName: fullName.trim(),
      cns: cns.trim(),
      cpf: cpf.trim(),
      birthDate,
      gender,
      phone: phone.trim(),
      address: address.trim(),
      legalGuardianName: calculatedAge.isMinor || legalGuardianName.trim() ? legalGuardianName.trim() : undefined,
      guardianKinship: calculatedAge.isMinor || legalGuardianName.trim() ? guardianKinship : undefined,
      guardianKinshipCustom:
        guardianKinship === 'Outro' && guardianKinshipCustom.trim()
          ? guardianKinshipCustom.trim()
          : undefined,
      createdAt: patientToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSavePatient(patient);
    onShowToast(
      'success',
      patientToEdit ? 'Dados do paciente atualizados com sucesso!' : 'Novo paciente cadastrado no e-SUS PEC!',
      'Cadastro Salvo'
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="patient-form-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            id="patient-form-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {patientToEdit ? 'Editar Cadastro do Paciente' : 'Novo Cadastro de Paciente (e-SUS)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Identificação, Cartão SUS, cálculo cronológico de idade e responsável legal
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-patient-form-modal-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Documentos Identificadores Únicos no Topo: CPF e Cartão SUS (CNS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* CPF */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      CPF
                    </label>
                    {duplicateCpfPatient ? (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Já cadastrado
                      </span>
                    ) : cpf ? (
                      <span
                        className={`text-[10px] font-semibold ${
                          isCpfValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {isCpfValid ? '✓ CPF Válido' : '000.000.000-00'}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <CreditCard className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${duplicateCpfPatient ? 'text-rose-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      id="patient-cpf-input"
                      value={cpf}
                      onChange={handleCpfChange}
                      onBlur={() => setCpfTouched(true)}
                      placeholder="000.000.000-00"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 outline-none transition-colors ${
                        duplicateCpfPatient
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                          : 'bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                  {duplicateCpfPatient && (
                    <div className="mt-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>CPF duplicado:</strong> Este CPF já pertence a <strong>{duplicateCpfPatient.fullName}</strong>. O CPF deve ser único para cada paciente.
                      </span>
                    </div>
                  )}
                </div>

                {/* Cartão SUS (CNS) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cartão SUS (CNS)
                    </label>
                    {duplicateCnsPatient ? (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Já cadastrado
                      </span>
                    ) : cns ? (
                      <span
                        className={`text-[10px] font-semibold ${
                          isCnsValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                        }`}
                      >
                        {isCnsValid ? '✓ Válido' : `${cns.replace(/\D/g, '').length}/15 dígitos`}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <CreditCard className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${duplicateCnsPatient ? 'text-rose-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      id="patient-cns-input"
                      value={cns}
                      onChange={handleCnsChange}
                      onBlur={() => setCnsTouched(true)}
                      placeholder="000 0000 0000 0000"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 outline-none transition-colors ${
                        duplicateCnsPatient
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                          : cnsTouched && cns && !isCnsValid
                          ? 'bg-slate-50 dark:bg-slate-950 border border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-teal-500'
                          : 'bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                  {duplicateCnsPatient && (
                    <div className="mt-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Cartão SUS duplicado:</strong> Este CNS já pertence a <strong>{duplicateCnsPatient.fullName}</strong>. O Cartão SUS deve ser único para cada paciente.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo abaixo: Nome Completo do Paciente * */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome Completo do Paciente <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    id="patient-fullname-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={(e) => setFullName(formatName(e.target.value))}
                    placeholder="Ex: Lucas Henrique de Oliveira"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Data de Nascimento + Cálculo Cronológico em Tempo Real */}
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-teal-950 dark:text-teal-200 block mb-1">
                      Data de Nascimento <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        required
                        id="patient-birthdate-input"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-teal-950 dark:text-teal-200 block mb-1">
                      Sexo / Gênero
                    </label>
                    <select
                      value={gender}
                      onChange={(e) =>
                        setGender(e.target.value as 'Feminino' | 'Masculino' | 'Outro')
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro / Não Declarado</option>
                    </select>
                  </div>
                </div>

                {/* Real-time Chronological Age Display */}
                {birthDate && (
                  <div
                    id="chronological-age-preview"
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-teal-500/30 text-xs shadow-xs"
                  >
                    {calculatedAge.isMinor ? (
                      <Baby className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                        Idade Cronológica Exata (Puericultura / APS):
                      </span>
                      <span className="font-extrabold text-teal-800 dark:text-teal-300 text-sm">
                        {calculatedAge.formatted}
                      </span>
                    </div>
                    {calculatedAge.isMinor && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/20">
                        Menor de Idade
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Responsável Legal (Obrigatório / Destacado para menores ou dependentes) */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  calculatedAge.isMinor
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <HeartHandshake className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Responsável Legal / Cuidador
                    {calculatedAge.isMinor && (
                      <span className="ml-2 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                        (Recomendado para menores de idade)
                      </span>
                    )}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Nome do Responsável Legal
                    </label>
                    <input
                      type="text"
                      id="legal-guardian-name-input"
                      value={legalGuardianName}
                      onChange={(e) => setLegalGuardianName(e.target.value)}
                      onBlur={(e) => setLegalGuardianName(formatName(e.target.value))}
                      placeholder="Ex: Juliana de Oliveira Santos"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Grau de Parentesco
                    </label>
                    <select
                      id="guardian-kinship-select"
                      value={guardianKinship}
                      onChange={(e) => setGuardianKinship(e.target.value as KinshipType)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      {KINSHIP_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Especificar se for 'Outro' */}
                {guardianKinship === 'Outro' && (
                  <div className="mt-2.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Especifique o Parentesco / Vínculo:
                    </label>
                    <input
                      type="text"
                      id="guardian-kinship-custom-input"
                      value={guardianKinshipCustom}
                      onChange={(e) => setGuardianKinshipCustom(e.target.value)}
                      onBlur={(e) => setGuardianKinshipCustom(formatName(e.target.value))}
                      placeholder="Ex: Vizinho cuidador, Irmão de criação, etc."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Endereço e Contato (Opcional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Endereço / Microárea
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onBlur={(e) => setAddress(formatName(e.target.value))}
                    placeholder="Rua, Número - Bairro / Microárea"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {(duplicateCnsPatient || duplicateCpfPatient) ? (
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Corrija o {duplicateCnsPatient ? 'Cartão SUS' : 'CPF'} duplicado antes de salvar.</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 hidden sm:block">
                    * CNS e CPF são documentos únicos e protegidos contra duplicidades.
                  </div>
                )}

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="save-patient-submit-btn"
                    disabled={Boolean(duplicateCnsPatient || duplicateCpfPatient)}
                    className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 ${
                      duplicateCnsPatient || duplicateCpfPatient
                        ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/20 cursor-pointer'
                    }`}
                    title={
                      duplicateCnsPatient || duplicateCpfPatient
                        ? 'Não é permitido cadastrar CNS ou CPF já existentes'
                        : 'Salvar dados do cidadão no banco de dados e abrir acolhimento na Fila de Atendimento'
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar/Add Fila</span>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
