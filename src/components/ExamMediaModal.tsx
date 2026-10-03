import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Save,
  Image as ImageIcon,
  Video,
  Plus,
  Trash2,
  Upload,
  QrCode,
  Calendar,
  ShieldCheck,
  Building2,
  Sparkles,
  Eye,
  AlertCircle,
  FileText,
  MoveUp,
  MoveDown,
  Play,
  RotateCcw,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Copy,
  Check,
  Film,
  Download,
} from 'lucide-react';
import QRCode from 'qrcode';
import { ExamMediaReportData, ExamMediaItem, Patient, User, Consultation } from '../types';
import { openExamMediaInNewTab } from '../utils/printExamMedia';
import { BrazilianDatePicker } from './BrazilianDatePicker';
import { saveExamMediaToFirestore } from '../services/firebase';
import {
  formatSingleUnitAge,
  formatAnajasDate,
  formatPatientDocument,
} from '../utils/dateCalculator';

interface ExamMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  currentUser: User;
  consultation?: Consultation | null;
  initialConsultation?: Consultation | null;
  existingReport?: ExamMediaReportData | null;
  onSave: (report: ExamMediaReportData) => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const ExamMediaModal: React.FC<ExamMediaModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  consultation,
  initialConsultation,
  existingReport,
  onSave,
  onShowToast,
}) => {
  const activeConsultation = consultation || initialConsultation;
  // Report details state
  const [title, setTitle] = useState('ANEXO ICONOGRÁFICO DE EXAMES E VÍDEOS');
  const [patientName, setPatientName] = useState('');
  const [patientAgeFormatted, setPatientAgeFormatted] = useState('');
  const [patientDocument, setPatientDocument] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cityDateFormatted, setCityDateFormatted] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [professionalRole, setProfessionalRole] = useState('');
  const [professionalRegister, setProfessionalRegister] = useState('');

  // Media items state (up to 6 per A4 page)
  const [items, setItems] = useState<ExamMediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Legal retention state
  const [legalRetentionYears, setLegalRetentionYears] = useState<number>(20);
  const [validUntilFormatted, setValidUntilFormatted] = useState<string>('');
  const [legalNotice, setLegalNotice] = useState<string>('');

  // Upload video state (prevents main thread lockup and shows real progress)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Active in-modal floating video player (for checking playback right inside the PEC)
  const [playingModalItem, setPlayingModalItem] = useState<ExamMediaItem | null>(null);
  // View mode switcher per card: 'player' (interactive video) or 'qrcode' (A4 scan view)
  const [videoCardViewModes, setVideoCardViewModes] = useState<Record<string, 'player' | 'qrcode'>>({});
  const [copiedLinkItemId, setCopiedLinkItemId] = useState<string | null>(null);

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [targetItemIndexForUpload, setTargetItemIndexForUpload] = useState<number | null>(null);

  // Initialize data on open
  useEffect(() => {
    if (!isOpen) return;

    const pName = (patient?.fullName || activeConsultation?.patientName || 'PACIENTE IDENTIFICADO').toUpperCase();
    setPatientName(pName);

    const age = patient?.birthDate ? formatSingleUnitAge(patient.birthDate) : '--';
    setPatientAgeFormatted(age);

    const doc = formatPatientDocument(patient?.cpf, patient?.cns);
    setPatientDocument(doc);

    const nowMs = activeConsultation?.timestamp || Date.now();
    setCityDateFormatted(formatAnajasDate(nowMs));

    setWorkplace((existingReport?.workplace || activeConsultation?.workplace || currentUser.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)').toUpperCase());
    setProfessionalName((existingReport?.professionalName || activeConsultation?.authorName || currentUser.name || 'Profissional de Saúde').toUpperCase());
    setProfessionalRole((existingReport?.professionalRole || activeConsultation?.authorProfession || (currentUser.profession === 'medico' ? 'Médico' : currentUser.profession === 'enfermeiro' ? 'Enfermeiro' : 'Profissional de Saúde')).toUpperCase());
    setProfessionalRegister((existingReport?.professionalRegister || activeConsultation?.authorRegister || currentUser.professionalRegister || '').toUpperCase());

    // Calculate legal retention
    const years = existingReport?.legalRetentionYears || 20;
    setLegalRetentionYears(years);
    const expDate = new Date(nowMs);
    expDate.setFullYear(expDate.getFullYear() + years);
    const expDateStr = `${String(expDate.getDate()).padStart(2, '0')}/${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;
    setValidUntilFormatted(expDateStr);

    const notice = existingReport?.legalNotice ||
      `As imagens e registros audiovisuais deste anexo iconográfico ficam disponíveis para acesso e visualização digital até ${expDateStr} nos termos do Art. 6º da Lei Federal nº 13.787/2018 e Resolução CFM nº 1.821/2007 (Guarda e Disponibilização de Prontuário e Exames Digitais).`;
    setLegalNotice(notice);

    if (existingReport) {
      setTitle(existingReport.title || 'ANEXO ICONOGRÁFICO DE EXAMES E VÍDEOS');
      if (existingReport.examDate) setExamDate(existingReport.examDate);
      if (existingReport.items && Array.isArray(existingReport.items)) {
        setItems(existingReport.items);
      }
    } else if (activeConsultation?.examMedia?.items) {
      setTitle(activeConsultation.examMedia.title || 'ANEXO ICONOGRÁFICO DE EXAMES E VÍDEOS');
      setItems(activeConsultation.examMedia.items);
    } else {
      // Start with 1 default image item
      setItems([
        {
          id: `item-${Date.now()}-1`,
          type: 'image',
          title: 'Registro Fotográfico do Exame',
          description: 'Aspecto macroscópico ou radiológico registrado durante o atendimento clínico.',
          order: 1,
          createdAt: Date.now(),
        },
      ]);
    }
  }, [isOpen, patient, activeConsultation, currentUser, existingReport]);

  // Update legal date when years change
  const handleYearsChange = (years: number) => {
    setLegalRetentionYears(years);
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + years);
    const expDateStr = `${String(expDate.getDate()).padStart(2, '0')}/${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;
    setValidUntilFormatted(expDateStr);
    setLegalNotice(
      `As imagens e registros audiovisuais deste anexo iconográfico ficam disponíveis para acesso e visualização digital até ${expDateStr} nos termos do Art. 6º da Lei Federal nº 13.787/2018 e Resolução CFM nº 1.821/2007 (Guarda e Disponibilização de Prontuário e Exames Digitais).`
    );
  };

  // Public base URL for QR codes and citizen access (converts internal AI Studio dev origin to public shared preview)
  const getPublicBaseUrl = () => {
    let origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  // Helper to generate QR code for video safely without URL size blowup
  const generateVideoQrCode = async (
    itemId: string,
    videoUrl: string,
    itemTitle: string,
    customPatientName?: string,
    customValidUntil?: string
  ) => {
    try {
      const baseUrl = getPublicBaseUrl();
      const safeVideoUrl = videoUrl && !videoUrl.startsWith('data:') ? videoUrl : '';
      
      // Keep QR code URL clean and compact so mobile cameras focus and decode in milliseconds
      const queryParams = new URLSearchParams();
      if (itemTitle) queryParams.set('t', itemTitle.slice(0, 35));
      if (safeVideoUrl && !safeVideoUrl.startsWith('/api/videos/')) {
        queryParams.set('v', safeVideoUrl);
      }
      queryParams.set('portal', 'video'); // Instructs SPA router to open open-access citizen player

      const qs = queryParams.toString();
      const watchUrl = `${baseUrl}/watch-video/${itemId}${qs ? `?${qs}` : ''}`;

      const qrDataUrl = await QRCode.toDataURL(watchUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });
      return qrDataUrl;
    } catch (err) {
      console.warn('Erro ao gerar QR Code do vídeo:', err);
      return '';
    }
  };

  // Add new Image item
  const handleAddImageItem = () => {
    const newItem: ExamMediaItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      type: 'image',
      title: `Imagem Clínica #${items.length + 1}`,
      description: 'Descrição e achados observados na imagem.',
      order: items.length + 1,
      createdAt: Date.now(),
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add new Video item with QR Code
  const handleAddVideoItem = async () => {
    const itemId = `item-${Date.now()}-${items.length + 1}`;
    const defaultTitle = `Exame em Vídeo #${items.length + 1}`;
    const qrData = await generateVideoQrCode(itemId, '', defaultTitle);

    const newItem: ExamMediaItem = {
      id: itemId,
      type: 'video',
      title: defaultTitle,
      description: 'Aponte a câmera do celular para o QR Code para reproduzir o vídeo completo do exame.',
      qrCodeDataUrl: qrData,
      order: items.length + 1,
      createdAt: Date.now(),
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
  };

  // Move item up / down
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const list = [...prev];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return list.map((item, idx) => ({ ...item, order: idx + 1 }));
    });
  };

  // Auto-regenerate QR codes if patient name or validity changes
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    const videoItems = items.filter((it) => it.type === 'video');
    if (videoItems.length === 0) return;

    let isMounted = true;
    (async () => {
      let hasChanges = false;
      const updated = await Promise.all(
        items.map(async (it) => {
          if (it.type === 'video') {
            const cleanUrl = it.videoUrl && !it.videoUrl.startsWith('data:') ? it.videoUrl : '';
            const qr = await generateVideoQrCode(it.id, cleanUrl, it.title, patientName, validUntilFormatted);
            if (qr && qr !== it.qrCodeDataUrl) {
              hasChanges = true;
              return { ...it, qrCodeDataUrl: qr };
            }
          }
          return it;
        })
      );
      if (hasChanges && isMounted) {
        setItems(updated);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [patientName, validUntilFormatted]);

  // Update item field
  const handleUpdateItem = async (index: number, field: keyof ExamMediaItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      updated[index] = item;

      // If videoUrl or title changed on a video item, regenerate QR Code safely
      if ((field === 'videoUrl' || field === 'title') && item.type === 'video') {
        const cleanUrl = typeof item.videoUrl === 'string' && !item.videoUrl.startsWith('data:') ? item.videoUrl : '';
        generateVideoQrCode(item.id, cleanUrl, item.title, patientName, validUntilFormatted).then((qr) => {
          setItems((current) =>
            current.map((it) => (it.id === item.id ? { ...it, qrCodeDataUrl: qr } : it))
          );
        });
      }

      return updated;
    });
  };

  // Handle local image file upload with compression to keep Firestore & memory light
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || targetItemIndexForUpload === null) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Compress via canvas if image is large
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          handleUpdateItem(targetItemIndexForUpload, 'imageDataUrl', compressedDataUrl);
          onShowToast?.('success', 'Imagem anexada com sucesso!');
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle local video file upload: streams directly to server and extracts lightweight thumbnail safely
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || targetItemIndexForUpload === null) return;

    const itemIdx = targetItemIndexForUpload;
    const targetItem = items[itemIdx];
    if (!targetItem) return;
    const targetItemId = targetItem.id;
    const targetTitle = targetItem.title;

    const videoObjUrl = URL.createObjectURL(file);

    // 1. Extract lightweight thumbnail safely using HTML5 video metadata + canvas (no browser lock)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = videoObjUrl;
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek safely to 0.5s or 10% duration
      const seekTime = Math.min(1, Math.max(0.1, (video.duration || 1) * 0.1));
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const MAX_W = 640;
        const scale = Math.min(1, MAX_W / (video.videoWidth || 640));
        canvas.width = Math.round((video.videoWidth || 640) * scale);
        canvas.height = Math.round((video.videoHeight || 360) * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setItems((prev) =>
            prev.map((it) => (it.id === targetItemId ? { ...it, videoThumbnailDataUrl: thumbDataUrl } : it))
          );
        }
      } catch (err) {
        console.warn('Erro ao extrair frame do vídeo:', err);
      } finally {
        URL.revokeObjectURL(videoObjUrl);
      }
    };

    video.onerror = () => {
      console.warn('Não foi possível gerar miniatura do vídeo');
      URL.revokeObjectURL(videoObjUrl);
    };

    // 2. Stream video file directly to Express server via FormData (NEVER convert video to base64 dataUrl!)
    setIsUploadingVideo(true);
    setUploadingIndex(itemIdx);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/exam-media/upload-video', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(pct);
      }
    };

    xhr.onload = async () => {
      setIsUploadingVideo(false);
      setUploadingIndex(null);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          const serverVideoUrl = resp.videoUrl;
          if (!serverVideoUrl) {
            throw new Error('Servidor não retornou a URL do vídeo');
          }

          const qrData = await generateVideoQrCode(
            targetItemId,
            serverVideoUrl,
            targetTitle,
            patientName,
            validUntilFormatted
          );

          setItems((prev) =>
            prev.map((it) =>
              it.id === targetItemId
                ? {
                    ...it,
                    videoUrl: serverVideoUrl,
                    qrCodeDataUrl: qrData,
                  }
                : it
            )
          );

          // Automatically set this card's view mode to interactive player
          setVideoCardViewModes((prev) => ({ ...prev, [targetItemId]: 'player' }));

          // Automatically sync report to server and Firestore
          const currentReport = buildReportData();
          const updatedItems = currentReport.items.map((it) =>
            it.id === targetItemId
              ? {
                  ...it,
                  videoUrl: serverVideoUrl,
                  qrCodeDataUrl: qrData,
                }
              : it
          );
          const fullReport = { ...currentReport, items: updatedItems };
          saveExamMediaToFirestore(fullReport).catch(() => {});
          fetch('/api/exam-media/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullReport),
          }).catch(() => {});

          onShowToast?.(
            'success',
            `Vídeo ${file.name} carregado com sucesso (${(file.size / (1024 * 1024)).toFixed(1)} MB)! Player pronto e QR Code gerado.`
          );
        } catch (err) {
          console.error('Erro ao processar resposta do upload:', err);
          onShowToast?.('error', 'Erro ao salvar o vídeo no servidor.');
        }
      } else {
        let errMsg = 'Falha no upload do vídeo.';
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData.error) errMsg = errData.error;
        } catch {}
        onShowToast?.('error', errMsg);
      }
    };

    xhr.onerror = () => {
      setIsUploadingVideo(false);
      setUploadingIndex(null);
      onShowToast?.('error', 'Falha na conexão durante o upload do vídeo.');
    };

    xhr.send(formData);
    e.target.value = '';
  };

  // Build the complete ExamMediaReportData object
  const buildReportData = (): ExamMediaReportData => {
    return {
      id: existingReport?.id || consultation?.examMedia?.id || `media-${Date.now()}`,
      title: title.trim() || 'ANEXO ICONOGRÁFICO DE EXAMES E VÍDEOS',
      patientId: patient?.id || consultation?.patientId || `pat-${Date.now()}`,
      patientName: patientName || 'PACIENTE IDENTIFICADO',
      patientAge: patientAgeFormatted || '--',
      patientAgeFormatted: patientAgeFormatted || '--',
      patientDocument: patientDocument || '--',
      examDate,
      dateFormatted: cityDateFormatted || formatAnajasDate(Date.now()),
      items,
      legalRetentionYears,
      validUntilFormatted,
      legalNotice,
      professionalName: professionalName.trim() || existingReport?.professionalName || activeConsultation?.authorName || currentUser.name || 'Profissional de Saúde',
      professionalRole: professionalRole.trim() || existingReport?.professionalRole || activeConsultation?.authorProfession || (currentUser.profession === 'medico' ? 'Médico' : 'Profissional de Saúde'),
      professionalRegister: professionalRegister.trim() || existingReport?.professionalRegister || activeConsultation?.authorRegister || currentUser.professionalRegister || '',
      professionalStampUrl: existingReport ? (existingReport.professionalStampUrl || (activeConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl)) : (currentUser as any)?.digitalStampUrl,
      useDigitalStamp: existingReport ? (existingReport.useDigitalStamp ?? true) : ((currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
      workplace: workplace.trim() || existingReport?.workplace || activeConsultation?.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)',
      createdAt: existingReport?.createdAt || Date.now(),
      consultationId: activeConsultation?.id,
    };
  };

  // Handle Save
  const handleSave = () => {
    if (items.length === 0) {
      onShowToast?.('error', 'Adicione pelo menos 1 imagem ou vídeo antes de salvar.');
      return;
    }
    const reportData = buildReportData();
    // 1. Sync to Firestore directly
    saveExamMediaToFirestore(reportData).catch((err) => console.warn('Aviso: sync Firestore falhou:', err));
    // 2. Also sync to backend datastore so /watch-video/:id can resolve item immediately
    try {
      fetch('/api/exam-media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      }).catch((err) => console.warn('Aviso: sync exam-media falhou:', err));
    } catch {
      // Non-blocking
    }
    onSave(reportData);
    onShowToast?.('success', 'Anexo iconográfico salvo no banco de dados com sucesso!');
    onClose();
  };

  // Handle Print A4
  const handlePrint = async () => {
    if (items.length === 0) {
      onShowToast?.('error', 'Adicione pelo menos 1 imagem ou vídeo para imprimir.');
      return;
    }
    const reportData = buildReportData();
    // 1. Sync to Firestore directly
    saveExamMediaToFirestore(reportData).catch((err) => console.warn('Aviso: sync Firestore falhou:', err));
    // 2. Also sync to backend so citizen scanning QR code resolves immediately
    try {
      fetch('/api/exam-media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      }).catch((err) => console.warn('Aviso: sync exam-media falhou:', err));
    } catch {
      // Non-blocking
    }
    await openExamMediaInNewTab(reportData, patient || undefined, currentUser);
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(Math.max(1, items.length) / 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={handleVideoFileChange}
      />

      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-inner">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Anexo Iconográfico de Imagens e QR Code de Vídeos (A4)
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-500 text-slate-950">
                  Padrão 6 por Página
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Layout de 2 colunas com 3 imagens por lado, QR Code sobreposto para vídeos e vigência legal digital.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Gerenciar Mídias ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Prévia A4 ({totalPages} pág{totalPages > 1 ? 's' : ''})
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/70">
          {/* Institutional Patient & Retention Header Bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Paciente</span>
              <span className="font-bold text-slate-900 text-sm">{patientName}</span>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Idade: {patientAgeFormatted} • Doc: {patientDocument}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Data do Exame / Atendimento
              </span>
              <BrazilianDatePicker
                value={examDate}
                onChange={(val) => setExamDate(val)}
                className="scale-95 origin-top-left"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Vigência Legal Digital (Art. 6º Lei 13.787)
              </span>
              <select
                value={legalRetentionYears}
                onChange={(e) => handleYearsChange(Number(e.target.value))}
                className="mt-1 w-full bg-teal-50/60 border border-teal-200 text-teal-900 rounded-md px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value={20}>20 Anos (Obrigatório CFM / Lei Federal)</option>
                <option value={25}>25 Anos (Custódia Estendida)</option>
                <option value={30}>30 Anos (Custódia Vitalícia APS)</option>
              </select>
              <span className="text-[10px] text-teal-700 font-medium block mt-1">
                Disponível até: <strong>{validUntilFormatted}</strong>
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Unidade e Profissional</span>
              <span className="font-medium text-slate-800 truncate block">{workplace}</span>
              <span className="text-slate-600 text-[11px] block mt-0.5">
                {professionalName} ({professionalRole} {professionalRegister})
              </span>
            </div>
          </div>

          {activeTab === 'editor' ? (
            /* TAB 1: MEDIA EDITOR */
            <div className="space-y-4">
              {/* Media Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Adicionar à Seção:</span>
                  <button
                    type="button"
                    onClick={handleAddImageItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    + Adicionar Imagem
                  </button>
                  <button
                    type="button"
                    onClick={handleAddVideoItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <Video className="w-3.5 h-3.5" />
                    + Adicionar Vídeo com QR Code
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  Mostrando <strong>{items.length}</strong> de até <strong>6 por folha A4</strong> (distribuídas em 2 colunas)
                </div>
              </div>

              {/* Items List */}
              {items.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  <ImageIcon className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                  <p className="font-bold text-slate-700 text-sm">Nenhuma imagem ou vídeo adicionado ainda</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Clique em "+ Adicionar Imagem" ou "+ Adicionar Vídeo com QR Code" para anexar fotografias, ecografias, raio-x ou registros em vídeo ao exame.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item, index) => {
                    const isVideo = item.type === 'video';
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between transition-all hover:border-slate-300"
                      >
                        <div className="space-y-3">
                          {/* Item Header & Controls */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">
                                #{index + 1}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                  isVideo
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : 'bg-teal-100 text-teal-800 border border-teal-200'
                                }`}
                              >
                                {isVideo ? 'Vídeo + QR Code' : 'Imagem A4'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveItem(index, 'up')}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                title="Mover para cima"
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === items.length - 1}
                                onClick={() => handleMoveItem(index, 'down')}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                title="Mover para baixo"
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors ml-1"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Video View Switcher (Player vs QR Code) */}
                          {isVideo && (
                            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setVideoCardViewModes((prev) => ({ ...prev, [item.id]: 'player' }))}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                                    (videoCardViewModes[item.id] || (item.videoUrl ? 'player' : 'qrcode')) === 'player'
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Player de Vídeo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVideoCardViewModes((prev) => ({ ...prev, [item.id]: 'qrcode' }))}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                                    (videoCardViewModes[item.id] || (item.videoUrl ? 'player' : 'qrcode')) === 'qrcode'
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  <QrCode className="w-3 h-3" />
                                  QR Code Impresso
                                </button>
                              </div>

                                <button
                                  type="button"
                                  onClick={() => setPlayingModalItem(item)}
                                  disabled={!item.videoUrl}
                                  className="px-2.5 py-1 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-40 disabled:pointer-events-none rounded-md flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800/60 shadow-2xs"
                                  title={item.videoUrl ? "Abrir reprodutor de vídeo ampliado (Modal Layer)" : "Envie o arquivo MP4 primeiro para abrir o layer"}
                                >
                                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                  Layer / Player Ampliado
                                </button>
                              </div>
                            )}

                          {/* Media Preview Box */}
                          <div className="relative w-full h-44 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 dark:border-slate-700">
                            {isVideo ? (
                              (videoCardViewModes[item.id] || (item.videoUrl ? 'player' : 'qrcode')) === 'player' ? (
                                item.videoUrl ? (
                                  <video
                                    key={item.videoUrl}
                                    src={item.videoUrl}
                                    poster={item.videoThumbnailDataUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full h-full object-contain bg-black"
                                  />
                                ) : (
                                  <div className="text-center p-4 text-slate-400">
                                    <Video className="w-10 h-10 mx-auto text-indigo-400 mb-2 opacity-80" />
                                    <span className="text-xs font-bold text-slate-200 block">Vídeo ainda não carregado</span>
                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                      Clique em "Upload do Vídeo (MP4)" abaixo para enviar o arquivo.
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-3 text-white">
                                  {item.qrCodeDataUrl ? (
                                    <div className="bg-white p-2 rounded-lg shadow-md flex flex-col items-center">
                                      <img src={item.qrCodeDataUrl} alt="QR Code" className="w-24 h-24" />
                                      <span className="text-[8px] font-black text-slate-900 uppercase tracking-wider mt-1">
                                        Aponte a Câmera
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-center text-slate-400">
                                      <QrCode className="w-12 h-12 mx-auto text-slate-500 mb-1" />
                                      <span className="text-xs">Gerando QR Code...</span>
                                    </div>
                                  )}
                                  <span className="text-[9.5px] font-bold mt-2 bg-indigo-600/90 px-2.5 py-0.5 rounded-full text-white">
                                    ▶ Visualização no A4 Impresso
                                  </span>
                                </div>
                              )
                            ) : item.imageDataUrl ? (
                              <img
                                src={item.imageDataUrl}
                                alt={item.title}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="text-center p-3 text-slate-400">
                                <ImageIcon className="w-8 h-8 mx-auto text-slate-500 mb-1" />
                                <span className="text-[11px] block">Nenhuma imagem carregada</span>
                              </div>
                            )}
                          </div>

                          {/* Upload Buttons */}
                          <div className="space-y-2">
                            {!isVideo ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetItemIndexForUpload(index);
                                  imageInputRef.current?.click();
                                }}
                                className="w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5 text-slate-600" />
                                {item.imageDataUrl ? 'Trocar Imagem' : 'Carregar Imagem (JPG/PNG)'}
                              </button>
                            ) : (
                              <>
                                {isUploadingVideo && uploadingIndex === index ? (
                                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-indigo-900 font-bold">
                                      <span className="flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                        Enviando vídeo ao servidor...
                                      </span>
                                      <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className="bg-indigo-600 h-full rounded-full transition-all duration-200"
                                        style={{ width: `${uploadProgress}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-indigo-700 block">
                                      Salvando e gerando QR Code de reprodução...
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={isUploadingVideo}
                                      onClick={() => {
                                        setTargetItemIndexForUpload(index);
                                        videoInputRef.current?.click();
                                      }}
                                      className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                      {item.videoUrl ? 'Substituir Vídeo (MP4)' : 'Upload do Vídeo (MP4)'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isUploadingVideo}
                                      onClick={() => {
                                        setTargetItemIndexForUpload(index);
                                        imageInputRef.current?.click();
                                      }}
                                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                      title="Carregar thumbnail / capa personalizada"
                                    >
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      Capa
                                    </button>
                                  </div>
                                )}

                                {item.videoUrl && !isUploadingVideo && (
                                  <div className="space-y-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-200">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        Player e QR Code Ativos
                                      </span>
                                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-extrabold uppercase">
                                        Acesso Aberto
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40 flex-wrap">
                                      {(() => {
                                        const safeVideoUrl = item.videoUrl && !item.videoUrl.startsWith('data:') ? item.videoUrl : '';
                                        const qp = new URLSearchParams();
                                        if (item.title) qp.set('t', item.title.slice(0, 35));
                                        if (safeVideoUrl && !safeVideoUrl.startsWith('/api/videos/')) {
                                          qp.set('v', safeVideoUrl);
                                        }
                                        qp.set('portal', 'video');
                                        const qs = qp.toString();
                                        const playerUrl = `${getPublicBaseUrl()}/watch-video/${item.id}${qs ? `?${qs}` : ''}`;
                                        return (
                                          <>
                                            <a
                                              href={playerUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[11px] text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-teal-100 font-extrabold flex items-center gap-1 underline underline-offset-2"
                                              title="Abrir o reprodutor público do cidadão sem pedir login"
                                            >
                                              <Play className="w-3 h-3 fill-current" />
                                              Testar Player do Cidadão ↗
                                            </a>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                navigator.clipboard.writeText(playerUrl);
                                                setCopiedLinkItemId(item.id);
                                                setTimeout(() => setCopiedLinkItemId(null), 2500);
                                                onShowToast?.('success', 'Link copiado para a área de transferência!');
                                              }}
                                              className="text-[10px] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
                                              title="Copiar link direto para envio ao paciente"
                                            >
                                              {copiedLinkItemId === item.id ? (
                                                <>
                                                  <Check className="w-3 h-3 text-emerald-600" />
                                                  Copiado!
                                                </>
                                              ) : (
                                                <>
                                                  <Copy className="w-3 h-3 text-slate-500" />
                                                  Copiar Link
                                                </>
                                              )}
                                            </button>
                                          </>
                                        );
                                      })()}
                                      <a
                                        href={item.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                                        title="Baixar ou ver arquivo MP4 direto"
                                      >
                                        MP4 Direto ↗
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Video Link Input (if video) */}
                          {isVideo && (
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Link Direto do Vídeo ou Cloud Storage:
                              </label>
                              <input
                                type="text"
                                placeholder="https://exemplo.gov.br/videos/exame.mp4"
                                value={item.videoUrl || ''}
                                onChange={(e) => handleUpdateItem(index, 'videoUrl', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                              />
                            </div>
                          )}

                          {/* Title */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                              Título do Exame / Imagem:
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Ecografia Abdominal - Lobo Hepático Direito"
                              value={item.title}
                              onChange={(e) => handleUpdateItem(index, 'title', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: A4 SHEET PREVIEW */
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-teal-600" />
                  <span>
                    Visualização da folha A4 com <strong>2 colunas e 3 imagens por lado</strong> (até 6 por folha).
                    Páginas totais calculadas: <strong>{totalPages}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-bold shadow-xs"
                >
                  Abrir Impressão Direta
                </button>
              </div>

              {/* Grid 2 cols x 3 rows simulation */}
              <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-md max-w-3xl mx-auto space-y-4">
                <div className="text-center border-b pb-3">
                  <div className="text-xs font-black text-slate-900 uppercase">
                    PREFEITURA MUNICIPAL DE ANAJÁS • SECRETARIA MUNICIPAL DE SAÚDE
                  </div>
                  <div className="text-[11px] font-bold text-teal-700 uppercase mt-0.5">{workplace}</div>
                  <div className="text-xs font-extrabold uppercase mt-1 px-3 py-1 bg-teal-50 border border-teal-200 rounded-md inline-block">
                    {title}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 min-h-[380px]">
                  {items.slice(0, 6).map((item, idx) => {
                    const isVideo = item.type === 'video';
                    const img = isVideo
                      ? item.videoThumbnailDataUrl || item.imageDataUrl
                      : item.imageDataUrl;
                    return (
                      <div
                        key={item.id}
                        onClick={isVideo && item.videoUrl ? () => setPlayingModalItem(item) : undefined}
                        className={`border border-slate-300 rounded-md p-2 bg-slate-50/50 flex flex-col justify-between transition-all ${
                          isVideo && item.videoUrl ? 'hover:border-teal-500 hover:shadow-md cursor-pointer group' : ''
                        }`}
                        title={isVideo && item.videoUrl ? 'Clique para testar a reprodução do vídeo no player' : undefined}
                      >
                        <div className="relative w-full h-28 bg-slate-900 rounded-sm overflow-hidden flex items-center justify-center">
                          {img ? (
                            <img src={img} alt={item.title} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-slate-400">Sem imagem</span>
                          )}

                          {isVideo && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-1 group-hover:bg-black/40 transition-colors">
                              {item.qrCodeDataUrl && (
                                <img src={item.qrCodeDataUrl} alt="QR Code" className="w-12 h-12 bg-white p-0.5 rounded-xs" />
                              )}
                              <span className="text-[8px] font-extrabold text-white mt-1 bg-teal-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Play className="w-2 h-2 fill-current" />
                                Testar Reprodução
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-1.5">
                          <div className="text-[10px] font-black text-slate-900 uppercase truncate">
                            #{idx + 1} {item.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legal note preview */}
                <div className="bg-slate-100 p-2.5 rounded-md border border-slate-300 text-[10px] text-slate-600">
                  <strong className="text-teal-800">Vigência Legal (Art. 6º Lei 13.787/2018):</strong> {legalNotice}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Vigência digital fixada em {legalRetentionYears} anos ({validUntilFormatted}).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={items.length === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              Imprimir A4
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={items.length === 0}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Salvar no Prontuário / Banco de Dados
            </button>
          </div>
        </div>
      </div>

      {/* Floating Video Player Modal Layer */}
      {playingModalItem && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded-lg bg-indigo-600/80 text-white">
                  <Play className="w-4 h-4 fill-current" />
                </span>
                <div className="truncate">
                  <h3 className="text-sm font-black truncate">{playingModalItem.title}</h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    Paciente: <strong className="text-teal-400">{patientName}</strong> • Validade Digital CFM: {validUntilFormatted}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlayingModalItem(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar reprodutor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Body */}
            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[280px] max-h-[58vh]">
              {playingModalItem.videoUrl ? (
                <video
                  src={playingModalItem.videoUrl}
                  poster={playingModalItem.videoThumbnailDataUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full max-h-[58vh] object-contain"
                />
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <Video className="w-12 h-12 mx-auto text-indigo-400 mb-2 opacity-60" />
                  <p className="text-sm font-bold text-slate-200">Vídeo não carregado para este item</p>
                </div>
              )}
            </div>

            {/* Footer Information & Controls */}
            <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-300">
                  <span className="font-bold text-white text-sm block">{playingModalItem.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  {playingModalItem.videoUrl && (
                    <a
                      href={playingModalItem.videoUrl}
                      download={`exame-${playingModalItem.id}.mp4`}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-400" />
                      Baixar MP4
                    </a>
                  )}

                  {(() => {
                    const safeVideoUrl = playingModalItem.videoUrl && !playingModalItem.videoUrl.startsWith('data:') ? playingModalItem.videoUrl : '';
                    const qp = new URLSearchParams();
                    if (playingModalItem.title) qp.set('t', playingModalItem.title.slice(0, 35));
                    if (safeVideoUrl && !safeVideoUrl.startsWith('/api/videos/')) {
                      qp.set('v', safeVideoUrl);
                    }
                    qp.set('portal', 'video');
                    const qs = qp.toString();
                    const playerUrl = `${getPublicBaseUrl()}/watch-video/${playingModalItem.id}${qs ? `?${qs}` : ''}`;
                    return (
                      <a
                        href={playerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir Player do Cidadão ↗
                      </a>
                    );
                  })()}
                </div>
              </div>

              {/* Legal Notice Bar */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10.5px] text-slate-400">
                <span>⚖️ Art. 6º Lei 13.787/2018 e Res. CFM 1.821/2007 (Guarda e Disponibilização Digital)</span>
                <span className="font-bold text-teal-400">Acesso Público Sem Login via QR Code</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
