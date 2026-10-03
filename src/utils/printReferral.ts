import { ReferralData, Patient, User, Consultation } from '../types';
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

/**
 * Generates an official, standalone HTML document formatted strictly
 * for A4 Portrait (210mm x 297mm) representing a SUS Referral Guide (Guia de Encaminhamento).
 */
export function generateReferralHtml(
  referral: ReferralData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): string {
  const patientName = (patient?.fullName || 'PACIENTE NÃO IDENTIFICADO').toUpperCase();

  let patientAge = '--';
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
      patientAge = '--';
    }
  }

  const cns = patient?.cns ? `CNS: ${patient.cns}` : 'CNS: Não informado';
  const cpf = patient?.cpf ? `CPF: ${patient.cpf}` : '';
  const docInfo = [cns, cpf].filter(Boolean).join(' • ');
  const guardian = patient?.legalGuardianName ? `Responsável: ${patient.legalGuardianName}` : '';
  const address = patient?.address ? `Endereço: ${patient.address}` : '';

  const issueDate = referral.createdAt ? new Date(referral.createdAt) : new Date();
  const day = String(issueDate.getDate()).padStart(2, '0');
  const month = issueDate.toLocaleDateString('pt-BR', { month: 'long' });
  const year = issueDate.getFullYear();
  const dateStr = referral.dateFormatted || `${day}/${String(issueDate.getMonth() + 1).padStart(2, '0')}/${year}`;

  const destination = (referral.destination || 'SERVIÇO ESPECIALIZADO').toUpperCase();
  const priority = referral.priority || 'Eletivo';

  let priorityBadgeColor = '#0d9488'; // green/teal
  let priorityBadgeBg = '#f0fdf4';
  let priorityBorder = '#86efac';

  if (priority === 'Prioritário') {
    priorityBadgeColor = '#b45309';
    priorityBadgeBg = '#fefce8';
    priorityBorder = '#fde047';
  } else if (priority === 'Urgência/Emergência') {
    priorityBadgeColor = '#b91c1c';
    priorityBadgeBg = '#fef2f2';
    priorityBorder = '#fca5a5';
  }

  const docAuthor = resolveDocumentAuthor(referral, currentUser, undefined, parentConsultation);
  const workplace = (docAuthor.workplace || referral.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL').toUpperCase();
  const professionalName = docAuthor.name.toUpperCase();
  const professionalRole = docAuthor.role.toUpperCase();
  const professionalRegister = docAuthor.register.toUpperCase();
  const stampUrl = docAuthor.stampUrl;
  const useStamp = docAuthor.useStamp;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guia de Encaminhamento - ${escapeHtml(patientName)}</title>
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
      background: #0284c7;
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
      background: #0284c7;
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
      background: #0369a1;
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
    .section-card {
      margin-bottom: 7px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
    }
    .section-title {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 3.5px 8px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-content {
      padding: 6px 8px;
      font-size: 10.5px;
      line-height: 1.45;
      color: #1e293b;
      background: #ffffff;
      white-space: pre-wrap;
      text-align: justify;
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
      <span><strong>Guia de Encaminhamento:</strong> ${escapeHtml(patientName)} &bull; Destino: ${escapeHtml(destination)}</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir Guia A4
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
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding: 0 10px 6px 10px; margin-bottom: 8px;">
          <div style="width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 4px;">
            <img src="${LOGO_CAPS_BASE64}" alt="Brasão Município" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>

          <div style="text-align: center; flex-grow: 1; padding: 0 12px;">
            <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px; line-height: 1.2;">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div style="font-weight: 800; font-size: 10.5px; text-transform: uppercase; color: #334155; margin-top: 1px; letter-spacing: 0.2px;">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: #0284c7; margin-top: 1px;">
              ${escapeHtml(workplace)}
            </div>
            <div style="font-weight: 900; font-size: 10.5px; text-transform: uppercase; color: #0f172a; margin-top: 2px; padding: 2px 10px; background: #f0f9ff; border-radius: 4px; display: inline-block; border: 1px solid #bae6fd;">
              GUIA DE ENCAMINHAMENTO E REFERÊNCIA - SUS
            </div>
          </div>

          <div style="width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 4px;">
            <img src="${LOGO_CAPS_BASE64}" alt="Logo SUS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>

        <!-- Patient Identification Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px;">
          <tbody>
            <tr>
              <th style="width: 12%; background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b;">
                PACIENTE
              </th>
              <td style="width: 58%; padding: 3.5px 6px; font-weight: 800; font-size: 11px; border: 1px solid #94a3b8; text-transform: uppercase; color: #0f172a;">
                ${escapeHtml(patientName)}
              </td>
              <th style="width: 12%; background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b;">
                IDADE / NASC
              </th>
              <td style="width: 18%; padding: 3.5px 6px; font-weight: 800; font-size: 10.5px; border: 1px solid #94a3b8; text-transform: uppercase; color: #0f172a;">
                ${escapeHtml(patientAge)} (${escapeHtml(birthDateFormatted)})
              </td>
            </tr>
            <tr>
              <th style="background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b;">
                DOCUMENTOS
              </th>
              <td style="padding: 3.5px 6px; font-weight: 600; font-size: 10px; border: 1px solid #94a3b8; color: #1e293b;">
                ${escapeHtml(docInfo)}
              </td>
              <th style="background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b;">
                DATA EMISSÃO
              </th>
              <td style="padding: 3.5px 6px; font-weight: 700; font-size: 10.5px; border: 1px solid #94a3b8; color: #0f172a;">
                ${escapeHtml(dateStr)}
              </td>
            </tr>
            ${(guardian || address) ? `
            <tr>
              <th style="background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b;">
                CONTATO / FAMÍLIA
              </th>
              <td colspan="3" style="padding: 3.5px 6px; font-weight: 600; font-size: 9.5px; border: 1px solid #94a3b8; color: #334155;">
                ${[escapeHtml(guardian), escapeHtml(address)].filter(Boolean).join(' • ')}
              </td>
            </tr>` : ''}
          </tbody>
        </table>

        <!-- Target Destination & Priority Bar -->
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <div style="flex: 2; border: 1px solid #0284c7; background: #f0f9ff; border-radius: 4px; padding: 6px 10px;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0369a1; letter-spacing: 0.5px;">
              SERVIÇO / ESPECIALIDADE DE DESTINO
            </div>
            <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; color: #0c4a6e; margin-top: 1px;">
              ${escapeHtml(destination)}
            </div>
          </div>
          <div style="flex: 1; border: 1px solid ${priorityBorder}; background: ${priorityBadgeBg}; border-radius: 4px; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${priorityBadgeColor}; letter-spacing: 0.5px;">
              GRAU DE PRIORIDADE
            </div>
            <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: ${priorityBadgeColor}; margin-top: 1px;">
              ${escapeHtml(priority)}
            </div>
          </div>
        </div>

        <!-- 1. Clinical Summary & Indication -->
        <div class="section-card">
          <div class="section-title">
            <span style="color: #0284c7;">■</span> 1. RESUMO DO QUADRO CLÍNICO E JUSTIFICATIVA DO ENCAMINHAMENTO
          </div>
          <div class="section-content">
            ${escapeHtml(referral.clinicalIndication || 'Encaminhamento para continuidade do acompanhamento e suporte especializado.')}
          </div>
        </div>

        <!-- 2. Diagnostic Hypotheses -->
        <div class="section-card">
          <div class="section-title">
            <span style="color: #0284c7;">■</span> 2. HIPÓTESES DIAGNÓSTICAS / DEMANDAS DE SUPORTE (CID-10 / CIAP-2)
          </div>
          <div class="section-content">
            ${escapeHtml(referral.hypotheses || 'Avaliação clínica especializada.')}
          </div>
        </div>

        <!-- 3. Procedures / Assessments Requested -->
        ${referral.proceduresRequested ? `
        <div class="section-card">
          <div class="section-title">
            <span style="color: #0284c7;">■</span> 3. CONDUTAS, AVALIAÇÕES OU EXAMES COMPLEMENTARES SOLICITADOS
          </div>
          <div class="section-content">
            ${escapeHtml(referral.proceduresRequested)}
          </div>
        </div>` : ''}

        <!-- 4. Exams Conducted / Previous Relevant Data -->
        ${referral.examsConducted ? `
        <div class="section-card">
          <div class="section-title">
            <span style="color: #0284c7;">■</span> 4. EXAMES JÁ REALIZADOS / ANTECEDENTES RELEVANTES
          </div>
          <div class="section-content">
            ${escapeHtml(referral.examsConducted)}
          </div>
        </div>` : ''}

        <!-- 5. Counter-Reference Block (Para preenchimento pelo serviço de destino) -->
        <div class="section-card" style="border: 1px dashed #64748b; margin-top: 10px;">
          <div class="section-title" style="background: #f8fafc; color: #475569;">
            <span>📋</span> CONTRA-REFERÊNCIA (CAMPO DESTINADO AO SERVIÇO DE DESTINO NO RETORNO DO USUÁRIO)
          </div>
          <div style="padding: 8px; font-size: 10px; color: #64748b;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span><strong>Unidade Receptora:</strong> ____________________________________________</span>
              <span><strong>Data do Atendimento:</strong> ____/____/202___</span>
            </div>
            <div style="margin-bottom: 6px;">
              <strong>Diagnóstico / Avaliação Conclusiva:</strong>
              <div style="border-bottom: 1px dotted #cbd5e1; height: 16px;"></div>
            </div>
            <div style="margin-bottom: 6px;">
              <strong>Conduta e Orientações para a Atenção Básica / Unidade de Origem:</strong>
              <div style="border-bottom: 1px dotted #cbd5e1; height: 16px;"></div>
              <div style="border-bottom: 1px dotted #cbd5e1; height: 16px;"></div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
              <div style="width: 220px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 2px;">
                Carimbo e Assinatura do Profissional Receptor
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Signature and Official Footer -->
      <div class="page-break-inside-avoid" style="margin-top: 10px;">
        <div style="text-align: right; font-size: 10px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">
          Anajás, ${day} de ${month} de ${year}
        </div>

        <div style="margin: 0 auto; width: 300px; text-align: center;">
          ${
            useStamp && stampUrl
              ? `<div style="text-align: center; margin: 0 auto;">
                   <img src="${stampUrl}" alt="Carimbo e Assinatura de ${escapeHtml(professionalName)}" style="max-height: 85px; max-width: 260px; object-fit: contain; margin: 0 auto; display: block;" />
                 </div>`
              : `
                <div style="border-top: 1.5px solid #0f172a; margin-bottom: 3px;"></div>
                <div style="font-weight: 900; font-size: 11.5px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px;">
                  ${escapeHtml(professionalName)}
                </div>
                <div style="font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; margin-top: 1px;">
                  ${escapeHtml(professionalRole)} ${professionalRegister ? `• ${escapeHtml(professionalRegister)}` : ''}
                </div>
              `
          }
        </div>

        <!-- Standard Institutional Footer -->
        <div style="text-align: center; font-size: 8.5px; font-weight: 600; color: #64748b; text-transform: uppercase; line-height: 1.35; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
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
 * Opens the Referral Guide in a new browser tab formatted strictly for A4 Portrait.
 */
export function openReferralInNewTab(
  referral: ReferralData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): Window | null {
  const htmlContent = generateReferralHtml(referral, patient, currentUser, parentConsultation);
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
