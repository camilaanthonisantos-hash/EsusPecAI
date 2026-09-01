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
} from 'lucide-react';
import { Patient, Consultation, User, ProfessionId } from '../types';
import { PROFESSIONS, isUserAdmin } from '../data/professions';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { copyToClipboard } from '../services/gemini';
import { PecContentRenderer } from './PecContentRenderer';

interface PatientTimelineProps {
  patient: Patient;
  consultations: Consultation[];
  currentUser: User;
  onNewConsultation: (patient: Patient) => void;
  onGenerateEvolution: (patient: Patient, consultations: Consultation[]) => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient?: (patient: Patient) => void;
  onEditConsultation?: (consultation: Consultation) => void;
  onDeleteConsultation?: (consultation: Consultation) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  patient,
  consultations,
  currentUser,
  onNewConsultation,
  onGenerateEvolution,
  onEditPatient,
  onDeletePatient,
  onEditConsultation,
  onDeleteConsultation,
  onShowToast,
}) => {
  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [selectedProfessionFilter, setSelectedProfessionFilter] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // States for in-app deletion confirmations
  const [isConfirmingPatientDelete, setIsConfirmingPatientDelete] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState<Consultation | null>(null);

  const isAdmin = isUserAdmin(currentUser);
  const chronologicalAge = calculateChronologicalAge(patient.birthDate);

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
      [id]: prev[id] === undefined ? false : !prev[id], // Default is expanded if undefined
    }));
  };

  const isCardExpanded = (id: string) => {
    return expandedCards[id] !== false; // Default expanded
  };

  const handleCopyBlock = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      onShowToast('success', `${label} copiado para a área de transferência!`, 'Copiado');
    }
  };

  const handleCopyFullRecord = async (consultation: Consultation) => {
    const fullText = `=== REGISTRO CLÍNICO e-SUS PEC (${PROFESSIONS[consultation.authorProfession]?.name || 'Equipe'}) ===
Data: ${new Date(consultation.timestamp).toLocaleString('pt-BR')}
Profissional: ${consultation.authorName} (${consultation.authorRegister})
Local: ${consultation.workplace}

--- CAMPO: AVALIAÇÃO ---
${consultation.avaliacao}

--- CAMPO: PLANO ---
${consultation.plano}
${consultation.conduta ? `\n--- CAMPO 06: CONDUTA / FINALIZAÇÃO ---\n${consultation.conduta}` : ''}`;

    const ok = await copyToClipboard(fullText);
    if (ok) {
      setCopiedId(consultation.id);
      onShowToast('success', 'Prontuário completo copiado para a área de transferência!', 'Copiado');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-6" id="patient-timeline-container">
      {/* Patient Summary Header Card */}
      <div
        id="patient-header-card"
        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Patient Details */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {patient.fullName}
              </h2>
              {patient.cns && (
                <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-mono text-xs font-semibold border border-teal-200 dark:border-teal-800">
                  CNS: {patient.cns}
                </span>
              )}
              {patient.cpf && (
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs">
                  CPF: {patient.cpf}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>
                  Idade Cronológica:{' '}
                  <strong className="text-teal-700 dark:text-teal-300 font-bold">
                    {chronologicalAge.formatted}
                  </strong>
                </span>
              </div>

              {patient.legalGuardianName && (
                <div className="flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    Responsável Legal:{' '}
                    <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                      {patient.legalGuardianName} ({patient.guardianKinship || 'Responsável'})
                    </strong>
                  </span>
                </div>
              )}

              {patient.phone && (
                <div className="text-slate-500">Tel: {patient.phone}</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
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
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}

            <button
              type="button"
              id="generate-evolution-btn"
              onClick={() => onGenerateEvolution(patient, allPatientConsultations)}
              disabled={allPatientConsultations.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600 hover:from-teal-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Gerar Análise de Evolução Clínica ✨</span>
            </button>

            <button
              type="button"
              id="new-consultation-for-patient-btn"
              onClick={() => onNewConsultation(patient)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Novo Atendimento</span>
            </button>
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
            <span>Toda a Equipe Multiprofissional ({allPatientConsultations.length})</span>
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
            <span>Meus Atendimentos ({currentUser.name.split(' ')[0]})</span>
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
            onClick={() => onNewConsultation(patient)}
            className="mt-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500 transition-colors"
          >
            + Registrar Primeiro Atendimento
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 sm:before:left-6 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredConsultations.map((consultation, index) => {
            const prof = PROFESSIONS[consultation.authorProfession] || PROFESSIONS.enfermeiro;
            const expanded = isCardExpanded(consultation.id);
            const isCopied = copiedId === consultation.id;
            const date = new Date(consultation.timestamp);

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
                  <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl text-xs font-bold border ${prof.accentBg}`}>
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            {consultation.authorName}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${prof.accentBg}`}>
                            {prof.name}
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
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{consultation.authorRegister || prof.council}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {consultation.workplace || 'UBS / RAPS'}
                          </span>
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

                      {/* Actions on consultation card */}
                      {onEditConsultation && (
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

                      {isAdmin && onDeleteConsultation && (
                        <button
                          type="button"
                          onClick={() => setConsultationToDelete(consultation)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Excluir Atendimento (Admin)"
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={expanded ? 'Recolher' : 'Expandir'}
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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

                      {/* BLOCO 1: AVALIAÇÃO */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                            CAMPO: AVALIAÇÃO (Subjetivo, Objetivo & Diagnósticos)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyBlock(consultation.avaliacao, 'Campo Avaliação')
                            }
                            className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar Avaliação</span>
                          </button>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <PecContentRenderer text={consultation.avaliacao} />
                        </div>
                      </div>

                      {/* BLOCO 2: PLANO */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                            CAMPO: PLANO (Intervenções, Orientações & Códigos Fixos)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyBlock(consultation.plano, 'Campo Plano')}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar Plano</span>
                          </button>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <PecContentRenderer text={consultation.plano} />
                        </div>
                      </div>

                      {/* BLOCO 3: CONDUTA (Opcional / Enfermagem) */}
                      {consultation.conduta && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                              CAMPO 06: CONDUTA / FINALIZAÇÃO DO ATENDIMENTO
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyBlock(consultation.conduta!, 'Campo 06 Conduta')
                              }
                              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar Conduta 06</span>
                            </button>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <PecContentRenderer text={consultation.conduta} />
                          </div>
                        </div>
                      )}

                      {/* Qualitative Flags / Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                        {consultation.qualitativeChecks?.hasQualitativeVitals && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
                            ✓ Parâmetros Qualitativos (Normotenso / Eutrófico)
                          </span>
                        )}
                        {consultation.qualitativeChecks?.hasFixedCiapSigtap && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-medium">
                            ✓ CIAP-2 (-69) & SIGTAP (0301080445)
                          </span>
                        )}
                        {consultation.qualitativeChecks?.hasNandaNocNic && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium">
                            ✓ Taxonomia NANDA-I / NOC / NIC
                          </span>
                        )}
                      </div>
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
    </div>
  );
};
