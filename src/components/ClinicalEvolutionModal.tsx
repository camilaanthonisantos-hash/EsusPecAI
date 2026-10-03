import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Calendar,
  User,
  Activity,
  HeartPulse,
  Brain,
  Users,
  AlertTriangle,
  FileText,
  Clock,
  RefreshCw,
  Pill,
  TrendingUp,
  TrendingDown,
  Minus,
  FileCheck2,
  CalendarX,
  Stethoscope,
  Send,
  FlaskConical,
  ClipboardList,
} from 'lucide-react';
import { EvolutionSummary, Patient, EvolutionStatus } from '../types';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { copyToClipboard } from '../services/gemini';

interface ClinicalEvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  evolution: EvolutionSummary | null;
  patient: Patient;
  isLoading: boolean;
  onRegenerate: (forceFull?: boolean) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const ClinicalEvolutionModal: React.FC<ClinicalEvolutionModalProps> = ({
  isOpen,
  onClose,
  evolution,
  patient,
  isLoading,
  onRegenerate,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);

  const chronologicalAge = calculateChronologicalAge(patient.birthDate);

  const handleCopyFull = async () => {
    if (!evolution) return;
    const ok = await copyToClipboard(evolution.rawMarkdown);
    if (ok) {
      setCopied(true);
      onShowToast('success', 'Relatório de Evolução Clínica copiado para a área de transferência!', 'Copiado');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status: EvolutionStatus) => {
    switch (status) {
      case 'positiva':
        return {
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500',
          icon: TrendingUp,
          label: 'Evolução Positiva / Melhora',
        };
      case 'negativa':
        return {
          bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
          icon: TrendingDown,
          label: 'Alerta / Piora ou Regressão',
        };
      case 'mista':
        return {
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500',
          icon: Activity,
          label: 'Evolução Mista / Flutuante',
        };
      default:
        return {
          bg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-500',
          icon: Minus,
          label: 'Quadro Estável / Em Manejo',
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="clinical-evolution-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            id="clinical-evolution-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[92vh] overflow-y-auto relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white shadow-lg shadow-teal-600/20">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Análise de Evolução Clínica Longitudinal
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[11px] font-bold border border-teal-500/20">
                      {evolution?.modelUsed || 'Cascade IA Multi-Modelo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Auditoria Multiprofissional Integrada (APS / RAPS / eMulti / e-SUS PEC)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="refresh-evolution-btn"
                  onClick={() => onRegenerate(false)}
                  disabled={isLoading}
                  title="Atualizar análise olhando exclusivamente para os atendimentos pendentes (Economia de IA)"
                  className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
                  <span className="hidden sm:inline">Atualizar (Econômico)</span>
                </button>
                <button
                  type="button"
                  id="reanalyze-full-evolution-btn"
                  onClick={() => onRegenerate(true)}
                  disabled={isLoading}
                  title="Reanalisar todo o histórico do prontuário do zero"
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-1 text-xs font-medium"
                >
                  <span className="hidden md:inline">Reanálise Completa</span>
                </button>
                <button
                  type="button"
                  id="close-evolution-modal-btn"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Patient Header Banner */}
            <div className="mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    {patient.fullName}
                  </span>
                  {evolution?.isIncrementalUpdate && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 flex items-center gap-1">
                      ⚡ Análise Incremental ({evolution.pendingConsultationsAnalyzed || 1} pendente(s) integrado(s))
                    </span>
                  )}
                  {evolution?.alreadyUpToDate && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-500/20">
                      ✅ Prontuário em dia
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Idade: <strong className="text-slate-700 dark:text-slate-300">{chronologicalAge.formatted}</strong>
                  </span>
                  <span>
                    CNS: <strong className="text-slate-700 dark:text-slate-300">{patient.cns || '--'}</strong>
                  </span>
                  {patient.legalGuardianName && (
                    <span>
                      Responsável: <strong className="text-slate-700 dark:text-slate-300">{patient.legalGuardianName}</strong>
                    </span>
                  )}
                </div>
              </div>

              {evolution && (
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {evolution.totalConsultationsAnalyzed}{' '}
                      {evolution.totalConsultationsAnalyzed === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {evolution.dateRange.start} até {evolution.dateRange.end}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Content Body */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-4 border-teal-500/20 border-t-teal-600 animate-spin" />
                  <Sparkles className="w-6 h-6 text-teal-600 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Auditando histórico longitudinal com IA...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cascata de modelos em execução (GPT-4o ➔ Gemini Flash com fallback resiliente).
                  </p>
                </div>
              </div>
            ) : evolution ? (
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* 1. RESUMO LONGITUDINAL */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>1. Resumo Longitudinal Geral (Norteador Clínico)</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                    {evolution.resumoLongitudinal}
                  </div>
                </div>

                {/* 2. CONDIÇÕES DE SAÚDE PSICOLÓGICAS E NÃO PSICOLÓGICAS */}
                {evolution.condicoesSaude && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      <Stethoscope className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>2. Condições de Saúde Clínicas & Psicológicas</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Condições Psicológicas & Saúde Mental
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {evolution.condicoesSaude.psicologicas || 'Sem queixas psicológicas ativas registradas.'}
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                        <div className="flex items-center gap-2">
                          <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Condições Físicas & Doenças Crônicas
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {evolution.condicoesSaude.naoPsicologicas || 'Sem condições físicas agudas ou descompensadas.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. FARMACOTERAPIA & MUDANÇAS NO TRATAMENTO */}
                {evolution.farmacoterapia && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>3. Farmacoterapia, Uso Contínuo & Mudanças de Tratamento</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1.5">
                            Medicamentos em Uso Contínuo
                          </h5>
                          {evolution.farmacoterapia.emUsoContinuo.length > 0 ? (
                            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                              {evolution.farmacoterapia.emUsoContinuo.map((med, idx) => (
                                <li key={idx}>{med}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Nenhum fármaco contínuo identificado no histórico.</p>
                          )}
                        </div>

                        <div>
                          <h5 className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-1.5">
                            Mudanças / Desmame / Ajustes no Tratamento
                          </h5>
                          {evolution.farmacoterapia.mudancasTratamento.length > 0 ? (
                            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                              {evolution.farmacoterapia.mudancasTratamento.map((mud, idx) => (
                                <li key={idx}>{mud}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Tratamento estável mantido sem alterações recentes.</p>
                          )}
                        </div>
                      </div>

                      {evolution.farmacoterapia.adesaoRelatada && (
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs text-slate-700 dark:text-slate-300">
                          <strong className="text-emerald-900 dark:text-emerald-200">Adesão Terapêutica: </strong>
                          {evolution.farmacoterapia.adesaoRelatada}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. MATRIZ DE EVOLUÇÃO (3 CARDS VISUAIS) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>4. Matriz de Trajetória Clínica (Melhora / Piora / Estabilidade)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Psicoemocional */}
                    {(() => {
                      const badge = getStatusBadge(
                        evolution.matrizEvolucao.aspectosPsicoemocionais.status
                      );
                      const Icon = badge.icon;
                      return (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Psicoemocional & Comportamental
                              </h4>
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{badge.label}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                              {evolution.matrizEvolucao.aspectosPsicoemocionais.descricao}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Físico e Sinais */}
                    {(() => {
                      const badge = getStatusBadge(
                        evolution.matrizEvolucao.aspectosFisicosSinais.status
                      );
                      const Icon = badge.icon;
                      return (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <HeartPulse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Físico & Sinais Vitais
                              </h4>
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{badge.label}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                              {evolution.matrizEvolucao.aspectosFisicosSinais.descricao}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Dinâmica Familiar & Social */}
                    {(() => {
                      const badge = getStatusBadge(
                        evolution.matrizEvolucao.dinamicaFamiliarSocial.status
                      );
                      const Icon = badge.icon;
                      return (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Dinâmica Familiar & Social
                              </h4>
                            </div>
                            <div
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{badge.label}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                              {evolution.matrizEvolucao.dinamicaFamiliarSocial.descricao}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 5. CONDUTAS DO PROFISSIONAL (PRESCRIÇÕES, EXAMES, ENCAMINHAMENTOS, LAUDOS, ATESTADOS) */}
                {evolution.condutasRealizadas && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      <FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>5. Condutas dos Profissionais (Exames, Encaminhamentos, Prescrições, Laudos e Atestados)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Prescrições */}
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400">
                          <Pill className="w-3.5 h-3.5" />
                          <span>Prescrições / Receitas</span>
                        </div>
                        {evolution.condutasRealizadas.prescricoes.length > 0 ? (
                          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                            {evolution.condutasRealizadas.prescricoes.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Nenhuma prescrição no histórico.</p>
                        )}
                      </div>

                      {/* Exames */}
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                          <FlaskConical className="w-3.5 h-3.5" />
                          <span>Solicitações de Exames</span>
                        </div>
                        {evolution.condutasRealizadas.examesSolicitados.length > 0 ? (
                          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                            {evolution.condutasRealizadas.examesSolicitados.map((e, i) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Sem solicitações de exames.</p>
                        )}
                      </div>

                      {/* Encaminhamentos */}
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          <Send className="w-3.5 h-3.5" />
                          <span>Encaminhamentos / Regulação</span>
                        </div>
                        {evolution.condutasRealizadas.encaminhamentos.length > 0 ? (
                          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                            {evolution.condutasRealizadas.encaminhamentos.map((enc, i) => (
                              <li key={i}>{enc}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Sem encaminhamentos registrados.</p>
                        )}
                      </div>

                      {/* Laudos Médicos */}
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>Laudos Médicos Oficiais</span>
                        </div>
                        {evolution.condutasRealizadas.laudosMedicos.length > 0 ? (
                          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                            {evolution.condutasRealizadas.laudosMedicos.map((l, i) => (
                              <li key={i}>{l}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Nenhum laudo emitido.</p>
                        )}
                      </div>

                      {/* Atestados */}
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Atestados de Saúde / Comparecimento</span>
                        </div>
                        {evolution.condutasRealizadas.atestados.length > 0 ? (
                          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                            {evolution.condutasRealizadas.atestados.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Sem atestados emitidos.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. NÃO COMPARECIMENTO & ABANDONO DA FILA */}
                {evolution.faltasEAbandonos && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      <CalendarX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>6. Auditoria de Assiduidade (Faltas, Cancelamentos & Abandonos na Fila)</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 space-y-2">
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <span className="font-bold text-rose-800 dark:text-rose-300">
                          Total de Faltas/Cancelamentos:{' '}
                          <strong className="text-rose-950 dark:text-rose-200">{evolution.faltasEAbandonos.totalFaltasOuCancelamentos}</strong>
                        </span>
                        <span className="font-bold text-amber-800 dark:text-amber-300">
                          Abandonos/Desistências na Fila:{' '}
                          <strong className="text-amber-950 dark:text-amber-200">{evolution.faltasEAbandonos.totalAbandonos}</strong>
                        </span>
                      </div>

                      {evolution.faltasEAbandonos.detalhes.length > 0 ? (
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside pt-1">
                          {evolution.faltasEAbandonos.detalhes.map((det, i) => (
                            <li key={i}>{det}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          Excelente assiduidade: Sem registros de abandono ou faltas injustificadas na fila.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. PONTOS DE ALERTA E RECOMENDAÇÕES PARA A EQUIPE (PTS) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>7. Pontos de Alerta & Recomendações para a Equipe Multiprofissional (PTS)</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                    {evolution.pontosAlertaRecomendacoes.map((ponto, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200">
                        <span className="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{ponto}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Nenhum dado de evolução gerado ainda. Clique em "Recalcular" para gerar a primeira análise.
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Documento de Apoio à Decisão Clínica • Sistema Único de Saúde (SUS)
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  id="copy-full-evolution-btn"
                  onClick={handleCopyFull}
                  disabled={!evolution || isLoading}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Relatório Copiado!' : 'Copiar Relatório Completo'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
