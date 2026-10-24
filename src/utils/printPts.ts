import { PtsData, Patient, User, Consultation } from '../types';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
import { calculateChronologicalAge } from './dateCalculator';
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

export function getPtsSectionTitles(role?: string): { diagTitle: string; actionTitle: string } {
  const r = (role || '').toLowerCase();
  if (r.includes('enferm')) {
    return { diagTitle: 'DIAGNÓSTICOS DE ENFERMAGEM:', actionTitle: 'INTERVENÇÕES:' };
  }
  if (r.includes('médic') || r.includes('medic')) {
    return { diagTitle: 'DIAGNÓSTICOS MÉDICOS:', actionTitle: 'CONDUTAS MÉDICAS:' };
  }
  if (r.includes('psicó') || r.includes('psico')) {
    return { diagTitle: 'AVALIAÇÃO E DIAGNÓSTICO PSICOSSOCIAL:', actionTitle: 'INTERVENÇÕES PSICOLÓGICAS:' };
  }
  if (r.includes('assist') || r.includes('social') || r.includes('cress')) {
    return { diagTitle: 'AVALIAÇÃO SOCIOASSISTENCIAL:', actionTitle: 'INTERVENÇÕES SOCIAIS:' };
  }
  if (r.includes('nutri')) {
    return { diagTitle: 'AVALIAÇÃO NUTRICIONAL:', actionTitle: 'INTERVENÇÕES NUTRICIONAIS:' };
  }
  if (r.includes('terap') || r.includes('ocupacional')) {
    return { diagTitle: 'AVALIAÇÃO TERAPÊUTICA OCUPACIONAL:', actionTitle: 'INTERVENÇÕES TERAPÊUTICAS:' };
  }
  if (r.includes('fisioter')) {
    return { diagTitle: 'AVALIAÇÃO FISIOTERAPÊUTICA:', actionTitle: 'INTERVENÇÕES FISIOTERAPÊUTICAS:' };
  }
  const spec = role ? role.toUpperCase() : 'ESPECIALIZADA';
  return { diagTitle: `AVALIAÇÃO E DIAGNÓSTICO (${spec}):`, actionTitle: `PLANO TERAPÊUTICO E INTERVENÇÕES (${spec}):` };
}

function formatPtsNumberedItems(sourceText?: string, fallbackList: string[] = [], maxItems: number = 6): string {
  const raw = (sourceText || '').trim();
  let items: string[] = [];

  if (raw) {
    const lines = raw
      .replace(/^>\s*/gm, '')
      .split(/\n+|;(?=\s*[A-ZÀ-Ú0-9a-z\-])/);

    for (const line of lines) {
      const cleaned = line
        .replace(/^[\d\s.\-•*>]+/g, '')
        .trim();
      if (cleaned.length > 2) {
        items.push(cleaned);
      }
    }
  }

  if (items.length === 0 && fallbackList.length > 0) {
    items = fallbackList;
  }

  if (items.length === 0) {
    items = ['Acompanhamento e monitoramento periódico conforme plano terapêutico singular.'];
  }

  const finalItems = items.slice(0, maxItems);

  return finalItems
    .map((item, idx) => {
      let text = item.trim();
      const isLast = idx === finalItems.length - 1;
      text = text.replace(/[;.,\s]+$/, '');
      if (isLast) {
        text = text + '.';
      } else {
        text = text + ';';
      }
      return `<div style="font-size: 11px; font-weight: bold; font-style: italic; color: #0f172a; margin-bottom: 3.5px; line-height: 1.35; text-align: justify;">
        ${idx + 1}. ${escapeHtml(text)}
      </div>`;
    })
    .join('');
}

