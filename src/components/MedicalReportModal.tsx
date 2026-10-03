import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Printer,
  Save,
  Sparkles,
  FileText,
  Stethoscope,
  Copy,
  Check,
  Building2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Search,
  Plus,
  PlusCircle,
  Database,
  Trash2,
} from 'lucide-react';
import { MedicalReportData, Patient, User, Consultation } from '../types';
import { openMedicalReportInNewTab } from '../utils/printMedicalReport';
import {
  generateMedicalReportAI,
  COMMON_REPORT_PURPOSES,
  extractCid10FromText,
} from '../services/medicalReportService';
import {
  formatSingleUnitAge,
  formatAnajasDate,
  formatPatientDocument,
} from '../utils/dateCalculator';
import {
  Cid10Entry,
  getAllAvailableCids,
  parseCidListString,
  formatCidListToString,
  normalizeCidCode,
  findDescriptionInCatalog,
} from '../data/cid10Catalog';

interface MedicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  currentUser: User;
  consultation?: Consultation | null;
  initialConsultation?: Consultation | null;
  initialClinicalContext?: string;
  existingReport?: MedicalReportData | null;
  onSave: (report: MedicalReportData) => void;
  onSaveReport?: (report: MedicalReportData) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  userApiKey?: string;
  consultations?: Consultation[];
}

