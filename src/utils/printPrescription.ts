import { PrescriptionData, PrescribedMedicationItem, User, Consultation } from '../types';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
import { DEFAULT_CBO_MAP } from '../data/professions';
import { resolveDocumentAuthor } from './authorResolver';

const ROUTE_ORDER_PRIORITY: Record<string, number> = {
  'USO ORAL': 10,
  'ORAL': 10,
  'USO SUBLINGUAL': 20,
  'SUBLINGUAL': 20,
  'USO TÓPICO': 30,
  'USO DERMATOLÓGICO': 31,
  'TÓPICO': 30,
  'USO NASAL': 40,
  'NASAL': 40,
  'USO OFTÁLMICO': 50,
  'OFTÁLMICO': 50,
  'USO OTOLÓGICO': 60,
  'OTOLÓGICO': 60,
  'USO INALATÓRIO': 70,
  'INALATÓRIO': 70,
  'USO RETAL': 80,
  'USO VAGINAL': 85,
  'USO INTRAMUSCULAR': 90,
  'USO IM': 90,
  'IM': 90,
  'USO INTRAVENOSO': 100,
  'USO IV': 100,
  'IV': 100,
  'USO SUBCUTÂNEO': 110,
  'USO SC': 110,
  'SC': 110,
};

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
 * Generates a self-contained, standalone HTML document formatted strictly
 * for A4 Landscape (297mm x 210mm) with 2 identical prescription copies.
 */
