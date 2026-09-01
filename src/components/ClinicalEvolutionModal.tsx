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
  Printer,
  RefreshCw,
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
  onRegenerate: () => void;
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

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: EvolutionStatus) => {
    switch (status) {
      case 'positiva':
        return {
          bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500',
          label: 'Evolução Positiva / Melhora',
        };
      case 'negativa':
        return {
          bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
          dot: 'bg-rose-500',
          label: 'Alerta / Piora ou Regressão',
        };
      case 'mista':
        return {
          bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500',
          label: 'Evolução Mista / Flutuante',
        };
      default:
        return {
          bg: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-500',
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
                      Gemini 2.5 Flash
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Auditoria Multiprofissional Integrada (APS / RAPS / eMulti)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="refresh-evolution-btn"
                  onClick={onRegenerate}
                  disabled={isLoading}
                  title="Recalcular Análise"
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  id="print-evolution-btn"
                  onClick={handlePrint}
                  title="Imprimir / Exportar"
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Printer className="w-4 h-4" />
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
                  {patient.cns && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      CNS: {patient.cns}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Idade Cronológica:{' '}
                    <strong className="text-teal-700 dark:text-teal-300 font-semibold">
                      {chronologicalAge.formatted}
                    </strong>
                  </span>
                  {patient.legalGuardianName && (
                    <span>
                      Responsável:{' '}
                      <strong className="text-slate-700 dark:text-slate-200 font-medium">
                        {patient.legalGuardianName} ({patient.guardianKinship || 'Responsável'})
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {evolution && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200 font-semibold flex items-center gap-1.5 border border-teal-200 dark:border-teal-800">
                    <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{evolution.totalConsultationsAnalyzed} Atendimentos</span>
                    <span className="text-[11px] opacity-75">
                      ({evolution.dateRange.start} até {evolution.dateRange.end})
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Content or Loading */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-teal-500/20 border-t-teal-600 animate-spin" />
                  <Sparkles className="w-6 h-6 text-teal-600 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Processando auditoria clínica longitudinal com Gemini 2.5 Flash...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    Correlacionando queixas, sinais vitais, intervenções multiprofissionais e fatores de risco psicossociais.
                  </p>
                </div>
              </div>
            ) : evolution ? (
              <div className="space-y-6 overflow-y-auto pr-1">
                {/* 1. RESUMO LONGITUDINAL */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>1. Resumo Longitudinal das Intervenções Multiprofissionais</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                    {evolution.resumoLongitudinal}
                  </div>
                </div>

                {/* 2. MATRIZ DE EVOLUÇÃO (3 CARDS VISUAIS) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>2. Matriz de Evolução Clínica & Psicossocial</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Psicoemocional */}
                    {(() => {
                      const badge = getStatusBadge(
                        evolution.matrizEvolucao.aspectosPsicoemocionais.status
                      );
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
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
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
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
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
                              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
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

                {/* 3. PONTOS DE ALERTA E RECOMENDAÇÕES PARA A EQUIPE (PTS) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>3. Pontos de Alerta & Recomendações para a Equipe (PTS)</span>
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
                Nenhum dado de evolução gerado ainda.
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
