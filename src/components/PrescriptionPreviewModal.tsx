import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  X,
  FileEdit,
  ZoomIn,
  ZoomOut,
  Scissors,
  FileText,
  Info,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { PrescriptionData, User } from '../types';
import { PrescriptionPrintSheet } from './PrescriptionPrintSheet';
import {
  openPrescriptionInNewTab,
  downloadPrescriptionHtml,
} from '../utils/printPrescription';

interface PrescriptionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescription: PrescriptionData | null;
  currentUser?: User | null;
  onEditPrescription?: (prescription: PrescriptionData) => void;
  onShowToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
}

export const PrescriptionPreviewModal: React.FC<PrescriptionPreviewModalProps> = ({
  isOpen,
  onClose,
  prescription,
  currentUser,
  onEditPrescription,
  onShowToast,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!isOpen || !prescription) return null;

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 15, 145));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 15, 60));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handlePrint = () => {
    if (!prescription) return;
    try {
      openPrescriptionInNewTab(prescription, currentUser);
      onShowToast?.('info', 'Documento gerado para impressão. A janela de impressão abrirá automaticamente.', 'Imprimir');
    } catch (e) {
      onShowToast?.('error', 'Não foi possível abrir a nova aba. Verifique as permissões de pop-up do navegador.');
    }
  };

  const handleDownloadHtml = () => {
    if (!prescription) return;
    try {
      downloadPrescriptionHtml(prescription, currentUser);
      onShowToast?.('success', 'Receituário baixado como arquivo HTML institucional.', 'Download Concluído');
    } catch (e) {
      onShowToast?.('error', 'Erro ao baixar arquivo HTML.');
    }
  };

  return (
    <AnimatePresence>
      <div
        id="prescription-preview-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static"
      >
        {/* Printable Area targeted by native browser print */}
        <div className="printable-prescription-target hidden print:block w-full">
          <PrescriptionPrintSheet prescription={prescription} isPrintOnly currentUser={currentUser} />
        </div>

        {/* Interactive Screen Preview Modal (Hidden in physical print) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden print:hidden"
        >
          {/* Header Bar */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    Pré-visualização do Receituário (2 Vias A4 Paisagem)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                    {prescription.type || 'PRESCRIÇÃO'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Paciente: <strong className="text-slate-700 dark:text-slate-200 uppercase">{prescription.patientName}</strong> {prescription.patientAge ? `(${prescription.patientAge})` : ''} • {prescription.dateFormatted}
                </p>
              </div>
            </div>

            {/* Controls and Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 font-bold font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
                  title="Ajustar Zoom Padrão"
                >
                  {zoomLevel}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Edit Button */}
              {onEditPrescription && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditPrescription(prescription);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Modificar Medicamentos ou Cabeçalho"
                >
                  <FileEdit className="w-4 h-4 text-slate-500" />
                  <span className="hidden md:inline">Editar</span>
                </button>
              )}

              {/* Botão Imprimir (Aciona diretamente a impressão da folha A4 Paisagem) */}
              <button
                type="button"
                id="forward-to-print-btn"
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                title="Imprimir folha A4 Paisagem (2 Vias)"
              >
                <Printer className="w-4 h-4 text-blue-100" />
                <span>Imprimir</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar Pré-visualização"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Notice Banner with Tips */}
          <div className="px-4 sm:px-6 py-2.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/50 flex flex-wrap items-center justify-between text-xs text-blue-900 dark:text-blue-200 gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Instruções de Impressão:</strong> Papel <strong>A4</strong>, Orientação <strong>Paisagem (Horizontal)</strong>, Margens <strong>1,27 cm</strong> (ou Estreita).
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300 text-[11px]">
              <Scissors className="w-3.5 h-3.5" />
              <span>2 Vias Idênticas lado a lado com guia de corte</span>
            </div>
          </div>

          {/* Canvas Body (Realistic A4 Landscape Paper Preview) */}
          <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-200 dark:bg-slate-950 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                width: '100%',
                maxWidth: '297mm',
              }}
              className="bg-white text-slate-900 shadow-2xl border border-slate-300 rounded-xs p-3 sm:p-6 select-text"
            >
              <PrescriptionPrintSheet prescription={prescription} currentUser={currentUser} />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{prescription.items.length} medicamento(s) receitado(s) • Modelo Oficial CAPS Anajás</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Salvar arquivo HTML do receituário"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Baixar HTML</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                id="btn-imprimir-footer"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title="Imprimir folha A4 Paisagem (2 Vias)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

