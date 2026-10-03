import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWhisperTranscriptionOptions {
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: string) => void;
  groqApiKey?: string;
}

export function useWhisperTranscription({
  onTranscriptionComplete,
  onError,
  groqApiKey,
}: UseWhisperTranscriptionOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animRef = useRef<number | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const cleanup = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Resolve Groq API key from multiple sources
  const resolveGroqKey = useCallback((): string => {
    if (groqApiKey && groqApiKey.trim()) return groqApiKey.trim();
    try {
      const direct = localStorage.getItem('pec_groq_api_key');
      if (direct && direct.trim()) return direct.trim();
      const settings = localStorage.getItem('pec_system_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.groqApiKey && parsed.groqApiKey.trim()) return parsed.groqApiKey.trim();
      }
    } catch {}
    return '';
  }, [groqApiKey]);

  // ── Start Recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      setRecordingDuration(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Visual level meter via AudioContext + AnalyserNode
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        src.connect(analyser);
        analyserRef.current = analyser;

        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        const pump = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArr);
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
          setAudioLevel(Math.min(100, Math.round((sum / dataArr.length / 128) * 100)));
          animRef.current = requestAnimationFrame(pump);
        };
        pump();
      } catch (e) {
        console.warn('[useWhisperTranscription] Analyser init error (non-fatal):', e);
      }

      // MediaRecorder — use best supported MIME
      let mimeType = '';
      for (const mime of [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ]) {
        if (MediaRecorder.isTypeSupported(mime)) {
          mimeType = mime;
          break;
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Start continuous recording (single chunk on stop)
      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[useWhisperTranscription] Mic error:', err);
      setErrorMessage('Permissão do microfone negada ou dispositivo indisponível.');
      onError?.('Permissão do microfone negada ou dispositivo indisponível.');
      cleanup();
    }
  }, [cleanup, onError]);

  // ── Stop Recording & Send ─────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    // Set up the onstop handler BEFORE calling stop()
    recorder.onstop = async () => {
      const mime = recorder.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mime });

      cleanup();

      console.log(`[useWhisperTranscription] Audio blob: ${blob.size} bytes, mime: ${mime}`);

      if (blob.size < 1000) {
        setErrorMessage('Áudio muito curto. Fale por pelo menos 2 segundos.');
        onError?.('Áudio muito curto.');
        return;
      }

      const key = resolveGroqKey();
      console.log(`[useWhisperTranscription] Groq key present: ${!!key}, length: ${key.length}`);

      try {
        setIsProcessing(true);

        // Build multipart/form-data with the raw audio blob
        const formData = new FormData();
        const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
        formData.append('audio', blob, `recording.${ext}`);
        if (key) formData.append('groqApiKey', key);

        let data: any = null;
        let responseOk = false;

        try {
          const response = await fetch('/api/audio/transcribe', {
            method: 'POST',
            body: formData, // NO Content-Type header — browser sets multipart boundary
            headers: key ? { 'x-groq-api-key': key } : undefined,
          });

          responseOk = response.ok;
          const rawText = await response.text();
          try {
            data = JSON.parse(rawText);
          } catch {
            console.warn('[useWhisperTranscription] Non-JSON response from server on multipart:', rawText.slice(0, 100));
          }
        } catch (fetchErr) {
          console.warn('[useWhisperTranscription] Multipart fetch error:', fetchErr);
        }

        // If multipart upload succeeded with valid text, use it
        if (data && data.success && data.text) {
          const text = String(data.text || '').trim();
          if (text && text !== '.') {
            onTranscriptionComplete?.(text);
            return;
          }
        }

        // ── Fallback: Base64 JSON Payload if multipart was unparseable or rejected ──
        console.log('[useWhisperTranscription] Executando envio resiliente via Base64 JSON...');
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            const b64 = res.includes(',') ? res.split(',')[1] : res;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const jsonResponse = await fetch('/api/audio/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(key ? { 'x-groq-api-key': key } : {}),
          },
          body: JSON.stringify({
            audioData: {
              data: base64Audio,
              mimeType: mime,
            },
            groqApiKey: key || undefined,
          }),
        });

        const jsonRaw = await jsonResponse.text();
        let jsonData: any = null;
        try {
          jsonData = JSON.parse(jsonRaw);
        } catch {
          throw new Error(`Falha na resposta do servidor (${jsonResponse.status}).`);
        }

        if (!jsonResponse.ok || !jsonData?.success) {
          throw new Error(jsonData?.error || 'Erro ao processar transcrição de voz.');
        }

        const finalText = String(jsonData.text || '').trim();
        if (finalText && finalText !== '.') {
          onTranscriptionComplete?.(finalText);
        } else {
          setErrorMessage('Nenhuma fala audível foi detectada no áudio.');
          onError?.('Nenhuma fala audível foi detectada no áudio.');
        }
      } catch (err: any) {
        console.error('[useWhisperTranscription] Transcription error:', err);
        setErrorMessage(err.message || 'Falha na transcrição.');
        onError?.(err.message || 'Falha na transcrição.');
      } finally {
        setIsProcessing(false);
      }
    };

    setIsRecording(false);
    recorder.stop();
  }, [cleanup, resolveGroqKey, onTranscriptionComplete, onError]);

  // ── Cancel Recording ──────────────────────────────────────────────────────
  const cancelRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsProcessing(false);
    setRecordingDuration(0);
    setErrorMessage(null);
  }, [cleanup]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    isProcessing,
    recordingDuration,
    formattedDuration: formatDuration(recordingDuration),
    audioLevel,
    errorMessage,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