function formatPtsCidList(pts: PtsData, parentConsultation?: Consultation | null): string {
  const cids: string[] = [];

  if (Array.isArray(pts.cids) && pts.cids.length > 0) {
    pts.cids.forEach(c => {
      if (c && typeof c === 'string') {
        const cleaned = c.trim();
        if (cleaned && !cids.includes(cleaned)) cids.push(cleaned);
      }
    });
  }

  if (parentConsultation?.cidPrimary) {
    const item = `${parentConsultation.cidPrimary}${parentConsultation.cidPrimaryDesc ? ` (${parentConsultation.cidPrimaryDesc})` : ''}`;
    if (!cids.some(c => c.includes(parentConsultation.cidPrimary))) cids.push(item);
  }
  if (parentConsultation?.cidSecondary) {
    const item = `${parentConsultation.cidSecondary}${parentConsultation.cidSecondaryDesc ? ` (${parentConsultation.cidSecondaryDesc})` : ''}`;
    if (!cids.some(c => c.includes(parentConsultation.cidSecondary))) cids.push(item);
  }

  if (pts.diagnosisVulnerability) {
    const matches = pts.diagnosisVulnerability.match(/\b[A-Z]\d{2}(?:\.\d{1,2})?\b(?:\s*\([^)]+\))?/g);
    if (matches) {
      matches.forEach(m => {
        if (!cids.some(c => c.includes(m))) cids.push(m);
      });
    }
  }

  if (cids.length === 0) {
    cids.push('F10 (Transtornos mentais e comportamentais devidos ao uso de álcool)');
    cids.push('F19.2 (Transtornos mentais e comportamentais devidos ao uso de múltiplas drogas e ao uso de outras substâncias psicoativas - síndrome de dependência)');
  }

  return cids
    .slice(0, 3)
    .map(c => `<div style="font-size: 11px; font-weight: bold; font-style: italic; color: #0f172a; margin-bottom: 3px; padding-left: 6px;">&gt; ${escapeHtml(c)}</div>`)
    .join('');
}

/**
 * Generates an official, standalone HTML document formatted strictly
 * for A4 Portrait (210mm x 297mm) representing a Multiprofessional
 * Singular Therapeutic Project (Projeto Terapêutico Singular - PTS).
 */
