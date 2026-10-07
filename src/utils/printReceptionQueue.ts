import { ReceptionQueueItem, User, Patient } from '../types';
import { LOGO_CAPS_BASE64, OFFICIAL_SUS_FOOTER } from '../constants/assets';
import { PROFESSIONS, getProfessionalProfessionTitle } from '../data/professions';
import { formatPatientDocument } from './dateCalculator';

export interface ProfessionalQueueGroupPrintData {
  professionalId: string;
  professionalName: string;
  professionalProfession?: string;
  items: ReceptionQueueItem[];
  waitingCount: number;
  completedCount: number;
  abandonedCount: number;
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

function formatPhoneDisplay(phone?: string): string {
  if (!phone) return 'Não informado';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

function formatPriorityBadge(item: ReceptionQueueItem): { label: string; bg: string; color: string; border: string } {
  if (item.priorityCategory === 'idoso_80') {
    return { label: 'IDOSO 80+ (SUPER PRIORIDADE)', bg: '#fef2f2', color: '#991b1b', border: '#f87171' };
  }
  if (item.priorityCategory === 'idoso_60') {
    return { label: 'IDOSO 60+ (PRIORIDADE)', bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
  }
  if (item.priorityCategory === 'gestante' || item.isPregnant) {
    return { label: 'GESTANTE / LACTANTE', bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8' };
  }
  if (item.priorityCategory === 'pcd') {
    return { label: 'PCD / DEFICIÊNCIA', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
  }
  if (item.priorityCategory === 'puericultura') {
    return { label: 'PUERICULTURA / COLO', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
  }
  if (item.riskClassification === 'vermelho') {
    return { label: 'VERMELHO (EMERGÊNCIA)', bg: '#fef2f2', color: '#b91c1c', border: '#ef4444' };
  }
  if (item.riskClassification === 'laranja') {
    return { label: 'LARANJA (MUITO URGENTE)', bg: '#fff7ed', color: '#c2410c', border: '#fb923c' };
  }
  if (item.riskClassification === 'amarelo') {
    return { label: 'AMARELO (URGENTE)', bg: '#fefce8', color: '#a16207', border: '#facc15' };
  }
  return { label: 'PADRÃO / ELETIVO', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
}

function formatStatusBadge(status: string): { label: string; bg: string; color: string } {
  if (status === 'waiting') return { label: 'AGUARDANDO', bg: '#ecfdf5', color: '#047857' };
  if (status === 'calling') return { label: 'CHAMANDO', bg: '#eff6ff', color: '#1d4ed8' };
  if (status === 'in_consultation' || status === 'in_service') return { label: 'EM ATENDIMENTO', bg: '#f5f3ff', color: '#6d28d9' };
  if (status === 'completed') return { label: 'ATENDIDO', bg: '#f1f5f9', color: '#334155' };
  if (status === 'abandoned') return { label: 'DESISTÊNCIA', bg: '#fffbeb', color: '#b45309' };
  if (status === 'cancelled') return { label: 'CANCELADO', bg: '#fef2f2', color: '#b91c1c' };
  return { label: status.toUpperCase(), bg: '#f8fafc', color: '#475569' };
}

/**
 * Generates an official, standalone HTML document formatted strictly
 * for A4 Portrait (210mm x 297mm) representing the Reception Attendance Queue for a Professional.
 */
export function generateProfessionalQueueHtml(
  group: ProfessionalQueueGroupPrintData,
  dateScopeLabel?: string,
  currentUser?: User | null,
  workplaceName?: string
): string {
  const professionalName = (group.professionalName || 'PROFISSIONAL DE SAÚDE').toUpperCase();
  const professionalRole = group.professionalProfession
    ? (PROFESSIONS[group.professionalProfession as any]?.name || group.professionalProfession).toUpperCase()
    : 'ATENDIMENTO CLÍNICO MULTIPROFISSIONAL';

  const workplace = (workplaceName || currentUser?.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL - CAPS I').toUpperCase();
  const now = new Date();
  const emissionDateFormatted = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const emissionTimeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const totalPatients = group.items.length;
  const waitingCount = group.waitingCount;
  const completedCount = group.completedCount;
  const abandonedCount = group.abandonedCount;

  const dateScopeText = dateScopeLabel || emissionDateFormatted;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fila de Atendimento - ${escapeHtml(professionalName)} - ${escapeHtml(dateScopeText)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
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
      font-weight: 800;
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
      background: #0d9488;
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
      padding: 10mm 12mm 10mm 12mm;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .table-queue {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 8px;
      font-size: 9.5px;
    }
    .table-queue th {
      background: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 5px 6px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.3px;
      font-size: 9px;
      text-align: left;
    }
    .table-queue td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      color: #1e293b;
      vertical-align: middle;
    }
    .table-queue tr:nth-child(even) {
      background: #f8fafc;
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
        padding: 10mm 12mm 10mm 12mm !important;
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
      }
      .page-break-avoid {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <!-- Toolbar for browser preview -->
  <div class="toolbar-container">
    <div class="toolbar-info">
      <span class="toolbar-badge">Fila de Recepção</span>
      <span><strong>Profissional:</strong> ${escapeHtml(professionalName)} &bull; ${totalPatients} paciente(s)</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir Fila A4
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
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding: 0 8px 6px 8px; margin-bottom: 8px;">
          <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Brasão Município" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>

          <div style="text-align: center; flex-grow: 1; padding: 0 10px;">
            <div style="font-weight: 900; font-size: 11.5px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px; line-height: 1.2;">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; color: #334155; margin-top: 1px;">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div style="font-weight: 700; font-size: 9.5px; text-transform: uppercase; color: #0d9488; margin-top: 1px;">
              ${escapeHtml(workplace)}
            </div>
            <div style="font-weight: 900; font-size: 10.5px; text-transform: uppercase; color: #0f172a; margin-top: 2px; padding: 2px 10px; background: #f0fdfa; border-radius: 4px; display: inline-block; border: 1px solid #99f6e4;">
              FOLHA DE ATENDIMENTO • FILA DE RECEPÇÃO / TRIAGEM
            </div>
          </div>

          <div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Logo SUS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>

        <!-- Professional & Queue Summary Card -->
        <div style="border: 1px solid #94a3b8; border-radius: 6px; background: #f8fafc; padding: 6px 10px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="flex: 2;">
              <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.4px;">
                PROFISSIONAL DE SAÚDE RESPONSÁVEL
              </div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 1px;">
                ${escapeHtml(professionalName)}
              </div>
              <div style="font-size: 9.5px; font-weight: 700; color: #0d9488; text-transform: uppercase; margin-top: 1px;">
                ${escapeHtml(professionalRole)}
              </div>
            </div>

            <div style="flex: 1.2; text-align: right;">
              <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b;">
                PERÍODO / DATA DA FILA
              </div>
              <div style="font-size: 11px; font-weight: 900; color: #0f172a; margin-top: 1px;">
                ${escapeHtml(dateScopeText)}
              </div>
              <div style="font-size: 8.5px; font-weight: 600; color: #64748b; margin-top: 1px;">
                Emitido em ${escapeHtml(emissionDateFormatted)} às ${escapeHtml(emissionTimeFormatted)}
              </div>
            </div>
          </div>

          <!-- Mini Badges Counter -->
          <div style="display: flex; gap: 6px; margin-top: 6px; padding-top: 5px; border-top: 1px solid #e2e8f0; font-size: 9.5px; font-weight: 800;">
            <span style="background: #e2e8f0; color: #334155; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1;">
              Total: ${totalPatients} pacientes
            </span>
            <span style="background: #ccfbf1; color: #0f766e; padding: 2px 7px; border-radius: 4px; border: 1px solid #99f6e4;">
              Aguardando: ${waitingCount}
            </span>
            <span style="background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 4px; border: 1px solid #bbf7d0;">
              Atendidos: ${completedCount}
            </span>
            ${abandonedCount > 0 ? `
            <span style="background: #fef3c7; color: #92400e; padding: 2px 7px; border-radius: 4px; border: 1px solid #fde68a;">
              Desistentes: ${abandonedCount}
            </span>` : ''}
          </div>
        </div>

        <!-- Patients Queue Table -->
        <table class="table-queue">
          <thead>
            <tr>
              <th style="width: 4%; text-align: center;">#</th>
              <th style="width: 7%; text-align: center;">HORA</th>
              <th style="width: 28%;">PACIENTE (IDADE)</th>
              <th style="width: 17%;">DOCUMENTOS</th>
              <th style="width: 14%;">CONTATO (TEL)</th>
              <th style="width: 14%;">PRIORIDADE / RISCO</th>
              <th style="width: 8%; text-align: center;">STATUS</th>
              <th style="width: 8%; text-align: center;">VISTO</th>
            </tr>
          </thead>
          <tbody>
            ${group.items.length === 0 ? `
            <tr>
              <td colspan="8" style="text-align: center; padding: 16px; color: #64748b; font-style: italic;">
                Nenhum paciente registrado nesta fila de atendimento.
              </td>
            </tr>` : group.items.map((item, index) => {
              const patientName = (item.patientName || 'PACIENTE NÃO IDENTIFICADO').toUpperCase();
              let ageDisplay = '--';
              if (item.patientBirthDate) {
                try {
                  const calc = calculateChronologicalAge(item.patientBirthDate);
                  ageDisplay = `${calc.years}A`;
                } catch {
                  ageDisplay = '--';
                }
              }

              const docInfo = [
                item.patientCns ? `CNS: ${item.patientCns}` : '',
                item.patientCpf ? `CPF: ${item.patientCpf}` : '',
              ].filter(Boolean).join('<br/>') || 'Não informado';

              const phoneFormatted = formatPhoneDisplay(item.patientPhone);
              const priority = formatPriorityBadge(item);
              const status = formatStatusBadge(item.status);
              const scheduledTime = item.scheduledTime || '--:--';

              return `
              <tr class="page-break-avoid">
                <td style="text-align: center; font-weight: 900; font-size: 10px; color: #0d9488;">
                  ${index + 1}º
                </td>
                <td style="text-align: center; font-weight: 800; font-family: monospace; font-size: 10px;">
                  ${escapeHtml(scheduledTime)}
                </td>
                <td>
                  <div style="font-weight: 800; color: #0f172a; font-size: 10px;">
                    ${escapeHtml(patientName)}
                  </div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 600;">
                    Idade: <strong>${escapeHtml(ageDisplay)}</strong>
                  </div>
                </td>
                <td style="font-size: 8.5px; font-weight: 600; color: #334155; line-height: 1.3;">
                  ${docInfo}
                </td>
                <td style="font-size: 9px; font-weight: 700; color: #0369a1;">
                  ${escapeHtml(phoneFormatted)}
                </td>
                <td>
                  <div style="font-size: 8px; font-weight: 800; padding: 2px 4px; border-radius: 3px; background: ${priority.bg}; color: ${priority.color}; border: 1px solid ${priority.border}; display: inline-block; line-height: 1.2;">
                    ${escapeHtml(priority.label)}
                  </div>
                </td>
                <td style="text-align: center;">
                  <span style="font-size: 8px; font-weight: 800; padding: 2px 4px; border-radius: 3px; background: ${status.bg}; color: ${status.color}; display: inline-block;">
                    ${escapeHtml(status.label)}
                  </span>
                </td>
                <td style="text-align: center; border-bottom: 1px solid #cbd5e1;">
                  <div style="height: 14px; border-bottom: 1px dotted #94a3b8; width: 85%; margin: 0 auto;"></div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Signatures & Footer Block -->
      <div class="page-break-avoid" style="margin-top: 14px; border-top: 1px solid #cbd5e1; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 12px;">
          <div style="flex: 1; text-align: center;">
            <div style="border-top: 1px solid #0f172a; width: 80%; margin: 0 auto; padding-top: 3px; font-size: 9px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
              ${escapeHtml(professionalName)}
            </div>
            <div style="font-size: 8.5px; color: #475569; font-weight: 600;">
              Profissional de Saúde Solicitante / Atendente
            </div>
          </div>

          <div style="flex: 1; text-align: center;">
            <div style="border-top: 1px solid #0f172a; width: 80%; margin: 0 auto; padding-top: 3px; font-size: 9px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
              RECEPÇÃO / REGULAÇÃO
            </div>
            <div style="font-size: 8.5px; color: #475569; font-weight: 600;">
              Responsável pelo Acolhimento e Chamada
            </div>
          </div>
        </div>

        <div style="text-align: center; font-size: 8px; color: #64748b; line-height: 1.4; border-top: 1px dashed #e2e8f0; padding-top: 5px;">
          <div>${escapeHtml(OFFICIAL_SUS_FOOTER.addressLine1)}</div>
          <div style="font-weight: 700; color: #0f766e;">${escapeHtml(OFFICIAL_SUS_FOOTER.addressLine2)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens the generated queue in a new printable browser tab.
 */
export function openProfessionalQueueInNewTab(
  group: ProfessionalQueueGroupPrintData,
  dateScopeLabel?: string,
  currentUser?: User | null,
  workplaceName?: string
): void {
  const html = generateProfessionalQueueHtml(group, dateScopeLabel, currentUser, workplaceName);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback if popup blocked
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

function calculateChronologicalAge(birthDate: string): { years: number; months: number; days: number } {
  const [year, month, day] = birthDate.split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}
