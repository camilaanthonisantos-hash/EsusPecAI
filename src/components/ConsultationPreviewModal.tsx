import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  X,
  ZoomIn,
  ZoomOut,
  FileText,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { Consultation, Patient, User } from '../types';
import { ConsultationPrintSheet } from './ConsultationPrintSheet';
import {
  openConsultationInNewTab,
  downloadConsultationHtml,
} from '../utils/printConsultation';

interface ConsultationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: Consultation | null;
  patient: Patient | null;
  currentUser?: User | null;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
}

export const ConsultationPreviewModal: React.FC<ConsultationPreviewModalProps> = ({
  isOpen,
  onClose,
  consultation,
  patient,
  currentUser,
  onShowToast,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!isOpen || !consultation || !patient) return null;

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 15, 145));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 15, 60));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handlePrint = async () => {
    if (!consultation || !patient) return;
    try {
      await openConsultationInNewTab(consultation, patient, currentUser);
      onShowToast?.('info', 'Documento gerado para impressão. A janela de impressão abrirá automaticamente.', 'Imprimir');
    } catch {
      onShowToast?.('error', 'Não foi possível abrir a nova aba. Verifique as permissões de pop-up do navegador.');
    }
  };

  const handleDownloadHtml = async () => {
    if (!consultation || !patient) return;
    try {
      await downloadConsultationHtml(consultation, patient, currentUser);
      onShowToast?.('success', 'Atendimento baixado como arquivo HTML institucional.', 'Download Concluído');
    } catch {
      onShowToast?.('error', 'Erro ao baixar arquivo HTML.');
    }
  };

  const consultDate = new Date(consultation.timestamp || Date.now());
  const dateFormatted = consultDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFormatted = consultDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      <div
        id="consultation-preview-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static"
      >
        {/* Printable Area targeted by native browser print */}
        <div className="printable-consultation-target hidden print:block w-full">
          <ConsultationPrintSheet
            consultation={consultation}
            patient={patient}
            isPrintOnly
            currentUser={currentUser}
          />
        </div>

        {/* Interactive Screen Preview Modal (Hidden in physical print) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden print:hidden"
        >
          {/* Header Bar */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-teal-600 text-white shadow-md shadow-teal-500/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    Visualização do Atendimento Clínico
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                    A4 Retrato • Margens Padronizadas
                  </span>
                  {consultation.prescription && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      + Prescrição
                    </span>
                  )}
                  {consultation.referral && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                      + Encaminhamento SUS
                    </span>
                  )}
                  {consultation.pts && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                      + PTS
                    </span>
                  )}
                  {consultation.examRequest && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                      + Exames Solicitados ({consultation.examRequest.items?.length || 0})
                    </span>
                  )}
                  {consultation.attendanceCertificate && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                      + Atestado Comparecimento
                    </span>
                  )}
                  {consultation.medicalCertificate && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                      + Atestado Médico ({consultation.medicalCertificate.daysOff}d)
                    </span>
                  )}
                  {consultation.examMedia && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      + Anexo Iconográfico ({consultation.examMedia.items?.length || 0})
                    </span>
                  )}
                  {consultation.medicalReport && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                      + Laudo Médico
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Paciente: <strong className="text-slate-700 dark:text-slate-300">{patient.fullName}</strong> • Atendimento de {dateFormatted} às {timeFormatted}
                </p>
              </div>
            </div>

            {/* Top actions & close */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader: Layout Specifications & Zoom Controls */}
          <div className="px-4 sm:px-6 py-2.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Formato: <strong>A4 Vertical (210 x 297 mm)</strong></span>
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
              <span className="hidden sm:inline">
                Margens: <strong>14 mm laterais / 12 mm superior (garantido)</strong>
              </span>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 60}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                title="Redefinir Zoom para 100%"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 145}
                className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Stage: Interactive Zoomable A4 Portrait Container */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-200/80 dark:bg-slate-950 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="transition-all"
            >
              <ConsultationPrintSheet
                consultation={consultation}
                patient={patient}
                isPrintOnly={false}
                currentUser={currentUser}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-700 cursor-pointer"
                title="Baixar arquivo HTML avulso do atendimento"
              >
                <Download className="w-4 h-4" />
                <span>Baixar HTML</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                id="btn-print-consultation-modal"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-teal-600/30 flex items-center gap-2 transition-all cursor-pointer"
                title="Imprimir todo o atendimento em folha A4 Retrato com margens padronizadas (18 mm x 16 mm)"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
