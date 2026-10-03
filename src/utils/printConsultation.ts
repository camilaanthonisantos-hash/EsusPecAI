import { Consultation, Patient, User } from '../types';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
import { calculateChronologicalAge } from './dateCalculator';
import { parsePecText } from './pecFormatter';
import { isDoctorConsultation, cleanDoctorConsultation } from './doctorConsultationCleaner';
import { ensureExamMediaQRCodes } from './printExamMedia';
import { DEFAULT_CBO_MAP } from '../data/professions';
import { resolveConsultationAuthor } from './authorResolver';

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
 * Generates a self-contained, standalone HTML document formatted strictly
 * for A4 Portrait (210mm x 297mm) with narrow margins (1.27 cm / 12.7 mm).
 */
export function generateConsultationHtml(
  consultation: Consultation,
  patient: Patient,
  currentUser?: User | null
): string {
  const patientName = (patient?.fullName || consultation.patientName || 'PACIENTE NÃO IDENTIFICADO').toUpperCase();
  
  let patientAge = '--';
  if (patient?.birthDate) {
    try {
      const calc = calculateChronologicalAge(patient.birthDate);
      patientAge = `${calc.years}A`;
    } catch {
      patientAge = '--';
    }
  }

  const consultDate = new Date(consultation.timestamp || Date.now());
  const day = String(consultDate.getDate()).padStart(2, '0');
  const month = consultDate.toLocaleDateString('pt-BR', { month: 'long' });
  const year = consultDate.getFullYear();
  const dateFormatted = consultDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFormatted = consultDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const cns = patient?.cns ? `CNS: ${patient.cns}` : '';
  const cpf = patient?.cpf ? `CPF: ${patient.cpf}` : '';
  const docInfo = [cns, cpf].filter(Boolean).join(' • ') || 'Não informado';

  const authorName = (consultation.authorName || 'Profissional de Saúde').toUpperCase();
  let authorRoleOrRegister = '';
  if (consultation.authorRegister) {
    authorRoleOrRegister = consultation.authorRegister.toUpperCase();
  } else if (consultation.authorProfession === 'enfermeiro') {
    authorRoleOrRegister = 'COREN CBO 2235-05';
  } else if (consultation.authorProfession === 'medico') {
    authorRoleOrRegister = 'CRM/PA - MÉDICO DA ATENÇÃO PRIMÁRIA';
  } else {
    authorRoleOrRegister = consultation.authorProfession ? consultation.authorProfession.toUpperCase() : 'PROFISSIONAL e-SUS PEC';
  }

  const workplace = consultation.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL';

  // Helper to render clinical field blocks
  const renderPecSectionHtml = (title: string, rawText: string) => {
    if (!rawText || !rawText.trim()) return '';
    const blocks = parsePecText(rawText);
    if (blocks.length === 0) return '';

    let contentHtml = '';
    blocks.forEach((block) => {
      if (block.type === 'banner') {
        contentHtml += `
          <div style="font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #0f766e; padding: 3px 0 1px 0; border-bottom: 1px solid #ccfbf1; margin-top: 4px;">
            ${escapeHtml(block.text || '')}
          </div>
        `;
      } else if (block.type === 'header') {
        contentHtml += `
          <div style="font-weight: 800; font-size: 10.5px; text-transform: uppercase; color: #1e293b; margin-top: 5px; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
            <span style="color: #0d9488; font-size: 11px; line-height: 1;">•</span>
            <span>${escapeHtml(block.title || '')}</span>
          </div>
        `;
      } else if (block.type === 'quote') {
        const linesHtml = (block.lines || []).map((l) => `<div>${escapeHtml(l)}</div>`).join('');
        contentHtml += `
          <div style="margin: 2px 0 3px 8px; padding: 2.5px 6px; border-left: 3px solid #0d9488; background-color: #f8fafc; font-size: 10px; line-height: 1.4; color: #334155; text-align: justify;">
            ${linesHtml}
          </div>
        `;
      } else {
        contentHtml += `
          <div style="font-size: 10px; line-height: 1.42; color: #334155; margin: 2px 0; text-align: justify;">
            ${escapeHtml(block.text || '')}
          </div>
        `;
      }
    });

    return `
      <div style="margin-bottom: 8px; break-inside: auto; page-break-inside: auto;">
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #0d9488; padding: 3px 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px;">
          ${escapeHtml(title)}
        </div>
        <div style="padding: 4px 7px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          ${contentHtml}
        </div>
      </div>
    `;
  };

  const isTriage = consultation.isTriage || consultation.authorProfession === 'tecnico_enfermagem' || consultation.authorProfession === 'auxiliar_enfermagem';

  const isDoctor = isDoctorConsultation(consultation.authorProfession, consultation.authorRegister);
  const cleanedDoctorData = isDoctor
    ? cleanDoctorConsultation(consultation.avaliacao, consultation.plano, consultation.conduta)
    : null;

  const effectiveAvaliacao = cleanedDoctorData ? cleanedDoctorData.avaliacao : consultation.avaliacao;
  const effectivePlano = cleanedDoctorData ? cleanedDoctorData.plano : consultation.plano;
  const effectiveConduta = cleanedDoctorData ? cleanedDoctorData.conduta : consultation.conduta;

  const avaliacaoHtml = isTriage
    ? `
      <div style="margin-bottom: 8px; break-inside: auto; page-break-inside: auto;">
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #0d9488; padding: 3px 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px;">
          TRIAGEM, SINAIS VITAIS E ANTROPOMETRIA
        </div>
        <div style="padding: 6px 8px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff; white-space: pre-wrap; font-size: 10px; line-height: 1.45; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${escapeHtml(effectiveAvaliacao || '')}
        </div>
      </div>
    `
    : renderPecSectionHtml('AVALIAÇÃO CLÍNICO-ASSISTENCIAL E EVOLUÇÃO', effectiveAvaliacao);

  const planoTitle = isDoctor
    ? 'PLANO CUIDADO / INTERVENÇÕES / CONDUTAS / DESFECHO'
    : 'PLANO DE CUIDADO E INTERVENÇÕES';

  const planoHtml = isTriage ? '' : renderPecSectionHtml(planoTitle, effectivePlano);
  const condutaHtml = isTriage || isDoctor ? '' : (effectiveConduta ? renderPecSectionHtml('CONDUTA PROFISSIONAL E DESFECHO DO ATENDIMENTO', effectiveConduta) : '');

  let prescriptionHtml = '';
  if (consultation.prescription && consultation.prescription.items && consultation.prescription.items.length > 0) {
    const p = consultation.prescription;
    const itemsHtml = p.items
      .map((item, idx) => {
        const num = item.itemNumber || idx + 1;
        const details = [
          escapeHtml(item.posology),
          item.duration ? `• ${escapeHtml(item.duration)}` : '',
          item.scheduleInstructions ? `• ${escapeHtml(item.scheduleInstructions)}` : '',
        ]
          .filter(Boolean)
          .join(' ');

        return `
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: flex-start; gap: 6px;">
              <span style="font-family: monospace; font-weight: 900; font-size: 10px; color: #0f172a; min-width: 20px;">
                ${num}-
              </span>
              <div>
                <div style="font-weight: 900; font-size: 10.5px; text-transform: uppercase; color: #0f172a;">
                  ${escapeHtml(item.medicationName)}
                </div>
                <div style="font-size: 9.5px; font-weight: 600; color: #334155; margin-top: 1px;">
                  ${details}
                </div>
              </div>
            </div>
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 1.5px 5px; border-radius: 4px; white-space: nowrap;">
              ${escapeHtml(item.route)}
            </span>
          </div>
        `;
      })
      .join('');

    prescriptionHtml = `
      <div style="margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid;">
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; padding: 3px 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px;">
          ${escapeHtml(p.type || 'PRESCRIÇÃO')} DE MEDICAMENTOS
        </div>
        <div style="padding: 4px 8px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  let referralHtml = '';
  if (consultation.referral) {
    const ref = consultation.referral;
    const priority = ref.priority || 'Eletivo';
    let priorityBadgeBg = '#f0fdf4';
    let priorityBadgeColor = '#166534';
    let priorityBorder = '#86efac';

    if (priority === 'Prioritário') {
      priorityBadgeBg = '#fefce8';
      priorityBadgeColor = '#854d0e';
      priorityBorder = '#fde047';
    } else if (priority === 'Urgência/Emergência') {
      priorityBadgeBg = '#fef2f2';
      priorityBadgeColor = '#991b1b';
      priorityBorder = '#fca5a5';
    }

    referralHtml = `
      <div style="margin-top: 10px; margin-bottom: 8px; border: 1px solid #7dd3fc; border-radius: 4px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: avoid;">
        <div style="background-color: #f0f9ff; border-bottom: 1px solid #bae6fd; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #082f49; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0284c7;"></span>
            <span>GUIA DE ENCAMINHAMENTO E REFERÊNCIA - SUS</span>
          </div>
          <span style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; background: ${priorityBadgeBg}; color: ${priorityBadgeColor}; border: 1px solid ${priorityBorder}; padding: 1.5px 6px; border-radius: 4px;">
            Prioridade: ${escapeHtml(priority)}
          </span>
        </div>

        <div style="padding: 6px 8px; font-size: 10px; color: #1e293b;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px;">
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0369a1;">
              Serviço / Especialidade de Destino:
            </div>
            <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 1px;">
              ${escapeHtml(ref.destination || 'SERVIÇO ESPECIALIZADO')}
            </div>
          </div>

          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              1. Resumo do Quadro Clínico e Justificativa do Encaminhamento:
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(ref.clinicalIndication || '')}
            </div>
          </div>

          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              2. Hipóteses Diagnósticas / Demandas de Suporte (CID-10 / CIAP-2):
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(ref.hypotheses || '')}
            </div>
          </div>

          ${ref.proceduresRequested ? `
          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              3. Condutas, Avaliações ou Exames Complementares Solicitados:
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(ref.proceduresRequested)}
            </div>
          </div>` : ''}

          ${ref.examsConducted ? `
          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              4. Exames Já Realizados / Antecedentes Relevantes:
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(ref.examsConducted)}
            </div>
          </div>` : ''}

          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #64748b;">
            <div style="font-weight: 800; text-transform: uppercase; color: #334155; margin-bottom: 2px;">
              Contra-Referência (Destinado ao Serviço de Destino):
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Unidade Receptora: _________________________________</span>
              <span>Data do Atendimento: ____/____/202___</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let ptsHtml = '';
  if (consultation.pts) {
    const pts = consultation.pts;
    const refProf = pts.referenceProfessional || pts.professionalName || authorName;

    ptsHtml = `
      <div style="margin-top: 10px; margin-bottom: 8px; border: 1px solid #d8b4fe; border-radius: 4px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: auto;">
        <div style="background-color: #faf5ff; border-bottom: 1px solid #e9d5ff; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #3b0764; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #9333ea;"></span>
            <span>PROJETO TERAPÊUTICO SINGULAR (PTS) - PACTUAÇÃO MULTIPROFISSIONAL</span>
          </div>
          <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; background: #f3e8ff; color: #6b21a8; border: 1px solid #d8b4fe; padding: 1.5px 6px; border-radius: 4px;">
            Reavaliação: ${escapeHtml(pts.reassessmentDate || '30 dias')}
          </span>
        </div>

        <div style="padding: 6px 8px; font-size: 10px; color: #1e293b;">
          <div style="background: #faf5ff; border: 1px solid #f3e8ff; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #7e22ce;">
                Profissional de Referência / Gestor do Caso:
              </div>
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 1px;">
                ${escapeHtml(refProf)}
              </div>
            </div>
            ${pts.teamMembers ? `
            <div style="font-size: 9.5px; font-weight: 700; color: #6b21a8;">
              Equipe Técnica: ${escapeHtml(pts.teamMembers)}
            </div>` : ''}
          </div>

          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              Eixo 1: Diagnóstico Situacional, Vulnerabilidades e Potencialidades:
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(pts.diagnosisVulnerability || '')}
            </div>
          </div>

          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              Eixo 2: Metas Pactuadas de Curto Prazo (Intervenções Imediatas / Estabilização):
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(pts.shortTermGoals || '')}
            </div>
          </div>

          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              Eixo 3: Metas de Médio e Longo Prazo (Autonomia e Reabilitação Psicossocial):
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(pts.mediumLongTermGoals || '')}
            </div>
          </div>

          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              Eixo 4: Divisão de Responsabilidades e Pactuação de Ações:
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.4; text-align: justify; margin-top: 1px; white-space: pre-wrap;">
              ${escapeHtml(pts.agreedActions || '')}
            </div>
          </div>

          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 15px; text-align: center;">
            <div style="flex: 1;">
              <div style="border-top: 1px solid #0f172a; padding-top: 2px; font-size: 9px; font-weight: 900; text-transform: uppercase;">
                ${escapeHtml(refProf)}
              </div>
              <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">Profissional de Referência</div>
            </div>
            <div style="flex: 1;">
              <div style="border-top: 1px solid #0f172a; padding-top: 2px; font-size: 9px; font-weight: 900; text-transform: uppercase;">
                ${escapeHtml(patientName)}
              </div>
              <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">Usuário(a) / Família (Pactuação)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let examRequestHtml = '';
  if (consultation.examRequest && consultation.examRequest.items && consultation.examRequest.items.length > 0) {
    const sortedItems = [...consultation.examRequest.items].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    );
    const itemsRowsHtml = sortedItems
      .map(
        (item, idx) => `
        <div style="display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 2.5px 0;">
          <div style="display: flex; align-items: baseline; gap: 5px;">
            <span style="font-weight: 900; color: #1d4ed8; font-size: 9.5px;">${String(idx + 1).padStart(2, '0')}.</span>
            <span style="font-weight: 800; color: #0f172a; font-size: 10px; text-transform: uppercase;">${escapeHtml(item.name)}</span>
            ${item.clinicalIndication ? `<span style="font-size: 8.5px; color: #64748b; font-style: italic;">(${escapeHtml(item.clinicalIndication)})</span>` : ''}
          </div>
          ${item.urgency ? `<span style="font-size: 8px; font-weight: 800; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; padding: 1px 4px; border-radius: 3px; text-transform: uppercase;">URGENTE</span>` : ''}
        </div>
      `
      )
      .join('');

    examRequestHtml = `
      <div style="margin-top: 10px; margin-bottom: 8px; border: 1px solid #93c5fd; border-radius: 4px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: auto;">
        <div style="background-color: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #2563eb;"></span>
            <span>SOLICITAÇÃO DE EXAMES COMPLEMENTARES</span>
          </div>
          <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; padding: 1.5px 6px; border-radius: 4px;">
            ${sortedItems.length} ${sortedItems.length === 1 ? 'Exame Solicitado' : 'Exames Solicitados'}
          </span>
        </div>
        <div style="padding: 6px 8px; font-size: 10px;">
          ${
            consultation.examRequest.clinicalIndicationGeneral
              ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 6px; border-radius: 4px; margin-bottom: 5px; font-size: 9.5px;">
                   <strong style="color: #1e40af; text-transform: uppercase; font-size: 9px;">Indicação Clínica Geral:</strong>
                   <span style="color: #334155;">${escapeHtml(consultation.examRequest.clinicalIndicationGeneral)}</span>
                 </div>`
              : ''
          }
          <div style="margin-top: 4px;">
            ${itemsRowsHtml}
          </div>
        </div>
      </div>
    `;
  }

  let attendanceCertificateHtml = '';
  if (consultation.attendanceCertificate) {
    const cert = consultation.attendanceCertificate;
    const isComp = Boolean(cert.isCompanion && cert.companionName);
    const dateStr = cert.attendanceDateFormatted || cert.attendanceDate || dateFormatted;
    const period = cert.periodLabel || 'Dia do Atendimento';
    const attType = cert.attendanceType || 'Atendimento / Consulta em Saúde';

    const bodyText = isComp
      ? `Atesto para os devidos fins de comprovação e justificativa de comparecimento que o(a) Sr.(a) <strong>${escapeHtml(cert.companionName || '')}</strong> (${escapeHtml(cert.companionKinship || 'Acompanhante / Responsável')}), portador(a) do documento ${escapeHtml(cert.companionDocument || 'apresentado')}, esteve presente nesta Unidade de Saúde acompanhando o(a) paciente <strong>${escapeHtml(patientName)}</strong> para a realização de <strong>${escapeHtml(attType)}</strong> no dia <strong>${escapeHtml(dateStr)}</strong>, no <strong>${escapeHtml(period)}</strong>.`
      : `Atesto para os devidos fins de comprovação e justificativa de comparecimento que o(a) paciente acima identificado(a) compareceu a esta Unidade de Saúde para a realização de <strong>${escapeHtml(attType)}</strong> no dia <strong>${escapeHtml(dateStr)}</strong>, no <strong>${escapeHtml(period)}</strong>.`;

    attendanceCertificateHtml = `
      <div style="margin-top: 10px; margin-bottom: 8px; border: 1px solid #7dd3fc; border-radius: 4px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: auto;">
        <div style="background-color: #f0f9ff; border-bottom: 1px solid #bae6fd; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #082f49; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0284c7;"></span>
            <span>ATESTADO DE COMPARECIMENTO (FOLHA A4)</span>
          </div>
          <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 1.5px 6px; border-radius: 4px;">
            ${escapeHtml(period)}
          </span>
        </div>

        <div style="padding: 6px 8px; font-size: 10px; color: #1e293b;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0369a1;">
                Finalidade / Motivo:
              </div>
              <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 1px;">
                ${escapeHtml(attType)}
              </div>
            </div>
            <div style="font-size: 9.5px; font-weight: 700; color: #0369a1;">
              Data: ${escapeHtml(dateStr)}
            </div>
          </div>

          ${
            isComp
              ? `
          <div style="background: #f0f9ff; border: 1px solid #e0f2fe; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px; font-size: 9.5px;">
            <strong style="color: #0369a1; text-transform: uppercase; font-size: 9px;">Acompanhante Justificado:</strong>
            <span style="font-weight: 800; text-transform: uppercase;">${escapeHtml(cert.companionName || '')}</span>
            ${cert.companionDocument ? `(Doc: ${escapeHtml(cert.companionDocument)})` : ''} - ${escapeHtml(cert.companionKinship || '')}
          </div>`
              : ''
          }

          <div style="font-size: 10px; line-height: 1.5; color: #334155; text-align: justify; margin: 4px 0;">
            ${bodyText}
          </div>

          ${
            cert.observations
              ? `
          <div style="font-size: 9px; font-style: italic; color: #64748b; margin-top: 4px; border-top: 1px solid #f1f5f9; padding-top: 2px;">
            Observações: ${escapeHtml(cert.observations)}
          </div>`
              : ''
          }

          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #64748b;">
            <div>
              Emitido por: <strong style="color: #0f172a; text-transform: uppercase;">${escapeHtml(cert.professionalName)}</strong> (${escapeHtml(cert.professionalRole)} - ${escapeHtml(cert.professionalCouncil)})
            </div>
            <div style="font-style: italic;">
              * Comprovante de comparecimento ao serviço de saúde nos termos da legislação vigente.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let medicalCertificateHtml = '';
  if (consultation.medicalCertificate) {
    const medCert = consultation.medicalCertificate;
    const daysOff = medCert.daysOff || 1;
    const daysOffExtenso = medCert.daysOffExtenso || `${daysOff} dia(s)`;
    const startDt = medCert.startDateFormatted || medCert.startDate || dateFormatted;

    medicalCertificateHtml = `
      <div style="margin-top: 10px; margin-bottom: 8px; border: 1px solid #2dd4bf; border-radius: 4px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: auto;">
        <div style="background-color: #f0fdfa; border-bottom: 1px solid #99f6e4; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #134e4a; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0d9488;"></span>
            <span>ATESTADO MÉDICO OFICIAL</span>
          </div>
          <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; padding: 1.5px 6px; border-radius: 4px;">
            ${daysOff} (${escapeHtml(daysOffExtenso)}) Afastamento
          </span>
        </div>

        <div style="padding: 6px 8px; font-size: 10px; color: #1e293b;">
          <div style="background: #f0fdfa; border: 1px solid #ccfbf1; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0f766e;">
                Período de Repouso / Afastamento:
              </div>
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 1px;">
                ${daysOff} (${escapeHtml(daysOffExtenso)}) a contar de ${escapeHtml(startDt)}
              </div>
            </div>
            ${
              medCert.includeCid && medCert.cid10
                ? `<div style="text-align: right;">
                     <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0f766e;">CID-10:</div>
                     <div style="font-size: 10.5px; font-weight: 900; color: #0f172a;">${escapeHtml(medCert.cid10)}</div>
                   </div>`
                : ''
            }
          </div>

          <div style="font-size: 10px; line-height: 1.5; color: #334155; text-align: justify; margin: 4px 0;">
            Atesto para os devidos fins que o(a) paciente acima identificado(a) necessita de <strong>${daysOff} (${escapeHtml(daysOffExtenso)})</strong> de afastamento de suas atividades por motivo de saúde, a contar de <strong>${escapeHtml(startDt)}</strong>.
          </div>

          ${
            medCert.purpose
              ? `<div style="font-size: 9.5px; color: #334155; margin-top: 3px;">
                   <strong>Finalidade:</strong> ${escapeHtml(medCert.purpose)}
                 </div>`
              : ''
          }

          ${
            medCert.clinicalNotes
              ? `<div style="font-size: 9px; font-style: italic; color: #64748b; margin-top: 3px; border-top: 1px solid #f1f5f9; padding-top: 2px;">
                   Observações / Recomendações: ${escapeHtml(medCert.clinicalNotes)}
                 </div>`
              : ''
          }

          <div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid #e2e8f0; text-align: center;">
            <div style="border-top: 1px solid #0f172a; width: 180px; margin: 0 auto; padding-top: 2px; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              Dr(a). ${escapeHtml(medCert.professionalName)}
            </div>
            <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">
              ${escapeHtml(medCert.professionalCouncil)} ${medCert.professionalSpecialty ? `• ${escapeHtml(medCert.professionalSpecialty)}` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let examMediaHtml = '';
  if (consultation.examMedia && consultation.examMedia.items && consultation.examMedia.items.length > 0) {
    const report = consultation.examMedia;
    const mediaItems = report.items;

    const itemsGridHtml = mediaItems
      .map((item) => {
        const isVideo = item.type === 'video';
        const imgSource = isVideo
          ? item.videoThumbnailDataUrl || item.imageDataUrl || ''
          : item.imageDataUrl || '';

        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="position: relative; width: 100%; height: 85px; background: #0f172a; border-radius: 3px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                ${
                  imgSource
                    ? `<img src="${imgSource}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 100%; object-fit: contain;" />`
                    : `<span style="font-size: 8px; color: #94a3b8;">Sem imagem</span>`
                }
                ${
                  isVideo
                    ? `
                  <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px;">
                    ${
                      item.qrCodeDataUrl
                        ? `
                      <div style="background: #ffffff; padding: 2px; border-radius: 3px; text-align: center;">
                        <img src="${item.qrCodeDataUrl}" alt="QR Code Vídeo" style="width: 44px; height: 44px; display: block;" />
                        <span style="font-size: 6.5px; font-weight: 900; color: #0f172a; text-transform: uppercase; display: block; margin-top: 1px;">Aponte Câmera</span>
                      </div>`
                        : `<span style="background: #f59e0b; color: #020617; font-weight: 900; font-size: 8px; padding: 2px 5px; border-radius: 3px;">▶ VÍDEO</span>`
                    }
                  </div>`
                    : ''
                }
              </div>
              <div style="font-weight: 900; font-size: 9px; text-transform: uppercase; color: #0f172a; margin-top: 3px; line-height: 1.2;">
                ${escapeHtml(item.title)}
              </div>
              ${
                item.description
                  ? `<div style="font-size: 8px; color: #475569; margin-top: 1px; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                       ${escapeHtml(item.description)}
                     </div>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    examMediaHtml = `
      <div style="margin-top: 10px; margin-bottom: 8px; border: 1px solid #fcd34d; border-radius: 4px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: auto;">
        <div style="background-color: #fffbeb; border-bottom: 1px solid #fde68a; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #78350f; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #d97706;"></span>
            <span>${escapeHtml(report.title || 'ANEXO ICONOGRÁFICO DE IMAGENS E QR CODE DE VÍDEOS (A4)')}</span>
          </div>
          <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 1.5px 6px; border-radius: 4px;">
            ${mediaItems.length} ${mediaItems.length === 1 ? 'Mídia Anexa' : 'Mídias Anexas'}
          </span>
        </div>

        <div style="padding: 6px 8px; font-size: 10px; color: #1e293b;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
            ${itemsGridHtml}
          </div>

          ${
            report.legalNotice
              ? `
          <div style="font-size: 8px; color: #78350f; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 3px; padding: 3px 6px; margin-top: 6px; line-height: 1.3;">
            ⚖️ ${escapeHtml(report.legalNotice)}
          </div>`
              : ''
          }
        </div>
      </div>
    `;
  }

  let medicalReportHtml = '';
  if (consultation.medicalReport) {
    const rep = consultation.medicalReport;
    medicalReportHtml = `
      <div style="margin-top: 10px; margin-bottom: 8px; border: 1px solid #5eead4; border-radius: 4px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: auto;">
        <div style="background-color: #f0fdfa; border-bottom: 1px solid #99f6e4; padding: 4px 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #134e4a; display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0d9488;"></span>
            <span>LAUDO MÉDICO OFICIAL</span>
          </div>
          <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; padding: 1.5px 6px; border-radius: 4px;">
            ${escapeHtml(rep.cityDateFormatted || 'Anajás/PA')}
          </span>
        </div>

        <div style="padding: 6px 8px; font-size: 10px; color: #1e293b;">
          <div style="background: #f0fdfa; border: 1px solid #ccfbf1; padding: 4px 6px; border-radius: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #0f766e;">CID-10:</div>
              <div style="font-size: 11px; font-weight: 900; color: #0f172a; margin-top: 1px;">${escapeHtml(rep.cid10)}</div>
            </div>
            <div style="font-size: 9.5px; font-weight: 700; color: #475569;">
              ${escapeHtml(rep.cityDateFormatted || 'Anajás/PA')}
            </div>
          </div>

          <div style="margin-bottom: 5px;">
            <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #0f172a;">
              Descrição Clínica e Parecer Médico:
            </div>
            <div style="font-size: 9.5px; color: #334155; line-height: 1.45; text-align: justify; margin-top: 2px; white-space: pre-wrap;">
              ${escapeHtml(rep.description)}
            </div>
          </div>

          <div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid #e2e8f0; text-align: center;">
            <div style="border-top: 1px solid #0f172a; width: 180px; margin: 0 auto; padding-top: 2px; font-size: 9px; font-weight: 900; text-transform: uppercase;">
              ${escapeHtml(rep.professionalName)}
            </div>
            <div style="font-size: 8px; color: #64748b; text-transform: uppercase;">
              ${escapeHtml(rep.professionalSpecialty)} • ${escapeHtml(rep.professionalCouncil)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Prontuário de Atendimento - ${escapeHtml(patientName)} - ${dateFormatted}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #525659;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
      background: #0d9488;
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
      box-sizing: border-box;
      background: #ffffff;
      margin: 0 auto;
      padding: 12mm 14mm 10mm 14mm;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
      }
      .toolbar-container {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
      }
      .a4-portrait-sheet {
        width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        height: auto !important;
        box-sizing: border-box !important;
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
  <!-- Floating screen toolbar -->
  <div class="toolbar-container no-print">
    <div class="toolbar-info">
      <span class="toolbar-badge">A4 Retrato</span>
      <span><strong>Atendimento e-SUS PEC:</strong> ${escapeHtml(patientName)} (${dateFormatted} às ${timeFormatted})</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        🖨️ Imprimir Atendimento
      </button>
      <button class="btn-secondary" onclick="window.print()">
        💾 Salvar em PDF
      </button>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="a4-portrait-sheet">
      <div>
        <!-- 1. Institutional Header (CapsLeftLogo, Prefeitura, CAPS, CapsRightLogo) -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding: 0 10px 6px 10px; margin-bottom: 7px;">
          <div style="width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 4px;">
            <img src="${LOGO_CAPS_BASE64}" alt="Brasão CAPS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>

          <div style="text-align: center; flex-grow: 1; padding: 0 12px;">
            <div style="font-weight: 900; font-size: 12px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px; line-height: 1.2;">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div style="font-weight: 800; font-size: 10.5px; text-transform: uppercase; color: #334155; margin-top: 1px; letter-spacing: 0.2px;">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: #0d9488; margin-top: 1px;">
              ${escapeHtml(workplace)}
            </div>
            <div style="font-weight: 900; font-size: 10px; text-transform: uppercase; color: #0f172a; margin-top: 2px; padding: 2px 10px; background: #f1f5f9; border-radius: 4px; display: inline-block; border: 1px solid #cbd5e1;">
              ${isTriage ? 'REGISTRO DE ATENDIMENTO CLÍNICO - TRIAGEM' : 'REGISTRO DE ATENDIMENTO CLÍNICO'}
            </div>
          </div>

          <div style="width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 4px;">
            <img src="${LOGO_CAPS_BASE64}" alt="Logo SUS" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>

        <!-- 2. Patient Identification Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #94a3b8;">
          <tbody>
            <tr>
              <th style="width: 12%; background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b;">
                NOME
              </th>
              <td style="width: 62%; padding: 3.5px 6px; font-weight: 800; font-size: 11px; border: 1px solid #94a3b8; text-transform: uppercase; color: #0f172a;">
                ${escapeHtml(patientName)}
              </td>
              <th style="width: 10%; background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b;">
                IDADE
              </th>
              <td style="width: 16%; padding: 3.5px 6px; font-weight: 800; font-size: 11px; border: 1px solid #94a3b8; text-transform: uppercase; color: #0f172a; text-align: center;">
                ${escapeHtml(patientAge)}
              </td>
            </tr>
          </tbody>
        </table>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #94a3b8; border-top: none; margin-bottom: 8px;">
          <tbody>
            <tr>
              <th style="width: 14%; background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b; white-space: nowrap;">
                ATENDIMENTO
              </th>
              <td style="width: 24%; padding: 3.5px 6px; font-weight: 700; font-size: 10.5px; border: 1px solid #94a3b8; color: #0f172a; white-space: nowrap;">
                ${dateFormatted} às ${timeFormatted}
              </td>
              <th style="width: 14%; background: #f1f5f9; padding: 3.5px 6px; text-align: left; font-weight: 800; text-transform: uppercase; border: 1px solid #94a3b8; color: #1e293b; white-space: nowrap;">
                DOCUMENTOS
              </th>
              <td style="width: 48%; padding: 3.5px 6px; font-weight: 600; font-size: 10px; border: 1px solid #94a3b8; color: #334155; white-space: nowrap;">
                ${escapeHtml(docInfo)}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 3. Clinical Consultation Content (Image 3 Red Boxes) -->
        <div class="consultation-clinical-body">
          ${avaliacaoHtml}
          ${planoHtml}
          ${condutaHtml}
          ${prescriptionHtml}
          ${referralHtml}
          ${ptsHtml}
          ${examRequestHtml}
          ${attendanceCertificateHtml}
          ${medicalCertificateHtml}
          ${examMediaHtml}
          ${medicalReportHtml}
        </div>
      </div>

      <!-- 4. Date, Signature Block and Footer (Image 1 Style) -->
      <div class="page-break-inside-avoid" style="margin-top: 10px;">
        <!-- Date aligned to the right -->
        <div style="text-align: right; font-size: 10.5px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">
          Anajás, ${day} de ${month} de ${year}
        </div>

        ${(() => {
          const authorInfo = resolveConsultationAuthor(consultation, currentUser);

          if (authorInfo.useDigitalStamp && authorInfo.digitalStampUrl) {
            return `
              <div style="margin: 0 auto; width: 280px; text-align: center;">
                <img src="${authorInfo.digitalStampUrl}" alt="Carimbo e Assinatura de ${escapeHtml(authorInfo.name)}" style="max-height: 90px; max-width: 260px; object-fit: contain; margin: 0 auto; display: block;" />
              </div>
            `;
          }

          const authorProfessionKey = (authorInfo.profession || '').toLowerCase();
          const cboCode = authorInfo.cbo || DEFAULT_CBO_MAP[authorProfessionKey] || '';
          const cboFormatted = cboCode ? (cboCode.toUpperCase().startsWith('CBO') ? cboCode.toUpperCase() : `CBO ${cboCode}`) : '';

          let councilInfo = '';
          if (authorInfo.councilBody && authorInfo.councilNumber) {
            councilInfo = `${authorInfo.councilBody}${authorInfo.councilUf ? `/${authorInfo.councilUf}` : ''} ${authorInfo.councilNumber}`.trim();
          } else if (authorInfo.professionalRegister) {
            councilInfo = authorInfo.professionalRegister.trim();
          }

          const isCouncilDuplicateOfCbo =
            councilInfo &&
            cboFormatted &&
            (councilInfo.replace(/\D/g, '') === cboFormatted.replace(/\D/g, '') ||
             councilInfo.toUpperCase().startsWith('CBO') ||
             councilInfo.toLowerCase().trim() === cboFormatted.toLowerCase().trim());
          const cleanCouncilInfo = isCouncilDuplicateOfCbo ? '' : councilInfo;

          return `
            <div style="margin: 0 auto; width: 280px; text-align: center;">
              <div style="border-top: 1.5px solid #0f172a; margin-bottom: 3px;"></div>
              <div style="font-weight: 900; font-size: 11.5px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.4px;">
                ${escapeHtml(authorInfo.name)}
              </div>
              ${cboFormatted ? `
              <div style="font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; margin-top: 1px;">
                ${escapeHtml(cboFormatted)}
              </div>` : ''}
              ${cleanCouncilInfo ? `
              <div style="font-size: 9.5px; font-weight: 600; color: #475569; text-transform: uppercase; margin-top: 1px;">
                ${escapeHtml(cleanCouncilInfo)}
              </div>` : ''}
            </div>
          `;
        })()}

        <!-- Institutional Address Footer -->
        <div style="text-align: center; font-size: 8.5px; font-weight: 600; color: #64748b; text-transform: uppercase; line-height: 1.35; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
          <div>TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000</div>
          <div>SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Automatic print trigger on load when ready
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
 * Opens the consultation record in a new browser tab formatted strictly for A4 Portrait with 1.27 cm margins.
 */
export async function openConsultationInNewTab(
  consultation: Consultation,
  patient: Patient,
  currentUser?: User | null
): Promise<Window | null> {
  let activeConsultation = consultation;
  if (consultation.examMedia) {
    try {
      const updatedMedia = await ensureExamMediaQRCodes(consultation.examMedia);
      activeConsultation = { ...consultation, examMedia: updatedMedia };
    } catch {
      // ignore
    }
  }

  const htmlContent = generateConsultationHtml(activeConsultation, patient, currentUser);
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
 * Downloads the consultation record as a standalone HTML file.
 */
export async function downloadConsultationHtml(
  consultation: Consultation,
  patient: Patient,
  currentUser?: User | null
): Promise<void> {
  let activeConsultation = consultation;
  if (consultation.examMedia) {
    try {
      const updatedMedia = await ensureExamMediaQRCodes(consultation.examMedia);
      activeConsultation = { ...consultation, examMedia: updatedMedia };
    } catch {
      // ignore
    }
  }

  const htmlContent = generateConsultationHtml(activeConsultation, patient, currentUser);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const consultDate = new Date(activeConsultation.timestamp || Date.now());
  const dateStr = consultDate.toISOString().split('T')[0];
  const safeName = (patient?.fullName || 'Paciente').replace(/\s+/g, '_');

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Atendimento_${safeName}_${dateStr}.html`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }, 1000);
}
