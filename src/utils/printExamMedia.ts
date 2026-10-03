import { ExamMediaReportData, ExamMediaItem, Patient, User, Consultation } from '../types';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
import { formatSingleUnitAge, formatAnajasDate, formatPatientDocument } from './dateCalculator';
import QRCode from 'qrcode';
import { resolveDocumentAuthor } from './authorResolver';

function getStoredCurrentUser(): User | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('pec_current_user');
      if (saved) return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return null;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Splits media items into pages of up to 6 items each (2 columns x 3 rows).
 */
function chunkItems(items: ExamMediaItem[], chunkSize: number = 6): ExamMediaItem[][] {
  const chunks: ExamMediaItem[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks.length > 0 ? chunks : [[]];
}

/**
 * Generates an official, standalone HTML document formatted strictly
 * for A4 Portrait (210mm x 297mm) containing:
 * - Institutional Header (Prefeitura de Anajás / SUS / CAPS)
 * - Patient Information Table
 * - 2-column by 3-row media grid (up to 6 images/videos per page)
 * - Video QR Code overlay on top of video thumbnail
 * - Mandatory Legal Retention Notice (Art. 6º Lei Federal 13.787/2018)
 * - Professional signature and municipal footer
 */
export function generateExamMediaHtml(
  report: ExamMediaReportData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): string {
  const patientName = (report.patientName || patient?.fullName || 'PACIENTE NÃO IDENTIFICADO').toUpperCase();
  const ageFormatted = report.patientAgeFormatted || (patient?.birthDate ? formatSingleUnitAge(patient.birthDate) : report.patientAge || '--');
  const documentFormatted = report.patientDocument || formatPatientDocument(patient?.cpf, patient?.cns);
  const cityDateFormatted = report.dateFormatted || formatAnajasDate(report.createdAt);
  const examDateFormatted = report.examDate
    ? report.examDate.split('-').reverse().join('/')
    : new Date(report.createdAt).toLocaleDateString('pt-BR');

  const docAuthor = resolveDocumentAuthor(
    {
      professionalName: report.professionalName,
      professionalRole: report.professionalRole,
      professionalRegister: report.professionalRegister,
      professionalStampUrl: (report as any).professionalStampUrl || (report as any).digitalStampUrl,
      useDigitalStamp: (report as any).useDigitalStamp,
      authorId: (report as any).authorId,
      workplace: report.workplace,
    },
    currentUser,
    undefined,
    parentConsultation
  );

  const workplace = (docAuthor.workplace || report.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)').toUpperCase();
  const professionalName = docAuthor.name.toUpperCase();
  const professionalRole = (report.professionalRole || docAuthor.role || 'Enfermeiro / Médico').toUpperCase();
  const professionalRegister = (docAuthor.register || (docAuthor.councilBody ? `${docAuthor.councilBody}${docAuthor.councilUf ? `/${docAuthor.councilUf}` : ''} ${docAuthor.councilNumber || ''}`.trim() : '') || '').toUpperCase();
  const reportTitle = (report.title || 'ANEXO ICONOGRÁFICO DE EXAMES E VÍDEOS').toUpperCase();

  const stampUrl = docAuthor.stampUrl;
  const useStamp = docAuthor.useStamp;

  const legalYears = report.legalRetentionYears || 20;
  const validUntilFormatted = report.validUntilFormatted || (() => {
    const d = new Date(report.createdAt || Date.now());
    d.setFullYear(d.getFullYear() + legalYears);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  })();

  const legalNotice = report.legalNotice ||
    `As imagens e registros audiovisuais deste anexo iconográfico ficam disponíveis para acesso e visualização digital até ${validUntilFormatted} nos termos do Art. 6º da Lei Federal nº 13.787/2018 e Resolução CFM nº 1.821/2007 (Guarda e Disponibilização de Prontuário e Exames Digitais).`;

  const items = report.items && report.items.length > 0 ? report.items : [];
  const pages = chunkItems(items, 6);
  const totalPages = pages.length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Anexo Iconográfico - ${escapeHtml(patientName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 12mm 8mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .toolbar-container {
      width: 100%;
      background: #0f172a;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .toolbar-info {
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-badge {
      background: #0d9488;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print {
      background: #0d9488;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 6px rgba(13, 148, 136, 0.3);
    }
    .btn-print:hover {
      background: #0f766e;
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
      border: 1px solid #475569;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .sheet-wrapper {
      padding: 20px 0 40px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      width: 100%;
    }
    .a4-portrait-sheet {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      background: #ffffff;
      padding: 10mm 12mm 8mm 12mm;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }
    .a4-portrait-sheet:last-child {
      page-break-after: auto;
    }
    
    /* Media Grid: 2 columns with 3 rows (up to 6 items) */
    .media-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 10px;
      flex-grow: 1;
      margin: 8px 0;
    }
    .media-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      padding: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: 67mm;
    }
    .media-frame {
      position: relative;
      width: 100%;
      height: 44mm;
      background: #0f172a;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .media-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #0b1120;
    }
    .media-qr-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px;
    }
    .qr-badge-box {
      background: #ffffff;
      padding: 4px;
      border-radius: 6px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .qr-badge-box img {
      width: 25mm;
      height: 25mm;
      display: block;
    }
    .qr-scan-label {
      font-size: 8px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 2px;
      text-align: center;
    }
    .qr-play-pill {
      background: rgba(13, 148, 136, 0.95);
      color: #ffffff;
      font-size: 7.5px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .media-meta {
      padding-top: 4px;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .media-title-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .media-index-badge {
      background: #0d9488;
      color: #fff;
      font-size: 7.5px;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .media-title {
      font-size: 8.5px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .media-desc {
      font-size: 7.5px;
      line-height: 1.25;
      color: #334155;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-top: 1px;
    }

    /* Print settings */
    @media print {
      body {
        background: none !important;
      }
      .toolbar-container {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
        gap: 0 !important;
      }
      .a4-portrait-sheet {
        width: 100% !important;
        height: 297mm !important;
        min-height: 297mm !important;
        padding: 8mm 12mm 8mm 12mm !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        page-break-after: always !important;
      }
      .a4-portrait-sheet:last-child {
        page-break-after: auto !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Floating Browser Toolbar -->
  <div class="toolbar-container no-print">
    <div class="toolbar-info">
      <span class="toolbar-badge">A4 Retrato</span>
      <span><strong>Anexo Iconográfico (6 Imagens/Página):</strong> ${escapeHtml(patientName)}</span>
      <span style="font-size: 11px; color: #94a3b8;">(${items.length} mídia${items.length === 1 ? '' : 's'} • ${totalPages} página${totalPages === 1 ? '' : 's'})</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir A4
      </button>
      <button class="btn-secondary" onclick="window.print()">
        💾 Salvar PDF
      </button>
    </div>
  </div>

  <div class="sheet-wrapper">
    ${pages
      .map((pageItems, pageIdx) => {
        const pageNum = pageIdx + 1;
        return `
    <div class="a4-portrait-sheet">
      <!-- HEADER SECTION -->
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding: 0 6px 6px 6px; margin-bottom: 6px;">
          <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Brasão Município de Anajás" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>

          <div style="text-align: center; flex-grow: 1; padding: 0 10px;">
            <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; line-height: 1.15;">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div style="font-weight: 800; font-size: 9.5px; text-transform: uppercase; color: #334155; margin-top: 1px; letter-spacing: 0.3px;">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div style="font-weight: 700; font-size: 8.5px; text-transform: uppercase; color: #0d9488; margin-top: 1px;">
              ${escapeHtml(workplace)}
            </div>
            <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #0f172a; margin-top: 3px; padding: 2px 14px; background: #f0fdfa; border-radius: 4px; display: inline-block; border: 1.2px solid #99f6e4; letter-spacing: 1.2px;">
              ${escapeHtml(reportTitle)}
            </div>
          </div>

          <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Logo SUS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>

        <!-- PATIENT IDENTIFICATION BOX -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 6px; border: 1px solid #cbd5e1; background: #f8fafc;">
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 4px 6px; width: 50%;">
                <strong style="color: #475569; font-size: 7.5px; text-transform: uppercase; display: block;">PACIENTE</strong>
                <span style="font-weight: 800; font-size: 10px; color: #0f172a;">${escapeHtml(patientName)}</span>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 4px 6px; width: 18%;">
                <strong style="color: #475569; font-size: 7.5px; text-transform: uppercase; display: block;">IDADE</strong>
                <span style="font-weight: 700; color: #0f172a;">${escapeHtml(ageFormatted)}</span>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 4px 6px; width: 18%;">
                <strong style="color: #475569; font-size: 7.5px; text-transform: uppercase; display: block;">DOCUMENTO (CPF/CNS)</strong>
                <span style="font-weight: 700; color: #0f172a;">${escapeHtml(documentFormatted)}</span>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 4px 6px; width: 14%;">
                <strong style="color: #475569; font-size: 7.5px; text-transform: uppercase; display: block;">DATA DO EXAME</strong>
                <span style="font-weight: 700; color: #0f172a;">${escapeHtml(examDateFormatted)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MEDIA GRID (2 COLUMNS X 3 ROWS = UP TO 6 IMAGES) -->
      <div class="media-grid">
        ${pageItems
          .map((item, idx) => {
            const globalIndex = pageIdx * 6 + idx + 1;
            const isVideo = item.type === 'video';
            const imgSource = isVideo
              ? item.videoThumbnailDataUrl || item.imageDataUrl || ''
              : item.imageDataUrl || '';

            return `
        <div class="media-card">
          <div class="media-frame">
            ${
              imgSource
                ? `<img src="${imgSource}" alt="${escapeHtml(item.title)}" class="media-img" />`
                : `<div style="color: #94a3b8; font-size: 8px; text-align: center; padding: 10px;">Sem imagem capturada</div>`
            }

            ${
              isVideo
                ? `
            <div class="media-qr-overlay">
              ${
                item.qrCodeDataUrl
                  ? `
              <div class="qr-badge-box">
                <img src="${item.qrCodeDataUrl}" alt="QR Code Vídeo" />
                <div class="qr-scan-label">Aponte a Câmera</div>
              </div>`
                  : ''
              }
              <div class="qr-play-pill">
                <span>▶ EXAME EM VÍDEO</span>
              </div>
            </div>`
                : ''
            }
          </div>

          <div class="media-meta">
            <div class="media-title-row">
              <span class="media-index-badge">#${globalIndex}</span>
              <span class="media-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title || `Registro #${globalIndex}`)}</span>
            </div>
            ${
              item.description
                ? `<p class="media-desc" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</p>`
                : ''
            }
          </div>
        </div>`;
          })
          .join('')}

        ${
          // Fill empty cells if fewer than 6 items on this page, maintaining grid height stability
          Array.from({ length: Math.max(0, 6 - pageItems.length) })
            .map(
              () => `
          <div class="media-card" style="border: 1px dashed #e2e8f0; background: #fafafa; opacity: 0.5;">
            <div class="media-frame" style="background: transparent;"></div>
          </div>`
            )
            .join('')
        }
      </div>

      <!-- FOOTER SECTION -->
      <div>
        <!-- MANDATORY LEGAL NOTICE (Small, direct font complying with user prompt) -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 3px solid #0d9488; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px;">
          <div style="font-size: 7.5px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px;">
            Vigência e Disponibilidade Legal Digital (Art. 6º Lei Federal nº 13.787/2018):
          </div>
          <div style="font-size: 7px; color: #475569; line-height: 1.35;">
            ${escapeHtml(legalNotice)}
          </div>
        </div>

        <!-- Professional Signature & Municipal Date -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 4px;">
          <div style="font-size: 8px; color: #64748b; font-weight: 600;">
            Página ${pageNum} de ${totalPages}
          </div>

          <div style="text-align: center; min-width: 220px;">
            ${
              useStamp && stampUrl
                ? `<img src="${stampUrl}" alt="Carimbo e Assinatura de ${escapeHtml(professionalName)}" style="max-height: 70px; max-width: 220px; object-fit: contain; margin: 0 auto; display: block;" />`
                : `
                  <div style="border-top: 1px solid #0f172a; padding-top: 3px; font-size: 9px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
                    ${escapeHtml(professionalName)}
                  </div>
                  <div style="font-size: 8px; font-weight: 700; color: #334155; text-transform: uppercase;">
                    ${escapeHtml(professionalRole)} ${professionalRegister ? `• ${escapeHtml(professionalRegister)}` : ''}
                  </div>
                  <div style="font-size: 7.5px; font-weight: 600; color: #64748b; text-transform: uppercase;">
                    ${escapeHtml(workplace)}
                  </div>
                `
            }
          </div>

          <div style="font-size: 8.5px; font-weight: 700; color: #0f172a; text-align: right;">
            ${escapeHtml(cityDateFormatted)}
          </div>
        </div>

        <!-- Standard Institutional Footer -->
        <div style="text-align: center; font-size: 7.5px; font-weight: 600; color: #64748b; text-transform: uppercase; line-height: 1.3; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
          <div>TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000</div>
          <div>SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PRIMÁRIA E PSICOSSOCIAL (RAPS)</div>
        </div>
      </div>
    </div>`;
      })
      .join('')}
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;
}

function getPublicPrintBaseUrl(): string {
  let origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  return origin;
}

/**
 * Ensures all video items in the Exam Media report have QR codes generated for playback.
 */
export async function ensureExamMediaQRCodes(report: ExamMediaReportData): Promise<ExamMediaReportData> {
  let currentReport = { ...report };
  if (currentReport.items && Array.isArray(currentReport.items)) {
    const updatedItems = await Promise.all(
      currentReport.items.map(async (item) => {
        if (item.type === 'video' && !item.qrCodeDataUrl) {
          try {
            const baseUrl = getPublicPrintBaseUrl();
            const safeVideoUrl = item.videoUrl && !item.videoUrl.startsWith('data:') ? item.videoUrl : '';
            const qp = new URLSearchParams();
            if (item.title) qp.set('t', item.title.slice(0, 35));
            if (safeVideoUrl && !safeVideoUrl.startsWith('/api/videos/')) {
              qp.set('v', safeVideoUrl);
            }
            qp.set('portal', 'video');
            const watchUrl = `${baseUrl}/watch-video/${item.id}${qp.toString() ? `?${qp.toString()}` : ''}`;
            const qr = await QRCode.toDataURL(watchUrl, {
              width: 280,
              margin: 2,
              color: { dark: '#0f172a', light: '#ffffff' },
              errorCorrectionLevel: 'M',
            });
            return { ...item, qrCodeDataUrl: qr };
          } catch {
            return item;
          }
        }
        return item;
      })
    );
    currentReport.items = updatedItems;
  }
  return currentReport;
}

/**
 * Opens the Exam Media A4 report in a new tab, automatically launching the print dialog.
 */
export async function openExamMediaInNewTab(
  report: ExamMediaReportData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): Promise<Window | null> {
  const currentReport = await ensureExamMediaQRCodes(report);

  const htmlContent = generateExamMediaHtml(currentReport, patient, currentUser, parentConsultation);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const newWin = window.open(blobUrl, '_blank');
  if (!newWin) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 60000);

  return newWin;
}