export function generatePtsHtml(
  pts: PtsData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): string {
  const patientName = (patient?.fullName || 'PACIENTE NÃO IDENTIFICADO').toUpperCase();

  let patientAge = 'XXA';
  let birthDateFormatted = '--';
  if (patient?.birthDate) {
    try {
      const calc = calculateChronologicalAge(patient.birthDate);
      patientAge = `${calc.years}A`;
      const [year, month, day] = patient.birthDate.split('-');
      if (year && month && day) {
        birthDateFormatted = `${day}/${month}/${year}`;
      }
    } catch {
      patientAge = 'XXA';
    }
  }

  const cns = patient?.cns ? `CNS: ${patient.cns}` : 'CNS: Não informado';
  const cpf = patient?.cpf ? `CPF: ${patient.cpf}` : '';
  const docInfo = [cns, cpf].filter(Boolean).join(' • ');
  const guardian = patient?.legalGuardianName || 'Próprio paciente';

  const issueDate = pts.createdAt ? new Date(pts.createdAt) : new Date();
  const day = String(issueDate.getDate()).padStart(2, '0');
  const month = issueDate.toLocaleDateString('pt-BR', { month: 'long' });
  const year = issueDate.getFullYear();
  const dateNumStr = `${day}/${String(issueDate.getMonth() + 1).padStart(2, '0')}/${year}`;
  const fullDateCityStr = `Anajás, ${day} de ${month} de ${year}`;

  const docAuthor = resolveDocumentAuthor(
    {
      professionalName: pts.referenceProfessional || pts.professionalName,
      professionalRole: pts.professionalRole,
      professionalRegister: pts.professionalRegister,
      professionalStampUrl: (pts as any).professionalStampUrl || (pts as any).digitalStampUrl,
      useDigitalStamp: (pts as any).useDigitalStamp,
      authorId: (pts as any).authorId,
      workplace: pts.workplace,
    },
    currentUser,
    undefined,
    parentConsultation
  );

  const workplace = (docAuthor.workplace || pts.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL - CAPS').toUpperCase();
  const refProfessional = docAuthor.name.toUpperCase();
  const profRole = (docAuthor.role || pts.professionalRole || (currentUser as any)?.professionTitle || 'PROFISSIONAL DE SAÚDE').toUpperCase();
  const reassessment = (pts.reassessmentDate || '30 DIAS').toUpperCase();
  const stampUrl = docAuthor.stampUrl;
  const useStamp = docAuthor.useStamp;

  const { diagTitle, actionTitle } = getPtsSectionTitles(profRole);

  const diagnosesContent = formatPtsNumberedItems(
    pts.diagnosisVulnerability,
    [
      'Síndrome de abstinência de substâncias agudas relacionada a desenvolvimento de dependência do álcool ou de outra substância e interrupção repentina de uma substância aditiva evidenciada por transtorno mental comórbido',
      'Comportamento de saúde propenso a risco relacionado a compreensão inadequada evidenciada por abuso de substâncias',
      'Risco de sobrepeso relacionado a consumo excessivo de álcool e distúrbio do sono',
      'Risco de integridade da membrana mucosa oral prejudicada relacionado a consumo de álcool evidenciado por transtorno de comportamento',
      'Processos familiares disfuncionais relacionados a abuso de substâncias'
    ],
    6
  );

  const interventionsContent = formatPtsNumberedItems(
    pts.shortTermGoals || pts.agreedActions || pts.mediumLongTermGoals,
    [
      'Realizar escuta terapêutica',
      'Incentivar e proporcionar a participação do paciente nas atividades proporcionadas pela clínica',
      'Realizar educação em saúde de forma permanente'
    ],
    12
  );

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Projeto Terapêutico Singular (PTS) - ${escapeHtml(patientName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
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
      background: #1e293b;
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
      background: #047857;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print {
      background: #047857;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .btn-print:hover {
      background: #065f46;
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
      height: 297mm;
      max-height: 297mm;
      background: #ffffff;
      padding: 10mm 12mm 8mm 12mm;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
    }

    /* Green Patient Info Table Styles */
    .patient-info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .patient-info-table th {
      background: #f0fdf4;
      padding: 2.5px 6px;
      text-align: left;
      font-weight: 800;
      text-transform: uppercase;
      border: 1px solid #a7f3d0;
      color: #047857;
      font-size: 12px;
    }
    .patient-info-table td {
      padding: 2.5px 6px;
      font-weight: 800;
      font-size: 12px;
      border: 1px solid #a7f3d0;
      text-transform: uppercase;
      color: #047857;
    }

    /* Section Titles */
    .section-main-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e3a8a;
      margin-top: 8px;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .section-sub-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e3a8a;
      margin-top: 10px;
      margin-bottom: 4px;
      line-height: 1.25;
      text-decoration: underline;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      html, body {
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }
      .toolbar-container {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
        margin: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        overflow: hidden !important;
      }
      .a4-portrait-sheet {
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        min-height: 297mm !important;
        padding: 10mm 12mm 8mm 12mm !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
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
  <div class="toolbar-container no-print">
    <div class="toolbar-info">
      <span class="toolbar-badge">A4 Retrato</span>
      <span><strong>Projeto Terapêutico Singular (PTS):</strong> ${escapeHtml(patientName)} &bull; Ref: ${escapeHtml(refProfessional)}</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir Ficha PTS A4
      </button>
      <button class="btn-secondary" onclick="window.print()">
        💾 Salvar PDF
      </button>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="a4-portrait-sheet">
      <div>
        <!-- Institutional Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding: 0 8px 5px 8px; margin-bottom: 8px;">
          <div style="width: 88px; height: 88px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Brasão Município" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>

          <div style="text-align: center; flex-grow: 1; padding: 0 10px;">
            <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px; line-height: 1.2;">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div style="font-weight: 800; font-size: 10.5px; text-transform: uppercase; color: #334155; margin-top: 1px; letter-spacing: 0.2px;">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: #047857; margin-top: 1px;">
              ${escapeHtml(workplace)}
            </div>
            <div style="font-weight: 900; font-size: 10.5px; text-transform: uppercase; color: #0f172a; margin-top: 2px; padding: 2px 10px; background: #f0fdf4; border-radius: 4px; display: inline-block; border: 1px solid #a7f3d0;">
              PROJETO TERAPÊUTICO SINGULAR (PTS) - PACTUAÇÃO MULTIPROFISSIONAL
            </div>
          </div>

          <div style="width: 88px; height: 88px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Logo SUS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>

        <!-- Patient & Case Identification Table (Green text, Size 12, Uppercase) -->
        <table class="patient-info-table">
          <tbody>
            <tr>
              <th style="width: 16%;">PACIENTE</th>
              <td style="width: 44%;">${escapeHtml(patientName)}</td>
              <th style="width: 14%;">IDADE</th>
              <td style="width: 26%;">${escapeHtml(patientAge)}</td>
            </tr>
            <tr>
              <th>CPF/CNS</th>
              <td>${escapeHtml(docInfo)}</td>
              <th>DATA PTS</th>
              <td>ANAJÁS, ${escapeHtml(dateNumStr)}</td>
            </tr>
            <tr>
              <th>RESPONSÁVEL</th>
              <td colspan="3">${escapeHtml(guardian)}</td>
            </tr>
            <tr>
              <th style="width: 16%;">REFERÊNCIA TÉCNICA</th>
              <td style="width: 44%;">${escapeHtml(refProfessional)} - ${escapeHtml(profRole)}</td>
              <th style="width: 14%;">AVALIAÇÃO</th>
              <td style="width: 26%;">${escapeHtml(reassessment)}</td>
            </tr>
          </tbody>
        </table>

        <!-- CID Main Header Title -->
        <div class="section-main-title">
          PLANO TERAPÊUTICO SINGULAR (PTS) ELABORADO PARA UM PACIENTE ACOMPANHADO PELO CAPS I COM OS SEGUINTES DIAGNÓSTICOS:
        </div>

        <!-- List of CIDs in Italic Bold Size 11 -->
        <div style="margin-bottom: 10px;">
          ${formatPtsCidList(pts, parentConsultation)}
        </div>

        <!-- Specialty Section 1 (Diagnósticos da Profissão) -->
        <div class="section-sub-title">
          ${escapeHtml(diagTitle)}
        </div>
        <div style="margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; background: #ffffff;">
          ${diagnosesContent}
        </div>

        <!-- Specialty Section 2 (Intervenções / Condutas da Profissão) -->
        <div class="section-sub-title">
          ${escapeHtml(actionTitle)}
        </div>
        <div style="margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; background: #ffffff;">
          ${interventionsContent}
        </div>
      </div>

      <!-- Shared Signatures & Institutional Footer -->
      <div class="page-break-inside-avoid" style="margin-top: 8px;">

        <!-- Dual Signature Layout: Professional + User/Family -->
        <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 6px;">
          <div style="flex: 1; text-align: center;">
            ${
              useStamp && stampUrl
                ? `<div style="text-align: center; margin: 0 auto;">
                     <img src="${stampUrl}" alt="Carimbo e Assinatura de ${escapeHtml(refProfessional)}" style="max-height: 75px; max-width: 230px; object-fit: contain; margin: 0 auto; display: block;" />
                   </div>`
                : `
                  <div style="border-top: 1.5px solid #0f172a; margin-bottom: 3px;"></div>
                  <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #0f172a;">
                    ${escapeHtml(refProfessional)}
                  </div>
                  <div style="font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 1px;">
                    Profissional de Referência (${escapeHtml(profRole)})
                  </div>
                `
            }
          </div>

          <div style="flex: 1; text-align: center;">
            <div style="border-top: 1.5px solid #0f172a; margin-bottom: 3px;"></div>
            <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #0f172a;">
              ${escapeHtml(patientName)}
            </div>
            <div style="font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase; margin-top: 1px;">
              Usuário(a) ou Responsável Familiar (Pactuação)
            </div>
          </div>
        </div>

        <!-- Standard Institutional Footer -->
        <div style="text-align: center; font-size: 8.5px; font-weight: 600; color: #64748b; text-transform: uppercase; line-height: 1.35; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
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
 * Opens the PTS document in a new browser tab formatted strictly for A4 Portrait.
 */
export function openPtsInNewTab(
  pts: PtsData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): Window | null {
  const htmlContent = generatePtsHtml(pts, patient, currentUser, parentConsultation);
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