export function generatePrescriptionHtml(
  prescription: PrescriptionData,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): string {
  const type = prescription.type || 'PRESCRIÇÃO';
  const patientName = prescription.patientName || 'PACIENTE NÃO IDENTIFICADO';
  const patientAge = prescription.patientAge || '--';
  const dateFormatted =
    prescription.dateFormatted ||
    'Anajás, ' +
      new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
  const defaultRoute = prescription.defaultRoute || 'USO ORAL';
  const items = prescription.items || [];
  const docAuthor = resolveDocumentAuthor(prescription, currentUser, undefined, parentConsultation);
  const professionalName = docAuthor.name;
  const professionalRegister = docAuthor.register;

  const header = prescription.header || {
    unitName: 'CENTRO DE ATENÇÃO PSICOSSOCIAL',
    authorityName: 'SECRETARIA MUNICIPAL DE SAÚDE',
    cityPrefecture: 'PREFEITURA MUNICIPAL DE ANAJÁS',
    leftLogoUrl: LOGO_CAPS_BASE64,
    rightLogoUrl: LOGO_CAPS_BASE64,
  };

  const footer = prescription.footer || {
    addressLine1: 'TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000',
    addressLine2: 'SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)',
  };

  const stampUrl = docAuthor.stampUrl;
  const useStamp = docAuthor.useStamp;

  const profRoleKey = (docAuthor.role || 'enfermeiro').toLowerCase();
  const cboCode = docAuthor.authorUser?.cboCode || docAuthor.authorUser?.cbo || DEFAULT_CBO_MAP[profRoleKey] || '';
  const cboFormatted = cboCode ? (cboCode.toUpperCase().startsWith('CBO') ? cboCode.toUpperCase() : `CBO ${cboCode}`) : '';

  let councilInfo = '';
  if (docAuthor.authorUser?.councilBody && docAuthor.authorUser?.councilNumber) {
    councilInfo = `${docAuthor.authorUser.councilBody}${docAuthor.authorUser.councilUf ? `/${docAuthor.authorUser.councilUf}` : ''} ${docAuthor.authorUser.councilNumber}`.trim();
  } else if (professionalRegister) {
    councilInfo = professionalRegister.trim();
  }

  // Helper to ensure logo is either valid custom data/http URI or fallback to institutional base64
  const resolveLogo = (url?: string) => {
    if (!url || url.includes('/assets/logo-caps.jpg') || url.includes('logo-caps.jpg')) {
      return LOGO_CAPS_BASE64;
    }
    return url;
  };

  const leftLogo = resolveLogo(header.leftLogoUrl);
  const rightLogo = resolveLogo(header.rightLogoUrl);

  // Group medications by route
  const groupedByRoute: Record<string, PrescribedMedicationItem[]> = {};
  if (items && items.length > 0) {
    items.forEach((item) => {
      const routeKey = (item.route || defaultRoute || 'USO ORAL').trim().toUpperCase();
      if (!groupedByRoute[routeKey]) {
        groupedByRoute[routeKey] = [];
      }
      groupedByRoute[routeKey].push(item);
    });
  } else {
    groupedByRoute[defaultRoute || 'USO ORAL'] = [];
  }

  // Sort routes by standard medical priority (Oral first, Topical, IM, IV, etc.)
  const sortedRouteEntries = Object.entries(groupedByRoute).sort(([routeA], [routeB]) => {
    const prioA = ROUTE_ORDER_PRIORITY[routeA] ?? 900;
    const prioB = ROUTE_ORDER_PRIORITY[routeB] ?? 900;
    return prioA - prioB;
  });

  const renderViaContent = (viaTitle: string) => {
    let globalMedIndex = 1;
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

        <!-- Prescription Title -->
        <div class="title-bar">
          <span class="type-title">${type}</span>
          <span class="via-label">${viaTitle}</span>
        </div>

        <!-- Patient Info Box with Borders -->
        <table class="patient-table">
          <tr>
            <td class="pt-label" style="width: 15%;">NOME</td>
            <td class="pt-value" style="width: 55%; font-weight: bold;">${patientName}</td>
            <td class="pt-label" style="width: 15%;">IDADE</td>
            <td class="pt-value" style="width: 15%; text-align: center; font-weight: bold;">${patientAge}</td>
          </tr>
        </table>

        <!-- Medication List Grouped by Route with Continuous Global Numbering -->
        <div class="meds-container">
          ${sortedRouteEntries
            .map(
              ([route, routeItems]) => `
              <div class="route-group">
                <div class="route-header"><span>${route}</span></div>
                <div class="items-list">
                  ${
                    routeItems.length === 0
                      ? '<div class="empty-notice">Nenhum medicamento prescrito.</div>'
                      : routeItems
                          .map((item) => {
                            const currentNum = globalMedIndex++;
                            return `
                        <div class="med-item">
                          <div class="med-name">${currentNum}- ${item.medicationName}</div>
                          <div class="med-details">
                            ${item.posology ? `<div class="med-posology">${item.posology}</div>` : ''}
                            ${item.duration ? `<div class="med-duration">${item.duration}</div>` : ''}
                            ${item.scheduleInstructions ? `<div class="med-schedule">${item.scheduleInstructions}</div>` : ''}
                          </div>
                        </div>
                      `;
                          })
                          .join('')
                  }
                </div>
              </div>
            `
            )
            .join('')}
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
              ? `<img src="${stampUrl}" alt="Carimbo e Assinatura" style="max-height: 75px; max-width: 240px; object-fit: contain; margin: 0 auto; display: block;" />`
              : `
              <div class="signature-line"></div>
              <div class="prof-name">${professionalName}</div>
              ${cboFormatted ? `<div class="prof-reg" style="font-weight: 700;">${cboFormatted}</div>` : ''}
              ${councilInfo ? `<div class="prof-reg">${councilInfo}</div>` : `<div class="prof-reg">${professionalRegister || 'Carimbo e Assinatura'}</div>`}
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
  <title>${type} - ${patientName}</title>
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
      flex: 1;
      padding: 0 2mm;
    }
    .unit-name {
      font-size: 11px;
      font-weight: 900;
      color: #172554;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .authority-name {
      font-size: 9.5px;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      line-height: 1.15;
      margin-top: 0.5mm;
    }
    .city-name {
      font-size: 9.5px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .title-bar {
      text-align: center;
      position: relative;
      padding: 1.5mm 0 1mm 0;
    }
    .type-title {
      font-size: 14px;
      font-weight: 900;
      color: #1e40af;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .via-label {
      position: absolute;
      right: 0;
      top: 2mm;
      font-size: 8px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .patient-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #0f172a;
      margin-top: 1mm;
      font-size: 10px;
    }
    .patient-table td {
      border: 1px solid #0f172a;
      padding: 1mm 2mm;
      vertical-align: middle;
    }
    .pt-label {
      background: #f1f5f9;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.5px;
      font-size: 9px;
      color: #0f172a;
    }
    .pt-value {
      text-transform: uppercase;
      color: #0f172a;
    }
    .meds-container {
      padding-top: 2.5mm;
    }
    .route-group {
      margin-bottom: 2.5mm;
    }
    .route-header {
      text-align: center;
      margin-bottom: 1.5mm;
    }
    .route-header span {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #0f172a;
      padding-bottom: 0.5mm;
      display: inline-block;
    }
    .items-list {
      padding-left: 1mm;
    }
    .med-item {
      margin-bottom: 2mm;
    }
    .med-name {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
    }
    .med-details {
      padding-left: 4mm;
      padding-top: 0.5mm;
      font-size: 10px;
      font-weight: 500;
      color: #1e293b;
    }
    .med-posology {
      font-weight: 700;
      text-transform: uppercase;
    }
    .med-duration, .med-schedule {
      text-transform: uppercase;
    }
    .bottom-section {
      padding-top: 3mm;
    }
    .date-line {
      text-align: right;
      font-size: 10px;
      color: #1e293b;
      padding-right: 2mm;
      margin-bottom: 2mm;
    }
    .signature-box {
      text-align: center;
      max-width: 60mm;
      margin: 0 auto;
      padding-top: 1mm;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 1mm;
    }
    .prof-name {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
    }
    .prof-reg {
      font-size: 9px;
      font-weight: 500;
      color: #334155;
    }
    .inst-footer {
      text-align: center;
      font-size: 8px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      border-top: 1px solid #e2e8f0;
      padding-top: 1mm;
      margin-top: 2.5mm;
      line-height: 1.2;
    }
    .empty-notice {
      color: #94a3b8;
      font-style: italic;
      text-align: center;
      padding: 3mm 0;
      font-size: 9px;
    }
    @media print {
      body {
        background: #ffffff !important;
      }
      .page-sheet {
        margin: 0 !important;
        width: 100% !important;
        min-height: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="page-sheet">
    <div class="via-wrapper">
      ${renderViaContent('1ª VIA: FARMÁCIA')}
    </div>
    <div class="via-wrapper">
      ${renderViaContent('2ª VIA: PACIENTE')}
    </div>
    <div class="cut-guide">
      <div>✂</div>
      <span>CORTE</span>
      <div>✂</div>
    </div>
  </div>
  <script>
    // Auto-trigger print when opened standalone, ensuring images are fully decoded
    window.addEventListener('load', async function() {
      try {
        var imgs = Array.from(document.images);
        await Promise.all(imgs.map(function(img) {
          if (img.complete) {
            return img.decode ? img.decode().catch(function() {}) : Promise.resolve();
          }
          return new Promise(function(resolve) {
            img.onload = function() {
              if (img.decode) {
                img.decode().catch(function() {}).finally(resolve);
              } else {
                resolve();
              }
            };
            img.onerror = resolve;
          });
        }));
      } catch (e) {}
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;
}

/**
 * Robust print executor:
 * 1. Tries hidden iframe with preloaded & decoded images.
 * 2. If blocked by browser sandbox (e.g. within an iframe), falls back to opening a Blob URL in a new tab.
 */
export async function executePrintPrescription(prescription: PrescriptionData): Promise<{
  success: boolean;
  usedFallback: boolean;
  message?: string;
}> {
  const htmlContent = generatePrescriptionHtml(prescription);

  try {
    // Attempt 1: Isolated Hidden Iframe
    const existingFrame = document.getElementById('prescription-print-iframe');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'prescription-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
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

    // Wait for images to load and decode into memory
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

    // Wait a brief tick for layout settling and rasterization
    await new Promise((r) => setTimeout(r, 250));

    // Try printing
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Schedule cleanup
    setTimeout(() => {
      iframe.remove();
    }, 60000);

    return { success: true, usedFallback: false };
  } catch (err) {
    console.warn('Iframe print blocked or failed, attempting new tab fallback:', err);

    // Fallback: Open clean standalone Blob in new tab with auto-print
    try {
      openPrescriptionInNewTab(prescription);
      return {
        success: true,
        usedFallback: true,
        message: 'Abertura em nova aba ativada devido às permissões do ambiente.',
      };
    } catch (fallbackErr) {
      console.error('All print methods failed:', fallbackErr);
      // Final attempt: native window.print()
      try {
        window.focus();
        window.print();
        return { success: true, usedFallback: true };
      } catch (finalErr) {
        return {
          success: false,
          usedFallback: true,
          message: 'O navegador bloqueou a caixa de impressão. Clique no botão "Abrir em Nova Aba".',
        };
      }
    }
  }
}

/**
 * Opens the prescription in a new browser tab formatted strictly for A4 Landscape with auto-print.
 * This is 100% immune to iframe sandboxing restrictions.
 */
export function openPrescriptionInNewTab(
  prescription: PrescriptionData,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): Window | null {
  const htmlContent = generatePrescriptionHtml(prescription, currentUser, parentConsultation);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  // Try window.open
  const newWin = window.open(blobUrl, '_blank');
  if (!newWin) {
    // If window.open was blocked by popup blocker, use a dynamic link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 1000);
  }

  // Revoke URL after 2 minutes
  setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);

  return newWin;
}

/**
 * Downloads the exact prescription as a standalone HTML file ready to print in any browser.
 */
export function downloadPrescriptionHtml(
  prescription: PrescriptionData,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): void {
  const htmlContent = generatePrescriptionHtml(prescription, currentUser, parentConsultation);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Receituario_${(prescription.patientName || 'Paciente').replace(/\s+/g, '_')}_${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}
