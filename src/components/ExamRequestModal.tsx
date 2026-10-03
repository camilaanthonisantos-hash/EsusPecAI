import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Save,
  Trash2,
  Settings,
  Eye,
  Building2,
  FlaskConical,
  Sparkles,
  ArrowDownAZ,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';
import {
  ExamRequestData,
  RequestedExamItem,
  SUSExam,
  Patient,
  User as UserModel,
  Consultation,
} from '../types';
import { ExamRequestPrintSheet } from './ExamRequestPrintSheet';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import {
  openExamRequestInNewTab,
  printExamRequest,
  sortExamsAlphabetically,
} from '../utils/printExamRequest';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
import { ExamSelector } from './ExamSelector';

interface ExamRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  currentUser: UserModel;
  initialConsultation?: Consultation | null;
  existingExamRequest?: ExamRequestData | null;
  onSaveExamRequest: (
    examRequest: ExamRequestData,
    consultationId?: string
  ) => Promise<void> | void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  initialPlanText?: string;
  initialNotesText?: string;
  initialConsultationPlanText?: string;
  consultationPlanText?: string;
  exams?: SUSExam[];
  onSaveNewExamToDb?: (exam: SUSExam) => Promise<void> | void;
}

export const ExamRequestModal: React.FC<ExamRequestModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  initialConsultation,
  existingExamRequest,
  onSaveExamRequest,
  onShowToast,
  initialConsultationPlanText,
  consultationPlanText,
  exams = [],
  onSaveNewExamToDb,
}) => {
  const getInitialDate = (targetConsultation?: Consultation | null) => {
    let d = new Date();
    if (targetConsultation?.timestamp) {
      d = new Date(targetConsultation.timestamp);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('pt-BR', { month: 'long' });
    const year = d.getFullYear();
    return `Anajás, ${day} de ${month} de ${year}`;
  };

  const getPatientAgeFormatted = (): string => {
    if (!patient?.birthDate) return '49A';
    try {
      const calc = calculateChronologicalAge(patient.birthDate);
      return `${calc.years}A`;
    } catch {
      return '--';
    }
  };

  // Form State
  const [title, setTitle] = useState<string>('SOLICITAÇÃO DE EXAMES');
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('');
  const [patientCns, setPatientCns] = useState<string>('');
  const [patientCpf, setPatientCpf] = useState<string>('');
  const [dateFormatted, setDateFormatted] = useState<string>(getInitialDate());
  const [clinicalIndicationGeneral, setClinicalIndicationGeneral] = useState<string>('');

  // Institutional Header and Footer Config
  const [unitName, setUnitName] = useState('CENTRO DE ATENÇÃO PSICOSSOCIAL');
  const [authorityName, setAuthorityName] = useState('SECRETARIA MUNICIPAL DE SAÚDE');
  const [cityPrefecture, setCityPrefecture] = useState('PREFEITURA MUNICIPAL DE ANAJÁS');
  const [addressLine1, setAddressLine1] = useState('TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000');
  const [addressLine2, setAddressLine2] = useState('SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)');

  // Professional
  const [professionalName, setProfessionalName] = useState('');
  const [professionalRole, setProfessionalRole] = useState<'Enfermeiro' | 'Médico' | string>(
    'Enfermeiro'
  );
  const [professionalRegister, setProfessionalRegister] = useState('');
  const [workplace, setWorkplace] = useState('CAPS I - Anajás');

  // Selected Exams List
  const [items, setItems] = useState<RequestedExamItem[]>([]);

  // UI Tabs & Views
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isHeaderFooterExpanded, setIsHeaderFooterExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronize state when modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (existingExamRequest) {
      setTitle(existingExamRequest.title || 'SOLICITAÇÃO DE EXAMES');
      setPatientName(existingExamRequest.patientName || patient?.fullName || '');
      setPatientAge(existingExamRequest.patientAge || getPatientAgeFormatted());
      setPatientCns(existingExamRequest.patientCns || patient?.cns || '');
      setPatientCpf(existingExamRequest.patientCpf || patient?.cpf || '');
      setDateFormatted(existingExamRequest.dateFormatted || getInitialDate(initialConsultation));
      setClinicalIndicationGeneral(existingExamRequest.clinicalIndicationGeneral || '');

      setUnitName(existingExamRequest.header?.unitName || 'CENTRO DE ATENÇÃO PSICOSSOCIAL');
      setAuthorityName(
        existingExamRequest.header?.authorityName || 'SECRETARIA MUNICIPAL DE SAÚDE'
      );
      setCityPrefecture(
        existingExamRequest.header?.cityPrefecture || 'PREFEITURA MUNICIPAL DE ANAJÁS'
      );
      setAddressLine1(existingExamRequest.footer?.addressLine1 || 'TRAVESSA FRANCISCO JR. FILHO');
      setAddressLine2(existingExamRequest.footer?.addressLine2 || 'CIDADE NOVA I');

      setProfessionalName(existingExamRequest.professionalName || initialConsultation?.authorName || currentUser.name || '');
      setProfessionalRole(existingExamRequest.professionalRole || initialConsultation?.authorProfession || currentUser.role || 'Enfermeiro');
      setProfessionalRegister(
        existingExamRequest.professionalRegister || initialConsultation?.authorRegister || currentUser.registrationNumber || currentUser.professionalRegister || ''
      );
      setWorkplace(existingExamRequest.workplace || initialConsultation?.workplace || currentUser.workplace || 'CAPS I - Anajás');

      setItems(sortExamsAlphabetically(existingExamRequest.items || []));
    } else {
      setTitle('SOLICITAÇÃO DE EXAMES');
      setPatientName(patient?.fullName || initialConsultation?.patientName || '');
      setPatientAge(getPatientAgeFormatted());
      setPatientCns(patient?.cns || '');
      setPatientCpf(patient?.cpf || '');
      setDateFormatted(getInitialDate(initialConsultation));

      // Attempt smart initial clinical justification extraction
      const defaultIndication =
        initialConsultation?.avaliacao ||
        consultationPlanText ||
        initialConsultationPlanText ||
        'Avaliação clínica e monitoramento terapêutico na Atenção Primária / RAPS.';
      setClinicalIndicationGeneral(
        defaultIndication.length > 250
          ? defaultIndication.slice(0, 250).trim() + '...'
          : defaultIndication
      );

      setUnitName('CENTRO DE ATENÇÃO PSICOSSOCIAL');
      setAuthorityName('SECRETARIA MUNICIPAL DE SAÚDE');
      setCityPrefecture('PREFEITURA MUNICIPAL DE ANAJÁS');
      setAddressLine1('TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000');
      setAddressLine2('SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)');

      setProfessionalName(currentUser.name || 'Jerime do Rêgo Ribeiro');
      setProfessionalRole(currentUser.role || 'Enfermeiro');
      setProfessionalRegister(
        currentUser.registrationNumber || 'COREN/PA 123456'
      );
      setWorkplace(currentUser.workplace || 'CAPS I - Anajás');

      setItems([]);
    }

    setActiveTab('edit');
    setIsHeaderFooterExpanded(false);
  }, [isOpen, existingExamRequest, patient, currentUser, initialConsultation]);

  // Always keep list sorted alphabetically in real-time
  const sortedItems = useMemo(() => {
    return sortExamsAlphabetically(items);
  }, [items]);

  const handleAddExam = (exam: {
    examId?: string;
    name: string;
    category?: string;
    clinicalIndication?: string;
    urgency?: boolean;
  }) => {
    const cleanName = exam.name.trim().toUpperCase();
    const exists = items.some((i) => i.name.trim().toUpperCase() === cleanName);

    if (exists) {
      onShowToast(
        'info',
        `O exame "${cleanName}" já está na relação de solicitados.`,
        'Item Existente'
      );
      return;
    }

    const newItem: RequestedExamItem = {
      id: `req-exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      examId: exam.examId,
      name: cleanName,
      category: exam.category || 'Laboratorial',
      clinicalIndication: exam.clinicalIndication || '',
      urgency: !!exam.urgency,
    };

    setItems((prev) => sortExamsAlphabetically([...prev, newItem]));
  };

  const handleAddMultipleExams = (
    examsToAdd: {
      examId?: string;
      name: string;
      category?: string;
      clinicalIndication?: string;
    }[]
  ) => {
    setItems((prev) => {
      const currentNames = new Set(prev.map((i) => i.name.trim().toUpperCase()));
      const newItems: RequestedExamItem[] = [];

      examsToAdd.forEach((e) => {
        const cleanName = e.name.trim().toUpperCase();
        if (!currentNames.has(cleanName)) {
          currentNames.add(cleanName);
          newItems.push({
            id: `req-exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            examId: e.examId,
            name: cleanName,
            category: e.category || 'Laboratorial',
            clinicalIndication: e.clinicalIndication || '',
          });
        }
      });

      return sortExamsAlphabetically([...prev, ...newItems]);
    });
  };

  const handleRemoveExam = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateExamIndication = (id: string, indication: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, clinicalIndication: indication } : item))
    );
  };

  const handleToggleUrgency = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, urgency: !item.urgency } : item))
    );
  };

  const buildCurrentExamRequestData = (): ExamRequestData => {
    return {
      id: existingExamRequest?.id || `exam-req-${Date.now()}`,
      title: title.trim() || 'SOLICITAÇÃO DE EXAMES',
      patientId: patient?.id || initialConsultation?.patientId || 'patient-unknown',
      patientName: patientName.trim() || patient?.fullName || 'PACIENTE',
      patientAge: patientAge.trim() || '--',
      patientCns: patientCns.trim() || undefined,
      patientCpf: patientCpf.trim() || undefined,
      dateFormatted: dateFormatted.trim(),
      clinicalIndicationGeneral: clinicalIndicationGeneral.trim() || undefined,
      header: {
        unitName: unitName.trim() || 'CENTRO DE ATENÇÃO PSICOSSOCIAL',
        authorityName: authorityName.trim() || 'SECRETARIA MUNICIPAL DE SAÚDE',
        cityPrefecture: cityPrefecture.trim() || 'PREFEITURA MUNICIPAL DE ANAJÁS',
        leftLogoUrl: LOGO_CAPS_BASE64,
        rightLogoUrl: LOGO_CAPS_BASE64,
      },
      footer: {
        addressLine1: addressLine1.trim() || 'TRAVESSA FRANCISCO JR. FILHO',
        addressLine2: addressLine2.trim() || 'CIDADE NOVA I',
      },
      items: sortedItems,
      professionalName: professionalName.trim() || existingExamRequest?.professionalName || initialConsultation?.authorName || currentUser.name || 'Profissional',
      professionalRole: professionalRole || existingExamRequest?.professionalRole || initialConsultation?.authorProfession || currentUser.profession || 'Enfermeiro',
      professionalRegister:
        professionalRegister.trim() || existingExamRequest?.professionalRegister || initialConsultation?.authorRegister || currentUser.registrationNumber || currentUser.professionalRegister || 'COREN/PA',
      professionalStampUrl: existingExamRequest ? (existingExamRequest.professionalStampUrl || (initialConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl)) : (currentUser as any)?.digitalStampUrl,
      useDigitalStamp: existingExamRequest ? (existingExamRequest.useDigitalStamp ?? true) : ((currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
      workplace: workplace.trim() || existingExamRequest?.workplace || initialConsultation?.workplace || 'CAPS I - Anajás',
      createdAt: existingExamRequest?.createdAt || Date.now(),
      consultationId: initialConsultation?.id,
    };
  };

  const handleSave = async () => {
    if (items.length === 0) {
      onShowToast('error', 'Adicione pelo menos um exame para gerar a solicitação.', 'Lista Vazia');
      return;
    }

    setIsSaving(true);
    try {
      const data = buildCurrentExamRequestData();
      await onSaveExamRequest(data, initialConsultation?.id);
      onShowToast('success', 'Solicitação de Exames salva no prontuário com sucesso!', 'Documento Salvo');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar solicitação de exames:', err);
      onShowToast('error', 'Falha ao salvar a solicitação de exames.', 'Erro');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (items.length === 0) {
      onShowToast('error', 'Adicione ao menos um exame antes de imprimir.', 'Lista Vazia');
      return;
    }
    const data = buildCurrentExamRequestData();
    const result = await printExamRequest(data, currentUser);
    if (result.success) {
      onShowToast('success', 'Documento enviado para a impressora (A4 Paisagem - 2 Vias).', 'Impressão');
    }
  };

  const handleOpenNewTab = () => {
    if (items.length === 0) {
      onShowToast('error', 'Adicione ao menos um exame antes de abrir.', 'Lista Vazia');
      return;
    }
    const data = buildCurrentExamRequestData();
    openExamRequestInNewTab(data, currentUser);
  };

  if (!isOpen) return null;

  const currentData = buildCurrentExamRequestData();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-slate-50 dark:from-blue-950/40 dark:to-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/25">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Solicitação de Exames Complementares</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 rounded-full">
                    A4 Paisagem • 2 Vias
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Paciente: <strong className="text-slate-800 dark:text-slate-200">{patientName || 'Não identificado'}</strong> ({patientAge}) • {dateFormatted}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'edit'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Editar Solicitação
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pré-visualizar Folha</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeTab === 'edit' ? (
              <div className="space-y-4">
                {/* 1. Header Identification Info */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Título do Documento
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold uppercase text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Paciente
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold uppercase text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Idade
                    </label>
                    <input
                      type="text"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      placeholder="Ex: 49A"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-center text-xs"
                    />
                  </div>
                </div>

                {/* 2. Intelligent Exam Selector Catalog */}
                <ExamSelector
                  exams={exams}
                  selectedExams={items}
                  onAddExam={handleAddExam}
                  onAddMultipleExams={handleAddMultipleExams}
                  onSaveNewExamToDb={onSaveNewExamToDb}
                  onShowToast={onShowToast}
                />

                {/* 3. Selected Exams List (Maintained in strict Alphabetical Order A-Z) */}
                <div className="space-y-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <ArrowDownAZ className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Relação de Exames Solicitados (Ordem Alfabética Automática A-Z)
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {sortedItems.length} {sortedItems.length === 1 ? 'exame' : 'exames'}
                    </span>
                  </div>

                  {sortedItems.length === 0 ? (
                    <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <FlaskConical className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Nenhum exame selecionado ainda.
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Utilize a busca inteligente acima ou clique em "Pacotes de Rotina APS" para incluir exames.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {sortedItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 transition-all hover:border-blue-300 dark:hover:border-blue-700"
                        >
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-xs shrink-0">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate">
                              {item.name}
                            </span>
                            {item.category && (
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 shrink-0">
                                {item.category}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.urgency}
                                onChange={() => handleToggleUrgency(item.id)}
                                className="rounded text-red-600 focus:ring-red-500"
                              />
                              <span className={item.urgency ? 'text-red-600 font-bold' : ''}>
                                Urgente
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveExam(item.id)}
                              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                              title="Remover este exame da solicitação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Editable Header & Footer Accordion */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsHeaderFooterExpanded(!isHeaderFooterExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Configurações do Cabeçalho e Rodapé Institucional (Editáveis)</span>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {isHeaderFooterExpanded ? 'Ocultar' : 'Personalizar'}
                    </span>
                  </button>

                  {isHeaderFooterExpanded && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Cabeçalho Linha 1 (Unidade)
                          </label>
                          <input
                            type="text"
                            value={unitName}
                            onChange={(e) => setUnitName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Cabeçalho Linha 2 (Secretaria)
                          </label>
                          <input
                            type="text"
                            value={authorityName}
                            onChange={(e) => setAuthorityName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Cabeçalho Linha 3 (Prefeitura)
                          </label>
                          <input
                            type="text"
                            value={cityPrefecture}
                            onChange={(e) => setCityPrefecture(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Rodapé Linha 1 (Logradouro / Travessa)
                          </label>
                          <input
                            type="text"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Rodapé Linha 2 (Bairro / Município)
                          </label>
                          <input
                            type="text"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Profissional Responsável
                          </label>
                          <input
                            type="text"
                            value={professionalName}
                            onChange={(e) => setProfessionalName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Carimbo e Registro (CRM ou COREN)
                          </label>
                          <input
                            type="text"
                            value={professionalRegister}
                            onChange={(e) => setProfessionalRegister(e.target.value)}
                            placeholder="Ex: COREN/PA 123456 ou CRM/PA 7890"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Realistic A4 Landscape Sheet Preview */
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>
                      <strong>Visualização Prévia da Solicitação de Exames (A4 Paisagem)</strong> • 2 Vias Idênticas lado a lado com ordem alfabética estrita.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenNewTab}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 text-blue-800 dark:text-blue-200 rounded-lg font-bold text-xs transition-all cursor-pointer"
                      title="Abrir em Nova Aba para Impressão Isolada"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Nova Aba</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                      title="Imprimir folha A4 Paisagem (2 Vias)"
                    >
                      <Printer className="w-4 h-4 text-blue-100" />
                      <span>Imprimir Folha</span>
                    </button>
                  </div>
                </div>

                {/* Printable Canvas Container */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg p-2 sm:p-6 bg-slate-200 dark:bg-slate-950 flex justify-center">
                  <div className="bg-white text-slate-900 shadow-2xl p-4 w-full rounded-sm">
                    <ExamRequestPrintSheet examRequest={currentData} currentUser={currentUser} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-3">
              {activeTab === 'edit' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                  title="Abrir pré-visualização da folha A4 Paisagem"
                >
                  <Eye className="w-4 h-4" />
                  <span>Pré-visualizar Folha</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  title="Imprimir folha A4 Paisagem (2 Vias)"
                >
                  <Printer className="w-4 h-4 text-blue-100" />
                  <span>Imprimir</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar no Prontuário'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
