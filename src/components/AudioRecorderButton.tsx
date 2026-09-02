import React from 'react';
import { Mic, Square, Loader2, X, Zap, AlertCircle, Activity } from 'lucide-react';
import { useWhisperTranscription } from '../hooks/useWhisperTranscription';
import { SpecularButton } from './SpecularButton';

interface AudioRecorderButtonProps {
  onTranscriptionComplete: (text: string) => void;
  groqApiKey?: string;
  disabled?: boolean;
}

export const AudioRecorderButton: React.FC<AudioRecorderButtonProps> = ({
  onTranscriptionComplete,
  groqApiKey,
  disabled = false,
}) => {
  const {
    isRecording,
    isProcessing,
    formattedDuration,
    audioLevel,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useWhisperTranscription({
    onTranscriptionComplete,
    groqApiKey,
  });

  return (
    <div className="w-full space-y-2">
      {/* Error notification if any */}
      {errorMessage && !isProcessing && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Information */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              isRecording
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 ring-4 ring-rose-500/10'
                : isProcessing
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
            }`}
          >
            {isRecording ? (
              <Mic className="w-4 h-4 animate-bounce" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Ditado Clínico com Groq Whisper
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                whisper-large-v3 (Ultra Rápido)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isRecording
                ? 'Microfone ativo! Fale com clareza os detalhes do atendimento.'
                : isProcessing
                ? 'Enviando e transcrevendo áudio com IA...'
                : 'Grave o relato do paciente. O texto será anexado sem apagar o que já foi digitado.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* RECORDING STATE */}
          {isRecording && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Live Audio Visualizer */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40">
                <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse mr-1" />
                {[0.4, 0.7, 1, 0.6, 0.8, 0.5].map((factor, idx) => {
                  const barHeight = Math.max(4, Math.min(20, Math.round((audioLevel * factor) / 4) + 4));
                  return (
                    <div
                      key={idx}
                      className="w-1 rounded-full bg-rose-500 transition-all duration-75"
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>

              {/* Timer */}
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
                {formattedDuration}
              </div>

              {/* Cancel Button */}
              <SpecularButton
                type="button"
                onClick={cancelRecording}
                size="icon"
                radius={12}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 border-transparent"
                title="Descartar gravação"
              >
                <X className="w-4 h-4" />
              </SpecularButton>

              {/* Stop & Transcribe Button */}
              <SpecularButton
                type="button"
                id="stop-audio-recording-btn"
                onClick={stopRecording}
                size="sm"
                radius={12}
                className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 border-rose-500/40"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Finalizar e Transcrever</span>
              </SpecularButton>
            </div>
          )}

          {/* PROCESSING STATE */}
          {isProcessing && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Transcrevendo via Groq Whisper...</span>
            </div>
          )}

          {/* IDLE / START BUTTON */}
          {!isRecording && !isProcessing && (
            <SpecularButton
              type="button"
              id="start-audio-recording-btn"
              onClick={startRecording}
              disabled={disabled}
              size="sm"
              radius={12}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 border-emerald-500/40"
            >
              <Mic className="w-4 h-4" />
              <span>Iniciar Gravação de Voz</span>
            </SpecularButton>
          )}
        </div>
      </div>
    </div>
  );
};

