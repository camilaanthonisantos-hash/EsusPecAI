import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  UploadCloud,
  Image,
  File,
  X,
  Sparkles,
  Paperclip,
  Bookmark,
  Camera,
  Loader2,
  Trash2,
  Eye,
  CheckCircle2,
  UserPlus,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { AudioRecorderButton } from './AudioRecorderButton';
import { AttachmentItem, ProfessionConfig } from '../types';
import { QUICK_CLINICAL_TEMPLATES } from '../data/professions';
import { fileToBase64 } from '../services/gemini';

interface MultimodalInputProps {
  profession: ProfessionConfig;
  rawNotes: string;
  setRawNotes: (notes: string) => void;
  isFirstConsultation: boolean;
  setIsFirstConsultation: (val: boolean) => void;
  patientPreviousConsultationsCount?: number;
  audioAttachment: AttachmentItem | null;
  setAudioAttachment: (att: AttachmentItem | null) => void;
  attachments: AttachmentItem[];
  setAttachments: React.Dispatch<React.SetStateAction<AttachmentItem[]>>;
  isGenerating: boolean;
  onGenerate: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  activeKnowledgeCount: number;
  onOpenKnowledgeBase: () => void;
  userApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({
  profession,
  rawNotes,
  setRawNotes,
  isFirstConsultation,
  setIsFirstConsultation,
  patientPreviousConsultationsCount = 0,
  audioAttachment,
  setAudioAttachment,
  attachments,
  setAttachments,
  isGenerating,
  onGenerate,
  onShowToast,
  activeKnowledgeCount,
  onOpenKnowledgeBase,
  userApiKey,
  openaiApiKey,
  groqApiKey,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<AttachmentItem | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Handle file uploads (Images, PDFs, Prescriptions, Exames)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments: AttachmentItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 20 * 1024 * 1024) {
        onShowToast(
          'error',
          `O arquivo "${file.name}" ultrapassa o limite de 20MB.`,
          'Arquivo Muito Grande'
        );
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        let category: AttachmentItem['category'] = 'geral';
        if (
          file.name.toLowerCase().includes('receita') ||
          file.name.toLowerCase().includes('prescricao')
        ) {
          category = 'receita';
        } else if (
          file.name.toLowerCase().includes('sinal') ||
          file.name.toLowerCase().includes('monitor') ||
          file.name.toLowerCase().includes('pa')
        ) {
          category = 'sinais_vitais';
        } else if (isPdf) {
          category = 'documento';
        }

        const item: AttachmentItem = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          base64,
          previewUrl: isImage ? URL.createObjectURL(file) : undefined,
          category,
        };

        newAttachments.push(item);
      } catch (err) {
        console.error('Erro ao ler anexo:', err);
        onShowToast('error', `Falha ao processar arquivo ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
      onShowToast(
        'success',
        `${newAttachments.length} anexo(s) adicionado(s) para análise multimodal!`,
        'Anexos Prontos'
      );
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleApplyTemplate = (templateText: string, title: string) => {
    setRawNotes(templateText);
    setShowTemplates(false);
    onShowToast('info', `Modelo "${title}" carregado na caixa de texto.`, 'Exemplo Carregado');
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to generate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isGenerating) {
        onGenerate();
      }
    }
  };

  const hasAnyInput =
    rawNotes.trim().length > 0 || audioAttachment !== null || attachments.length > 0;

  return (
    <div id="multimodal-input-container" className="space-y-4">
      {/* Visual Selector: Tipo de Atendimento (Primeiro Atendimento vs Retorno/Reavaliação) */}
      <div
        id="consultation-type-selector"
        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Tipo de Atendimento:
          </label>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {isFirstConsultation
              ? 'Anamnese completa e histórico abrangente'
              : 'Evolução comparativa e auditoria de pendências'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: Primeiro Atendimento / Acolhimento Inicial */}
          <button
            type="button"
            id="consultation-type-first-btn"
            onClick={() => setIsFirstConsultation(true)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 bg-[#0f2e90] ${
              isFirstConsultation
                ? 'border-indigo-400 ring-2 ring-indigo-500/30 text-white shadow-xs'
                : 'border-indigo-900/50 text-indigo-100 hover:border-indigo-400'
            }`}
          >
            <div className="pt-0.5 shrink-0">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  isFirstConsultation
                    ? 'border-teal-400 bg-teal-400'
                    : 'border-indigo-300/60 bg-transparent'
                }`}
              >
                {isFirstConsultation && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
              </div>
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-teal-300" />
                  Primeiro Atendimento / Acolhimento Inicial
                </span>
                {isFirstConsultation && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-600 text-white">
                    Anamnese
                  </span>
                )}
              </div>
              <p className="text-[11px] text-indigo-200 leading-snug">
                Anamnese completa, histórico abrangente e levantamento integral de diagnósticos.
              </p>
            </div>
          </button>

          {/* Option 2: Retorno / Reavaliação / Alta (DEFAULT) */}
          <button
            type="button"
            id="consultation-type-return-btn"
            onClick={() => setIsFirstConsultation(false)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 bg-[#071b92] ${
              !isFirstConsultation
                ? 'border-indigo-400 ring-2 ring-indigo-500/30 text-white shadow-xs'
                : 'border-indigo-900/50 text-indigo-100 hover:border-indigo-400'
            }`}
          >
            <div className="pt-0.5 shrink-0">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  !isFirstConsultation
                    ? 'border-teal-400 bg-teal-400'
                    : 'border-indigo-300/60 bg-transparent'
                }`}
              >
                {!isFirstConsultation && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
              </div>
            </div>
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-teal-300" />
                  Retorno / Reavaliação / Alta
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                  Padrão
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 leading-snug">
                Evolução comparativa, adesão ao plano anterior e auditoria de pendências.
              </p>
            </div>
          </button>
        </div>

        {/* Informative notice for Retorno */}
        {!isFirstConsultation && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-800 dark:text-teal-200">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>
              {patientPreviousConsultationsCount > 0
                ? `A IA cruzará o relato atual com os ${patientPreviousConsultationsCount} atendimento(s) do histórico do paciente para auditar queixas ou remédios pendentes.`
                : 'A IA gerará evolução comparativa focada em adesão e reajuste terapêutico.'}
            </span>
          </div>
        )}
      </div>

      {/* Text Area Card */}
      <div
        className={`relative rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 ${
          isDragOver
            ? 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-50/20 dark:bg-teal-950/20'
            : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }}
      >
        {/* Top toolbar inside Text Area */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-indigo-900/60 bg-[#0b0b91] rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-300" />
              Relato Clínico / Anotações do Atendimento
            </span>
            {activeKnowledgeCount > 0 && (
              <button
                type="button"
                onClick={onOpenKnowledgeBase}
                className="text-[11px] font-medium text-teal-200 bg-teal-500/20 hover:bg-teal-500/30 px-2 py-0.5 rounded-full border border-teal-400/40 transition-colors flex items-center gap-1 cursor-pointer"
                title="Ver protocolos e REMUME injetados"
              >
                <CheckCircle2 className="w-3 h-3 text-teal-300" />
                {activeKnowledgeCount} protocolo(s) injetado(s)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="toggle-quick-templates-btn"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs font-medium text-indigo-100 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-800/60 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-teal-300" />
              {showTemplates ? 'Fechar Exemplos' : 'Modelos Rápidos'}
            </button>

            {rawNotes && (
              <button
                type="button"
                id="clear-notes-btn"
                onClick={() => setRawNotes('')}
                className="text-xs text-indigo-200 hover:text-rose-300 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Limpar texto digitado"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Quick Templates Drawer */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 px-4 py-3"
            >
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Selecione um caso clínico típico para preenchimento rápido de teste ou adaptação:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {QUICK_CLINICAL_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.text, tmpl.title)}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-400 text-left transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                        {tmpl.title}
                      </span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium bg-teal-50 dark:bg-teal-950/80 px-1.5 py-0.5 rounded">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                      {tmpl.preview}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Textarea */}
        <div className="p-4">
          <textarea
            id="clinical-notes-textarea"
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder={`Digite ou cole o relato clínico bruto do atendimento (ex: queixa principal, história, sinais vitais numéricos brutos como 130x85 mmHg, medicamentos em uso, orientações prestadas, etc.).\n\nA IA converterá automaticamente os sinais vitais para qualitativos e formatará no padrão do PEC.`}
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none resize-y leading-relaxed font-sans min-h-[120px]"
          />

          {/* Quick Action Shortcuts inside Textarea Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />

              <button
                type="button"
                id="attach-files-btn"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium cursor-pointer transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Paperclip className="w-4 h-4" />
                <span>Anexar Receita / Foto / PDF</span>
              </button>

              <button
                type="button"
                id="camera-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                className="hidden sm:flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 font-medium cursor-pointer transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Capturar foto de exame ou receita"
              >
                <Camera className="w-4 h-4" />
                <span>Foto de Monitor/Exame</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block">
              Atalho: <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">Ctrl+Enter</kbd> para gerar
            </div>
          </div>
        </div>
      </div>

      {/* Attachments Chips List */}
      {attachments.length > 0 && (
        <div id="attachments-chips-container" className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Anexos Multimodais ({attachments.length}):</span>
            <button
              type="button"
              onClick={() => setAttachments([])}
              className="text-rose-500 hover:underline text-[11px]"
            >
              Remover todos
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                id={`attachment-chip-${att.id}`}
                className="flex items-center gap-2 p-2 pl-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs"
              >
                {att.previewUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewImageModal(att)}
                    className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 group"
                  >
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-3 h-3 text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                    <File className="w-4 h-4" />
                  </div>
                )}

                <div className="max-w-[150px] sm:max-w-[200px]">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {att.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {(att.size / 1024).toFixed(0)} KB • {att.category}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                  aria-label="Remover anexo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groq Whisper Large v3 Audio Recorder */}
      <AudioRecorderButton
        onTranscriptionComplete={(text) => {
          setRawNotes((prev) => (prev ? `${prev.trim()}\n\n${text}` : text));
          onShowToast('success', 'Áudio transcrito com sucesso via Groq Whisper!', 'Transcrição Concluída');
        }}
        groqApiKey={groqApiKey}
        disabled={isGenerating}
      />


      {/* Main Action Button */}
      <div className="pt-2">
        <button
          type="button"
          id="generate-pec-record-btn"
          disabled={!hasAnyInput || isGenerating}
          onClick={onGenerate}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-base shadow-lg shadow-teal-600/25 flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Gerando Prontuário PEC para {profession.name}...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 fill-white/20" />
              <span>Gerar Prontuário PEC ✨</span>
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2">
          Gera blocos individuais com conformidade aos padrões do e-SUS APS, RAPS e eMulti.
        </p>
      </div>

      {/* Modal for image preview */}
      <AnimatePresence>
        {previewImageModal && (
          <div
            id="image-preview-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewImageModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2 border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImageModal.previewUrl}
                alt={previewImageModal.name}
                className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
              />
              <p className="text-center text-xs text-slate-300 mt-2 truncate px-4">
                {previewImageModal.name}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
