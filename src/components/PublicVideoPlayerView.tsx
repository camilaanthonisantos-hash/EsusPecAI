import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Download,
  ShieldCheck,
  Calendar,
  User,
  Building2,
  ExternalLink,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeft,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface PublicVideoPlayerViewProps {
  onBackToHome?: () => void;
}

export const PublicVideoPlayerView: React.FC<PublicVideoPlayerViewProps> = ({ onBackToHome }) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('Exame em Vídeo');
  const [description, setDescription] = useState<string>(
    'Registro audiovisual anexo ao prontuário médico do paciente.'
  );
  const [patientName, setPatientName] = useState<string>('Cidadão Identificado');
  const [validUntil, setValidUntil] = useState<string>('Conforme legislação (Art. 6º Lei 13.787/2018)');
  const [dateFormatted, setDateFormatted] = useState<string>(() => new Date().toLocaleDateString('pt-BR'));
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Parse URL search parameters on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlParam =
        params.get('videoUrl') ||
        params.get('video') ||
        params.get('v') ||
        params.get('url') ||
        '';

      if (urlParam) {
        // Prevent huge base64 data URLs from freezing the browser
        if (!urlParam.startsWith('data:')) {
          setVideoUrl(urlParam);
        }
      }

      const titleParam = params.get('title') || params.get('t');
      if (titleParam) setTitle(titleParam);

      const descParam = params.get('desc') || params.get('description');
      if (descParam) setDescription(descParam);

      const patientParam = params.get('patient') || params.get('paciente');
      if (patientParam) setPatientName(patientParam);

      const validParam = params.get('validUntil') || params.get('validade');
      if (validParam) setValidUntil(validParam);

      const dateParam = params.get('date') || params.get('data');
      if (dateParam) setDateFormatted(dateParam);

      // Also extract itemId from path or query if present (e.g. /watch-video/item-123 or ?id=item-123)
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      const targetId = params.get('id') || (lastPart && lastPart !== 'watch-video' && lastPart !== 'video' ? lastPart : '');
      
      if (targetId) {
        fetch(`/api/exam-media/item/${targetId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data && data.item) {
              if (data.item.videoUrl && !urlParam) setVideoUrl(data.item.videoUrl);
              if (data.item.title && !titleParam) setTitle(data.item.title);
              if (data.item.description && !descParam) setDescription(data.item.description);
              if (data.report?.patientName && !patientParam) setPatientName(data.report.patientName);
              if (data.report?.validUntilFormatted && !validParam) setValidUntil(data.report.validUntilFormatted);
              if (data.report?.dateFormatted && !dateParam) setDateFormatted(data.report.dateFormatted);
            }
          })
          .catch((err) => console.warn('Falha ao buscar item de mídia:', err));
      }
    } catch (e) {
      console.warn('Erro ao ler parâmetros do vídeo:', e);
    }
  }, []);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleChangePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `Exame em vídeo de ${patientName} - e-SUS PEC`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 font-sans">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-4">
        {onBackToHome ? (
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Sistema</span>
          </button>
        ) : (
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Página Inicial</span>
          </a>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-900/40 border border-teal-700/50 hover:bg-teal-800/50 text-teal-300 text-xs font-semibold transition-all cursor-pointer"
        >
          {copiedLink ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Link Copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartilhar</span>
            </>
          )}
        </button>
      </div>

      {/* Main Video Card */}
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Card Header */}
        <div className="bg-slate-950/80 p-4 sm:p-6 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              SUS • Acesso Público Autorizado
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {dateFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-1">
            <Building2 className="w-3.5 h-3.5 text-teal-500" />
            <span>PREFEITURA DE ANAJÁS • CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {title}
          </h1>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-sm">
            <User className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-slate-400 text-xs font-semibold uppercase">Paciente:</span>
            <span className="text-white font-bold text-sm tracking-wide">{patientName}</span>
          </div>
        </div>

        {/* Video Player Display */}
        <div className="relative bg-black w-full flex items-center justify-center min-h-[260px] sm:min-h-[380px]">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[500px] object-contain bg-black"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Seu navegador não suporta a reprodução deste formato de vídeo.
            </video>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3 text-red-400">
                ⚠️
              </div>
              <p className="text-sm font-bold text-slate-200">Vídeo não especificado ou link expirado</p>
              <p className="text-xs text-slate-500 mt-1">
                Aponte a câmera para o QR Code impresso no documento do prontuário médico.
              </p>
            </div>
          )}
        </div>

        {/* Quick Speed Controls */}
        {videoUrl && (
          <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Velocidade:</span>
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleChangePlaybackRate(rate)}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFullscreen}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Tela Cheia"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        {videoUrl && (
          <div className="p-4 sm:p-6">
            <a
              href={videoUrl}
              download={`exame-video-${Date.now()}.mp4`}
              className="w-full py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Cópia do Vídeo (MP4)</span>
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        <p className="font-semibold">Prefeitura Municipal de Anajás • Secretaria Municipal de Saúde</p>
        <p className="text-[10px] text-slate-600 mt-1">
          e-SUS PEC • Prontuário Eletrônico do Cidadão • Rede de Atenção Psicossocial
        </p>
      </footer>
    </div>
  );
};
