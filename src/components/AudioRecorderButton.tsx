import React from 'react';
import { Mic, Square, Loader2, X, AlertCircle, Activity } from 'lucide-react';
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
    <div className="w-full flex items-center justify-center">
      {/* Error notification if any */}
      {errorMessage && !isProcessing && (
        <div className="mb-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. RECORDING ACTIVE STATE */}
      {isRecording && (
        <div className="w-full max-w-md p-3 rounded-2xl bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 shadow-md flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2.5">
            {/* Live Audio Visualizer */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800/40">
              <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse mr-1" />
              {[0.4, 0.7, 1, 0.6, 0.8, 0.5].map((factor, idx) => {
                const barHeight = Math.max(4, Math.min(18, Math.round((audioLevel * factor) / 4) + 4));
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
              {formattedDuration}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Cancel Button */}
            <SpecularButton
              type="button"
              onClick={cancelRecording}
              size="icon"
              radius={12}
              className="bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
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
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 border-rose-500/40"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Finalizar</span>
            </SpecularButton>
          </div>
        </div>
      )}

      {/* 2. PROCESSING STATE */}
      {isProcessing && (
        <div className="p-3 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2 shadow-xs animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>Transcrevendo áudio com Groq Whisper...</span>
        </div>
      )}

      {/* 3. IDLE STATE: ONLY MICROPHONE ICON WITHOUT TEXT */}
      {!isRecording && !isProcessing && (
        <button
          type="button"
          id="start-audio-recording-btn"
          onClick={startRecording}
          disabled={disabled}
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white shadow-md shadow-teal-600/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group border border-teal-400/30"
          title="Gravar Áudio / Ditado Clínico (Groq Whisper)"
          aria-label="Gravar Áudio com Microfone"
        >
          <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
};
