import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Save,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Users,
  FileCheck,
  Building2,
  Info,
} from 'lucide-react';
import { AttendanceCertificateData, AttendanceShift, Patient, User, Consultation } from '../types';
import { openAttendanceCertificateInNewTab } from '../utils/printAttendanceCertificate';
import {
  formatSingleUnitAge,
  formatAnajasDate,
  formatPatientDocument,
} from '../utils/dateCalculator';
import { isHigherEducationProfession } from '../data/professions';
import { BrazilianDatePicker } from './BrazilianDatePicker';

interface AttendanceCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  currentUser: User;
  consultation?: Consultation | null;
  initialConsultation?: Consultation | null;
  existingCertificate?: AttendanceCertificateData | null;
  onSave: (certificate: AttendanceCertificateData) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AttendanceCertificateModal: React.FC<AttendanceCertificateModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  consultation: propConsultation,
  initialConsultation,
  existingCertificate,
  onSave,
  onShowToast,
}) => {
  const activeConsultation = propConsultation || initialConsultation || null;
  const isHigherEducation = isHigherEducationProfession(currentUser.profession);
  const isDoctor = currentUser.profession === 'medico';

  // Patient details state
  const [patientName, setPatientName] = useState('');
  const [patientAgeFormatted, setPatientAgeFormatted] = useState('');
  const [patientDocument, setPatientDocument] = useState('');

  // Companion state
  const [isCompanion, setIsCompanion] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [companionDocument, setCompanionDocument] = useState('');
  const [companionKinship, setCompanionKinship] = useState('Mãe / Responsável');

  // Date and Shift state
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceDateFormatted, setAttendanceDateFormatted] = useState('');
  const [period, setPeriod] = useState<AttendanceShift>('matutino');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [customPeriodLabel, setCustomPeriodLabel] = useState('');

  // Attendance details
  const [attendanceType, setAttendanceType] = useState('Consulta e Acompanhamento em Saúde');
  const [observations, setObservations] = useState('');
  const [cityDateFormatted, setCityDateFormatted] = useState('');

  // Professional details
  const [professionalName, setProfessionalName] = useState('');
  const [professionalRole, setProfessionalRole] = useState('');
  const [professionalCouncil, setProfessionalCouncil] = useState('');
  const [workplace, setWorkplace] = useState('');

  // Helper date format
  const formatDateToPtBr = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return d.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const getComputedPeriodLabel = () => {
    switch (period) {
      case 'matutino':
        return 'Matutino (das 08:00 às 12:00)';
      case 'vespertino':
        return 'Vespertino (das 13:00 às 17:00)';
      case 'noturno':
        return 'Noturno (das 18:00 às 22:00)';
      case 'integral':
        return 'Período Integral (das 08:00 às 17:00)';
      case 'personalizado':
        return customPeriodLabel || `Horário das ${startTime} às ${endTime}`;
      default:
        return 'Período Matutino';
    }
  };

  // Default attendance type based on profession
  const getDefaultAttendanceType = (professionId?: string) => {
    switch (professionId) {
      case 'enfermeiro':
        return 'Consulta de Enfermagem e Procedimentos Clínicos';
      case 'psicologo':
        return 'Atendimento Psicológico / Sessão de Psicoterapia';
      case 'assistente_social':
        return 'Acolhimento e Atendimento Social';
      case 'psicopedagogo':
        return 'Atendimento e Avaliação Psicopedagógica';
      case 'nutricionista':
        return 'Consulta e Orientação Nutricional';
      case 'fisioterapeuta':
        return 'Sessão de Atendimento Fisioterapêutico';
      case 'fonoaudiologo':
        return 'Atendimento Fonoaudiológico';
      case 'terapeuta_ocupacional':
        return 'Sessão de Terapia Ocupacional';
      case 'farmaceutico':
        return 'Cuidado Farmacêutico e Dispensação Orientada';
      case 'cirurgiao_dentista':
      case 'dentista':
        return 'Atendimento Odontológico';
      default:
        return 'Atendimento Multiprofissional em Saúde';
    }
  };

  const getDefaultRoleName = (professionId?: string) => {
    switch (professionId) {
      case 'enfermeiro':
        return 'Enfermeiro(a)';
      case 'psicologo':
        return 'Psicólogo(a)';
      case 'assistente_social':
        return 'Assistente Social';
      case 'psicopedagogo':
        return 'Psicopedagogo(a)';
      case 'nutricionista':
        return 'Nutricionista';
      case 'fisioterapeuta':
        return 'Fisioterapeuta';
      case 'fonoaudiologo':
        return 'Fonoaudiólogo(a)';
      case 'terapeuta_ocupacional':
        return 'Terapeuta Ocupacional';
      case 'farmaceutico':
        return 'Farmacêutico(a)';
      case 'cirurgiao_dentista':
      case 'dentista':
        return 'Cirurgião-Dentista';
      default:
        return 'Profissional de Saúde de Nível Superior';
    }
  };

  const getDefaultCouncilName = (user: User) => {
    const councilBody = user.councilBody || 'CONSELHO';
    const councilNum = user.councilNumber || '';
    const uf = user.councilUf || 'PA';
    if (councilNum) {
      return `${councilBody}/${uf} ${councilNum}`;
    }
    switch (user.profession) {
      case 'enfermeiro':
        return 'COREN/PA';
      case 'psicologo':
        return 'CRP/PA';
      case 'assistente_social':
        return 'CRESS/PA';
      case 'nutricionista':
        return 'CRN/PA';
      case 'fisioterapeuta':
      case 'terapeuta_ocupacional':
        return 'CREFITO/PA';
      case 'fonoaudiologo':
        return 'CRFa/PA';
      case 'farmaceutico':
        return 'CRF/PA';
      case 'cirurgiao_dentista':
      case 'dentista':
        return 'CRO/PA';
      default:
        return 'Registro Profissional';
    }
  };

  // Initialize data
  useEffect(() => {
    if (!isOpen) return;

    // Patient
    const pName = patient?.fullName || activeConsultation?.patientName || '';
    const pAge = patient?.birthDate ? formatSingleUnitAge(patient.birthDate) : '';
    const pDoc = formatPatientDocument(patient?.cpf, patient?.cns);

    setPatientName(pName);
    setPatientAgeFormatted(pAge);
    setPatientDocument(pDoc);

    // Professional
    setProfessionalName(
      existingCertificate?.professionalName ||
        activeConsultation?.authorName ||
        currentUser.name ||
        'Profissional de Saúde'
    );
    setProfessionalRole(
      existingCertificate?.professionalRole ||
        activeConsultation?.authorProfession ||
        getDefaultRoleName(currentUser.profession)
    );
    setProfessionalCouncil(
      existingCertificate?.professionalCouncil ||
        activeConsultation?.authorRegister ||
        getDefaultCouncilName(currentUser)
    );
    setWorkplace(
      existingCertificate?.workplace ||
        activeConsultation?.workplace ||
        currentUser.workplace ||
        'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)'
    );

    const todayDate = new Date().toISOString().split('T')[0];
    setAttendanceDate(todayDate);
    setAttendanceDateFormatted(formatDateToPtBr(todayDate));
    setCityDateFormatted(formatAnajasDate(Date.now()));

    // If editing existing certificate
    if (existingCertificate) {
      setAttendanceDate(existingCertificate.attendanceDate);
      setAttendanceDateFormatted(existingCertificate.attendanceDateFormatted || formatDateToPtBr(existingCertificate.attendanceDate));
      setPeriod(existingCertificate.period || 'matutino');
      setStartTime(existingCertificate.startTime || '08:00');
      setEndTime(existingCertificate.endTime || '12:00');
      setAttendanceType(existingCertificate.attendanceType || getDefaultAttendanceType(currentUser.profession));
      setIsCompanion(Boolean(existingCertificate.isCompanion));
      setCompanionName(existingCertificate.companionName || '');
      setCompanionDocument(existingCertificate.companionDocument || '');
      setCompanionKinship(existingCertificate.companionKinship || 'Mãe / Responsável');
      setObservations(existingCertificate.observations || '');
      if (existingCertificate.cityDateFormatted) {
        setCityDateFormatted(existingCertificate.cityDateFormatted);
      }
    } else {
      setAttendanceType(getDefaultAttendanceType(currentUser.profession));
      setIsCompanion(false);
      setCompanionName('');
      setCompanionDocument('');
      setPeriod('matutino');
      setObservations('');
    }
  }, [isOpen, patient, currentUser, activeConsultation, existingCertificate]);

  if (!isOpen) return null;

  const currentCertificateData: AttendanceCertificateData = {
    id: existingCertificate?.id || `atestado-comp-${Date.now()}`,
    patientId: patient?.id || activeConsultation?.patientId,
    patientName: patientName.trim(),
    patientAgeFormatted: patientAgeFormatted.trim(),
    patientDocument: patientDocument.trim(),
    isCompanion: isCompanion,
    companionName: isCompanion ? companionName.trim() : undefined,
    companionDocument: isCompanion ? companionDocument.trim() : undefined,
    companionKinship: isCompanion ? companionKinship.trim() : undefined,
    attendanceDate: attendanceDate,
    attendanceDateFormatted: attendanceDateFormatted || formatDateToPtBr(attendanceDate),
    period: period,
    periodLabel: getComputedPeriodLabel(),
    startTime: period === 'personalizado' ? startTime : undefined,
    endTime: period === 'personalizado' ? endTime : undefined,
    attendanceType: attendanceType.trim(),
    observations: observations.trim() || undefined,
    cityDateFormatted: cityDateFormatted || formatAnajasDate(Date.now()),
    professionalName: professionalName.trim() || existingCertificate?.professionalName || activeConsultation?.authorName || currentUser.name,
    professionalRole: professionalRole.trim() || existingCertificate?.professionalRole || activeConsultation?.authorProfession || getDefaultRoleName(currentUser.profession),
    professionalCouncil: professionalCouncil.trim() || existingCertificate?.professionalCouncil || activeConsultation?.authorRegister || getDefaultCouncilName(currentUser),
    professionalStampUrl: existingCertificate ? (existingCertificate.professionalStampUrl || (activeConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl)) : (currentUser as any)?.digitalStampUrl,
    useDigitalStamp: existingCertificate ? (existingCertificate.useDigitalStamp ?? true) : ((currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
    workplace: workplace.trim() || existingCertificate?.workplace || activeConsultation?.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)',
    createdAt: existingCertificate?.createdAt || Date.now(),
    consultationId: activeConsultation?.id,
  };

  const handlePrint = () => {
    openAttendanceCertificateInNewTab(currentCertificateData, patient || undefined, currentUser);
    if (onShowToast) {
      onShowToast('info', 'Atestado de comparecimento aberto para impressão em Folha A4 Retrato.', 'Impressão');
    }
  };

  const handleSave = () => {
    onSave(currentCertificateData);
    if (onShowToast) {
      onShowToast('success', 'Atestado de Comparecimento salvo no prontuário.', 'Atestado Salvo');
    }
    onClose();
  };

  return (
    <div
      id="attendance-certificate-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="attendance-certificate-modal-container"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <FileCheck className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Atestado de Comparecimento
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/30 text-sky-100 border border-sky-300/30">
                  Nível Superior • A4 Retrato
                </span>
              </div>
              <p className="text-xs text-sky-100/90 font-medium">
                Comprovante estrito do dia e período de atendimento em saúde para justificar ausência
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-sky-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Doctor advice warning if doctor opens it */}
        {isDoctor && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center gap-2.5 text-xs px-5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Nota:</strong> Como Médico, você tem acesso exclusivo ao <strong>Atestado Médico</strong> (com especificação de quantidade de dias de afastamento e CID). Este Atestado de Comparecimento justifica apenas o dia do atendimento.
            </span>
          </div>
        )}

        {/* Body content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          {/* Patient summary badge */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                Paciente:
              </span>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                {patientName || 'PACIENTE NÃO INFORMADO'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                Idade: <strong>{patientAgeFormatted || '--'}</strong> • Doc: <strong>{patientDocument || 'Sem CPF/CNS'}</strong>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                Emitido por:
              </span>
              <div className="text-xs font-bold text-sky-700 dark:text-sky-300">
                {professionalName} ({professionalRole})
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                {professionalCouncil}
              </div>
            </div>
          </div>

          {/* Core Rule Callout */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="text-sky-950 dark:text-sky-200 font-bold block mb-0.5">
                Regra Funcional do Atestado de Comparecimento:
              </strong>
              Este documento serve para comprovar a presença do usuário ou de seu acompanhante estritamente no <strong>dia e período da consulta/sessão</strong>. Não possui determinação de dias futuros de afastamento nem obrigatoriedade de CID.
            </div>
          </div>

          {/* Attendance Date & Period Configuration */}
          <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border-2 border-sky-200 dark:border-sky-800/60 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-700 dark:text-sky-300" />
              <h3 className="text-xs sm:text-sm font-black text-sky-950 dark:text-sky-100 uppercase tracking-tight">
                Data do Atendimento e Turno / Horário
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Date */}
              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-1.5">
                  <span>Data do Atendimento:</span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium normal-case">
                    (DD/MM/AAAA ou Calendário)
                  </span>
                </label>
                <BrazilianDatePicker
                  value={attendanceDate}
                  onChange={(val) => {
                    setAttendanceDate(val);
                    setAttendanceDateFormatted(formatDateToPtBr(val));
                  }}
                  required
                />
              </div>

              {/* Shift Presets */}
              <div className="sm:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Período / Turno:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPeriod('matutino')}
                    className={`p-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      period === 'matutino'
                        ? 'bg-sky-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-sky-100'
                    }`}
                  >
                    Matutino (Manhã)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('vespertino')}
                    className={`p-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      period === 'vespertino'
                        ? 'bg-sky-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-sky-100'
                    }`}
                  >
                    Vespertino (Tarde)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('integral')}
                    className={`p-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      period === 'integral'
                        ? 'bg-sky-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-sky-100'
                    }`}
                  >
                    Integral
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriod('personalizado')}
                    className={`p-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer ${
                      period === 'personalizado'
                        ? 'bg-sky-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-sky-100'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Hours inputs */}
            {period === 'personalizado' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário de Início:
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Horário de Término:
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Companion Declaration Option */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCompanion}
                  onChange={(e) => setIsCompanion(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Emitir Declaração para Acompanhante / Responsável Legal</span>
                </span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Justificativa para o acompanhante
              </span>
            </div>

            {isCompanion && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Nome Completo do Acompanhante:
                  </label>
                  <input
                    type="text"
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    placeholder="Ex: Maria Santos da Silva"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 uppercase focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    CPF ou RG do Acompanhante:
                  </label>
                  <input
                    type="text"
                    value={companionDocument}
                    onChange={(e) => setCompanionDocument(e.target.value)}
                    placeholder="Ex: 000.000.000-00"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Grau de Parentesco / Vínculo:
                  </label>
                  <input
                    type="text"
                    value={companionKinship}
                    onChange={(e) => setCompanionKinship(e.target.value)}
                    placeholder="Ex: Mãe, Pai, Filho, Cônjuge"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Attendance Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tipo de Atendimento / Procedimento Realizado:
            </label>
            <input
              type="text"
              value={attendanceType}
              onChange={(e) => setAttendanceType(e.target.value)}
              placeholder="Ex: Consulta de Enfermagem, Acompanhamento Psicológico, Atendimento Social..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Observações Institucionais (Opcional):</span>
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Informações adicionais pertinentes..."
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* City & Workplace */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Local e Data por Extenso:
              </label>
              <input
                type="text"
                value={cityDateFormatted}
                onChange={(e) => setCityDateFormatted(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Unidade de Saúde:
              </label>
              <input
                type="text"
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Abrir página formatada para impressão A4"
            >
              <Printer className="w-4 h-4 text-sky-300" />
              <span>Imprimir Atestado A4</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar no Prontuário</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
