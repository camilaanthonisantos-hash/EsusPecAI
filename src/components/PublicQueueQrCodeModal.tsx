import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Printer,
  X,
  Tv,
  Smartphone,
  Sparkles,
  Info,
} from 'lucide-react';
import { SpecularButton } from './SpecularButton';

export interface PublicQueueQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitName?: string;
}

export const PublicQueueQrCodeModal: React.FC<PublicQueueQrCodeModalProps> = ({
  isOpen,
  onClose,
  unitName = 'Centro de Saúde / CAPS • e-SUS PEC',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Derive public URL for the TV / Mobile Call Screen
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?painel=chamada`
    : 'https://painel-chamada.sus';

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(publicUrl, {
      width: 420,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Erro ao gerar QRCode:', err);
      });
  }, [isOpen, publicUrl]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleOpenNewTab = () => {
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrintQr = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>QR Code - Painel de Chamadas - ${unitName}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            color: #0f172a;
            padding: 20px;
            margin: 0;
          }
          .card {
            border: 3px solid #0f172a;
            border-radius: 24px;
            padding: 32px 24px;
            max-width: 520px;
            margin: 0 auto;
          }
          .title {
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 6px;
            color: #0f766e;
          }
          .subtitle {
            font-size: 14px;
            color: #475569;
            margin-bottom: 24px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
          }
          .qr-img {
            width: 260px;
            height: 260px;
            margin: 0 auto 20px auto;
            display: block;
          }
          .instructions {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 8px;
          }
          .desc {
            font-size: 13px;
            color: #64748b;
            line-height: 1.5;
            margin-bottom: 20px;
          }
          .url-box {
            background: #f1f5f9;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 11px;
            font-family: monospace;
            word-break: break-all;
            color: #334155;
            border: 1px dashed #cbd5e1;
          }
          .footer {
            margin-top: 24px;
            font-size: 11px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">${unitName}</div>
          <div class="subtitle">Acompanhamento da Fila em Tempo Real</div>
          <img class="qr-img" src="${qrDataUrl}" alt="QR Code da Fila" />
          <div class="instructions">Aponte a câmera do seu celular</div>
          <div class="desc">
            Escaneie o código acima para acompanhar sua posição na fila e ouvir as chamadas de atendimento diretamente no seu aparelho, sem necessidade de login.
          </div>
          <div class="url-box">${publicUrl}</div>
          <div class="footer">Sistema e-SUS PEC Multiprofissional • Sala de Espera</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="qr-code-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-750 text-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  QR Code da Fila de Espera
                </h3>
                <p className="text-xs text-slate-400">
                  Acesso público sem login para Smart TV e celular
                </p>
              </div>
            </div>
            <button
              type="button"
              id="qr-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            {/* White QR Code container for high contrast scanning */}
            <div className="p-4 bg-white rounded-3xl shadow-xl shadow-teal-950/40 border-4 border-teal-500/40">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code da Fila de Espera"
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl"
                />
              ) : (
                <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center text-slate-400 text-xs font-bold">
                  Gerando QR Code...
                </div>
              )}
            </div>

            {/* Explanatory text */}
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-200">
                Aponte a câmera do smartphone para escanear
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                O paciente acompanha a fila em tempo real no próprio celular, ou este link pode ser aberto no navegador de qualquer Smart TV.
              </p>
            </div>

            {/* Quick URL preview & copy */}
            <div className="w-full flex items-center gap-2 p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full bg-transparent text-slate-300 font-mono text-[11px] truncate focus:outline-none"
              />
              <SpecularButton
                type="button"
                id="qr-modal-copy-btn"
                onClick={handleCopy}
                size="sm"
                radius={10}
                className="shrink-0 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 px-3 py-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </SpecularButton>
            </div>

            {/* Actions Grid */}
            <div className="w-full grid grid-cols-2 gap-2 pt-2">
              <SpecularButton
                type="button"
                id="qr-modal-open-tv-btn"
                onClick={handleOpenNewTab}
                size="md"
                radius={14}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700 text-xs font-bold flex items-center justify-center gap-2 py-2.5"
              >
                <Tv className="w-4 h-4 text-teal-400" />
                <span>Abrir na TV</span>
              </SpecularButton>

              <SpecularButton
                type="button"
                id="qr-modal-print-btn"
                onClick={handlePrintQr}
                size="md"
                radius={14}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-slate-700 text-xs font-bold flex items-center justify-center gap-2 py-2.5"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir Placa</span>
              </SpecularButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
