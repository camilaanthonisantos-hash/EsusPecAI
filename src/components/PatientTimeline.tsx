import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Sparkles,
  UserPlus,
  Filter,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Calendar,
  Activity,
  HeartHandshake,
  CheckCircle2,
  FileEdit,
  PlusCircle,
  Stethoscope,
  Building,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Lock,
  Printer,
  Pill,
  Eye,
  Phone,
  Send,
  FlaskConical,
  FileText,
  RefreshCw,
  FileCheck2,
  FileCheck,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { Patient, Consultation, User, ProfessionId, PrescriptionData, ReferralData, PtsData, ExamRequestData, MedicalReportData, MedicalCertificateData, AttendanceCertificateData, ReceptionQueueItem, ExamMediaReportData } from '../types';
import { PROFESSIONS, isUserAdmin, canIssueMedicalCertificate, canIssueAttendanceCertificate } from '../data/professions';
import { isDoctorConsultation, cleanDoctorConsultation } from '../utils/doctorConsultationCleaner';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { copyToClipboard } from '../services/gemini';
import { saveConsultationToFirestore } from '../services/firebase';
import { PecContentRenderer } from './PecContentRenderer';
import { PecQuickCodesBar } from './PecQuickCodesBar';
import { ConsultationPreviewModal } from './ConsultationPreviewModal';
import { openReferralInNewTab } from '../utils/printReferral';
import { openPtsInNewTab } from '../utils/printPts';
import { openExamRequestInNewTab } from '../utils/printExamRequest';
import { openMedicalReportInNewTab } from '../utils/printMedicalReport';
import { openMedicalCertificateInNewTab } from '../utils/printMedicalCertificate';
import { openAttendanceCertificateInNewTab } from '../utils/printAttendanceCertificate';
import { openExamMediaInNewTab, ensureExamMediaQRCodes } from '../utils/printExamMedia';
import { isUserConsultationAuthor, canUserEditConsultation } from '../utils/authorResolver';

