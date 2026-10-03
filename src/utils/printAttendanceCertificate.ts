import { AttendanceCertificateData, Patient, User, Consultation } from '../types';
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
 * for A4 Portrait (210mm x 297mm) representing a SUS Official Attendance Certificate (Atestado de Comparecimento).
 * Issued exclusively by higher education professionals (Enfermeiro, Psicólogo, Assistente Social, etc.).
 */
export function generateAttendanceCertificateHtml(
  certificate: AttendanceCertificateData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): string {
  const patientName = (certificate.patientName || patient?.fullName || 'PACIENTE NÃO IDENTIFICADO').toUpperCase();
  const ageFormatted = certificate.patientAgeFormatted || (patient?.birthDate ? formatSingleUnitAge(patient.birthDate) : '--');
  const documentFormatted = certificate.patientDocument || formatPatientDocument(patient?.cpf, patient?.cns);
  const cityDateFormatted = certificate.cityDateFormatted || formatAnajasDate(certificate.createdAt);

  const docAuthor = resolveDocumentAuthor(
    {
      professionalName: certificate.professionalName,
      professionalRole: certificate.professionalRole,
      professionalRegister: certificate.professionalCouncil,
      professionalStampUrl: (certificate as any).professionalStampUrl || (certificate as any).digitalStampUrl,
      useDigitalStamp: (certificate as any).useDigitalStamp,
      authorId: (certificate as any).authorId,
      workplace: certificate.workplace,
    },
    currentUser,
    undefined,
    parentConsultation
  );

  const workplace = (docAuthor.workplace || certificate.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)').toUpperCase();
  const professionalName = docAuthor.name.toUpperCase();
  const professionalRole = (certificate.professionalRole || docAuthor.role || 'Profissional de Nível Superior').toUpperCase();
  const professionalCouncil = (docAuthor.register || (docAuthor.councilBody ? `${docAuthor.councilBody}${docAuthor.councilUf ? `/${docAuthor.councilUf}` : ''} ${docAuthor.councilNumber || ''}`.trim() : '') || 'COREN / CRP / CRESS').toUpperCase();
  const stampUrl = docAuthor.stampUrl;
  const useStamp = docAuthor.useStamp;

  const attendanceDateFormatted = certificate.attendanceDateFormatted || certificate.attendanceDate || 'nesta data';
  const periodLabel = certificate.periodLabel || 'Período Matutino';
  const attendanceType = certificate.attendanceType || 'Atendimento / Consulta em Saúde';
  const observations = certificate.observations ? certificate.observations.trim() : '';

  const isCompanion = Boolean(certificate.isCompanion);
  const companionName = (certificate.companionName || '').toUpperCase();
  const companionDoc = certificate.companionDocument || '';
  const companionKinship = certificate.companionKinship || 'Acompanhante / Responsável Legal';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Atestado de Comparecimento - ${escapeHtml(patientName)}</title>
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
      background: #0284c7;
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
      background: #0284c7;
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
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
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
      padding: 14mm 16mm 12mm 16mm;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .atestado-text {
      font-size: 13.5px;
      line-height: 1.85;
      color: #1e293b;
      text-align: justify;
      margin-bottom: 20px;
      text-indent: 32px;
    }
    .highlight-box {
      background: #f0f9ff;
      border: 2px solid #0284c7;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 24px 0;
      text-align: center;
    }
    .highlight-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0369a1;
      margin-bottom: 6px;
    }
    .highlight-date {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .highlight-period {
      font-size: 13px;
      color: #0369a1;
      margin-top: 5px;
      font-weight: 700;
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
        padding: 14mm 16mm 12mm 16mm !important;
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
      <span><strong>Atestado de Comparecimento:</strong> ${escapeHtml(patientName)}</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir Atestado A4
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
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding: 0 10px 10px 10px; margin-bottom: 20px;">
          <div style="width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Brasão do Município" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>

          <div style="text-align: center; flex-grow: 1; padding: 0 14px;">
            <div style="font-weight: 900; font-size: 14px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; line-height: 1.2;">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div style="font-weight: 800; font-size: 11.5px; text-transform: uppercase; color: #334155; margin-top: 2px; letter-spacing: 0.3px;">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div style="font-weight: 700; font-size: 10.5px; text-transform: uppercase; color: #0284c7; margin-top: 2px;">
              ${escapeHtml(workplace)}
            </div>
            <div style="font-weight: 900; font-size: 14.5px; text-transform: uppercase; color: #0f172a; margin-top: 6px; padding: 4px 22px; background: #f0f9ff; border-radius: 4px; display: inline-block; border: 1.5px solid #bae6fd; letter-spacing: 1.5px;">
              ATESTADO DE COMPARECIMENTO
            </div>
          </div>

          <div style="width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <img src="${LOGO_CAPS_BASE64}" alt="Logo SUS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>

        <!-- Patient Identification Box -->
        <div style="border: 1px solid #94a3b8; border-radius: 6px; overflow: hidden; margin-bottom: 20px; background: #f8fafc;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tbody>
              <tr>
                <th style="width: 16%; background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; color: #1e293b;">
                  PACIENTE:
                </th>
                <td style="width: 54%; padding: 8px 10px; font-weight: 800; font-size: 12.5px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; text-transform: uppercase; color: #0f172a;">
                  ${escapeHtml(patientName)}
                </td>
                <th style="width: 12%; background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; color: #1e293b;">
                  IDADE:
                </th>
                <td style="width: 18%; padding: 8px 10px; font-weight: 700; font-size: 11.5px; border-bottom: 1px solid #cbd5e1; color: #0f172a;">
                  ${escapeHtml(ageFormatted)}
                </td>
              </tr>
              <tr>
                <th style="width: 16%; background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 800; text-transform: uppercase; border-right: 1px solid #cbd5e1; color: #1e293b;">
                  DOCUMENTO:
                </th>
                <td style="padding: 8px 10px; font-weight: 700; font-size: 11.5px; color: #0f172a;" colspan="3">
                  ${escapeHtml(documentFormatted)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        ${
          isCompanion && companionName
            ? `
        <!-- Companion Identification Box -->
        <div style="border: 1.5px solid #bae6fd; border-radius: 6px; overflow: hidden; margin-bottom: 20px; background: #f0f9ff;">
          <div style="background: #e0f2fe; padding: 6px 10px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #0369a1; border-bottom: 1px solid #bae6fd; letter-spacing: 0.5px;">
            Declaração para Acompanhante / Responsável Legal
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tbody>
              <tr>
                <th style="width: 18%; background: #f0f9ff; padding: 6px 10px; text-align: left; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #e0f2fe; border-right: 1px solid #e0f2fe; color: #0369a1;">
                  ACOMPANHANTE:
                </th>
                <td style="width: 52%; padding: 6px 10px; font-weight: 800; font-size: 12px; border-bottom: 1px solid #e0f2fe; border-right: 1px solid #e0f2fe; text-transform: uppercase; color: #0f172a;">
                  ${escapeHtml(companionName)}
                </td>
                <th style="width: 12%; background: #f0f9ff; padding: 6px 10px; text-align: left; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #e0f2fe; border-right: 1px solid #e0f2fe; color: #0369a1;">
                  VÍNCULO:
                </th>
                <td style="width: 18%; padding: 6px 10px; font-weight: 700; font-size: 11px; border-bottom: 1px solid #e0f2fe; color: #0f172a;">
                  ${escapeHtml(companionKinship)}
                </td>
              </tr>
              <tr>
                <th style="width: 18%; background: #f0f9ff; padding: 6px 10px; text-align: left; font-weight: 800; text-transform: uppercase; border-right: 1px solid #e0f2fe; color: #0369a1;">
                  DOCUMENTO:
                </th>
                <td style="padding: 6px 10px; font-weight: 700; font-size: 11px; color: #0f172a;" colspan="3">
                  ${escapeHtml(companionDoc || 'Documento apresentado')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        `
            : ''
        }

        <!-- Declaratory Body Text -->
        <div style="margin-top: 10px;">
          <p class="atestado-text">
            ${
              isCompanion && companionName
                ? `Atesto para os devidos fins de comprovação e justificativa de comparecimento que o(a) Sr.(a) <strong>${escapeHtml(companionName)}</strong> (${escapeHtml(companionKinship)}), portador(a) do documento ${escapeHtml(companionDoc || 'apresentado')}, esteve presente nesta Unidade de Saúde acompanhando o(a) paciente <strong>${escapeHtml(patientName)}</strong> para a realização de <strong>${escapeHtml(attendanceType)}</strong> no dia <strong>${escapeHtml(attendanceDateFormatted)}</strong>, no <strong>${escapeHtml(periodLabel)}</strong>.`
                : `Atesto para os devidos fins de comprovação e justificativa de comparecimento que o(a) paciente acima identificado(a) compareceu a esta Unidade de Saúde para a realização de <strong>${escapeHtml(attendanceType)}</strong> no dia <strong>${escapeHtml(attendanceDateFormatted)}</strong>, no <strong>${escapeHtml(periodLabel)}</strong>.`
            }
          </p>

          <div style="font-size: 11px; color: #64748b; margin-top: 12px; line-height: 1.5; font-style: italic; text-align: center;">
            * Este documento comprova estritamente o comparecimento do usuário ou de seu acompanhante ao serviço de saúde no dia e período acima indicados, nos termos da legislação vigente.
          </div>

          ${
            observations
              ? `
          <div style="margin-top: 20px; padding: 12px 14px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 0 6px 6px 0;">
            <div style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-bottom: 4px; letter-spacing: 0.5px;">
              Observações Institucionais:
            </div>
            <div style="font-size: 12px; line-height: 1.6; color: #334155;">
              ${escapeHtml(observations)}
            </div>
          </div>
          `
              : ''
          }
        </div>
      </div>

      <!-- Footer & Signature Block -->
      <div class="page-break-inside-avoid" style="margin-top: 30px;">
        <!-- Date location -->
        <div style="text-align: right; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 36px;">
          ${escapeHtml(cityDateFormatted)}
        </div>

        <!-- Professional Signature and Seal Box -->
        <div style="display: flex; justify-content: center; margin-bottom: 24px;">
          ${
            useStamp && stampUrl
              ? `<div style="text-align: center;">
                  <img src="${stampUrl}" alt="Carimbo e Assinatura de ${escapeHtml(professionalName)}" style="max-height: 96px; max-width: 280px; object-fit: contain; margin: 0 auto; display: block;" />
                </div>`
              : `<div style="width: 320px; text-align: center; border-top: 1.5px solid #0f172a; padding-top: 8px;">
                  <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; color: #0f172a;">
                    ${escapeHtml(professionalName)}
                  </div>
                  <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 2px;">
                    ${escapeHtml(professionalRole)}
                  </div>
                  <div style="font-size: 11.5px; font-weight: 800; color: #0284c7; margin-top: 2px;">
                    ${escapeHtml(professionalCouncil)}
                  </div>
                </div>`
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
    window.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('autoprint') === 'true') {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    });
  </script>
</body>
</html>`;
}

export function openAttendanceCertificateInNewTab(
  certificate: AttendanceCertificateData,
  patient?: Patient,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): void {
  const html = generateAttendanceCertificateHtml(certificate, patient, currentUser, parentConsultation);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
