import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Save,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  FileCheck2,
  ChevronDown,
  Info,
  Sparkles,
} from 'lucide-react';
import { MedicalCertificateData, Patient, User, Consultation } from '../types';
import { openMedicalCertificateInNewTab } from '../utils/printMedicalCertificate';
import {
  formatSingleUnitAge,
  formatAnajasDate,
  formatPatientDocument,
} from '../utils/dateCalculator';
import { numberToDaysExtenso } from '../data/professions';
import {
  Cid10Entry,
  getAllAvailableCids,
  normalizeCidCode,
} from '../data/cid10Catalog';
import {
  generateCertificateRecommendationsAI,
  generateLocalCertificateRecommendations,
} from '../services/medicalCertificateService';
import { BrazilianDatePicker } from './BrazilianDatePicker';

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  currentUser: User;
  consultation?: Consultation | null;
  initialConsultation?: Consultation | null;
  existingCertificate?: MedicalCertificateData | null;
  onSave: (certificate: MedicalCertificateData) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  userApiKey?: string;
  consultations?: Consultation[];
}

export const MedicalCertificateModal: React.FC<MedicalCertificateModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  consultation: propConsultation,
  initialConsultation,
  existingCertificate,
  onSave,
  onShowToast,
  userApiKey,
  consultations,
}) => {
  // Find effective latest consultation for patient if not passed directly
  const effectiveConsultation = useMemo(() => {
    if (propConsultation) return propConsultation;
    if (initialConsultation) return initialConsultation;
    if (patient?.id && consultations && consultations.length > 0) {
      const patientConsults = consultations.filter((c) => c.patientId === patient.id);
      if (patientConsults.length > 0) {
        return [...patientConsults].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
      }
    }
    return null;
  }, [propConsultation, initialConsultation, patient?.id, consultations]);

  const isDoctor = currentUser.profession === 'medico';

  // Form states
  const [patientName, setPatientName] = useState('');
  const [patientAgeFormatted, setPatientAgeFormatted] = useState('');
  const [patientDocument, setPatientDocument] = useState('');

  const [daysOff, setDaysOff] = useState<number>(1);
  const [daysOffExtenso, setDaysOffExtenso] = useState('01 (um) dia');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [startDateFormatted, setStartDateFormatted] = useState('');

  // CID-10 state
  const [includeCid, setIncludeCid] = useState(false);
  const [selectedCid, setSelectedCid] = useState<Cid10Entry | null>(null);
  const [customCidText, setCustomCidText] = useState('');
  const [isCidDropdownOpen, setIsCidDropdownOpen] = useState(false);
  const [cidSearchQuery, setCidSearchQuery] = useState('');

  // Clinical recommendations / notes
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [cityDateFormatted, setCityDateFormatted] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);

  // Professional data
  const [professionalName, setProfessionalName] = useState('');
  const [professionalSpecialty, setProfessionalSpecialty] = useState('');
  const [professionalCouncil, setProfessionalCouncil] = useState('');
  const [workplace, setWorkplace] = useState('');

  const cidDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        cidDropdownRef.current &&
        !cidDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCidDropdownOpen(false);
      }
    }
    if (isCidDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCidDropdownOpen]);

  // Available CIDs catalog
  const availableCids = useMemo(() => {
    return getAllAvailableCids(consultations);
  }, [consultations]);

  const filteredCids = useMemo(() => {
    const q = cidSearchQuery.trim().toLowerCase();
    if (!q) return availableCids.slice(0, 30);
    return availableCids.filter((item) => {
      const codeMatch =
        (item.code || '').toLowerCase().includes(q) ||
        normalizeCidCode(item.code || '').toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      return codeMatch || descMatch;
    }).slice(0, 30);
  }, [availableCids, cidSearchQuery]);

  // Update extenso when daysOff change
  const handleDaysOffChange = (val: number) => {
    const num = Math.max(1, Math.min(180, Math.floor(val || 1)));
    setDaysOff(num);
    setDaysOffExtenso(numberToDaysExtenso(num));
  };

  // Format date helper
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

  // AI Recommendation Generator function
  const handleGenerateRecommendationsAI = async () => {
    if (!patient && !effectiveConsultation) return;
    setIsGeneratingAI(true);
    try {
      const patientObj: Patient = patient || {
        id: effectiveConsultation?.patientId || 'temp-id',
        fullName: patientName || effectiveConsultation?.patientName || 'Paciente',
        cns: '',
        cpf: '',
        birthDate: '1990-01-01',
        gender: 'Outro',
        phone: '',
        address: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await generateCertificateRecommendationsAI({
        patient: patientObj,
        consultation: effectiveConsultation,
        doctor: {
          name: professionalName || currentUser.name,
          workplace: workplace || currentUser.workplace,
        },
        daysOff: daysOff,
        cid10: includeCid ? (selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : customCidText) : undefined,
        userApiKey: userApiKey,
      });

      if (result.recommendations) {
        setClinicalNotes(result.recommendations);
        setLastModelUsed(result.modelUsed || 'Gemini 3.7 Flash');
        if (onShowToast) {
          onShowToast('success', 'Recomendações clínicas geradas com sucesso via IA!', 'IA Clínica');
        }
      }
    } catch (err) {
      console.error('Erro ao gerar recomendações com IA:', err);
      const localRec = generateLocalCertificateRecommendations(
        effectiveConsultation,
        customCidText,
        daysOff
      );
      setClinicalNotes(localRec);
      if (onShowToast) {
        onShowToast('info', 'Recomendações clínicas elaboradas conforme dados do atendimento.', 'Recomendações');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Init data
  useEffect(() => {
    if (!isOpen) return;

    // Patient
    const pName = patient?.fullName || effectiveConsultation?.patientName || '';
    const pAge = patient?.birthDate ? formatSingleUnitAge(patient.birthDate) : '';
    const pDoc = formatPatientDocument(patient?.cpf, patient?.cns);

    setPatientName(pName);
    setPatientAgeFormatted(pAge);
    setPatientDocument(pDoc);

    // Doctor details
    setProfessionalName(
      existingCertificate?.professionalName ||
        effectiveConsultation?.authorName ||
        currentUser.name ||
        'Médico Assistente'
    );
    setProfessionalSpecialty(
      existingCertificate?.professionalSpecialty ||
        effectiveConsultation?.authorProfession ||
        currentUser.specialty ||
        (currentUser.customServices?.[0]?.name ? `${currentUser.customServices[0].name}` : 'Clínica Médica')
    );
    setProfessionalCouncil(
      existingCertificate?.professionalCouncil ||
        effectiveConsultation?.authorRegister ||
        (currentUser.councilNumber ? `CRM/${currentUser.councilUf || 'PA'} ${currentUser.councilNumber}` : 'CRM/PA')
    );
    setWorkplace(
      existingCertificate?.workplace ||
        effectiveConsultation?.workplace ||
        currentUser.workplace ||
        'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)'
    );

    const todayDate = new Date().toISOString().split('T')[0];
    setStartDate(todayDate);
    setStartDateFormatted(formatDateToPtBr(todayDate));
    setCityDateFormatted(formatAnajasDate(Date.now()));

    // If editing existing certificate
    if (existingCertificate) {
      setDaysOff(existingCertificate.daysOff || 1);
      setDaysOffExtenso(existingCertificate.daysOffExtenso || numberToDaysExtenso(existingCertificate.daysOff || 1));
      if (existingCertificate.startDate) {
        setStartDate(existingCertificate.startDate);
        setStartDateFormatted(existingCertificate.startDateFormatted || formatDateToPtBr(existingCertificate.startDate));
      }
      setIncludeCid(Boolean(existingCertificate.includeCid));
      setCustomCidText(existingCertificate.cid10 || '');
      setClinicalNotes(existingCertificate.clinicalNotes || '');
      if (existingCertificate.cityDateFormatted) {
        setCityDateFormatted(existingCertificate.cityDateFormatted);
      }
    } else {
      // Default: check if effectiveConsultation has notes or CID
      setDaysOff(1);
      setDaysOffExtenso(numberToDaysExtenso(1));
      setIncludeCid(false);

      // Auto-populate CID if detected in consultation
      const detectedCid =
        effectiveConsultation?.medicalCertificate?.cid10 ||
        effectiveConsultation?.medicalReport?.cid10 ||
        effectiveConsultation?.referral?.hypotheses ||
        '';
      if (detectedCid) {
        setCustomCidText(detectedCid);
      }

      // Initial contextual recommendation
      const initialRec = generateLocalCertificateRecommendations(
        effectiveConsultation,
        detectedCid,
        1
      );
      setClinicalNotes(initialRec);

      // If we have a patient or consultation, trigger AI generation asynchronously
      if (patient || effectiveConsultation) {
        const patientObj: Patient = patient || {
          id: effectiveConsultation?.patientId || 'temp-id',
          fullName: pName || 'Paciente',
          cns: '',
          cpf: '',
          birthDate: '1990-01-01',
          gender: 'Outro',
          phone: '',
          address: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        generateCertificateRecommendationsAI({
          patient: patientObj,
          consultation: effectiveConsultation,
          doctor: {
            name: currentUser.name || 'Médico Assistente',
            workplace: currentUser.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)',
          },
          daysOff: 1,
          cid10: detectedCid,
          userApiKey: userApiKey,
        }).then((res) => {
          if (res.recommendations) {
            setClinicalNotes(res.recommendations);
            setLastModelUsed(res.modelUsed || 'Gemini 3.7 Flash');
          }
        }).catch((err) => {
          console.warn('[Certificate Modal] Auto-AI init fallback to local:', err);
        });
      }
    }
  }, [isOpen, patient, currentUser, effectiveConsultation, existingCertificate, userApiKey]);

  if (!isOpen) return null;

  const currentCertificateData: MedicalCertificateData = {
    id: existingCertificate?.id || `atestado-med-${Date.now()}`,
    patientId: patient?.id || effectiveConsultation?.patientId,
    patientName: patientName.trim(),
    patientAgeFormatted: patientAgeFormatted.trim(),
    patientDocument: patientDocument.trim(),
    daysOff: daysOff,
    daysOffExtenso: daysOffExtenso,
    startDate: startDate,
    startDateFormatted: startDateFormatted || formatDateToPtBr(startDate),
    cid10: includeCid ? (selectedCid ? `${selectedCid.code} - ${selectedCid.description}` : customCidText) : undefined,
    includeCid: includeCid,
    clinicalNotes: clinicalNotes.trim(),
    cityDateFormatted: cityDateFormatted || formatAnajasDate(Date.now()),
    professionalName: professionalName.trim() || existingCertificate?.professionalName || effectiveConsultation?.authorName || currentUser.name,
    professionalSpecialty: professionalSpecialty.trim() || existingCertificate?.professionalSpecialty || effectiveConsultation?.authorProfession || currentUser.specialty || 'Clínica Médica',
    professionalCouncil: professionalCouncil.trim() || existingCertificate?.professionalCouncil || effectiveConsultation?.authorRegister || 'CRM/PA',
    professionalStampUrl: existingCertificate ? (existingCertificate.professionalStampUrl || (effectiveConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl)) : (currentUser as any)?.digitalStampUrl,
    useDigitalStamp: existingCertificate ? (existingCertificate.useDigitalStamp ?? true) : ((currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
    workplace: workplace.trim() || existingCertificate?.workplace || effectiveConsultation?.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)',
    createdAt: existingCertificate?.createdAt || Date.now(),
    consultationId: effectiveConsultation?.id,
  };

  const handlePrint = () => {
    openMedicalCertificateInNewTab(currentCertificateData, patient || undefined, currentUser);
    if (onShowToast) {
      onShowToast('info', 'Documento aberto para impressão em folha A4 Retrato.', 'Impressão');
    }
  };

  const handleSave = () => {
    onSave(currentCertificateData);
    if (onShowToast) {
      onShowToast('success', 'Atestado Médico salvo com sucesso no prontuário.', 'Atestado Salvo');
    }
    onClose();
  };

  return (
    <div
      id="medical-certificate-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="medical-certificate-modal-container"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <FileCheck2 className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Atestado Médico Oficial
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-100 border border-teal-300/30">
                  Exclusivo Médico • A4
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium">
                Emissão de atestado médico com determinação de dias de repouso/afastamento e CID-10
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if not doctor */}
        {!isDoctor && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center gap-2.5 text-xs px-5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Atenção:</strong> Atestados médicos com determinação de dias de afastamento e CID são privativos de Médicos (CRM). Outros profissionais de nível superior devem utilizar o <strong>Atestado de Comparecimento</strong>.
            </span>
          </div>
        )}

        {/* Body content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-100">
          {/* Patient summary badge */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                Paciente Identificado:
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
                Médico Assistente:
              </span>
              <div className="text-xs font-bold text-teal-700 dark:text-teal-300">
                {professionalName}
              </div>
              <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                {professionalCouncil}
              </div>
            </div>
          </div>

          {/* Days Off Configuration (Core feature) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border-2 border-teal-200 dark:border-teal-800/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                <h3 className="text-xs sm:text-sm font-black text-teal-950 dark:text-teal-100 uppercase tracking-tight">
                  Período e Dias de Afastamento Concedidos
                </h3>
              </div>
              <span className="text-xs font-black text-teal-800 dark:text-teal-200 bg-teal-100 dark:bg-teal-900/80 px-2.5 py-1 rounded-lg">
                {daysOffExtenso}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              {/* Counter Input */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Quantidade de Dias:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={daysOff}
                    onChange={(e) => handleDaysOffChange(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 font-black text-base text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                    {daysOff === 1 ? 'dia' : 'dias'}
                  </span>
                </div>
              </div>

              {/* Start Date */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>A partir de:</span>
                </label>
                <BrazilianDatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    setStartDateFormatted(formatDateToPtBr(val));
                  }}
                  required
                />
              </div>

              {/* Extenso Preview */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Formato por Extenso:
                </label>
                <input
                  type="text"
                  value={daysOffExtenso}
                  onChange={(e) => setDaysOffExtenso(e.target.value)}
                  placeholder="Ex: 03 (três) dias"
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* CID-10 Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCid}
                  onChange={(e) => setIncludeCid(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Inserir CID-10 no Atestado (Mediante autorização do paciente)
                </span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Res. CFM nº 1.658/2002
              </span>
            </div>

            {includeCid && (
              <div className="space-y-3 pt-2" ref={cidDropdownRef}>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cidSearchQuery}
                        onChange={(e) => {
                          setCidSearchQuery(e.target.value);
                          setIsCidDropdownOpen(true);
                        }}
                        onFocus={() => setIsCidDropdownOpen(true)}
                        placeholder="Buscar por código CID-10 ou descrição (ex: F32, F41, M54, Dengue...)"
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCidDropdownOpen(!isCidDropdownOpen)}
                      className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-300 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {isCidDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-30 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCids.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setSelectedCid(item);
                            setCustomCidText(`${item.code} - ${item.description}`);
                            setIsCidDropdownOpen(false);
                            setCidSearchQuery('');
                          }}
                          className="w-full p-2.5 text-left hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded">
                              {item.code}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.description}
                            </span>
                          </div>
                          {item.category && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                              {item.category}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected CID Display / Manual Input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    CID-10 Selecionado ou Personalizado:
                  </label>
                  <input
                    type="text"
                    value={customCidText}
                    onChange={(e) => setCustomCidText(e.target.value)}
                    placeholder="Ex: F41.1 - Ansiedade generalizada"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs text-teal-900 dark:text-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Clinical Notes & Recommendations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span>Recomendações Clínicas / Observações:</span>
                {lastModelUsed && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-semibold border border-teal-200 dark:border-teal-800">
                    Gerado via {lastModelUsed}
                  </span>
                )}
              </label>

              <button
                type="button"
                onClick={handleGenerateRecommendationsAI}
                disabled={isGeneratingAI}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  isGeneratingAI
                    ? 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-wait'
                    : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs hover:shadow cursor-pointer'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAI ? 'Gerando com IA...' : 'Gerar com IA'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Descreva orientações pertinentes ao afastamento (ou clique em Gerar com IA)..."
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* City / Date / Workplace verification */}
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
              <Printer className="w-4 h-4 text-teal-300" />
              <span>Imprimir Atestado A4</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
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
