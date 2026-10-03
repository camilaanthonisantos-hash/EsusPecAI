import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  UserPlus,
  Stethoscope,
  Calendar,
  Clock,
  X,
  ArrowRight,
  Sparkles,
  FileCheck,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Patient, User, ProfessionId } from '../types';
import { PROFESSIONS } from '../data/professions';
import { formatQueueDateTime } from '../utils/dateCalculator';
import { SpecularButton } from './SpecularButton';
import { BrazilianDatePicker } from './BrazilianDatePicker';

interface CompleteConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  currentProfessional: User | null;
  professionals: User[];
  onFinalizeOnly: () => void;
  onFinalizeAndAddToQueue: (targetProfessional: User, scheduledDate: string, scheduledTime: string, conductText: string) => void;
}

export const CompleteConsultationModal: React.FC<CompleteConsultationModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentProfessional,
  professionals,
  onFinalizeOnly,
  onFinalizeAndAddToQueue,
}) => {
  // Step: 'choose_mode' | 'configure_queue'
  const [step, setStep] = useState<'choose_mode' | 'configure_queue'>('choose_mode');

  // Filter destination professionals (exclude current professional and administrative)
  const availableProfessionals = useMemo(() => {
    return professionals.filter(
      (p) => p.profession !== 'administrativo' && p.id !== currentProfessional?.id
    );
  }, [professionals, currentProfessional]);

  const [selectedProfId, setSelectedProfId] = useState<string>(() => {
    return availableProfessionals[0]?.id || '';
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nearestTimeStr = useMemo(() => {
    const d = new Date();
    const minutes = d.getMinutes();
    const roundedMinutes = minutes < 30 ? '30' : '00';
    const hours = minutes < 30 ? d.getHours() : (d.getHours() + 1) % 24;
    return `${String(hours).padStart(2, '0')}:${roundedMinutes}`;
  }, []);

  const [scheduledDate, setScheduledDate] = useState<string>(todayStr);
  const [scheduledTime, setScheduledTime] = useState<string>(nearestTimeStr);

  if (!isOpen || !patient) return null;

  const targetProf = professionals.find((p) => p.id === selectedProfId) || availableProfessionals[0];
  const targetProfConfig = targetProf ? PROFESSIONS[targetProf.profession] : null;

  // Conduct format as requested:
  // "Paciente encaminhado para Atendimento e Avaliação do(a) [Nome do Profissional] às [Hora]."
  const generatedConduct = targetProf
    ? `Paciente encaminhado para Atendimento e Avaliação do(a) ${targetProf.name} (${targetProfConfig?.name || targetProf.profession}) às ${scheduledTime}.`
    : '';

  const handleConfirmAddToQueue = () => {
    if (!targetProf) return;
    onFinalizeAndAddToQueue(targetProf, scheduledDate, scheduledTime, generatedConduct);
    onClose();
  };

  return (
    <div
      id="complete-consultation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                Concluir Atendimento Clínico
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paciente: <strong>{patient.fullName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {step === 'choose_mode' ? (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Escolha como deseja concluir este atendimento no Prontuário Eletrônico do Cidadão (PEC):
              </p>

              {/* Option 1: Finalize Only */}
              <button
                type="button"
                id="btn-finalize-only"
                onClick={() => {
                  onFinalizeOnly();
                  onClose();
                }}
                className="w-full p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 bg-white dark:bg-slate-850 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 text-left transition-all group flex items-start gap-4 shadow-xs"
              >
                <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 group-hover:scale-105 transition-transform shrink-0">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                    1. Finalizar e Gravar na Linha do Tempo
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Conclui o atendimento atual e salva o registro clínico completo permanentemente no prontuário do paciente.
                  </p>
                </div>
              </button>

              {/* Option 2: Finalize and Add to Queue */}
              <button
                type="button"
                id="btn-finalize-and-queue"
                onClick={() => setStep('configure_queue')}
                className="w-full p-5 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 bg-gradient-to-r from-emerald-50/60 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/30 text-left transition-all group flex items-start gap-4 shadow-sm"
              >
                <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                      2. Finalizar, Gravar e Adicionar à Fila
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Grava este atendimento na linha do tempo e insere automaticamente o encaminhamento na fila de outro profissional (médico, psicólogo, nutricionista, etc.).
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* Step 2: Configure Queue Destination */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  Ao confirmar, o sistema registrará automaticamente a conduta de encaminhamento no prontuário atual e adicionará o paciente à fila do profissional indicado.
                </div>
              </div>

              {/* Destination Professional */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Profissional para Encaminhamento *</span>
                </label>
                <select
                  id="select-complete-destination-prof"
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs"
                >
                  {availableProfessionals.map((prof) => {
                    const pConfig = PROFESSIONS[prof.profession];
                    return (
                      <option key={prof.id} value={prof.id}>
                        {prof.name} — {pConfig?.name || prof.profession} ({prof.workplace})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Data na Fila</span>
                  </label>
                  <BrazilianDatePicker
                    value={scheduledDate}
                    onChange={(newDate) => setScheduledDate(newDate)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Horário na Fila</span>
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Automatic Conduct Preview */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Conduta Gerada Automaticamente:
                </label>
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-teal-800 dark:text-teal-300 italic">
                  "{generatedConduct}"
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          {step === 'configure_queue' ? (
            <button
              type="button"
              onClick={() => setStep('choose_mode')}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Cancelar
            </button>
          )}

          {step === 'configure_queue' && (
            <SpecularButton
              type="button"
              id="btn-confirm-finalize-and-queue"
              onClick={handleConfirmAddToQueue}
              size="sm"
              radius={12}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Gravar e Adicionar à Fila</span>
            </SpecularButton>
          )}
        </div>
      </motion.div>
    </div>
  );
};
