import { ExamRequestData, RequestedExamItem, User, Consultation } from '../types';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
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

/**
 * Sorts requested exam items strictly in alphabetical order (A-Z) by name
 */
export function sortExamsAlphabetically(items: RequestedExamItem[]): RequestedExamItem[] {
  return [...(items || [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
}

/**
 * Generates a self-contained, standalone HTML document formatted strictly
 * for A4 Landscape (297mm x 210mm) with 2 identical exam request copies (1ª Via e 2ª Via),
 * with the exact same institutional header, logos, patient box, alphabetical exams list,
 * professional stamp/signature line, and address footer.
 */
export function generateExamRequestHtml(
  examRequest: ExamRequestData,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): string {
  const title = examRequest.title || 'SOLICITAÇÃO DE EXAMES';
  const patientName = examRequest.patientName || 'PACIENTE NÃO IDENTIFICADO';
  const patientAge = examRequest.patientAge || '--';
  const patientCns = examRequest.patientCns || '';
  const patientCpf = examRequest.patientCpf || '';
  const clinicalIndication = examRequest.clinicalIndicationGeneral || '';
  const dateFormatted =
    examRequest.dateFormatted ||
    'Anajás, ' +
      new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
  const docAuthor = resolveDocumentAuthor(examRequest, currentUser, undefined, parentConsultation);
  const professionalName = docAuthor.name;
  const professionalRegister = docAuthor.register;
  const professionalRole = docAuthor.role;
  const stampUrl = docAuthor.stampUrl;
  const useStamp = docAuthor.useStamp;

  const header = examRequest.header || {
    unitName: 'CENTRO DE ATENÇÃO PSICOSSOCIAL',
    authorityName: 'SECRETARIA MUNICIPAL DE SAÚDE',
    cityPrefecture: 'PREFEITURA MUNICIPAL DE ANAJÁS',
    leftLogoUrl: LOGO_CAPS_BASE64,
    rightLogoUrl: LOGO_CAPS_BASE64,
  };

  const footer = examRequest.footer || {
    addressLine1: 'TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000',
    addressLine2: 'SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)',
  };

  // Ensure logos
  const resolveLogo = (url?: string) => {
    if (!url || url.includes('/assets/logo-caps.jpg') || url.includes('logo-caps.jpg')) {
      return LOGO_CAPS_BASE64;
    }
    return url;
  };

  const leftLogo = resolveLogo(header.leftLogoUrl);
  const rightLogo = resolveLogo(header.rightLogoUrl);

  // Sort exams alphabetically
  const sortedExams = sortExamsAlphabetically(examRequest.items || []);

  const renderViaContent = (viaTitle: string) => {
    return `
    <div class="via-container">
      <!-- Top Section -->
      <div>
        <!-- Institutional Header -->
        <div class="inst-header">
          <div class="logo-box">
            <img src="${leftLogo}" alt="Logo CAPS" class="header-logo" />
          </div>
          <div class="header-text">
            <div class="unit-name">${header.unitName || 'CENTRO DE ATENÇÃO PSICOSSOCIAL'}</div>
            <div class="authority-name">${header.authorityName || 'SECRETARIA MUNICIPAL DE SAÚDE'}</div>
            <div class="city-name">${header.cityPrefecture || 'PREFEITURA MUNICIPAL DE ANAJÁS'}</div>
          </div>
          <div class="logo-box">
            <img src="${rightLogo}" alt="Logo CAPS" class="header-logo" />
          </div>
        </div>

        <!-- Exam Request Title -->
        <div class="title-bar">
          <span class="type-title">${title}</span>
          <span class="via-label">${viaTitle}</span>
        </div>

        <!-- Patient Info Box with Borders -->
        <table class="patient-table">
          <tr>
            <td class="pt-label" style="width: 14%;">NOME</td>
            <td class="pt-value" style="width: 56%; font-weight: bold;">${patientName}</td>
            <td class="pt-label" style="width: 14%;">IDADE</td>
            <td class="pt-value" style="width: 16%; text-align: center; font-weight: bold;">${patientAge}</td>
          </tr>
          ${
            patientCns || patientCpf
              ? `
          <tr>
            <td class="pt-label">${patientCns ? 'CNS' : 'CPF'}</td>
            <td class="pt-value" colspan="3">${patientCns || patientCpf}</td>
          </tr>
          `
              : ''
          }
        </table>

        <!-- Alphabetical Exam List -->
        <div class="exams-container">
          <div class="items-list">
            ${
              sortedExams.length === 0
                ? '<div class="empty-notice">Nenhum exame selecionado nesta solicitação.</div>'
                : sortedExams
                    .map((item, index) => {
                      return `
                  <div class="exam-item">
                    <div class="exam-number-name">
                      <span class="exam-num">${String(index + 1).padStart(2, '0')}.</span>
                      <span class="exam-name">${item.name}</span>
                    </div>
                  </div>
                `;
                    })
                    .join('')
            }
          </div>
        </div>
      </div>

      <!-- Bottom Section -->
      <div class="bottom-section">
        <!-- Date -->
        <div class="date-line">${dateFormatted}</div>

        <!-- Signature & Stamp Line -->
        <div class="signature-box">
          ${
            useStamp && stampUrl
              ? `<div style="text-align: center; margin: 0 auto;">
                   <img src="${stampUrl}" alt="Carimbo e Assinatura de ${professionalName}" style="max-height: 75px; max-width: 240px; object-fit: contain; margin: 0 auto; display: block;" />
                 </div>`
              : `
                <div class="signature-line"></div>
                <div class="prof-name">${professionalName}</div>
                <div class="prof-reg">${professionalRole ? `${professionalRole} • ` : ''}${professionalRegister || 'Carimbo e Assinatura'}</div>
              `
          }
        </div>

        <!-- Institutional Footer -->
        <div class="inst-footer">
          <div>${footer.addressLine1 || 'TRAVESSA FRANCISCO JR. FILHO'}</div>
          <div>${footer.addressLine2 || 'CIDADE NOVA I'}</div>
        </div>
      </div>
    </div>
  `;
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${typeof window !== 'undefined' ? window.location.origin : ''}/" />
  <title>${title} - ${patientName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 1.0cm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-sheet {
      width: 277mm;
      min-height: 190mm;
      max-height: 190mm;
      margin: 0 auto;
      display: flex;
      flex-direction: row;
      background: #ffffff;
      position: relative;
    }
    .via-wrapper {
      width: 50%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 4mm;
    }
    .via-wrapper:first-child {
      padding-right: 6mm;
      border-right: 1px dashed #94a3b8;
    }
    .via-wrapper:last-child {
      padding-left: 6mm;
    }
    .cut-guide {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      transform: translateX(-50%);
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 4mm 0;
      color: #94a3b8;
      font-size: 8px;
    }
    .cut-guide span {
      writing-mode: vertical-rl;
      letter-spacing: 2px;
      opacity: 0.7;
    }
    .via-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      min-height: 185mm;
    }
    .inst-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2mm;
      min-height: 18mm;
    }
    .logo-box {
      width: 22mm;
      height: 14mm;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .header-logo {
      width: auto !important;
      height: auto !important;
      max-width: 22mm !important;
      max-height: 14mm !important;
      object-fit: contain !important;
      display: block !important;
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: crisp-edges !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header-text {
      text-align: center;
      flex-grow: 1;
      padding: 0 4px;
    }
    .unit-name {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.2px;
      color: #0f172a;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .authority-name {
      font-size: 9.5px;
      font-weight: 600;
      color: #334155;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .city-name {
      font-size: 9px;
      font-weight: 500;
      color: #64748b;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .title-bar {
      margin-top: 2.5mm;
      margin-bottom: 2mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 1mm;
    }
    .type-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .via-label {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      background-color: #f1f5f9;
      padding: 1px 6px;
      border-radius: 3px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
    }
    .patient-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2.5mm;
      border: 1px solid #94a3b8;
    }
    .patient-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 6px;
      font-size: 10px;
    }
    .pt-label {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      font-size: 8.5px;
      text-transform: uppercase;
    }
    .pt-value {
      color: #0f172a;
      text-transform: uppercase;
    }
    .exams-container {
      margin-top: 2mm;
    }
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .exam-item {
      padding: 1.5px 3px;
      border-bottom: 1px dotted #e2e8f0;
    }
    .exam-number-name {
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    .exam-num {
      font-weight: 800;
      font-size: 9.5px;
      color: #0284c7;
      min-width: 20px;
    }
    .exam-name {
      font-size: 9.5px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      line-height: 1.25;
    }
    .empty-notice {
      color: #94a3b8;
      font-style: italic;
      text-align: center;
      padding: 6mm 0;
      font-size: 10px;
    }
    .bottom-section {
      margin-top: auto;
      padding-top: 3mm;
    }
    .date-line {
      text-align: right;
      font-size: 9.5px;
      color: #334155;
      font-weight: 600;
      margin-bottom: 5mm;
      padding-right: 2mm;
    }
    .signature-box {
      text-align: center;
      margin: 0 auto;
      max-width: 65%;
      margin-bottom: 3mm;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 1.5mm;
      width: 100%;
    }
    .prof-name {
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .prof-reg {
      font-size: 8.5px;
      font-weight: 600;
      color: #475569;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .inst-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 1.5mm;
      text-align: center;
      font-size: 8px;
      color: #64748b;
      line-height: 1.2;
      text-transform: uppercase;
    }
    @media screen {
      body {
        background-color: #e2e8f0;
        padding: 15px;
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
      .page-sheet {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        border: 1px solid #cbd5e1;
      }
    }
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .page-sheet {
        box-shadow: none !important;
        border: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="page-sheet">
    <!-- 1ª Via (Prestador / Laboratório) -->
    <div class="via-wrapper">
      ${renderViaContent('1ª VIA - LABORATÓRIO / PRESTADOR')}
    </div>

    <!-- Cut Guide Line -->
    <div class="cut-guide">
      <span>✂ RECORTAR</span>
      <span>✂ RECORTAR</span>
    </div>

    <!-- 2ª Via (Paciente / Prontuário) -->
    <div class="via-wrapper">
      ${renderViaContent('2ª VIA - PACIENTE / PRONTUÁRIO')}
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const images = Array.from(document.images);
      Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
        })
      ).then(() => {
        setTimeout(() => {
          try {
            window.print();
          } catch(e) {}
        }, 300);
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Direct print triggering via invisible iframe with automatic fallback to new tab
 */
export async function printExamRequest(
  examRequest: ExamRequestData,
  currentUser?: User | null
): Promise<{
  success: boolean;
  usedFallback: boolean;
  message?: string;
}> {
  try {
    const htmlContent = generateExamRequestHtml(examRequest, currentUser);
    const existingIframe = document.getElementById('print-exam-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-exam-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '297mm';
    iframe.style.height = '210mm';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      throw new Error('Não foi possível acessar o documento do iframe de impressão.');
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const images = Array.from(doc.images);
    await Promise.all(
      images.map(async (img) => {
        if (img.complete) {
          if ('decode' in img) {
            try {
              await img.decode();
            } catch (e) {}
          }
          return;
        }
        return new Promise<void>((resolve) => {
          img.onload = async () => {
            if ('decode' in img) {
              try {
                await img.decode();
              } catch (e) {}
            }
            resolve();
          };
          img.onerror = () => resolve();
        });
      })
    );

    await new Promise((r) => setTimeout(r, 250));

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
      iframe.remove();
    }, 60000);

    return { success: true, usedFallback: false };
  } catch (err) {
    console.warn('Iframe print blocked, opening new tab fallback:', err);
    try {
      openExamRequestInNewTab(examRequest, currentUser);
      return {
        success: true,
        usedFallback: true,
        message: 'Abertura em nova aba ativada.',
      };
    } catch (fallbackErr) {
      return {
        success: false,
        usedFallback: true,
        message: 'O navegador bloqueou a janela de impressão. Utilize o botão "Abrir em Nova Aba".',
      };
    }
  }
}

/**
 * Opens exam request sheet in a new browser tab formatted strictly for A4 Landscape with auto-print
 */
export function openExamRequestInNewTab(
  examRequest: ExamRequestData,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): Window | null {
  const htmlContent = generateExamRequestHtml(examRequest, currentUser, parentConsultation);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const newWin = window.open(blobUrl, '_blank');
  if (!newWin) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1000);
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
  return newWin;
}

/**
 * Downloads the exam request as a standalone HTML file
 */
export function downloadExamRequestHtml(
  examRequest: ExamRequestData,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): void {
  const htmlContent = generateExamRequestHtml(examRequest, currentUser, parentConsultation);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Solicitacao_Exames_${(examRequest.patientName || 'Paciente').replace(/\s+/g, '_')}_${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}
