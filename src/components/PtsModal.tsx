import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Save,
  HeartHandshake,
  Sparkles,
  Calendar,
  UserCheck,
  Target,
  ShieldAlert,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { PtsData, Patient, User, Consultation } from '../types';
import { openPtsInNewTab } from '../utils/printPts';

interface PtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: PtsData) => void;
  onSavePts?: (data: PtsData) => void;
  initialData?: Partial<PtsData> | null;
  existingPts?: Partial<PtsData> | null;
  patient?: Patient | null;
  consultationSummary?: { avaliacao?: string; plano?: string; conduta?: string };
  initialPlanText?: string;
  initialNotesText?: string;
  initialConsultation?: Consultation | null;
  currentUser?: User | null;
  consultationId?: string;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const REASSESSMENT_PRESETS = ['15 dias', '30 dias', '45 dias', '60 dias', '90 dias', '6 meses'];

export const PtsModal: React.FC<PtsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSavePts,
  initialData,
  existingPts,
  patient,
  consultationSummary,
  initialPlanText,
  initialNotesText,
  initialConsultation,
  currentUser,
  consultationId,
  onShowToast,
}) => {
  const activeInitial = initialData || existingPts;
  const activeSummary = consultationSummary || {
    avaliacao: initialNotesText || initialConsultation?.avaliacao,
    plano: initialPlanText || initialConsultation?.plano,
    conduta: initialConsultation?.conduta,
  };

  const [diagnosisVulnerability, setDiagnosisVulnerability] = useState(activeInitial?.diagnosisVulnerability || '');
  const [shortTermGoals, setShortTermGoals] = useState(activeInitial?.shortTermGoals || '');
  const [mediumLongTermGoals, setMediumLongTermGoals] = useState(activeInitial?.mediumLongTermGoals || '');
  const [agreedActions, setAgreedActions] = useState(activeInitial?.agreedActions || '');
  const [referenceProfessional, setReferenceProfessional] = useState(activeInitial?.referenceProfessional || '');
  const [teamMembers, setTeamMembers] = useState(activeInitial?.teamMembers || '');
  const [reassessmentDate, setReassessmentDate] = useState(activeInitial?.reassessmentDate || '30 dias');

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      const init = initialData || existingPts;
      const summary = consultationSummary || {
        avaliacao: initialNotesText || initialConsultation?.avaliacao,
        plano: initialPlanText || initialConsultation?.plano,
        conduta: initialConsultation?.conduta,
      };

      if (init) {
        setDiagnosisVulnerability(init.diagnosisVulnerability || '');
        setShortTermGoals(init.shortTermGoals || '');
        setMediumLongTermGoals(init.mediumLongTermGoals || '');
        setAgreedActions(init.agreedActions || '');
        setReferenceProfessional(init.referenceProfessional || currentUser?.name || '');
        setTeamMembers(init.teamMembers || '');
        setReassessmentDate(init.reassessmentDate || '30 dias');
      } else {
        setReferenceProfessional(currentUser?.name || 'Profissional de Referência');
        setTeamMembers('');
        setReassessmentDate('30 dias');

        // Pre-fill from consultation if available
        if (summary?.avaliacao) {
          setDiagnosisVulnerability(
            `Vulnerabilidades e dinâmica do caso:\n${summary.avaliacao.slice(0, 350)}`
          );
        } else {
          setDiagnosisVulnerability('');
        }

        if (summary?.plano || summary?.conduta) {
          setShortTermGoals(
            summary.plano?.slice(0, 250) || summary.conduta?.slice(0, 250) || ''
          );
          setMediumLongTermGoals('Promover estabilização clínica, fortalecimento do vínculo familiar e ampliação da autonomia no território.');
          setAgreedActions(
            '- Usuário / Família: Manter adesão aos atendimentos agendados e acompanhamento da rotina.\n- Equipe de Saúde: Atendimento multiprofissional compartilhado e monitoramento do plano terapêutico.\n- Intersetorial: Articulação com a rede de assistência social e suporte comunitário.'
          );
        } else {
          setShortTermGoals('');
          setMediumLongTermGoals('');
          setAgreedActions('');
        }
      }
    }
  }, [isOpen, initialData, existingPts, consultationSummary, initialPlanText, initialNotesText, initialConsultation, currentUser]);

  if (!isOpen) return null;

  const buildCurrentPtsData = (): PtsData => {
    const now = Date.now();
    const init = initialData || existingPts;
    return {
      id: init?.id || `pts-${now}`,
      diagnosisVulnerability: diagnosisVulnerability.trim() || 'Diagnóstico situacional pactuado em equipe multiprofissional.',
      shortTermGoals: shortTermGoals.trim() || 'Estabilização clínica e acolhimento imediato das demandas prioritárias.',
      mediumLongTermGoals: mediumLongTermGoals.trim() || 'Fortalecimento de autonomia e reinserção comunitária e psicossocial.',
      agreedActions: agreedActions.trim() || 'Pactuação de responsabilidades mútuas entre usuário, família e equipe de referência.',
      referenceProfessional: referenceProfessional.trim() || init?.referenceProfessional || init?.professionalName || initialConsultation?.authorName || currentUser?.name || 'Profissional de Referência',
      reassessmentDate: reassessmentDate.trim() || '30 dias',
      teamMembers: teamMembers.trim() || undefined,
      dateFormatted:
        init?.dateFormatted ||
        'Anajás, ' +
          new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
      professionalName: init?.professionalName || initialConsultation?.authorName || currentUser?.name || 'Profissional de Referência',
      professionalRole: init?.professionalRole || initialConsultation?.authorProfession || (currentUser?.role === 'admin' ? 'Coordenador / Profissional' : (currentUser?.profession || 'Profissional de Referência')),
      professionalRegister: init?.professionalRegister || initialConsultation?.authorRegister || currentUser?.professionalRegister || '',
      professionalStampUrl: init?.professionalStampUrl || (initialConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl),
      useDigitalStamp: init?.useDigitalStamp ?? (initialConsultation?.authorUseDigitalStamp ?? (currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
      workplace: init?.workplace || initialConsultation?.workplace || currentUser?.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL - CAPS',
      createdAt: init?.createdAt || now,
      consultationId: consultationId || initialConsultation?.id || init?.consultationId,
    };
  };

  const handleSaveOnly = () => {
    if (!diagnosisVulnerability.trim() && !shortTermGoals.trim()) {
      alert('Por favor, descreva ao menos o diagnóstico situacional ou metas do PTS.');
      return;
    }
    const data = buildCurrentPtsData();
    const saveFn = onSave || onSavePts;
    if (saveFn) {
      saveFn(data);
    }
    onClose();
  };

  const handleSaveAndPrint = () => {
    if (!diagnosisVulnerability.trim() && !shortTermGoals.trim()) {
      alert('Por favor, descreva ao menos o diagnóstico situacional ou metas do PTS.');
      return;
    }
    const data = buildCurrentPtsData();
    const saveFn = onSave || onSavePts;
    if (saveFn) {
      saveFn(data);
    }
    openPtsInNewTab(data, patient || undefined, currentUser);
    onClose();
  };

  const handleAutoFillFromNotes = () => {
    if (consultationSummary) {
      if (consultationSummary.avaliacao) {
        setDiagnosisVulnerability((prev) =>
          prev
            ? `${prev}\n\n[Dados do Atendimento Clínico]:\n${consultationSummary.avaliacao}`
            : consultationSummary.avaliacao
        );
      }
      if (consultationSummary.plano || consultationSummary.conduta) {
        setShortTermGoals((prev) =>
          prev
            ? `${prev}\n\n[Plano Imediato]:\n${consultationSummary.plano || consultationSummary.conduta}`
            : (consultationSummary.plano || consultationSummary.conduta || '')
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <HeartHandshake className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
                PROJETO TERAPÊUTICO SINGULAR (PTS)
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-100 border border-purple-400/30">
                  Ficha A4 Retrato
                </span>
              </h3>
              <p className="text-xs text-purple-200 font-medium">
                {patient ? `Usuário(a): ${patient.fullName}` : 'Instrumento de Pactuação Multiprofissional e Corresponsabilização'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
          {/* Quick Auto-fill banner */}
          {consultationSummary && (consultationSummary.avaliacao || consultationSummary.plano) && (
            <div className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-300 font-medium">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Preencher eixos com base na evolução e plano deste atendimento</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillFromNotes}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
              >
                Preencher
              </button>
            </div>
          )}

          {/* Reference Professional and Reassessment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Profissional de Referência / Gestor do Caso *
              </label>
              <input
                type="text"
                value={referenceProfessional}
                onChange={(e) => setReferenceProfessional(e.target.value)}
                placeholder="Nome do profissional responsável..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Previsão de Reavaliação do PTS
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={reassessmentDate}
                  onChange={(e) => setReassessmentDate(e.target.value)}
                  placeholder="Ex: 30 dias ou DD/MM/AAAA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Reassessment Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Prazo sugerido:</span>
            {REASSESSMENT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReassessmentDate(preset)}
                className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-purple-100 dark:bg-slate-800 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 hover:text-purple-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Team Members */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              Equipe Técnica Envolvida (Multiprofissional)
            </label>
            <input
              type="text"
              value={teamMembers}
              onChange={(e) => setTeamMembers(e.target.value)}
              placeholder="Ex: Psicólogo, Enfermeiro, Assistente Social, Médico Psiquiatra..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Axis 1: Diagnosis & Vulnerability */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              Eixo 1: Diagnóstico Situacional, Vulnerabilidades e Potencialidades *
            </label>
            <textarea
              value={diagnosisVulnerability}
              onChange={(e) => setDiagnosisVulnerability(e.target.value)}
              rows={3}
              placeholder="Descreva a história de vida, vínculos familiares, rede de apoio, fatores de risco e potencialidades do usuário..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-hidden resize-y"
            />
          </div>

          {/* Axis 2: Short-Term Goals */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-600" />
              Eixo 2: Metas de Curto Prazo (Intervenções Imediatas e Estabilização) *
            </label>
            <textarea
              value={shortTermGoals}
              onChange={(e) => setShortTermGoals(e.target.value)}
              rows={2}
              placeholder="Ex: Acolhimento semanal, estabilização dos sintomas agudos, encaminhamento para avaliação médica..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:outline-hidden resize-y"
            />
          </div>

          {/* Axis 3: Medium & Long-Term Goals */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
              Eixo 3: Metas de Médio e Longo Prazo (Autonomia e Reabilitação Psicossocial)
            </label>
            <textarea
              value={mediumLongTermGoals}
              onChange={(e) => setMediumLongTermGoals(e.target.value)}
              rows={2}
              placeholder="Ex: Retorno às atividades escolares/ocupacionais, inserção em oficinas terapêuticas, fortalecimento de laços comunitários..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:outline-hidden resize-y"
            />
          </div>

          {/* Axis 4: Agreed Actions & Responsibilities */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-purple-600" />
              Eixo 4: Divisão de Responsabilidades e Pactuação de Ações
            </label>
            <textarea
              value={agreedActions}
              onChange={(e) => setAgreedActions(e.target.value)}
              rows={3}
              placeholder="- Ações do Usuário e Família: ...&#10;- Ações da Equipe de Saúde: ...&#10;- Articulação Intersetorial (CRAS/Escola): ..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 focus:outline-hidden resize-y"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Instrumento oficial de pactuação e corresponsabilização no SUS
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              Salvar PTS
            </button>
            <button
              type="button"
              onClick={handleSaveAndPrint}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-purple-700/20"
            >
              <Printer className="w-4 h-4" />
              Salvar e Imprimir PTS A4
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