interface PatientTimelineProps {
  patient: Patient;
  consultations: Consultation[];
  currentUser: User;
  hasValidAccess?: boolean;
  queueItems?: ReceptionQueueItem[];
  onAddToQueue?: (patient: Patient) => void;
  onNewConsultation: (patient: Patient) => void;
  onGenerateEvolution: (patient: Patient, consultations: Consultation[]) => void;
  onRegenerateEvolutionNow?: (patient: Patient, consultations: Consultation[]) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient?: (patient: Patient) => void;
  onEditConsultation?: (consultation: Consultation) => void;
  onDeleteConsultation?: (consultation: Consultation) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onNewPrescription?: (patient: Patient, consultation?: Consultation) => void;
  onPrintPrescription?: (prescription: PrescriptionData) => void;
  onOpenReferral?: (patient: Patient, consultation: Consultation, referral?: ReferralData) => void;
  onOpenPts?: (patient: Patient, consultation: Consultation, pts?: PtsData) => void;
  onDeleteReferral?: (consultation: Consultation) => void;
  onDeletePts?: (consultation: Consultation) => void;
  onDeleteExamRequest?: (consultation: Consultation) => void;
  onOpenExamRequest?: (patient: Patient, consultation?: Consultation, examRequest?: ExamRequestData) => void;
  onPrintExamRequest?: (examRequest: ExamRequestData) => void;
  onOpenMedicalReport?: (patient: Patient, consultation: Consultation, report?: MedicalReportData) => void;
  onDeleteMedicalReport?: (consultation: Consultation) => void;
  onOpenMedicalCertificate?: (patient: Patient, consultation: Consultation, certificate?: MedicalCertificateData) => void;
  onDeleteMedicalCertificate?: (consultation: Consultation) => void;
  onOpenAttendanceCertificate?: (patient: Patient, consultation: Consultation, certificate?: AttendanceCertificateData) => void;
  onDeleteAttendanceCertificate?: (consultation: Consultation) => void;
  onOpenExamMedia?: (patient: Patient, consultation?: Consultation, examMedia?: ExamMediaReportData) => void;
  onDeleteExamMedia?: (consultation: Consultation) => void;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  patient,
  consultations,
  currentUser,
  hasValidAccess = true,
  queueItems = [],
  onAddToQueue,
  onNewConsultation,
  onGenerateEvolution,
  onRegenerateEvolutionNow,
  onEditPatient,
  onDeletePatient,
  onEditConsultation,
  onDeleteConsultation,
  onShowToast,
  onNewPrescription,
  onPrintPrescription,
  onOpenReferral,
  onOpenPts,
  onDeleteReferral,
  onDeletePts,
  onDeleteExamRequest,
  onOpenExamRequest,
  onPrintExamRequest,
  onOpenMedicalReport,
  onDeleteMedicalReport,
  onOpenMedicalCertificate,
  onDeleteMedicalCertificate,
  onOpenAttendanceCertificate,
  onDeleteAttendanceCertificate,
  onOpenExamMedia,
  onDeleteExamMedia,
}) => {
  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [selectedProfessionFilter, setSelectedProfessionFilter] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // States for in-app deletion confirmations
  const [isConfirmingPatientDelete, setIsConfirmingPatientDelete] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);
  const [selectedConsultationForPrint, setSelectedConsultationForPrint] = useState<Consultation | null>(null);

  const handleOpenConsultationPrint = async (consultation: Consultation) => {
    if (consultation.examMedia) {
      try {
        const enrichedMedia = await ensureExamMediaQRCodes(consultation.examMedia);
        setSelectedConsultationForPrint({
          ...consultation,
          examMedia: enrichedMedia,
        });
        return;
      } catch {
        // fallback
      }
    }
    setSelectedConsultationForPrint(consultation);
  };

  const isAdmin = isUserAdmin(currentUser);
  const isDoctor = currentUser.profession === 'medico';
  const canPrescribe = currentUser.profession === 'enfermeiro' || currentUser.profession === 'medico' || isAdmin;
  const chronologicalAge = calculateChronologicalAge(patient.birthDate);

  const queueItem = queueItems?.find(
    (q) => q.patientId === patient.id && (q.status === 'waiting' || q.status === 'in_service')
  );
  const isQueued = Boolean(queueItem);

  // All consultations for this patient sorted by date desc
  const patientConsultations = consultations
    .filter((c) => c.patientId === patient.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Filter consultations based on active settings
  const filteredConsultations = consultations
    .filter((c) => c.patientId === patient.id)
    .filter((c) => {
      if (filterMode === 'mine') {
        return c.authorId === currentUser.id || c.authorProfession === currentUser.profession;
      }
      return true;
    })
    .filter((c) => {
      if (selectedProfessionFilter === 'all') return true;
      return c.authorProfession === selectedProfessionFilter;
    })
    .sort((a, b) => b.timestamp - a.timestamp); // Newest first for timeline

  const allPatientConsultations = consultations.filter((c) => c.patientId === patient.id);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isCardExpanded = (id: string) => {
    return !!expandedCards[id]; // Default is collapsed, so "Mostrar" is shown by default
  };

  const handleCopyBlock = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      onShowToast('success', `${label} copiado para a área de transferência!`, 'Copiado');
    }
  };

  const handleCopyFullRecord = async (consultation: Consultation) => {
    const isTriage =
      consultation.isTriage ||
      consultation.authorProfession === 'tecnico_enfermagem' ||
      consultation.authorProfession === 'auxiliar_enfermagem';

    if (isTriage) {
      const fullText = `=== REGISTRO DE TRIAGEM e-SUS PEC (${PROFESSIONS[consultation.authorProfession]?.name || 'Enfermagem'}) ===
Data: ${new Date(consultation.timestamp).toLocaleString('pt-BR')}
Profissional: ${consultation.authorName} (${consultation.authorRegister})
Local: ${consultation.workplace}

--- TRIAGEM ---
${consultation.avaliacao}`;

      const ok = await copyToClipboard(fullText);
      if (ok) {
        setCopiedId(consultation.id);
        onShowToast('success', 'Registro de Triagem copiado para a área de transferência!', 'Copiado');
        setTimeout(() => setCopiedId(null), 2000);
      }
      return;
    }

    const isDoctor = isDoctorConsultation(
      consultation.authorProfession || currentUser.profession,
      consultation.authorRegister
    );
    const cleanedDoctorData = isDoctor
      ? cleanDoctorConsultation(consultation.avaliacao, consultation.plano, consultation.conduta)
      : null;

    const effAvaliacao = cleanedDoctorData ? cleanedDoctorData.avaliacao : consultation.avaliacao;
    const effPlano = cleanedDoctorData ? cleanedDoctorData.plano : consultation.plano;
    const effConduta = cleanedDoctorData ? cleanedDoctorData.conduta : consultation.conduta;

    const fullText = `=== REGISTRO CLÍNICO e-SUS PEC (${PROFESSIONS[consultation.authorProfession]?.name || 'Equipe'}) ===
Data: ${new Date(consultation.timestamp).toLocaleString('pt-BR')}
Profissional: ${consultation.authorName} (${consultation.authorRegister})
Local: ${consultation.workplace}

--- CAMPO: AVALIAÇÃO ---
${effAvaliacao}

--- CAMPO: PLANO ---
${effPlano}${!isDoctor && effConduta ? `\n\n--- CAMPO 06: CONDUTA / FINALIZAÇÃO ---\n${effConduta}` : ''}`;

    const ok = await copyToClipboard(fullText);
    if (ok) {
      setCopiedId(consultation.id);
      onShowToast('success', 'Prontuário completo copiado para a área de transferência!', 'Copiado');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDeletePrescriptionItem = async (consultation: Consultation, itemId: string) => {
    if (!consultation.prescription) return;
    const remainingItems = consultation.prescription.items.filter(
      (item, idx) => (item.id || String(idx)) !== itemId
    );

    let updatedPrescription: PrescriptionData | undefined = undefined;
    if (remainingItems.length > 0) {
      const renumbered = remainingItems.map((item, idx) => ({
        ...item,
        itemNumber: idx + 1,
      }));
      updatedPrescription = {
        ...consultation.prescription,
        items: renumbered,
      };
    }

    const updatedConsultation: Consultation = {
      ...consultation,
      prescription: updatedPrescription,
    };

    try {
      await saveConsultationToFirestore(updatedConsultation);
      onShowToast(
        'success',
        remainingItems.length > 0
          ? 'Medicamento removido da prescrição.'
          : 'Prescrição removida do atendimento.',
        'Prescrição Atualizada'
      );
    } catch (err) {
      console.error('Erro ao atualizar prescrição:', err);
      onShowToast('error', 'Falha ao atualizar prescrição no Firestore.', 'Erro');
    }
  };

  return (
    <div className="space-y-6" id="patient-timeline-container">
      {/* Patient Summary Header Card - Estrutura Proporcional em 2 Linhas */}
      <div
        id="patient-header-card"
        className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden space-y-4"
      >
        {/* LINHA 1: Dados do Paciente Lado a Lado */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
          {/* Identificação Principal (Nome, CNS, CPF) */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
              {patient.fullName}
            </h2>
            {patient.cns && (
              <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-mono text-xs font-bold border border-teal-200 dark:border-teal-800 whitespace-nowrap">
                CNS: {patient.cns}
              </span>
            )}
            {patient.cpf && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-semibold border border-slate-200/80 dark:border-slate-700/80 whitespace-nowrap">
                CPF: {patient.cpf}
              </span>
            )}
            {patientConsultations.length > 0 && (
              <span
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-xs border border-blue-200 dark:border-blue-800 whitespace-nowrap flex items-center gap-1.5"
                title="Data e hora do atendimento mais recente do paciente"
              >
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  Atendimento:{' '}
                  <strong className="font-bold text-blue-900 dark:text-blue-100">
                    {new Date(patientConsultations[0].timestamp).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}{' '}
                    às{' '}
                    {new Date(patientConsultations[0].timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </span>
              </span>
            )}
          </div>

          {/* Dados Complementares (Idade, Responsável, Telefone) lado a lado */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Idade:{' '}
                <strong className="text-teal-700 dark:text-teal-300 font-bold">
                  {chronologicalAge.formatted}
                </strong>
              </span>
            </div>

            {patient.legalGuardianName && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Responsável Legal:{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {patient.legalGuardianName} ({patient.guardianKinship || 'Responsável'})
                  </strong>
                </span>
              </div>
            )}

            {patient.phone && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Tel:{' '}
                  <strong className="text-slate-700 dark:text-slate-300 font-medium">
                    {patient.phone}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* LINHA 2: Botões de Ação Lado a Lado */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          {/* Ações Cadastrais e Clínicas */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="edit-patient-btn"
              onClick={() => onEditPatient(patient)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Editar dados cadastrais do paciente"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Editar Cadastro</span>
            </button>

            {isAdmin && onDeletePatient && (
              <button
                type="button"
                id="delete-patient-btn"
                onClick={() => setIsConfirmingPatientDelete(true)}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Exclusão restrita a Administrador"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            )}

            {/* Botão Add Fila: única e exclusiva função é adicionar à fila e não salvar nada */}
            <button
              type="button"
              id="generate-evolution-btn"
              onClick={() => {
                if (onAddToQueue) {
                  onAddToQueue(patient);
                } else {
                  onNewConsultation(patient);
                }
              }}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                !hasValidAccess && !isAdmin
                  ? 'bg-amber-600/90 hover:bg-amber-600 shadow-amber-600/20'
                  : isQueued
                  ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
              title={
                !hasValidAccess && !isAdmin
                  ? 'Acesso bloqueado: requer plano ativo'
                  : isQueued
                  ? `Paciente já está na Fila de Atendimento (${queueItem?.status === 'in_service' ? 'Em Atendimento' : 'Aguardando'}) - clique para gerenciar fila`
                  : 'Adicionar paciente à Fila de Atendimento'
              }
            >
              {!hasValidAccess && !isAdmin ? (
                <Lock className="w-4 h-4 text-amber-200" />
              ) : isQueued ? (
                <Clock className="w-4 h-4" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>Add Fila</span>
              {isQueued && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase">
                  {queueItem?.status === 'in_service' ? 'Em Atendimento' : 'Na Fila'}
                </span>
              )}
            </button>

            {/* Recurso de Evolução Longitudinal por IA */}
            {allPatientConsultations.length > 0 && onGenerateEvolution && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="patient-evolution-ai-btn"
                  onClick={() => onGenerateEvolution(patient, allPatientConsultations)}
                  className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Abrir última evolução clínica longitudinal salva ou gerar automaticamente"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="hidden sm:inline">Evolução IA</span>
                </button>

                {onRegenerateEvolutionNow && (
                  <button
                    type="button"
                    id="patient-evolution-now-btn"
                    onClick={() => onRegenerateEvolutionNow(patient, allPatientConsultations)}
                    className="px-2.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Forçar nova análise e recálculo da evolução longitudinal agora (IA mais eficaz disponível)"
                  >
                    <RefreshCw className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span className="hidden sm:inline">Evolução IA Now</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Controls & Filter Bar */}
      <div
        id="timeline-filter-bar"
        className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
      >
        {/* Toggle Mode: All Team vs My Consultations */}
        <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            type="button"
            id="filter-all-team-btn"
            onClick={() => setFilterMode('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Todos ({allPatientConsultations.length})</span>
          </button>

          <button
            type="button"
            id="filter-my-consultations-btn"
            onClick={() => setFilterMode('mine')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'mine'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Meus Atendimentos</span>
          </button>
        </div>

        {/* Category / Profession Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="filter-profession-select"
            value={selectedProfessionFilter}
            onChange={(e) => setSelectedProfessionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Todas as Especialidades</option>
            {Object.values(PROFESSIONS).map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.name} ({prof.council})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Consultations Feed */}
      {filteredConsultations.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
          <Clock className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhum atendimento encontrado para o filtro selecionado.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {filterMode === 'mine'
              ? 'Você ainda não registrou nenhum atendimento para este paciente. Alterne para "Toda a Equipe" ou crie um novo atendimento.'
              : 'Cadastre o primeiro atendimento clínico multiprofissional para este paciente.'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (onAddToQueue) {
                onAddToQueue(patient);
              } else {
                onNewConsultation(patient);
              }
            }}
            className={`mt-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
              !hasValidAccess && !isAdmin
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            title={
              !hasValidAccess && !isAdmin
                ? 'Acesso bloqueado: requer assinatura de plano'
                : 'Adicionar cidadão à Fila de Atendimento'
            }
          >
            {!hasValidAccess && !isAdmin ? (
              <Lock className="w-3.5 h-3.5 text-amber-200" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            <span>Add Fila</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 sm:before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredConsultations.map((consultation, index) => {
            const prof = PROFESSIONS[consultation.authorProfession] || PROFESSIONS.enfermeiro;
            const expanded = isCardExpanded(consultation.id);
            const isCopied = copiedId === consultation.id;
            const date = new Date(consultation.timestamp);

            // Verificar se o usuário logado é o autor do atendimento ou admin
            const isAuthor = isUserConsultationAuthor(consultation, currentUser);
            const canEditOrDelete = isAuthor || isAdmin;

            return (
              <motion.div
                key={consultation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="relative pl-10 sm:pl-14"
              >
                {/* Timeline Dot with Profession Icon / Indicator */}
                <div className="absolute left-2 sm:left-4 top-4 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-teal-500 shadow-xs flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                </div>

                {/* Consultation Card */}
                <div
                  id={`consultation-card-${consultation.id}`}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div
                    style={{ backgroundColor: '#314204' }}
                    className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl text-xs font-bold border ${prof.accentBg}`}>
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {consultation.authorName}
                          </span>
                          {consultation.isFirstConsultation !== undefined && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                consultation.isFirstConsultation
                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {consultation.isFirstConsultation ? '1º Atendimento' : 'Retorno'}
                            </span>
                          )}
                          {consultation.prescription && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                              <Pill className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span>{consultation.prescription.type || 'PRESCRIÇÃO'} (2 Vias)</span>
                            </span>
                          )}

                          {consultation.examRequest && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <FlaskConical className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>EXAMES SOLICITADOS ({consultation.examRequest.items?.length || 0})</span>
                            </span>
                          )}

                          {consultation.examMedia && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>ANEXO ICONOGRÁFICO ({consultation.examMedia.items?.length || 0})</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Imprimir Todo o Atendimento Clínico (A4 Retrato - Margens Padronizadas) */}
                      <button
                        type="button"
                        id={`consultation-print-btn-${consultation.id}`}
                        onClick={() => handleOpenConsultationPrint(consultation)}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Imprimir todo este atendimento clínico em Folha A4 Retrato com margens padronizadas"
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-200" />
                        <span className="hidden sm:inline">Impressão Completa</span>
                        <span className="sm:hidden">Imprimir</span>
                      </button>

                      {/* Actions on consultation card */}
                      {onEditConsultation && canEditOrDelete && (
                        <button
                          type="button"
                          onClick={() => onEditConsultation(consultation)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Editar Prontuário"
                        >
                          <FileEdit className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span className="hidden sm:inline text-[11px]">Editar</span>
                        </button>
                      )}

                      {canEditOrDelete && onDeleteConsultation && (
                        <button
                          type="button"
                          onClick={() => setConsultationToDelete(consultation)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Excluir Atendimento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[11px]">Excluir</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyFullRecord(consultation)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copiar Atendimento Completo"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline text-[11px]">
                          {isCopied ? 'Copiado' : 'Copiar Tudo'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(consultation.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title={expanded ? 'Ocultar detalhes do atendimento' : 'Mostrar detalhes do atendimento'}
                      >
                        <span>{expanded ? 'Ocultar' : 'Mostrar'}</span>
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Body - Collapsible PEC Blocks */}
                  {expanded && (
                    <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                      {/* AUDITORIA CLÍNICA CRUZADA ALERT (se presente) */}
                      {consultation.clinicalAudit && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400/80 dark:border-amber-700/80 space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Auditoria Clínica Cruzada: Pendências do Histórico</span>
                          </div>
                          <div className="text-[11px] font-mono whitespace-pre-wrap text-amber-950 dark:text-amber-100 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-300/60 dark:border-amber-800/60">
                            {consultation.clinicalAudit}
                          </div>
                        </div>
                      )}

                      {/* MODO TRIAGEM (TÉC. / AUX. DE ENFERMAGEM) */}
                      {consultation.isTriage ||
                      consultation.authorProfession === 'tecnico_enfermagem' ||
                      consultation.authorProfession === 'auxiliar_enfermagem' ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                              <span>CAMPO ÚNICO: TRIAGEM (e-SUS PEC)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyBlock(consultation.avaliacao, 'Registro de Triagem')}
                              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar Triagem</span>
                            </button>
                          </div>
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-teal-500/30 whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                            {consultation.avaliacao}
                          </div>
                        </div>
                      ) : (() => {
                        const isDoc = isDoctorConsultation(
                          consultation.authorProfession || currentUser.profession,
                          consultation.authorRegister
                        );
                        const cleanDoc = isDoc
                          ? cleanDoctorConsultation(consultation.avaliacao, consultation.plano, consultation.conduta)
                          : null;
                        const dispAvaliacao = cleanDoc ? cleanDoc.avaliacao : consultation.avaliacao;
                        const dispPlano = cleanDoc ? cleanDoc.plano : consultation.plano;
                        const dispConduta = cleanDoc ? cleanDoc.conduta : consultation.conduta;

                        return (
                          <>
                            {/* BLOCO 1: AVALIAÇÃO */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                                  CAMPO: AVALIAÇÃO (Subjetivo, Objetivo & Diagnósticos)
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyBlock(dispAvaliacao, 'Campo Avaliação')
                                  }
                                  className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar Avaliação</span>
                                </button>
                              </div>
                              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <PecContentRenderer text={dispAvaliacao} />
                              </div>
                              <PecQuickCodesBar
                                type="avaliacao"
                                text={dispAvaliacao}
                                onShowToast={onShowToast}
                                professionId={consultation.authorProfession || currentUser.profession}
                                userCbo={consultation.authorRegister}
                              />
                            </div>

                            {/* BLOCO 2: PLANO */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                                  {isDoc
                                    ? 'CAMPO: PLANO (Metas, Intervenções, Condutas e Desfecho)'
                                    : 'CAMPO: PLANO (Intervenções, Orientações & Códigos Fixos)'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyBlock(dispPlano, 'Campo Plano')}
                                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar Plano</span>
                                </button>
                              </div>
                              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <PecContentRenderer text={dispPlano} />
                              </div>
                              <PecQuickCodesBar
                                type="plano"
                                text={dispPlano}
                                onShowToast={onShowToast}
                                professionId={consultation.authorProfession || currentUser.profession}
                                userCbo={consultation.authorRegister}
                              />
                            </div>

                            {/* BLOCO 3: CONDUTA (Opcional / Enfermagem e Outros Não Médicos) */}
                            {!isDoc && dispConduta && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                                    CAMPO 06: CONDUTA / FINALIZAÇÃO DO ATENDIMENTO
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyBlock(dispConduta, 'Campo 06 Conduta')
                                    }
                                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Copiar Conduta 06</span>
                                  </button>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                  <PecContentRenderer text={dispConduta} />
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* BLOCO DE PRESCRIÇÃO DE MEDICAMENTOS VINCULADA AO ATENDIMENTO */}
                      {consultation.prescription && consultation.prescription.items && consultation.prescription.items.length > 0 && (
                        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800/80 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/80 dark:border-blue-800/80 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                                <Pill className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-extrabold text-xs text-blue-950 dark:text-blue-200 uppercase tracking-wider flex items-center gap-2">
                                  <span>{consultation.prescription.type || 'PRESCRIÇÃO'} DE MEDICAMENTOS (2 VIAS IDÊNTICAS)</span>
                                </div>
                                <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">
                                  {consultation.prescription.header?.unitName || 'CENTRO DE ATENÇÃO PSICOSSOCIAL'} • {consultation.prescription.dateFormatted}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {canEditOrDelete && canPrescribe && onNewPrescription && (
                                <button
                                  type="button"
                                  onClick={() => onNewPrescription(patient, consultation)}
                                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                  title="Editar Prescrição deste Atendimento"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span>Editar Receita</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Lista de Medicamentos Prescritos com botão excluir individual */}
                          <div className="space-y-2 bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                            {consultation.prescription.items.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="text-xs text-slate-800 dark:text-slate-200 flex items-start justify-between gap-2.5 p-1 rounded-lg hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <span className="font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md text-[11px] shrink-0">
                                    {item.itemNumber || idx + 1}-
                                  </span>
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="font-black text-slate-900 dark:text-slate-100 uppercase text-xs truncate">
                                      {item.medicationName}
                                    </div>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                      {item.posology} {item.duration && `• ${item.duration}`}{' '}
                                      {item.scheduleInstructions && `• ${item.scheduleInstructions}`}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {canEditOrDelete && canPrescribe && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePrescriptionItem(consultation, item.id || String(idx))}
                                      className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10.5px] font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                      title="Excluir este medicamento da prescrição"
                                    >
                                      <span>excluir</span>
                                    </button>
                                  )}
                                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700">
                                    {item.route}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MÓDULO A: GUIA DE ENCAMINHAMENTO E REFERÊNCIA SUS */}
                      {consultation.referral && (
                        <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border-2 border-sky-200 dark:border-sky-800/60 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/80 dark:border-sky-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                                <Send className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-black text-sky-950 dark:text-sky-100 uppercase text-xs sm:text-sm flex items-center gap-2">
                                  <span>Guia de Encaminhamento / Referência SUS</span>
                                </div>
                                <div className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">
                                  Destino: <strong>{consultation.referral.destination}</strong> • Prioridade:{' '}
                                  <span className={`font-bold ${
                                    consultation.referral.priority === 'Urgência/Emergência'
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : consultation.referral.priority === 'Prioritário'
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-teal-600 dark:text-teal-400'
                                  }`}>
                                    {consultation.referral.priority}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openReferralInNewTab(consultation.referral!, patient, currentUser)}
                                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Imprimir Guia de Encaminhamento"
                              >
                                <Printer className="w-3.5 h-3.5 text-sky-200" />
                                <span>Imprimir Guia</span>
                              </button>
                              {canEditOrDelete && onOpenReferral && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReferral(patient, consultation, consultation.referral)}
                                  className="p-1.5 rounded-lg text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Editar dados da Guia de Encaminhamento"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Editar</span>
                                </button>
                              )}
                              {canEditOrDelete && onDeleteReferral && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteReferral(consultation)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs transition-colors cursor-pointer"
                                  title="Remover Guia de Encaminhamento deste atendimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                  JUSTIFICATIVA / INDICAÇÃO CLÍNICA:
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                {consultation.referral.clinicalIndication}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                  HIPÓTESES DIAGNÓSTICAS / SUPORTE:
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                {consultation.referral.hypotheses}
                              </p>
                            </div>
                            {consultation.referral.proceduresRequested && (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    CONDUTAS / AVALIAÇÕES SOLICITADAS:
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                  {consultation.referral.proceduresRequested}
                                </p>
                              </div>
                            )}
                            {consultation.referral.examsConducted && (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    EXAMES REALIZADOS / RESULTADOS RELEVANTES:
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                  {consultation.referral.examsConducted}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* MÓDULO B: PROJETO TERAPÊUTICO SINGULAR (PTS) */}
                      {consultation.pts && (
                        <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border-2 border-purple-200 dark:border-purple-800/60 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-200/80 dark:border-purple-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-xs">
                                <HeartHandshake className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-black text-purple-950 dark:text-purple-100 uppercase text-xs sm:text-sm flex items-center gap-2">
                                  <span>Projeto Terapêutico Singular (PTS)</span>
                                </div>
                                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                                  Ref: <strong>{consultation.pts.referenceProfessional}</strong> • Reavaliação:{' '}
                                  <span className="font-bold text-purple-900 dark:text-purple-200">{consultation.pts.reassessmentDate}</span>
                                  {consultation.pts.teamMembers ? ` • Equipe: ${consultation.pts.teamMembers}` : ''}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openPtsInNewTab(consultation.pts!, patient, currentUser)}
                                className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Imprimir Ficha do PTS"
                              >
                                <Printer className="w-3.5 h-3.5 text-purple-200" />
                                <span>Imprimir PTS</span>
                              </button>
                              {canEditOrDelete && onOpenPts && (
                                <button
                                  type="button"
                                  onClick={() => onOpenPts(patient, consultation, consultation.pts)}
                                  className="p-1.5 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Editar dados do Projeto Terapêutico Singular"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Editar</span>
                                </button>
                              )}
                              {canEditOrDelete && onDeletePts && (
                                <button
                                  type="button"
                                  onClick={() => onDeletePts(consultation)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs transition-colors cursor-pointer"
                                  title="Remover PTS deste atendimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                  EIXO 1: DIAGNÓSTICO SITUACIONAL & VULNERABILIDADES:
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                {consultation.pts.diagnosisVulnerability}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                  EIXO 2: METAS DE CURTO PRAZO (IMEDIATAS):
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                {consultation.pts.shortTermGoals}
                              </p>
                            </div>
                            {consultation.pts.mediumLongTermGoals && (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    EIXO 3: METAS DE MÉDIO / LONGO PRAZO:
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                  {consultation.pts.mediumLongTermGoals}
                                </p>
                              </div>
                            )}
                            {consultation.pts.agreedActions && (
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    EIXO 4: DIVISÃO DE RESPONSABILIDADES / PACTUAÇÃO:
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap ml-3.5">
                                  {consultation.pts.agreedActions}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* MÓDULO C: SOLICITAÇÃO DE EXAMES COMPLEMENTARES */}
                      {consultation.examRequest && consultation.examRequest.items && consultation.examRequest.items.length > 0 && (
                        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800/60 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/80 dark:border-indigo-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <FlaskConical className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-black text-indigo-950 dark:text-indigo-100 uppercase text-xs sm:text-sm flex items-center gap-2">
                                  <span>Solicitação de Exames Complementares</span>
                                </div>
                                <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                                  {consultation.examRequest.items.length} {consultation.examRequest.items.length === 1 ? 'Exame Solicitado' : 'Exames Solicitados'} • 2 Vias A4 Paisagem
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onPrintExamRequest) {
                                    onPrintExamRequest(consultation.examRequest!);
                                  } else {
                                    openExamRequestInNewTab(consultation.examRequest!, currentUser);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Imprimir Solicitação de Exames (2 Vias A4 Paisagem)"
                              >
                                <Printer className="w-3.5 h-3.5 text-indigo-200" />
                                <span>Imprimir Exames</span>
                              </button>
                              {canEditOrDelete && onOpenExamRequest && (
                                <button
                                  type="button"
                                  onClick={() => onOpenExamRequest(patient, consultation, consultation.examRequest)}
                                  className="p-1.5 rounded-lg text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Editar Solicitação de Exames"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Editar</span>
                                </button>
                              )}
                              {canEditOrDelete && onDeleteExamRequest && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteExamRequest(consultation)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs transition-colors cursor-pointer"
                                  title="Remover Solicitação de Exames deste atendimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                            {consultation.examRequest.items.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2 py-0.5"
                              >
                                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[11px] shrink-0">
                                  {String(idx + 1).padStart(2, '0')}.
                                </span>
                                <span className="font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">
                                  {item.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MÓDULO D: LAUDO MÉDICO OFICIAL */}
                      {consultation.medicalReport && (
                        <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border-2 border-teal-200 dark:border-teal-800/60 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/80 dark:border-teal-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-black text-teal-950 dark:text-teal-100 uppercase text-xs sm:text-sm flex items-center gap-2">
                                  <span>Laudo Médico Oficial (A4)</span>
                                  <span className="text-[10px] bg-teal-200/60 dark:bg-teal-900 text-teal-900 dark:text-teal-200 px-2 py-0.5 rounded font-bold">
                                    {consultation.medicalReport.cityDateFormatted || 'Anajás/PA'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                                  CID-10:{' '}
                                  <span className="font-bold text-teal-900 dark:text-teal-100">
                                    {consultation.medicalReport.cid10 || 'CID-10 informada'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openMedicalReportInNewTab(consultation.medicalReport!, patient, currentUser)}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Imprimir Laudo Médico em Folha A4"
                              >
                                <Printer className="w-3.5 h-3.5 text-teal-200" />
                                <span>Imprimir Laudo</span>
                              </button>
                              {canEditOrDelete && (isDoctor || isAdmin) && onOpenMedicalReport && (
                                <button
                                  type="button"
                                  onClick={() => onOpenMedicalReport(patient, consultation, consultation.medicalReport)}
                                  className="p-1.5 rounded-lg text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Editar Laudo Médico"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Editar</span>
                                </button>
                              )}
                              {canEditOrDelete && (isDoctor || isAdmin) && onDeleteMedicalReport && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteMedicalReport(consultation)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs transition-colors cursor-pointer"
                                  title="Remover Laudo Médico deste atendimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-100 dark:border-teal-900/50 shadow-xs">
                              <span className="font-black text-teal-900 dark:text-teal-200 uppercase text-[10px] block mb-1">
                                Descrição Clínica do Laudo:
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {consultation.medicalReport.description}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                              <div>
                                Paciente: <strong>{consultation.medicalReport.patientName}</strong> ({consultation.medicalReport.patientAgeFormatted}) • {consultation.medicalReport.patientDocument}
                              </div>
                              <div>
                                Médico: <strong>{consultation.medicalReport.professionalName}</strong> ({consultation.medicalReport.professionalSpecialty} - {consultation.medicalReport.professionalCouncil})
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Visualização de Atestado Médico Anexo */}
                      {consultation.medicalCertificate && (
                        <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border-2 border-teal-200 dark:border-teal-900/60 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200/60 dark:border-teal-900/40 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-teal-600 text-white shadow-xs">
                                <FileCheck2 className="w-4 h-4" />
                              </span>
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-tight text-teal-950 dark:text-teal-100 flex items-center gap-2">
                                  Atestado Médico Oficial (Folha A4)
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                                    {consultation.medicalCertificate.daysOff} {consultation.medicalCertificate.daysOff === 1 ? 'dia' : 'dias'} de afastamento
                                  </span>
                                </h4>
                                <p className="text-[11px] text-teal-700 dark:text-teal-300">
                                  {consultation.medicalCertificate.purpose || 'Justificativa de Repouso e Afastamento'} • Início em {consultation.medicalCertificate.startDateFormatted}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openMedicalCertificateInNewTab(consultation.medicalCertificate!, patient, currentUser)}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                title="Imprimir Atestado Médico em Folha A4 Retrato"
                              >
                                <Printer className="w-3.5 h-3.5 text-teal-200" />
                                <span>Imprimir A4</span>
                              </button>

                              {canEditOrDelete && onOpenMedicalCertificate && (canIssueMedicalCertificate(currentUser.profession) || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => onOpenMedicalCertificate(patient, consultation, consultation.medicalCertificate)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                                  title="Editar Atestado Médico"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canEditOrDelete && onDeleteMedicalCertificate && (canIssueMedicalCertificate(currentUser.profession) || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteMedicalCertificate(consultation)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                                  title="Remover Atestado Médico"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-teal-100 dark:border-teal-900/50 shadow-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                <div>
                                  <span className="font-bold text-teal-900 dark:text-teal-200 text-[10px] uppercase block">Período de Afastamento:</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{consultation.medicalCertificate.daysOff} ({consultation.medicalCertificate.daysOffExtenso}) a contar de {consultation.medicalCertificate.startDateFormatted}</span>
                                </div>
                                {consultation.medicalCertificate.showCid && consultation.medicalCertificate.cidCode && (
                                  <div>
                                    <span className="font-bold text-teal-900 dark:text-teal-200 text-[10px] uppercase block">Diagnóstico Codificado (CID-10):</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{consultation.medicalCertificate.cidCode} {consultation.medicalCertificate.cidDescription ? `- ${consultation.medicalCertificate.cidDescription}` : ''}</span>
                                  </div>
                                )}
                              </div>
                              {consultation.medicalCertificate.observations && (
                                <p className="text-slate-600 dark:text-slate-400 italic text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                                  Obs: {consultation.medicalCertificate.observations}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                              <div>
                                Paciente: <strong>{consultation.medicalCertificate.patientName}</strong> ({consultation.medicalCertificate.patientAgeFormatted}) • {consultation.medicalCertificate.patientDocument}
                              </div>
                              <div>
                                Médico: <strong>{consultation.medicalCertificate.professionalName}</strong> ({consultation.medicalCertificate.professionalCouncil})
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Visualização de Atestado de Comparecimento Anexo */}
                      {consultation.attendanceCertificate && (
                        <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border-2 border-sky-200 dark:border-sky-900/60 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/60 dark:border-sky-900/40 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-sky-600 text-white shadow-xs">
                                <FileCheck className="w-4 h-4" />
                              </span>
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-tight text-sky-950 dark:text-sky-100 flex items-center gap-2">
                                  Atestado de Comparecimento (Folha A4)
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                                    {consultation.attendanceCertificate.periodLabel || 'Dia do Atendimento'}
                                  </span>
                                </h4>
                                <p className="text-[11px] text-sky-700 dark:text-sky-300">
                                  Comprovante de presença em {consultation.attendanceCertificate.attendanceDateFormatted} • {consultation.attendanceCertificate.attendanceType}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openAttendanceCertificateInNewTab(consultation.attendanceCertificate!, patient, currentUser)}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                title="Imprimir Atestado de Comparecimento em Folha A4 Retrato"
                              >
                                <Printer className="w-3.5 h-3.5 text-sky-200" />
                                <span>Imprimir A4</span>
                              </button>

                              {canEditOrDelete && onOpenAttendanceCertificate && (canIssueAttendanceCertificate(currentUser.profession, currentUser.cbo) || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => onOpenAttendanceCertificate(patient, consultation, consultation.attendanceCertificate)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                                  title="Editar Atestado de Comparecimento"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canEditOrDelete && onDeleteAttendanceCertificate && (canIssueAttendanceCertificate(currentUser.profession, currentUser.cbo) || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteAttendanceCertificate(consultation)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                                  title="Remover Atestado de Comparecimento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-sky-100 dark:border-sky-900/50 shadow-xs space-y-1.5">
                              <div>
                                <span className="font-bold text-sky-900 dark:text-sky-200 text-[10px] uppercase block">Finalidade / Motivo:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{consultation.attendanceCertificate.attendanceType}</span>
                              </div>
                              {consultation.attendanceCertificate.isCompanion && (
                                <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200/60 dark:border-sky-900/40 text-[11px]">
                                  <strong className="text-sky-900 dark:text-sky-200">Acompanhante Justificado:</strong> {consultation.attendanceCertificate.companionName} {consultation.attendanceCertificate.companionDocument ? `(Doc: ${consultation.attendanceCertificate.companionDocument})` : ''} - {consultation.attendanceCertificate.companionKinship}
                                </div>
                              )}
                              {consultation.attendanceCertificate.observations && (
                                <p className="text-slate-600 dark:text-slate-400 italic text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                                  Obs: {consultation.attendanceCertificate.observations}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                              <div>
                                Paciente: <strong>{consultation.attendanceCertificate.patientName}</strong> ({consultation.attendanceCertificate.patientAgeFormatted}) • {consultation.attendanceCertificate.patientDocument}
                              </div>
                              <div>
                                Emitido por: <strong>{consultation.attendanceCertificate.professionalName}</strong> ({consultation.attendanceCertificate.professionalRole} - {consultation.attendanceCertificate.professionalCouncil})
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* MÓDULO E: ANEXO ICONOGRÁFICO DE IMAGENS E VÍDEOS */}
                      {consultation.examMedia && (
                        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-900/40 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-amber-600 text-white shadow-xs">
                                <ImageIcon className="w-4 h-4" />
                              </span>
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-tight text-amber-950 dark:text-amber-100 flex items-center gap-2">
                                  Anexo Iconográfico de Imagens e QR Code de Vídeos (A4)
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                                    {consultation.examMedia.items?.length || 0} mídias
                                  </span>
                                </h4>
                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                  Layout padrão de 2 colunas com 3 imagens por lado (até 6 por página) • Vigência digital até {consultation.examMedia.validUntilFormatted || '20 anos'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openExamMediaInNewTab(consultation.examMedia!, patient, currentUser)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                title="Imprimir Anexo Iconográfico em Folha A4 Retrato (Até 6 Imagens por Página)"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-200" />
                                <span>Imprimir A4</span>
                              </button>

                              {canEditOrDelete && onOpenExamMedia && (
                                <button
                                  type="button"
                                  onClick={() => onOpenExamMedia(patient, consultation, consultation.examMedia)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                                  title="Editar Imagens e Vídeos"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {canEditOrDelete && onDeleteExamMedia && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteExamMedia(consultation)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 text-xs transition-colors"
                                  title="Remover Anexo Iconográfico"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Media Items Thumbnails Preview */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                            {consultation.examMedia.items.map((item, mIdx) => (
                              <div key={item.id || mIdx} className="bg-white dark:bg-slate-900 rounded-lg p-1.5 border border-amber-200 dark:border-amber-900/40 text-center">
                                <div className="relative w-full h-16 bg-slate-900 rounded-sm overflow-hidden flex items-center justify-center">
                                  {item.imageDataUrl || item.videoThumbnailDataUrl ? (
                                    <img src={item.imageDataUrl || item.videoThumbnailDataUrl} alt={item.title} className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="text-[9px] text-slate-400">Sem imagem</span>
                                  )}
                                  {item.type === 'video' && (
                                    <span className="absolute bottom-1 right-1 bg-amber-500 text-slate-950 font-black text-[7px] px-1 rounded-xs">
                                      QR VÍDEO
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate mt-1">
                                  {item.title}
                                </p>
                              </div>
                            ))}
                          </div>

                          {consultation.examMedia.legalNotice && (
                            <div className="text-[10px] text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/80">
                              ⚖️ {consultation.examMedia.legalNotice}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rodapé do Atendimento Clínico com Identificação e Botão de Impressão */}
                      <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800/80">
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>Atendimento por:</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold uppercase">{consultation.authorName}</strong>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10.5px] text-slate-600 dark:text-slate-300">
                            {consultation.authorRegister || (consultation.authorProfession === 'enfermeiro' ? 'COREN CBO 2235-05' : 'CRM/PA')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            id={`consultation-print-btn-bottom-${consultation.id}`}
                            onClick={() => handleOpenConsultationPrint(consultation)}
                            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                            title="Imprimir todo o atendimento formatado em Folha A4 Retrato com margens padronizadas"
                          >
                            <Printer className="w-4 h-4 text-teal-200" />
                            <span>Impressão Completa</span>
                          </button>
                        </div>
                      </div>

                      {/* Botões para Anexar Prescrição, Exames, Encaminhamento, PTS e Atestados */}
                      {canEditOrDelete && (
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                          {!consultation.prescription && canPrescribe && onNewPrescription && (
                            <button
                              type="button"
                              onClick={() => onNewPrescription(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                              title="Emitir receituário em 2 vias vinculado a este atendimento"
                            >
                              <Pill className="w-3.5 h-3.5" />
                              <span>+ Prescrição</span>
                            </button>
                          )}

                          {!consultation.medicalCertificate && canIssueMedicalCertificate(currentUser.profession) && onOpenMedicalCertificate && (
                            <button
                              type="button"
                              onClick={() => onOpenMedicalCertificate(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                              title="Emitir Atestado Médico oficial com afastamento por dias (Exclusivo Médico)"
                            >
                              <FileCheck2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              <span>+ Atestado Médico</span>
                            </button>
                          )}

                          {!consultation.attendanceCertificate && canIssueAttendanceCertificate(currentUser.profession, currentUser.cbo) && onOpenAttendanceCertificate && (
                            <button
                              type="button"
                              onClick={() => onOpenAttendanceCertificate(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                              title="Emitir Atestado de Comparecimento para justificar o dia do atendimento (Nível Superior)"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                              <span>+ Atestado Comparecimento</span>
                            </button>
                          )}

                          {!consultation.examRequest && onOpenExamRequest && (
                            <button
                              type="button"
                              onClick={() => onOpenExamRequest(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                              title="Solicitar exames complementares vinculados a este atendimento"
                            >
                              <FlaskConical className="w-3.5 h-3.5" />
                              <span>+ Exames</span>
                            </button>
                          )}

                          {!consultation.referral && onOpenReferral && (
                            <button
                              type="button"
                              onClick={() => onOpenReferral(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                              title="Emitir Guia de Encaminhamento e Referência SUS vinculada a este atendimento"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>+ Encaminhamento</span>
                            </button>
                          )}

                          {!consultation.pts && onOpenPts && (
                            <button
                              type="button"
                              onClick={() => onOpenPts(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                              title="Elaborar Projeto Terapêutico Singular (PTS) vinculado a este atendimento"
                            >
                              <HeartHandshake className="w-3.5 h-3.5" />
                              <span>+ PTS</span>
                            </button>
                          )}

                          {isDoctor && !consultation.medicalReport && onOpenMedicalReport && (
                            <button
                              type="button"
                              onClick={() => onOpenMedicalReport(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                              title="Emitir Laudo Médico oficial vinculado a este atendimento (Exclusivo da Classe Médica)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>+ Laudo Médico</span>
                            </button>
                          )}

                          {!consultation.examMedia && onOpenExamMedia && (
                            <button
                              type="button"
                              onClick={() => onOpenExamMedia(patient, consultation)}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                              title="Anexar imagens e QR Code de vídeos em folha A4 vinculadas a este atendimento"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>+ Imagens/Vídeos</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Qualitative Flags / Badges */}
                      {consultation.qualitativeChecks?.hasQualitativeVitals && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
                            ✓ Parâmetros Qualitativos (Normotenso / Eutrófico)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Patient Deletion */}
      <AnimatePresence>
        {isConfirmingPatientDelete && (
          <div
            id="confirm-delete-patient-timeline-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsConfirmingPatientDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Excluir Paciente
                </h3>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {patient.fullName}
                </p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-mono mt-0.5">
                  CNS: {patient.cns || 'S/N'} {patient.cpf ? `• CPF: ${patient.cpf}` : ''}
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tem certeza que deseja excluir este paciente? Esta ação é irreversível e excluirá todo o histórico clínico e atendimentos vinculados no Cloud Firestore.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingPatientDelete(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="confirm-delete-patient-timeline-action-btn"
                  onClick={() => {
                    if (onDeletePatient) {
                      onDeletePatient(patient);
                      setIsConfirmingPatientDelete(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Consultation Deletion */}
      <AnimatePresence>
        {consultationToDelete && (
          <div
            id="confirm-delete-consultation-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
            onClick={() => setConsultationToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Excluir Atendimento Clínico
                </h3>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Atendimento por {consultationToDelete.authorName} ({consultationToDelete.authorProfession})
                </p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-mono mt-0.5">
                  Data: {new Date(consultationToDelete.timestamp).toLocaleDateString('pt-BR')} • {consultationToDelete.workplace || 'UBS Central'}
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tem certeza que deseja excluir este atendimento do prontuário? Esta ação é restrita a administradores e não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConsultationToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="confirm-delete-consultation-action-btn"
                  onClick={() => {
                    if (onDeleteConsultation && consultationToDelete) {
                      onDeleteConsultation(consultationToDelete);
                      setConsultationToDelete(null);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Pré-visualização e Impressão de Atendimento Clínico (A4 Retrato) */}
      <ConsultationPreviewModal
        isOpen={!!selectedConsultationForPrint}
        onClose={() => setSelectedConsultationForPrint(null)}
        consultation={selectedConsultationForPrint}
        patient={patient}
        onShowToast={onShowToast}
      />
    </div>
  );
};
