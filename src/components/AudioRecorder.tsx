import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, AlertCircle, RefreshCw, Loader2, CheckCircle2, Volume2 } from 'lucide-react';
import { AttachmentItem } from '../types';

interface AudioRecorderProps {
  onAudioReady: (attachment: AttachmentItem | null) => void;
  onTranscribed?: (text: string) => void;
  currentAudio: AttachmentItem | null;
  disabled?: boolean;
  userApiKey?: string;    // Gemini key
  openaiApiKey?: string;  // OpenAI key (for Whisper)
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioReady,
  onTranscribed,
  currentAudio,
  disabled = false,
  userApiKey,
  openaiApiKey,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionDone, setTranscriptionDone] = useState(false);
  const [transcriptionEngine, setTranscriptionEngine] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Transcribe via backend (Whisper → Gemini fallback) ────────────────────
  const transcribeAudio = async (base64Data: string, mimeType: string) => {
    setIsTranscribing(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: { data: base64Data, mimeType },
          userApiKey,
          openaiApiKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.transcription) {
        setTranscriptionDone(true);
        setTranscriptionEngine(data.engine || '');
        onTranscribed?.(data.transcription);
        onAudioReady(null);
      } else {
        setError(data.error || 'Falha na transcrição. Tente novamente.');
      }
    } catch (e: any) {
      setError('Erro de conexão ao transcrever o áudio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Start Recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    setError(null);
    setTranscriptionDone(false);
    setTranscriptionEngine('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Waveform visualizer
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      drawLiveWaveform();

      // MediaRecorder
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const detectedMime = (mediaRecorder.mimeType || 'audio/webm').split(';')[0].trim();
        const blob = new Blob(audioChunksRef.current, { type: detectedMime });
        const previewUrl = URL.createObjectURL(blob);

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1] || '';
          console.log(`[AudioRecorder] Blob size=${blob.size}B | mime="${detectedMime}" | base64 length=${base64.length}`);

          if (onTranscribed) {
            const att: AttachmentItem = {
              id: `audio-${Date.now()}`,
              name: `Relato-Voz-${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.webm`,
              size: blob.size, type: detectedMime, base64, previewUrl, category: 'audio',
            };
            onAudioReady(att);
            await transcribeAudio(base64, detectedMime);
          } else {
            const att: AttachmentItem = {
              id: `audio-${Date.now()}`,
              name: `Relato-Voz-${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.webm`,
              size: blob.size, type: detectedMime, base64, previewUrl, category: 'audio',
            };
            onAudioReady(att);
          }
        };

        stream.getTracks().forEach(t => t.stop());
        audioContextRef.current?.close().catch(() => {});
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err: any) {
      setError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const drawLiveWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const render = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
        const g = ctx.createLinearGradient(0, canvas.height, 0, 0);
        g.addColorStop(0, '#0d9488');
        g.addColorStop(1, '#14b8a6');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, [2, 2, 0, 0]);
        ctx.fill();
        x += barWidth + 1;
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleDiscard = () => {
    audioPlayerRef.current?.pause();
    setIsPlaying(false);
    setPlaybackTime(0);
    setTranscriptionDone(false);
    setError(null);
    onAudioReady(null);
  };

  const togglePlay = () => {
    if (!audioPlayerRef.current || !currentAudio?.previewUrl) return;
    if (isPlaying) { audioPlayerRef.current.pause(); setIsPlaying(false); }
    else { audioPlayerRef.current.play(); setIsPlaying(true); }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div id="audio-recorder-container" className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl border transition-colors ${
            isRecording
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-500 border-rose-200'
              : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/40'
          }`}>
            <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Gravação de Relato Clínico por Voz
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {onTranscribed
                ? `Transcrito automaticamente via ${openaiApiKey ? 'Whisper (OpenAI)' : 'Gemini'}`
                : 'Fale livremente os achados da consulta'}
            </p>
          </div>
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            {formatTime(recordingDuration)}
          </div>
        )}
      </div>

      {/* Error */}
      {error && !isTranscribing && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            {currentAudio && (
              <button
                type="button"
                onClick={() => transcribeAudio(currentAudio.base64, currentAudio.type)}
                className="mt-2 px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                Tentar novamente
              </button>
            )}
          </div>
        </div>
      )}

      {/* Transcribing spinner */}
      {isTranscribing && (
        <div className="mb-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              Transcrevendo com {openaiApiKey ? 'Whisper...' : 'Gemini...'}
            </p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
              {openaiApiKey ? 'Geralmente leva 1-3 segundos.' : 'Aguarde alguns instantes.'}
            </p>
          </div>
        </div>
      )}

      {/* Transcription success */}
      {transcriptionDone && !currentAudio && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <div>
            <p className="font-semibold">Transcrição concluída! {transcriptionEngine === 'whisper' ? '(Whisper)' : '(Gemini)'}</p>
            <p className="text-emerald-600 dark:text-emerald-400">Revise o texto na caixa acima e clique em Gerar Prontuário.</p>
          </div>
        </div>
      )}

      {/* RECORDING */}
      {isRecording && (
        <div className="space-y-3">
          <div className="h-14 w-full bg-slate-950 rounded-xl overflow-hidden flex items-center p-2 border border-slate-800 relative">
            <canvas ref={canvasRef} width={360} height={56} className="w-full h-full object-contain" />
            <div className="absolute top-2 right-3 text-[11px] text-teal-400 font-mono">{formatTime(recordingDuration)}</div>
          </div>
          <button
            id="stop-recording-btn"
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-md shadow-rose-600/20 transition-all active:scale-[0.99] cursor-pointer"
          >
            <Square className="w-4 h-4 fill-white" />
            {onTranscribed ? 'Finalizar e Transcrever' : 'Finalizar Gravação'}
          </button>
        </div>
      )}

      {/* AUDIO PREVIEW (after recording, before transcription) */}
      {!isRecording && currentAudio && !isTranscribing && (
        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <audio
            ref={audioPlayerRef}
            src={currentAudio.previewUrl}
            onTimeUpdate={() => audioPlayerRef.current && setPlaybackTime(audioPlayerRef.current.currentTime)}
            onLoadedMetadata={() => audioPlayerRef.current && setTotalDuration(audioPlayerRef.current.duration || 0)}
            onEnded={() => { setIsPlaying(false); setPlaybackTime(0); }}
          />
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-transform active:scale-95 cursor-pointer">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold truncate max-w-[160px] text-slate-800 dark:text-slate-200">{currentAudio.name}</span>
                <span className="font-mono text-[11px]">{formatTime(playbackTime)} / {formatTime(totalDuration || recordingDuration)}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full transition-all duration-100" style={{ width: `${totalDuration ? (playbackTime / totalDuration) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { handleDiscard(); startRecording(); }} disabled={disabled} title="Regravar"
                className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={handleDiscard} disabled={disabled} title="Excluir"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {onTranscribed && (
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              <Volume2 className="w-3 h-3" />
              Aguardando transcrição automática...
            </div>
          )}
        </div>
      )}

      {/* IDLE */}
      {!isRecording && !currentAudio && !isTranscribing && !transcriptionDone && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">Grave relatos em áudio</span>
            {onTranscribed
              ? `Transcrição automática via ${openaiApiKey ? 'Whisper (~1-3s)' : 'Gemini'} ao finalizar.`
              : 'O Gemini analisará o áudio junto com o prontuário.'}
          </div>
          <button
            id="start-recording-btn"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
          >
            <Mic className="w-4 h-4" />
            Iniciar Gravação
          </button>
        </div>
      )}
    </div>
  );
};
