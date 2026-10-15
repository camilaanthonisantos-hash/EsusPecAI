import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Volume2,
  Stethoscope,
  XCircle,
  UserX,
  Play,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ReceptionQueueItem } from '../types';
import { PROFESSIONS } from '../data/professions';
import { SpecularButton } from './SpecularButton';

export interface CallPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueItem: ReceptionQueueItem | null;
  onStartConsultation?: (item: ReceptionQueueItem) => void;
  onMarkAbandonment?: (item: ReceptionQueueItem) => void;
  onCancelQueue?: (item: ReceptionQueueItem) => void;
}

export const CallPatientModal: React.FC<CallPatientModalProps> = ({
  isOpen,
  onClose,
  queueItem,
  onStartConsultation,
  onMarkAbandonment,
  onCancelQueue,
}) => {
  useEffect(() => {
    if (!isOpen || !queueItem) return;

    // Pleasant hospital call chime: 587Hz (D5) -> 880Hz (A5)
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.3);
        gain2.gain.setValueAtTime(0.25, now + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.3);
        osc2.stop(now + 1.2);
      }
    } catch {
      // Audio context may be restricted before user interaction
    }

    // Voice announcement (Text-to-Speech)
    try {
      if ('speechSynthesis' in window && queueItem.patientName) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(
          `Atenção: ${queueItem.patientName}, favor dirigir-se ao consultório de ${queueItem.professionalName}.`
        );
        utterance.lang = 'pt-BR';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore if speech synthesis unavailable
    }
  }, [isOpen, queueItem]);

  if (!isOpen || !queueItem) return null;

  const profConfig = PROFESSIONS[queueItem.professionalProfession];

  return (
    <div
      id="call-patient-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-2xl overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Green Header Banner */}
        <div className="relative p-6 bg-gradient-to-b from-emerald-500/20 via-teal-500/10 to-transparent flex flex-col items-center">
          {/* Pulsing Green Call Icon */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 mb-4 animate-bounce">
            <div className="absolute inset-0 rounded-3xl bg-emerald-400 animate-ping opacity-30" />
            <Volume2 className="w-10 h-10 relative z-10" />
          </div>

          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700/60 mb-2">
            Chamando para Atendimento
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {queueItem.patientName}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            <span>{queueItem.formattedDateTime ? queueItem.formattedDateTime.replace(/\s*\+\s*/g, ' ') : ''}</span>
          </p>
        </div>

        {/* Directed Professional Badge */}
        <div className="px-6 py-4 mx-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Consultório / Profissional
            </p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {queueItem.professionalName}
            </p>
            <p className="text-xs text-teal-700 dark:text-teal-300">
              {profConfig?.name || queueItem.professionalProfession}
            </p>
          </div>
        </div>

        {/* Modal Action Buttons: Atender, Desistência, Cancelar, Fechar */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. ATENDER (Primary Highlight) */}
          <SpecularButton
            type="button"
            id="call-modal-btn-atender"
            onClick={() => {
              onStartConsultation?.(queueItem);
              onClose();
            }}
            size="lg"
            radius={16}
            className="sm:col-span-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold shadow-lg shadow-emerald-600/30 text-sm flex items-center justify-center gap-2 border-emerald-400/40"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Iniciar Atendimento Agora</span>
          </SpecularButton>

          {/* 2. DESISTÊNCIA */}
          <SpecularButton
            type="button"
            id="call-modal-btn-desistencia"
            onClick={() => {
              onMarkAbandonment?.(queueItem);
              onClose();
            }}
            size="md"
            radius={14}
            className="py-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center justify-center gap-2"
          >
            <UserX className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Registrar Desistência</span>
          </SpecularButton>

          {/* 3. CANCELAR */}
          <SpecularButton
            type="button"
            id="call-modal-btn-cancelar"
            onClick={() => {
              onCancelQueue?.(queueItem);
              onClose();
            }}
            size="md"
            radius={14}
            className="py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Cancelar Chamado</span>
          </SpecularButton>

          {/* 4. FECHAR (dismiss modal while keeping calling alert alive) */}
          <button
            type="button"
            id="call-modal-btn-fechar"
            onClick={onClose}
            className="sm:col-span-2 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Fechar Janela (Continuar Chamando na Sala de Espera)
          </button>
        </div>
      </motion.div>
    </div>
  );
};
