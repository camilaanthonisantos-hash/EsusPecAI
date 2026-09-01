import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Play, Pause, Trash2, Volume2, AlertCircle, RefreshCw } from 'lucide-react';
import { AttachmentItem } from '../types';

interface AudioRecorderProps {
  onAudioReady: (attachment: AttachmentItem | null) => void;
  currentAudio: AttachmentItem | null;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioReady,
  currentAudio,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Format seconds to mm:ss
  const formatTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Start Audio Recording with Web Audio API Waveform Visualizer
  const startRecording = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Audio Context for real-time waveform visualizer
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      // Media Recorder setup
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const detectedMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: detectedMimeType });
        const previewUrl = URL.createObjectURL(audioBlob);

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1] || '';
          const audioAttachment: AttachmentItem = {
            id: `audio-${Date.now()}`,
            name: `Relato-Voz-Consulta-${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.webm`,
            size: audioBlob.size,
            type: detectedMimeType,
            base64: base64Data,
            previewUrl,
            category: 'audio',
          };
          onAudioReady(audioAttachment);
        };

        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start(250); // Emit chunk every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Duration counter
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Draw real-time animated waveform
      drawLiveWaveform();
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      setPermissionError(
        'Não foi possível acessar o microfone. Verifique as permissões do navegador ou utilize a digitação de texto.'
      );
      setIsRecording(false);
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
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#0d9488');
        gradient.addColorStop(1, '#14b8a6');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // Discard Audio
  const handleDiscardAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setPlaybackTime(0);
    onAudioReady(null);
  };

  // Toggle Audio Playback
  const togglePlayAudio = () => {
    if (!audioPlayerRef.current || !currentAudio?.previewUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Cleanups
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div
      id="audio-recorder-container"
      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/40">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Gravação de Relato Clínico por Voz
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fale livremente os achados da consulta ou visita domiciliar
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Gravando ({formatTime(recordingDuration)})
          </div>
        )}
      </div>

      {permissionError && (
        <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{permissionError}</p>
          </div>
        </div>
      )}

      {/* Recording State */}
      {isRecording ? (
        <div className="space-y-3">
          <div className="h-16 w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-800 relative">
            <canvas
              ref={canvasRef}
              width={360}
              height={60}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 right-3 text-[11px] text-teal-400 font-mono">
              {formatTime(recordingDuration)}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              id="stop-recording-btn"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-md shadow-rose-600/20 transition-transform active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              Finalizar e Anexar Áudio
            </button>
          </div>
        </div>
      ) : currentAudio ? (
        /* Audio Preview State */
        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <audio
            ref={audioPlayerRef}
            src={currentAudio.previewUrl}
            onTimeUpdate={() => {
              if (audioPlayerRef.current) {
                setPlaybackTime(audioPlayerRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (audioPlayerRef.current) {
                setTotalDuration(audioPlayerRef.current.duration || 0);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setPlaybackTime(0);
            }}
          />

          <div className="flex items-center justify-between gap-3">
            <button
              id="play-audio-preview-btn"
              onClick={togglePlayAudio}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-transform active:scale-95 cursor-pointer"
              aria-label={isPlaying ? 'Pausar áudio' : 'Ouvir gravação'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span className="truncate max-w-[180px] font-semibold text-slate-800 dark:text-slate-200">
                  {currentAudio.name}
                </span>
                <span className="font-mono text-[11px]">
                  {formatTime(playbackTime)} / {formatTime(totalDuration || recordingDuration)}
                </span>
              </div>

              {/* Scrubber bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-500 h-full transition-all duration-100"
                  style={{
                    width: `${totalDuration ? (playbackTime / totalDuration) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="rerecord-audio-btn"
                onClick={() => {
                  handleDiscardAudio();
                  startRecording();
                }}
                disabled={disabled}
                title="Regravar áudio"
                className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                id="discard-audio-btn"
                onClick={handleDiscardAudio}
                disabled={disabled}
                title="Excluir áudio"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Áudio pronto para transcrição e análise clínica pelo Gemini
          </div>
        </div>
      ) : (
        /* Ready to Record State */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block">
              Grave relatos em áudio de até 10 minutos
            </span>
            O modelo Gemini transcreverá e converterá em prontuário formal.
          </div>

          <button
            id="start-recording-btn"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
          >
            <Mic className="w-4 h-4" />
            Iniciar Gravação
          </button>
        </div>
      )}
    </div>
  );
};
