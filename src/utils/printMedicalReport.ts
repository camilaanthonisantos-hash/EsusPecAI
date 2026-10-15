import { MedicalReportData, Patient, User, Consultation } from '../types';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
import { formatSingleUnitAge, formatAnajasDate, formatPatientDocument } from './dateCalculator';
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
 * Generates an official, standalone HTML document formatted strictly
 * for A4 Portrait (210mm x 297mm) representing a SUS Official Medical Report (Laudo Médico).
 */
export function generateMedicalReportHtml(
  report: MedicalReportData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): string {
  const patientName = (report.patientName || patient?.fullName || 'PACIENTE NÃO IDENTIFICADO').toUpperCase();

  // Exact single unit age: "idade sem informar meses e dias. Ex: 1 ano ou 10 meses ou 25 dias."
  const ageFormatted = report.patientAgeFormatted || (patient?.birthDate ? formatSingleUnitAge(patient.birthDate) : '--');

  // Document: CPF ou CNS
  const documentFormatted = report.patientDocument || formatPatientDocument(patient?.cpf, patient?.cns);

  // Date format: "Anajás, dd de [mes por extenso] de aaaa"
  const cityDateFormatted = report.cityDateFormatted || formatAnajasDate(report.createdAt);

  const docAuthor = resolveDocumentAuthor(
    {
      professionalName: report.professionalName,
      professionalRole: report.professionalSpecialty,
      professionalRegister: report.professionalCouncil,
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
  const professionalSpecialty = (report.professionalSpecialty || docAuthor.role || 'Clínica Médica / Psiquiatria').toUpperCase();
  const professionalCouncil = (docAuthor.register || (docAuthor.councilBody ? `${docAuthor.councilBody}${docAuthor.councilUf ? `/${docAuthor.councilUf}` : ''} ${docAuthor.councilNumber || ''}`.trim() : '') || 'CRM/PA').toUpperCase();
  const rawCid = report.cid10 || 'Não informada';
  const cidItems = rawCid
    .split(/\s*;\s*|\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
  const cid10 = rawCid.toUpperCase();
  const purpose = report.purpose ? report.purpose.trim() : '';

  const stampUrl = docAuthor.stampUrl;
  const useStamp = docAuthor.useStamp;

  // Process paragraphs in description
  const descriptionParagraphs = (report.description || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laudo Médico - ${escapeHtml(patientName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 10mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
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
      justify-content: center;
      width: 100%;
    }
    .a4-portrait-sheet {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      padding: 12mm 14mm 10mm 14mm;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .laudo-body-text {
      font-size: 11.5px;
      line-height: 1.65;
      color: #1e293b;
      text-align: justify;
      margin-bottom: 12px;
      text-indent: 28px;
    }
    .laudo-body-text:first-child {
      margin-top: 4px;
    }
    @media print {
      body {
        background: none !important;
      }
      .toolbar-container {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
      }
      .a4-portrait-sheet {
        width: 100% !important;
        min-height: 297mm !important;
        height: auto !important;
        padding: 12mm 14mm 10mm 14mm !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break-inside-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <!-- Toolbar for browser preview -->
  <div class="toolbar-container no-print">
    <div class="toolbar-info">
      <span class="toolbar-badge">A4 Retrato</span>
      <span><strong>Laudo Médico Oficial:</strong> ${escapeHtml(patientName)}</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir Laudo A4
      </button>
      <button class="btn-secondary" onclick="window.print()">
        💾 Salvar PDF
      </button>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="a4-portrait-sheet">
      <div>
        <!-- Institutional Header with LAUDO MÉDICO Title -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding: 0 10px 8px 10px; margin-bottom: 12px;">
          <div style="width: 124px; height: 124px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 2px;">
            <img src="${LOGO_CAPS_BASE64}" alt="Brasão Município de Anajás" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>

          <div style="text-align: center; flex-grow: 1; padding: 0 12px;">
            <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; line-height: 1.2;">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div style="font-weight: 800; font-size: 11px; text-transform: uppercase; color: #334155; margin-top: 1px; letter-spacing: 0.3px;">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: #0d9488; margin-top: 1px;">
              ${escapeHtml(workplace)}
            </div>
            <div style="font-weight: 900; font-size: 14px; text-transform: uppercase; color: #0f172a; margin-top: 4px; padding: 3px 18px; background: #f0fdfa; border-radius: 4px; display: inline-block; border: 1.5px solid #99f6e4; letter-spacing: 1.5px;">
              LAUDO MÉDICO
            </div>
          </div>

          <div style="width: 124px; height: 124px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 2px;">
            <img src="${LOGO_CAPS_BASE64}" alt="Logo SUS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>

        <!-- Patient Identification Section (Nome e Idade na mesma linha, Documento) -->
        <div style="border: 1px solid #94a3b8; border-radius: 4px; overflow: hidden; margin-bottom: 14px; background: #f8fafc;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <tbody>
              <tr>
                <th style="width: 14%; background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; color: #1e293b;">
                  PACIENTE:
                </th>
                <td style="width: 54%; padding: 6px 8px; font-weight: 800; font-size: 12px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; text-transform: uppercase; color: #0f172a;">
                  ${escapeHtml(patientName)}
                </td>
                <th style="width: 12%; background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; color: #1e293b;">
                  IDADE:
                </th>
                <td style="width: 20%; padding: 6px 8px; font-weight: 700; font-size: 11px; border-bottom: 1px solid #cbd5e1; color: #0f172a;">
                  ${escapeHtml(ageFormatted)}
                </td>
              </tr>
              <tr>
                <th style="width: 14%; background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 800; text-transform: uppercase; border-right: 1px solid #cbd5e1; color: #1e293b;">
                  DOCUMENTO:
                </th>
                <td style="padding: 6px 8px; font-weight: 700; font-size: 11px; color: #0f172a;" colspan="3">
                  ${escapeHtml(documentFormatted)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Description of the Medical Report (Laudo Médico) -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-bottom: 6px; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
            DESCRIÇÃO CLÍNICA E PARECER MÉDICO:
          </div>

          <div style="min-height: 220px; padding: 4px 2px;">
            ${
              descriptionParagraphs.length > 0
                ? descriptionParagraphs
                    .map((p) => `<p class="laudo-body-text">${escapeHtml(p)}</p>`)
                    .join('')
                : `<p class="laudo-body-text">${escapeHtml(report.description || 'Atesto para os devidos fins que o(a) paciente supracitado(a) encontra-se em acompanhamento médico regular neste serviço de saúde.')}</p>`
            }
          </div>
        </div>

        <!-- CID-10 Section at the End of the Body (sem parênteses e sem cabeçalho longo) -->
        <div style="border: 1.5px solid #0f172a; border-radius: 4px; padding: 8px 12px; margin-top: 10px; margin-bottom: 16px; background: #f8fafc;">
          <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
            ${cidItems.length > 1 ? 'CLASSIFICAÇÃO INTERNACIONAL DE DOENÇAS (CID-10):' : 'CID-10:'}
          </div>
          <div style="margin-top: 3px;">
            ${cidItems.length > 1
              ? cidItems
                  .map(
                    (c) => `
                <div style="font-size: 12.5px; font-weight: 800; color: #0f172a; margin-top: 2px; line-height: 1.35;">
                  • ${escapeHtml(c.toUpperCase())}
                </div>`
                  )
                  .join('')
              : `
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px;">
                  ${escapeHtml(cid10)}
                </div>`
            }
          </div>
        </div>
      </div>

      <!-- Footer Section with Date (Right-Aligned), Centered Signature Block & Institutional Address -->
      <div class="page-break-inside-avoid" style="margin-top: 20px;">
        <!-- Date formatted as "Anajás, dd de [mes por extenso] de aaaa" (Aligned to Right Margin) -->
        <div style="text-align: right; font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 24px; padding-right: 4px;">
          ${escapeHtml(cityDateFormatted)}
        </div>

        <!-- Centered Signature Block (Linha, Nome do Profissional com Especialidade, Órgão de Classe) -->
        <div style="margin: 0 auto; width: 340px; text-align: center;">
          ${
            useStamp && stampUrl
              ? `<div style="text-align: center; margin: 0 auto;">
                   <img src="${stampUrl}" alt="Carimbo e Assinatura de ${escapeHtml(professionalName)}" style="max-height: 90px; max-width: 280px; object-fit: contain; margin: 0 auto; display: block;" />
                 </div>`
              : `
                <div style="border-top: 1.5px solid #0f172a; margin-bottom: 5px;"></div>
                <div style="font-weight: 900; font-size: 12.5px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px;">
                  ${escapeHtml(professionalName)}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; margin-top: 1px;">
                  ${escapeHtml(professionalSpecialty)}
                </div>
                ${
                  professionalCouncil
                    ? `<div style="font-size: 11px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-top: 1px;">
                        ${escapeHtml(professionalCouncil)}
                      </div>`
                    : ''
                }
              `
          }
        </div>

        <!-- Standard Institutional Footer -->
        <div style="text-align: center; font-size: 8.5px; font-weight: 600; color: #64748b; text-transform: uppercase; line-height: 1.35; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
          <div>TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000</div>
          <div>SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)</div>
        </div>
      </div>
    </div>
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

/**
 * Opens the Medical Report in a new browser tab formatted strictly for A4 Portrait,
 * automatically opening the print dialog.
 */
export function openMedicalReportInNewTab(
  report: MedicalReportData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): Window | null {
  const htmlContent = generateMedicalReportHtml(report, patient, currentUser, parentConsultation);
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