export const MedicalReportModal: React.FC<MedicalReportModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  consultation: propConsultation,
  initialConsultation,
  initialClinicalContext,
  existingReport,
  onSave,
  onSaveReport,
  onShowToast,
  userApiKey,
  consultations,
}) => {
  const activeConsultation = propConsultation || initialConsultation || null;
  const isDoctor = currentUser.profession === 'medico';

  // Patient details state
  const [patientName, setPatientName] = useState('');
  const [patientAgeFormatted, setPatientAgeFormatted] = useState('');
  const [patientDocument, setPatientDocument] = useState('');

  // Doctor details state
  const [professionalName, setProfessionalName] = useState('');
  const [professionalSpecialty, setProfessionalSpecialty] = useState('');
  const [professionalCouncil, setProfessionalCouncil] = useState('');
  const [workplace, setWorkplace] = useState('');

  // Report content state
  const [purpose, setPurpose] = useState(COMMON_REPORT_PURPOSES[0]);
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [description, setDescription] = useState('');
  const [cityDateFormatted, setCityDateFormatted] = useState('');

  // Multi-CID-10 State
  const [selectedCids, setSelectedCids] = useState<
    Array<Cid10Entry & { isSuggestedByAI?: boolean }>
  >([]);
  const [cid10, setCid10] = useState('');
  const [isCidDropdownOpen, setIsCidDropdownOpen] = useState(false);
  const [cidSearchQuery, setCidSearchQuery] = useState('');
  const [cidFilterTab, setCidFilterTab] = useState<'todos' | 'database' | 'caps' | 'aps'>('todos');

  const cidDropdownRef = useRef<HTMLDivElement>(null);

  // Interaction / status state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Close dropdown when clicking outside
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

  // Available CIDs combining database consultations and master catalog
  const availableCids = useMemo(() => {
    return getAllAvailableCids(consultations);
  }, [consultations]);

  // Filtered CIDs for dropdown
  const filteredCids = useMemo(() => {
    const q = cidSearchQuery.trim().toLowerCase();
    return availableCids.filter((item) => {
      if (cidFilterTab === 'database' && !item.fromDatabase) return false;
      if (cidFilterTab === 'caps' && item.category !== 'Saúde Mental (CAPS)') return false;
      if (cidFilterTab === 'aps' && item.category !== 'Atenção Primária') return false;

      if (!q) return true;

      const codeMatch =
        item.code.toLowerCase().includes(q) ||
        normalizeCidCode(item.code).toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const catMatch = (item.category || '').toLowerCase().includes(q);
      return codeMatch || descMatch || catMatch;
    });
  }, [availableCids, cidSearchQuery, cidFilterTab]);

  // Initialize or reset modal data
  useEffect(() => {
    if (!isOpen) return;

    // Derive patient details
    const derivedName = existingReport?.patientName || patient?.fullName || 'Paciente Não Identificado';
    const derivedAge =
      existingReport?.patientAgeFormatted ||
      (patient?.birthDate ? formatSingleUnitAge(patient.birthDate) : '--');
    const derivedDoc =
      existingReport?.patientDocument || (patient ? formatPatientDocument(patient.cpf, patient.cns) : 'Documento Não Informado');

    setPatientName(derivedName);
    setPatientAgeFormatted(derivedAge);
    setPatientDocument(derivedDoc);

    // Derive professional details
    setProfessionalName(
      existingReport?.professionalName ||
        activeConsultation?.authorName ||
        currentUser.name ||
        'Dr. Médico Assistente'
    );
    setProfessionalSpecialty(
      existingReport?.professionalSpecialty ||
        activeConsultation?.authorProfession ||
        (currentUser.profession === 'medico'
          ? 'Médico Clínico / Saúde Mental'
          : 'Médico Assistente')
    );
    setProfessionalCouncil(
      existingReport?.professionalCouncil ||
        activeConsultation?.authorRegister ||
        currentUser.professionalRegister ||
        'CRM/PA'
    );
    setWorkplace(
      existingReport?.workplace ||
        activeConsultation?.workplace ||
        currentUser.workplace ||
        'CENTRO DE ATENÇÃO PSICOSSOCIAL - CAPS I'
    );

    // Derive date
    setCityDateFormatted(
      existingReport?.cityDateFormatted ||
        formatAnajasDate(existingReport?.createdAt || Date.now())
    );

    // Derive purpose & CID-10
    setPurpose(existingReport?.purpose || COMMON_REPORT_PURPOSES[0]);

    if (existingReport?.cid10) {
      const parsed = parseCidListString(existingReport.cid10);
      setSelectedCids(parsed);
      setCid10(existingReport.cid10);
    } else {
      // Extract from active consultation or context
      const clinicalExcerpt = activeConsultation?.avaliacao || initialClinicalContext || '';
      const parsedFromNotes = parseCidListString(clinicalExcerpt);
      if (parsedFromNotes.length > 0) {
        const marked = parsedFromNotes.map((c) => ({
          ...c,
          isSuggestedByAI: true,
        }));
        setSelectedCids(marked);
        setCid10(formatCidListToString(marked));
      } else {
        const fallbackCode = extractCid10FromText(clinicalExcerpt) || 'F41.9 - Transtorno ansioso não especificado';
        const parsedFallback = parseCidListString(fallbackCode);
        const marked = parsedFallback.map((c) => ({
          ...c,
          isSuggestedByAI: true,
        }));
        setSelectedCids(marked);
        setCid10(formatCidListToString(marked));
      }
    }

    // Derive description
    if (existingReport?.description) {
      setDescription(existingReport.description);
    } else {
      // Auto-trigger initial draft or load from consultation / context
      const clinicalExcerpt = activeConsultation?.avaliacao || initialClinicalContext || 'Paciente em acompanhamento clínico regular, apresentando queixas compatíveis com a hipótese diagnóstica elencada.';
      const therapeuticExcerpt = activeConsultation?.plano || 'Em uso de psicofármacos sob vigilância ambulatorial e suporte psicossocial contínuo.';

      setDescription(
        `Atesto, a pedido do(a) paciente e para os devidos fins de ${purpose.toLowerCase()}, que ${derivedName.toUpperCase()}, ${derivedAge}, portador(a) do ${derivedDoc}, encontra-se em acompanhamento médico regular neste serviço de saúde.\n\nHistórico e Exame Clínico:\n${clinicalExcerpt}\n\nConduta Terapêutica:\n${therapeuticExcerpt}\n\nParecer e Recomendações:\nDiante do quadro clínico apresentado, orienta-se a continuidade do acompanhamento regular e cumprimento estrito do esquema posológico prescrito.`
      );
    }
  }, [isOpen, patient, currentUser, activeConsultation, initialClinicalContext, existingReport]);

  if (!isOpen) return null;

  const handleSelectCid = (entry: Cid10Entry) => {
    const isAlready = selectedCids.some(
      (s) => normalizeCidCode(s.code) === normalizeCidCode(entry.code)
    );
    if (isAlready) {
      if (onShowToast) {
        onShowToast('info', `O CID ${entry.code} já foi adicionado ao laudo.`);
      }
      return;
    }

    const updated = [...selectedCids, { ...entry, isSuggestedByAI: false }];
    setSelectedCids(updated);
    const formatted = formatCidListToString(updated);
    setCid10(formatted);
    setIsCidDropdownOpen(false);
    setCidSearchQuery('');
    if (onShowToast) {
      onShowToast('success', `CID ${entry.code} adicionado com sucesso ao laudo médico!`);
    }
  };

  const handleRemoveCid = (indexToRemove: number) => {
    const updated = selectedCids.filter((_, idx) => idx !== indexToRemove);
    setSelectedCids(updated);
    const formatted = formatCidListToString(updated);
    setCid10(formatted);
  };

  const handleAddCustomCid = (rawCodeOrText: string) => {
    const trimmed = rawCodeOrText.trim();
    if (!trimmed) return;

    const parsed = parseCidListString(trimmed);
    const newEntry: Cid10Entry =
      parsed.length > 0
        ? parsed[0]
        : { code: trimmed.toUpperCase(), description: findDescriptionInCatalog(trimmed) };

    const isAlready = selectedCids.some(
      (s) => normalizeCidCode(s.code) === normalizeCidCode(newEntry.code)
    );
    if (isAlready) {
      if (onShowToast) onShowToast('info', `O CID ${newEntry.code} já foi adicionado.`);
      return;
    }

    const updated = [...selectedCids, { ...newEntry, isSuggestedByAI: false }];
    setSelectedCids(updated);
    setCid10(formatCidListToString(updated));
    setIsCidDropdownOpen(false);
    setCidSearchQuery('');
    if (onShowToast) {
      onShowToast('success', `CID ${newEntry.code} adicionado com sucesso!`);
    }
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    setFeedbackMessage(null);
    try {
      const result = await generateMedicalReportAI({
        patient: {
          ...(patient || {}),
          id: patient?.id || 'temp-patient',
          fullName: patientName,
          cns: patient?.cns || '',
          cpf: patient?.cpf || '',
          birthDate: patient?.birthDate || '1990-01-01',
          gender: patient?.gender || 'Outro',
          createdAt: patient?.createdAt || Date.now(),
          updatedAt: patient?.updatedAt || Date.now(),
        },
        consultation: activeConsultation,
        doctor: {
          name: professionalName,
          specialty: professionalSpecialty,
          councilRegister: professionalCouncil,
          workplace,
        },
        purpose,
        clinicalObservations: clinicalObservations || initialClinicalContext || '',
        userApiKey,
      });

      setDescription(result.description);
      if (result.cid10) {
        const parsedAiCids = parseCidListString(result.cid10).map((c) => ({
          ...c,
          isSuggestedByAI: true,
        }));

        // Preserve any CIDs the doctor had already selected from the database
        const existingManual = selectedCids.filter(
          (curr) => !curr.isSuggestedByAI && !parsedAiCids.some((ai) => normalizeCidCode(ai.code) === normalizeCidCode(curr.code))
        );

        const merged = [...parsedAiCids, ...existingManual];
        setSelectedCids(merged);
        setCid10(formatCidListToString(merged));
      }
      if (result.modelUsed) {
        setLastModelUsed(result.modelUsed);
      }
      setFeedbackMessage('Laudo médico gerado com sucesso com IA! Você pode editar o texto abaixo.');
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      console.error('Erro ao gerar laudo:', err);
      setFeedbackMessage('Erro ao conectar com IA. Modelo padrão institucional carregado.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = () => {
    const reportData: MedicalReportData = {
      id: existingReport?.id || `laudo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      patientName: patientName.trim(),
      patientAgeFormatted: patientAgeFormatted.trim(),
      patientDocument: patientDocument.trim(),
      description: description.trim(),
      cid10: cid10.trim(),
      purpose: purpose.trim(),
      cityDateFormatted: cityDateFormatted.trim() || formatAnajasDate(),
      professionalName: professionalName.trim(),
      professionalSpecialty: professionalSpecialty.trim(),
      professionalCouncil: professionalCouncil.trim(),
      workplace: workplace.trim(),
      createdAt: existingReport?.createdAt || Date.now(),
      consultationId: activeConsultation?.id,
    };

    onSave(reportData);
    if (onSaveReport) {
      onSaveReport(reportData);
    }
    onClose();
  };

  const handlePrint = () => {
    const reportData: MedicalReportData = {
      id: existingReport?.id || `laudo-${Date.now()}`,
      patientName: patientName.trim(),
      patientAgeFormatted: patientAgeFormatted.trim(),
      patientDocument: patientDocument.trim(),
      description: description.trim(),
      cid10: cid10.trim(),
      purpose: purpose.trim(),
      cityDateFormatted: cityDateFormatted.trim() || formatAnajasDate(),
      professionalName: professionalName.trim() || existingReport?.professionalName || activeConsultation?.authorName || currentUser.name,
      professionalSpecialty: professionalSpecialty.trim() || existingReport?.professionalSpecialty || activeConsultation?.authorProfession || currentUser.profession,
      professionalCouncil: professionalCouncil.trim() || existingReport?.professionalCouncil || activeConsultation?.authorRegister || currentUser.professionalRegister || 'CRM/PA',
      professionalStampUrl: existingReport ? (existingReport.professionalStampUrl || (activeConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl)) : (currentUser as any)?.digitalStampUrl,
      useDigitalStamp: existingReport ? (existingReport.useDigitalStamp ?? true) : ((currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
      workplace: workplace.trim() || existingReport?.workplace || activeConsultation?.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)',
      createdAt: existingReport?.createdAt || Date.now(),
      consultationId: activeConsultation?.id,
    };

    openMedicalReportInNewTab(reportData, patient || undefined, currentUser);
  };

  const handleCopyText = () => {
    const fullText = `LAUDO MÉDICO OFICIAL
PREFEITURA MUNICIPAL DE ANAJÁS - SECRETARIA MUNICIPAL DE SAÚDE
${workplace}

PACIENTE: ${patientName.toUpperCase()} • IDADE: ${patientAgeFormatted}
DOCUMENTO: ${patientDocument}

DESCRIÇÃO DO LAUDO:
${description}

CID-10: ${cid10}

${cityDateFormatted}

___________________________________________
${professionalName}
${professionalSpecialty}
${professionalCouncil}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      id="medical-report-modal-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div
        id="medical-report-modal-card"
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-teal-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white uppercase">
                  {isDoctor ? 'Emissão de Laudo Médico' : 'Laudo Médico Oficial'}
                </h2>
                <span className="bg-teal-400/20 text-teal-200 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-300/30 uppercase tracking-wide">
                  Padrão SUS / CFM (A4)
                </span>
                {!isDoctor && (
                  <span className="bg-amber-400/20 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300/30 uppercase tracking-wide">
                    Modo Leitura / Impressão
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                {isDoctor
                  ? 'Geração de laudo oficial com auxílio de IA e impressão em folha A4 com cabeçalho de praxe'
                  : 'Visualização e impressão do laudo médico emitido pelo profissional assistente'}
              </p>
            </div>
          </div>
          <button
            id="close-laudo-modal-btn"
            onClick={onClose}
            className="text-teal-200 hover:text-white p-2 rounded-lg hover:bg-teal-700/40 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-800 bg-slate-50/50">
          {/* Read-only notification for non-doctors */}
          {!isDoctor && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-amber-900 text-xs font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Acesso de Visualização:</strong> A geração e alteração de laudo médico é privativa da classe médica. Este laudo está disponível para consulta e impressão oficial em folha A4.
              </span>
            </div>
          )}

          {/* Feedback banner */}
          {feedbackMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Section 1: Patient and Professional Info Preview Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  Identificação do Paciente
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Formato de Laudo A4
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={patientName}
                  readOnly={!isDoctor}
                  onChange={(e) => setPatientName(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                    !isDoctor ? 'bg-slate-50 cursor-default' : ''
                  }`}
                  placeholder="Nome do paciente"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Idade (sem meses e dias)
                  </label>
                  <input
                    type="text"
                    value={patientAgeFormatted}
                    readOnly={!isDoctor}
                    onChange={(e) => setPatientAgeFormatted(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      !isDoctor ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder="Ex: 1 ano ou 10 meses ou 25 dias"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Ex: 1 ano, 10 meses ou 25 dias
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Documento (CPF ou CNS)
                  </label>
                  <input
                    type="text"
                    value={patientDocument}
                    readOnly={!isDoctor}
                    onChange={(e) => setPatientDocument(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      !isDoctor ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder="CPF ou CNS"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Ex: CPF: 000.000... / CNS: 700...
                  </span>
                </div>
              </div>
            </div>

            {/* Doctor Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  Médico Responsável
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Assinatura & Órgão de Classe
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                  Nome do Profissional
                </label>
                <input
                  type="text"
                  value={professionalName}
                  readOnly={!isDoctor}
                  onChange={(e) => setProfessionalName(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                    !isDoctor ? 'bg-slate-50 cursor-default' : ''
                  }`}
                  placeholder="Nome do médico"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Especialidade
                  </label>
                  <input
                    type="text"
                    value={professionalSpecialty}
                    readOnly={!isDoctor}
                    onChange={(e) => setProfessionalSpecialty(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      !isDoctor ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder="Ex: Psiquiatria / Clínica Médica"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Órgão de Classe (CRM)
                  </label>
                  <input
                    type="text"
                    value={professionalCouncil}
                    readOnly={!isDoctor}
                    onChange={(e) => setProfessionalCouncil(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                      !isDoctor ? 'bg-slate-50 cursor-default' : ''
                    }`}
                    placeholder="Ex: CRM/PA 12345"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Purpose & AI Generation Control Box (Accessible only to doctors) */}
          {isDoctor && (
            <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-black uppercase text-slate-900">
                    Finalidade do Laudo & Geração com IA
                  </span>
                </div>
                {lastModelUsed && (
                  <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-200">
                    Gerado via {lastModelUsed}
                  </span>
                )}
              </div>

              {/* Quick purpose selector chips */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                  Selecione a Finalidade do Laudo:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_REPORT_PURPOSES.map((p) => {
                    const isSelected = purpose === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPurpose(p)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all text-left ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-700 shadow-sm font-semibold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom observations for AI input */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Observações complementares para a IA (Opcional):
                </label>
                <input
                  type="text"
                  value={clinicalObservations}
                  onChange={(e) => setClinicalObservations(e.target.value)}
                  placeholder="Ex: Paciente com sintomas acentuados há 6 meses, necessita de 60 dias de afastamento laboral..."
                  className="w-full px-3 py-1.5 text-xs text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* AI Generator Button */}
              <div className="pt-1 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  A IA analisa a consulta e redige a descrição completa de acordo com os padrões éticos do CFM.
                </p>
                <button
                  id="generate-laudo-ai-btn"
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Redigindo Laudo Médico...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-teal-200" />
                      <span>Gerar / Atualizar Laudo com IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Description of the Medical Report (Editable by Physician) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                Corpo do Laudo Médico (Editável pelo Médico)
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">
                {description.length} caracteres • {description.split(/\s+/).filter(Boolean).length} palavras
              </span>
            </div>

            <textarea
              id="laudo-description-input"
              rows={10}
              value={description}
              readOnly={!isDoctor}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição formal do laudo médico..."
              className={`w-full p-3 text-xs leading-relaxed text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none font-sans ${
                !isDoctor ? 'bg-slate-50 cursor-default' : ''
              }`}
            />
            <p className="text-[10px] text-slate-500">
              {isDoctor
                ? '* O médico assistente pode alterar livremente qualquer trecho da descrição gerada pela IA antes de salvar ou imprimir.'
                : '* Laudo médico oficial emitido pelo profissional assistente.'}
            </p>
          </div>

          {/* Section 4: Multi-CID Selection & Local / Data */}
          <div className="space-y-4">
            {/* CID-10 Card */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>CID-10 (Classificação Internacional de Doenças)</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Selecione um ou mais CIDs para constar no laudo oficial. Além do CID sugerido pela IA, você pode adicionar outros CIDs salvos no banco de dados.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    {selectedCids.length}{' '}
                    {selectedCids.length === 1 ? 'CID selecionado' : 'CIDs selecionados'}
                  </span>
                </div>
              </div>

              {/* Lista dos CIDs Selecionados (Chips/Cards) */}
              <div className="space-y-2">
                {selectedCids.length === 0 ? (
                  <div className="p-3.5 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400 bg-slate-50/60">
                    Nenhum CID selecionado. Escolha um ou mais CIDs na lista suspensa abaixo ou utilize a sugestão da IA.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCids.map((item, idx) => (
                      <div
                        key={`${item.code}-${idx}`}
                        className="flex items-start justify-between gap-2 p-2.5 bg-slate-50/80 hover:bg-slate-100/90 rounded-lg border border-slate-200 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-xs px-2 py-0.5 bg-teal-800 text-white rounded shrink-0 shadow-2xs">
                              {item.code}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                                Principal
                              </span>
                            )}
                            {item.isSuggestedByAI && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 shrink-0 inline-flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Sugerido pela IA
                              </span>
                            )}
                            {item.fromDatabase && !item.isSuggestedByAI && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0 inline-flex items-center gap-0.5">
                                <Database className="w-2.5 h-2.5" /> Salvo no Banco
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                            {item.description || findDescriptionInCatalog(item.code)}
                          </p>
                        </div>

                        {isDoctor && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCid(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="Remover este CID do laudo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista Suspensa (Dropdown Combobox) para Adicionar Mais CIDs */}
              {isDoctor && (
                <div className="relative pt-1" ref={cidDropdownRef}>
                  <button
                    type="button"
                    id="btn-cid-dropdown-toggle"
                    onClick={() => setIsCidDropdownOpen(!isCidDropdownOpen)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-lg border border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-teal-900 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <PlusCircle className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>Adicionar mais um CID (buscar no banco de dados e catálogo SUS)...</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-teal-600 transition-transform duration-200 shrink-0 ${
                        isCidDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isCidDropdownOpen && (
                    <div
                      className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                      style={{ maxHeight: '380px' }}
                    >
                      {/* Search Bar & Categories Header */}
                      <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={cidSearchQuery}
                            onChange={(e) => setCidSearchQuery(e.target.value)}
                            placeholder="Pesquisar por código (ex: F41, F32, G47, Z76) ou nome (ansiedade, depressão, insônia)..."
                            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                            autoFocus
                          />
                          {cidSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setCidSearchQuery('')}
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 text-[10px] overflow-x-auto pb-0.5">
                          <button
                            type="button"
                            onClick={() => setCidFilterTab('todos')}
                            className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap cursor-pointer ${
                              cidFilterTab === 'todos'
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            Todos ({availableCids.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setCidFilterTab('database')}
                            className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                              cidFilterTab === 'database'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-amber-100 text-amber-900 hover:bg-amber-200/80 border border-amber-300'
                            }`}
                          >
                            <Database className="w-3 h-3" />
                            Salvos no Banco ({availableCids.filter((c) => c.fromDatabase).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setCidFilterTab('caps')}
                            className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap cursor-pointer ${
                              cidFilterTab === 'caps'
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            Saúde Mental (CAPS)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCidFilterTab('aps')}
                            className={`px-2.5 py-1 rounded-full font-bold transition-colors whitespace-nowrap cursor-pointer ${
                              cidFilterTab === 'aps'
                                ? 'bg-teal-600 text-white shadow-2xs'
                                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            Atenção Básica
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Items List */}
                      <div className="overflow-y-auto max-h-56 divide-y divide-slate-100">
                        {filteredCids.length === 0 ? (
                          <div className="p-5 text-center space-y-2.5">
                            <p className="text-xs text-slate-500">
                              Nenhum CID encontrado para "{cidSearchQuery}".
                            </p>
                            {cidSearchQuery.trim() && (
                              <button
                                type="button"
                                onClick={() => handleAddCustomCid(cidSearchQuery)}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar "{cidSearchQuery}" como CID</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          filteredCids.map((item) => {
                            const isSelected = selectedCids.some(
                              (s) => normalizeCidCode(s.code) === normalizeCidCode(item.code)
                            );
                            return (
                              <button
                                key={item.code}
                                type="button"
                                disabled={isSelected}
                                onClick={() => handleSelectCid(item)}
                                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-slate-100/80 opacity-60 cursor-not-allowed'
                                    : 'hover:bg-teal-50/80 text-slate-800'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-black text-xs px-1.5 py-0.5 bg-slate-900 text-white rounded">
                                      {item.code}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {item.description}
                                    </span>
                                    {item.fromDatabase && (
                                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-0.5">
                                        <Database className="w-2.5 h-2.5" /> Banco
                                      </span>
                                    )}
                                  </div>
                                  {item.category && (
                                    <p className="text-[10px] text-slate-400">{item.category}</p>
                                  )}
                                </div>

                                <div className="shrink-0">
                                  {isSelected ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Já Adicionado
                                    </span>
                                  ) : (
                                    <span className="text-[10.5px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white px-2.5 py-1 rounded-md border border-teal-200 transition-colors inline-flex items-center gap-1">
                                      <Plus className="w-3 h-3" /> Adicionar
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown Footer */}
                      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Clique em qualquer CID para adicioná-lo ao laudo.</span>
                        <button
                          type="button"
                          onClick={() => setIsCidDropdownOpen(false)}
                          className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2 py-0.5 cursor-pointer"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Texto Oficial Sincronizado do CID-10 */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span className="font-bold uppercase tracking-wider text-slate-700">
                    Texto Oficial do CID-10 (que constará no laudo impresso):
                  </span>
                  <span className="text-[9.5px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                    Sincronizado automaticamente
                  </span>
                </div>
                <input
                  type="text"
                  value={cid10}
                  readOnly={!isDoctor}
                  onChange={(e) => {
                    setCid10(e.target.value);
                    const parsed = parseCidListString(e.target.value);
                    if (parsed.length > 0) {
                      setSelectedCids(parsed);
                    }
                  }}
                  placeholder="Ex: F41.9 - Transtorno ansioso não especificado; F51.0 - Insônia não-orgânica"
                  className={`w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                    !isDoctor ? 'bg-slate-50 cursor-default' : ''
                  }`}
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  {selectedCids.length > 1
                    ? `${selectedCids.length} CIDs selecionados. Todos aparecerão em destaque no cabeçalho do documento oficial.`
                    : 'Código e descrição da patologia que constará em destaque no laudo.'}
                </span>
              </div>
            </div>

            {/* Local e Data (Formato Oficial) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
              <label className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                Local e Data (Formato Oficial)
              </label>
              <input
                type="text"
                value={cityDateFormatted}
                readOnly={!isDoctor}
                onChange={(e) => setCityDateFormatted(e.target.value)}
                placeholder="Ex: Anajás, 18 de setembro de 2026"
                className={`w-full px-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  !isDoctor ? 'bg-slate-50 cursor-default' : ''
                }`}
              />
              <span className="text-[10px] text-slate-400 block">
                Formato padrão obrigatório: "Anajás, dd de [mês por extenso] de aaaa".
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="cancel-laudo-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>

            <button
              id="print-laudo-btn"
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span>Imprimir Laudo (A4)</span>
            </button>

            {isDoctor && (
              <button
                id="save-laudo-btn"
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-teal-200" />
                <span>Salvar Laudo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
