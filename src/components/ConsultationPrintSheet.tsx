import React from 'react';
import { Consultation, Patient, User } from '../types';
import { CapsLeftLogo, CapsRightLogo } from './PrescriptionLogos';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { PecContentRenderer } from './PecContentRenderer';
import { isDoctorConsultation, cleanDoctorConsultation } from '../utils/doctorConsultationCleaner';
import { ProfessionalSignatureBlock } from './ProfessionalSignatureBlock';
import { resolveConsultationAuthor } from '../utils/authorResolver';

interface ConsultationPrintSheetProps {
  consultation: Consultation;
  patient: Patient;
  isPrintOnly?: boolean;
  currentUser?: User | null;
}

export const ConsultationPrintSheet: React.FC<ConsultationPrintSheetProps> = ({
  consultation,
  patient,
  isPrintOnly = false,
  currentUser,
}) => {
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

  const isDoctor = isDoctorConsultation(consultation.authorProfession, consultation.authorRegister);
  const cleanedDoctorData = isDoctor
    ? cleanDoctorConsultation(consultation.avaliacao, consultation.plano, consultation.conduta)
    : null;

  const effectiveAvaliacao = cleanedDoctorData ? cleanedDoctorData.avaliacao : consultation.avaliacao;
  const effectivePlano = cleanedDoctorData ? cleanedDoctorData.plano : consultation.plano;
  const effectiveConduta = cleanedDoctorData ? cleanedDoctorData.conduta : consultation.conduta;

  return (
    <div
      className={`bg-white text-slate-900 mx-auto flex flex-col justify-between ${
        isPrintOnly
          ? 'w-[210mm] min-h-[297mm] p-[12mm_14mm_10mm_14mm] shadow-none'
          : 'w-[210mm] min-h-[297mm] p-[12mm_14mm_10mm_14mm] shadow-xl border border-slate-200'
      }`}
      style={{
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div>
        {/* Institutional Header (Image 1 Model) */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 px-3 pb-2 mb-2">
          <div className="w-[96px] h-[96px] shrink-0 flex items-center justify-center ml-1">
            <CapsLeftLogo className="w-[90px] h-[90px]" />
          </div>

          <div className="text-center flex-1 px-3">
            <div className="font-black text-xs uppercase tracking-wide text-slate-900 leading-tight">
              PREFEITURA MUNICIPAL DE ANAJÁS
            </div>
            <div className="font-extrabold text-[10.5px] uppercase tracking-wide text-slate-700 mt-0.5">
              SECRETARIA MUNICIPAL DE SAÚDE
            </div>
            <div className="font-bold text-[10px] uppercase text-teal-700 mt-0.5">
              {workplace}
            </div>
            <div className="font-black text-[10px] uppercase text-slate-900 mt-1 px-2.5 py-0.5 bg-slate-100 rounded inline-block border border-slate-300">
              {consultation.isTriage ||
              consultation.authorProfession === 'tecnico_enfermagem' ||
              consultation.authorProfession === 'auxiliar_enfermagem'
                ? 'REGISTRO DE ATENDIMENTO CLÍNICO - TRIAGEM'
                : 'REGISTRO DE ATENDIMENTO CLÍNICO'}
            </div>
          </div>

          <div className="w-[96px] h-[96px] shrink-0 flex items-center justify-center mr-1">
            <CapsRightLogo className="w-[90px] h-[90px]" />
          </div>
        </div>

        {/* Patient Identification Table */}
        <table className="w-full border-collapse text-[10px] border border-slate-400">
          <tbody>
            <tr>
              <th className="w-[12%] bg-slate-100 p-1 text-left font-black uppercase border border-slate-400 text-slate-800">
                NOME
              </th>
              <td className="w-[62%] p-1 font-black text-[11px] border border-slate-400 uppercase text-slate-950">
                {patientName}
              </td>
              <th className="w-[10%] bg-slate-100 p-1 text-left font-black uppercase border border-slate-400 text-slate-800">
                IDADE
              </th>
              <td className="w-[16%] p-1 font-black text-[11px] border border-slate-400 uppercase text-slate-950 text-center">
                {patientAge}
              </td>
            </tr>
          </tbody>
        </table>
        <table className="w-full border-collapse mb-2 text-[10px] border border-slate-400 border-t-0 -mt-[1px]">
          <tbody>
            <tr>
              <th className="w-[14%] bg-slate-100 p-1 text-left font-black uppercase border border-slate-400 text-slate-800 whitespace-nowrap">
                ATENDIMENTO
              </th>
              <td className="w-[24%] p-1 font-bold text-[10.5px] border border-slate-400 text-slate-900 whitespace-nowrap">
                {dateFormatted} às {timeFormatted}
              </td>
              <th className="w-[14%] bg-slate-100 p-1 text-left font-black uppercase border border-slate-400 text-slate-800 whitespace-nowrap">
                DOCUMENTOS
              </th>
              <td className="w-[48%] p-1 font-medium text-[10px] border border-slate-400 text-slate-700 whitespace-nowrap">
                {docInfo}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Clinical Sections (Standardized titles for all professions) */}
        <div className="space-y-3.5">
          {/* Triage Mode for Nursing Technician & Assistant */}
          {consultation.isTriage ||
          consultation.authorProfession === 'tecnico_enfermagem' ||
          consultation.authorProfession === 'auxiliar_enfermagem' ? (
            <div className="break-inside-avoid">
              <div className="bg-slate-100 border border-slate-300 border-l-4 border-l-teal-600 px-2 py-1 text-[11px] font-black uppercase text-slate-900 tracking-wide">
                TRIAGEM, SINAIS VITAIS E ANTROPOMETRIA
              </div>
              <div className="p-2.5 border border-slate-200 border-t-0 bg-white whitespace-pre-wrap text-[10.5px] leading-relaxed text-slate-900 font-sans">
                {consultation.avaliacao}
              </div>
            </div>
          ) : (
            <>
              {/* Section 1: Avaliação */}
              {effectiveAvaliacao && effectiveAvaliacao.trim() && (
                <div className="break-inside-avoid">
                  <div className="bg-slate-100 border border-slate-300 border-l-4 border-l-teal-600 px-2 py-1 text-[11px] font-black uppercase text-slate-900 tracking-wide">
                    AVALIAÇÃO CLÍNICO-ASSISTENCIAL E EVOLUÇÃO
                  </div>
                  <div className="p-2 border border-slate-200 border-t-0 bg-white">
                    <PecContentRenderer text={effectiveAvaliacao} compact />
                  </div>
                </div>
              )}

              {/* Section 2: Plano */}
              {effectivePlano && effectivePlano.trim() && (
                <div className="break-inside-avoid">
                  <div className="bg-slate-100 border border-slate-300 border-l-4 border-l-teal-600 px-2 py-1 text-[11px] font-black uppercase text-slate-900 tracking-wide">
                    {isDoctor
                      ? 'PLANO CUIDADO / INTERVENÇÕES / CONDUTAS / DESFECHO'
                      : 'PLANO DE CUIDADO E INTERVENÇÕES'}
                  </div>
                  <div className="p-2 border border-slate-200 border-t-0 bg-white">
                    <PecContentRenderer text={effectivePlano} compact />
                  </div>
                </div>
              )}

              {/* Section 3: Conduta (se houver e não for médico) */}
              {!isDoctor && effectiveConduta && effectiveConduta.trim() && (
                <div className="break-inside-avoid">
                  <div className="bg-slate-100 border border-slate-300 border-l-4 border-l-teal-600 px-2 py-1 text-[11px] font-black uppercase text-slate-900 tracking-wide">
                    CONDUTA PROFISSIONAL E DESFECHO DO ATENDIMENTO
                  </div>
                  <div className="p-2 border border-slate-200 border-t-0 bg-white">
                    <PecContentRenderer text={effectiveConduta} compact />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Section 4: Prescrição / Transcrição de Medicamentos vinculada ao Atendimento */}
          {consultation.prescription && consultation.prescription.items && consultation.prescription.items.length > 0 && (
            <div className="break-inside-avoid">
              <div className="bg-slate-100 border border-slate-300 border-l-4 border-l-blue-600 px-2.5 py-1 text-[11px] font-black uppercase text-slate-900 tracking-wide">
                {consultation.prescription.type || 'PRESCRIÇÃO'} DE MEDICAMENTOS
              </div>
              <div className="p-2.5 border border-slate-200 border-t-0 bg-white space-y-2">
                {consultation.prescription.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="text-xs text-slate-800 flex items-start justify-between gap-3 border-b border-slate-100 last:border-b-0 pb-1.5 last:pb-0"
                  >
                    <div className="flex items-start gap-2">
                      <span className="font-mono font-black text-slate-900 text-[11px] min-w-[22px]">
                        {item.itemNumber || idx + 1}-
                      </span>
                      <div className="space-y-0.5">
                        <div className="font-black text-slate-950 uppercase text-[11.5px]">
                          {item.medicationName}
                        </div>
                        <div className="text-[10.5px] text-slate-700 font-medium">
                          {item.posology} {item.duration && `• ${item.duration}`}{' '}
                          {item.scheduleInstructions && `• ${item.scheduleInstructions}`}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                      {item.route}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Guia de Encaminhamento e Referência SUS (quando presente) */}
          {consultation.referral && (
            <div className="break-inside-avoid border border-sky-300 rounded-md overflow-hidden bg-white mt-3.5">
              <div className="bg-sky-50 border-b border-sky-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-sky-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                  <span>GUIA DE ENCAMINHAMENTO E REFERÊNCIA - SUS</span>
                </div>
                <span
                  className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                    consultation.referral.priority === 'Urgência/Emergência'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : consultation.referral.priority === 'Prioritário'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-teal-100 text-teal-900 border-teal-300'
                  }`}
                >
                  Prioridade: {consultation.referral.priority || 'Eletivo'}
                </span>
              </div>

              <div className="p-3 space-y-2.5 text-[10px] text-slate-800">
                <div className="bg-sky-50/70 p-2 rounded border border-sky-100">
                  <span className="font-extrabold text-sky-900 uppercase text-[9px] block">
                    Serviço / Especialidade de Destino:
                  </span>
                  <span className="font-black text-slate-950 text-xs uppercase">
                    {consultation.referral.destination || 'SERVIÇO ESPECIALIZADO'}
                  </span>
                </div>

                <div>
                  <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                    1. Resumo do Quadro Clínico e Justificativa do Encaminhamento:
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {consultation.referral.clinicalIndication}
                  </p>
                </div>

                <div>
                  <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                    2. Hipóteses Diagnósticas / Demandas de Suporte (CID-10 / CIAP-2):
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {consultation.referral.hypotheses}
                  </p>
                </div>

                {consultation.referral.proceduresRequested && (
                  <div>
                    <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                      3. Condutas, Avaliações ou Exames Complementares Solicitados:
                    </span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                      {consultation.referral.proceduresRequested}
                    </p>
                  </div>
                )}

                {consultation.referral.examsConducted && (
                  <div>
                    <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                      4. Exames Já Realizados / Antecedentes Relevantes:
                    </span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                      {consultation.referral.examsConducted}
                    </p>
                  </div>
                )}

                {/* Contra-Referência (Campo para preenchimento no retorno) */}
                <div className="mt-2 pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-600">
                  <span className="font-black uppercase text-slate-800">
                    Contra-Referência (Destinado ao Serviço de Destino):
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>Unidade Receptora: _____________________________</div>
                    <div>Data do Atendimento: ____/____/202___</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Projeto Terapêutico Singular - PTS (quando presente) */}
          {consultation.pts && (
            <div className="break-inside-avoid border border-purple-300 rounded-md overflow-hidden bg-white mt-3.5">
              <div className="bg-purple-50 border-b border-purple-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-purple-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                  <span>PROJETO TERAPÊUTICO SINGULAR (PTS) - PACTUAÇÃO MULTIPROFISSIONAL</span>
                </div>
                <span className="text-[9.5px] font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-200 uppercase">
                  Reavaliação: {consultation.pts.reassessmentDate || '30 dias'}
                </span>
              </div>

              <div className="p-3 space-y-2.5 text-[10px] text-slate-800">
                <div className="bg-purple-50/70 p-2 rounded border border-purple-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-purple-900 uppercase text-[9px] block">
                      Profissional de Referência / Gestor do Caso:
                    </span>
                    <span className="font-black text-slate-950 text-xs uppercase">
                      {consultation.pts.referenceProfessional || consultation.pts.professionalName || authorName}
                    </span>
                  </div>
                  {consultation.pts.teamMembers && (
                    <div className="text-[9.5px] text-purple-900 font-bold">
                      Equipe Técnica: {consultation.pts.teamMembers}
                    </div>
                  )}
                </div>

                <div>
                  <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                    Eixo 1: Diagnóstico Situacional, Vulnerabilidades e Potencialidades:
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {consultation.pts.diagnosisVulnerability}
                  </p>
                </div>

                <div>
                  <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                    Eixo 2: Metas Pactuadas de Curto Prazo (Intervenções Imediatas / Estabilização):
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {consultation.pts.shortTermGoals}
                  </p>
                </div>

                <div>
                  <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                    Eixo 3: Metas de Médio e Longo Prazo (Autonomia e Reabilitação Psicossocial):
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {consultation.pts.mediumLongTermGoals}
                  </p>
                </div>

                <div>
                  <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                    Eixo 4: Divisão de Responsabilidades e Pactuação de Ações:
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {consultation.pts.agreedActions}
                  </p>
                </div>

                {/* Pactuação e Assinaturas Compartilhadas */}
                <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="border-t border-slate-800 pt-1 text-[9px] font-black uppercase text-slate-900">
                      {consultation.pts.referenceProfessional || authorName}
                    </div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase">
                      Profissional de Referência
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-slate-800 pt-1 text-[9px] font-black uppercase text-slate-900">
                      {patientName}
                    </div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase">
                      Usuário(a) / Família (Pactuação)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: Solicitação de Exames Complementares (quando presente) */}
          {consultation.examRequest && consultation.examRequest.items && consultation.examRequest.items.length > 0 && (
            <div className="break-inside-avoid border border-blue-300 rounded-md overflow-hidden bg-white mt-3.5">
              <div className="bg-blue-50 border-b border-blue-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-blue-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                  <span>SOLICITAÇÃO DE EXAMES COMPLEMENTARES</span>
                </div>
                <span className="text-[9.5px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 uppercase">
                  {consultation.examRequest.items.length} {consultation.examRequest.items.length === 1 ? 'Exame Solicitado' : 'Exames Solicitados'}
                </span>
              </div>

              <div className="p-3 space-y-2 text-[10px] text-slate-800">
                {consultation.examRequest.clinicalIndicationGeneral && (
                  <div className="bg-blue-50/50 p-1.5 rounded border border-blue-100 text-[9.5px]">
                    <span className="font-bold text-blue-900 uppercase">Indicação Clínica: </span>
                    <span className="text-slate-800">{consultation.examRequest.clinicalIndicationGeneral}</span>
                  </div>
                )}

                <div className="space-y-1">
                  {[...consultation.examRequest.items]
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
                    .map((item, idx) => (
                      <div key={item.id || idx} className="flex items-start justify-between border-b border-slate-100 pb-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-blue-700">{String(idx + 1).padStart(2, '0')}.</span>
                          <span className="font-bold text-slate-900 uppercase">{item.name}</span>
                          {item.clinicalIndication && (
                            <span className="text-slate-500 italic text-[9px]">({item.clinicalIndication})</span>
                          )}
                        </div>
                        {item.urgency && (
                          <span className="text-[8px] font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-200 uppercase">
                            Urgente
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 8: Laudo Médico Oficial (quando presente) */}
          {consultation.medicalReport && (
            <div className="break-inside-avoid border border-teal-300 rounded-md overflow-hidden bg-white mt-3.5">
              <div className="bg-teal-50 border-b border-teal-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-teal-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                  <span>LAUDO MÉDICO OFICIAL</span>
                </div>
                <span className="text-[9.5px] font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded border border-teal-200 uppercase">
                  {consultation.medicalReport.cityDateFormatted || 'Anajás/PA'}
                </span>
              </div>

              <div className="p-3 space-y-2 text-[10px] text-slate-800">
                <div className="bg-teal-50/50 p-2 rounded border border-teal-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-teal-900 uppercase text-[9px] block">
                      CID-10:
                    </span>
                    <div className="font-black text-slate-950 text-xs mt-0.5 space-y-0.5">
                      {consultation.medicalReport.cid10.includes(';') ? (
                        consultation.medicalReport.cid10.split(';').map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 inline-block shrink-0" />
                            <span>{c.trim()}</span>
                          </div>
                        ))
                      ) : (
                        <span>{consultation.medicalReport.cid10}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-700 text-[10px]">
                      {consultation.medicalReport.cityDateFormatted || 'Anajás/PA'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="font-black text-slate-900 uppercase text-[9.5px] block">
                    Descrição Clínica e Parecer Médico:
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mt-0.5 text-justify">
                    {consultation.medicalReport.description}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200 text-center">
                  <div className="border-t border-slate-800 w-48 mx-auto pt-1 text-[9px] font-black uppercase text-slate-900">
                    {consultation.medicalReport.professionalName}
                  </div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase">
                    {consultation.medicalReport.professionalSpecialty} • {consultation.medicalReport.professionalCouncil}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 9: Atestado de Comparecimento Oficial (quando presente) */}
          {consultation.attendanceCertificate && (
            <div className="break-inside-avoid border border-sky-300 rounded-md overflow-hidden bg-white mt-3.5">
              <div className="bg-sky-50 border-b border-sky-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-sky-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-600 inline-block" />
                  <span>ATESTADO DE COMPARECIMENTO (FOLHA A4)</span>
                </div>
                <span className="text-[9.5px] font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded border border-sky-200 uppercase">
                  {consultation.attendanceCertificate.periodLabel || 'Dia do Atendimento'}
                </span>
              </div>

              <div className="p-3 space-y-2.5 text-[10px] text-slate-800">
                <div className="bg-sky-50/70 p-2 rounded border border-sky-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-sky-900 uppercase text-[9px] block">
                      Finalidade / Motivo:
                    </span>
                    <span className="font-black text-slate-950 text-xs uppercase">
                      {consultation.attendanceCertificate.attendanceType}
                    </span>
                  </div>
                  <div className="text-right text-[9.5px] text-sky-950 font-bold">
                    Data: {consultation.attendanceCertificate.attendanceDateFormatted || consultation.attendanceCertificate.attendanceDate}
                  </div>
                </div>

                {consultation.attendanceCertificate.isCompanion && consultation.attendanceCertificate.companionName && (
                  <div className="p-2 bg-sky-50/60 rounded border border-sky-200 text-[10px]">
                    <span className="font-bold text-sky-900 uppercase text-[9px] block">Acompanhante Justificado:</span>
                    <span className="font-black text-slate-950 uppercase">{consultation.attendanceCertificate.companionName}</span>
                    {consultation.attendanceCertificate.companionDocument && ` (Doc: ${consultation.attendanceCertificate.companionDocument})`}
                    {consultation.attendanceCertificate.companionKinship && ` • ${consultation.attendanceCertificate.companionKinship}`}
                  </div>
                )}

                <div>
                  <p className="text-slate-800 text-[10px] leading-relaxed text-justify indent-4">
                    {consultation.attendanceCertificate.isCompanion && consultation.attendanceCertificate.companionName
                      ? `Atesto para os devidos fins de comprovação e justificativa de comparecimento que o(a) Sr.(a) ${consultation.attendanceCertificate.companionName} (${consultation.attendanceCertificate.companionKinship || 'Acompanhante'}), portador(a) do documento ${consultation.attendanceCertificate.companionDocument || 'apresentado'}, esteve presente nesta Unidade de Saúde acompanhando o(a) paciente ${patientName} para a realização de ${consultation.attendanceCertificate.attendanceType} no dia ${consultation.attendanceCertificate.attendanceDateFormatted || consultation.attendanceCertificate.attendanceDate}, no ${consultation.attendanceCertificate.periodLabel || 'período de atendimento'}.`
                      : `Atesto para os devidos fins de comprovação e justificativa de comparecimento que o(a) paciente acima identificado(a) compareceu a esta Unidade de Saúde para a realização de ${consultation.attendanceCertificate.attendanceType} no dia ${consultation.attendanceCertificate.attendanceDateFormatted || consultation.attendanceCertificate.attendanceDate}, no ${consultation.attendanceCertificate.periodLabel || 'período de atendimento'}.`}
                  </p>
                </div>

                {consultation.attendanceCertificate.observations && (
                  <p className="text-slate-600 italic text-[9.5px] pt-1 border-t border-slate-100">
                    Observações: {consultation.attendanceCertificate.observations}
                  </p>
                )}

                <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[9px] text-slate-600">
                  <div>
                    Emitido por: <strong className="text-slate-900 uppercase">{consultation.attendanceCertificate.professionalName}</strong> ({consultation.attendanceCertificate.professionalRole} - {consultation.attendanceCertificate.professionalCouncil})
                  </div>
                  <div className="italic text-[8.5px] text-slate-500">
                    * Comprovante de presença nos termos da legislação vigente.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 10: Atestado Médico Oficial (quando presente) */}
          {consultation.medicalCertificate && (
            <div className="break-inside-avoid border border-teal-300 rounded-md overflow-hidden bg-white mt-3.5">
              <div className="bg-teal-50 border-b border-teal-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-teal-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
                  <span>ATESTADO MÉDICO OFICIAL</span>
                </div>
                <span className="text-[9.5px] font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded border border-teal-200 uppercase">
                  {consultation.medicalCertificate.daysOff} {consultation.medicalCertificate.daysOff === 1 ? 'Dia de Afastamento' : 'Dias de Afastamento'}
                </span>
              </div>

              <div className="p-3 space-y-2.5 text-[10px] text-slate-800">
                <div className="bg-teal-50/70 p-2 rounded border border-teal-100 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-teal-900 uppercase text-[9px] block">
                      Período de Repouso / Afastamento:
                    </span>
                    <span className="font-black text-slate-950 text-xs uppercase">
                      {consultation.medicalCertificate.daysOff} ({consultation.medicalCertificate.daysOffExtenso}) a contar de {consultation.medicalCertificate.startDateFormatted || consultation.medicalCertificate.startDate}
                    </span>
                  </div>
                  {consultation.medicalCertificate.includeCid && consultation.medicalCertificate.cid10 && (
                    <div className="text-right">
                      <span className="font-extrabold text-teal-900 uppercase text-[9px] block">CID-10:</span>
                      <span className="font-black text-teal-950 text-[11px]">{consultation.medicalCertificate.cid10}</span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-slate-800 text-[10px] leading-relaxed text-justify indent-4">
                    Atesto para os devidos fins que o(a) paciente acima identificado(a) necessita de <strong>{consultation.medicalCertificate.daysOff} ({consultation.medicalCertificate.daysOffExtenso})</strong> de afastamento de suas atividades por motivo de saúde, a contar de <strong>{consultation.medicalCertificate.startDateFormatted || consultation.medicalCertificate.startDate}</strong>.
                  </p>
                </div>

                {consultation.medicalCertificate.purpose && (
                  <div className="text-[9.5px] text-slate-700">
                    <strong className="text-slate-900">Finalidade:</strong> {consultation.medicalCertificate.purpose}
                  </div>
                )}

                {consultation.medicalCertificate.clinicalNotes && (
                  <p className="text-slate-600 italic text-[9.5px] pt-1 border-t border-slate-100">
                    Observações / Recomendações: {consultation.medicalCertificate.clinicalNotes}
                  </p>
                )}

                <div className="mt-2 pt-2 border-t border-slate-200 text-center">
                  <div className="border-t border-slate-800 w-48 mx-auto pt-1 text-[9px] font-black uppercase text-slate-900">
                    Dr(a). {consultation.medicalCertificate.professionalName}
                  </div>
                  <div className="text-[8px] font-bold text-slate-600 uppercase">
                    {consultation.medicalCertificate.professionalCouncil} {consultation.medicalCertificate.professionalSpecialty ? `• ${consultation.medicalCertificate.professionalSpecialty}` : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 11: Anexo Iconográfico de Imagens e QR Code de Vídeos (quando presente) */}
          {consultation.examMedia && consultation.examMedia.items && consultation.examMedia.items.length > 0 && (
            <div className="break-inside-avoid border border-amber-300 rounded-md overflow-hidden bg-white mt-3.5">
              <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-black uppercase text-amber-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                  <span>{consultation.examMedia.title || 'ANEXO ICONOGRÁFICO DE IMAGENS E QR CODE DE VÍDEOS (A4)'}</span>
                </div>
                <span className="text-[9.5px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 uppercase">
                  {consultation.examMedia.items.length} {consultation.examMedia.items.length === 1 ? 'Mídia Anexa' : 'Mídias Anexas'}
                </span>
              </div>

              <div className="p-3 space-y-2.5 text-[10px] text-slate-800">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {consultation.examMedia.items.map((item, idx) => {
                    const isVideo = item.type === 'video';
                    const imgSource = isVideo
                      ? item.videoThumbnailDataUrl || item.imageDataUrl || ''
                      : item.imageDataUrl || '';

                    return (
                      <div key={item.id || idx} className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col justify-between">
                        <div>
                          <div className="relative w-full h-28 bg-slate-900 rounded overflow-hidden flex items-center justify-center border border-slate-300">
                            {imgSource ? (
                              <img src={imgSource} alt={item.title} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[9px] text-slate-400">Sem imagem</span>
                            )}
                            {isVideo && (
                              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-1">
                                {item.qrCodeDataUrl ? (
                                  <div className="bg-white p-1 rounded shadow-md flex flex-col items-center">
                                    <img src={item.qrCodeDataUrl} alt="QR Code Vídeo" className="w-14 h-14" />
                                    <span className="text-[7.5px] font-black text-slate-900 uppercase mt-0.5">Aponte a Câmera</span>
                                  </div>
                                ) : (
                                  <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded">
                                    ▶ VÍDEO
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="font-bold text-slate-950 uppercase text-[10.5px] mt-1.5 leading-tight">
                            {item.title}
                          </div>
                          {item.description && (
                            <p className="text-[9.5px] text-slate-600 mt-0.5 line-clamp-2 leading-tight">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {consultation.examMedia.legalNotice && (
                  <div className="text-[9px] text-amber-900 bg-amber-50/80 p-2 rounded border border-amber-200 font-medium leading-relaxed">
                    ⚖️ {consultation.examMedia.legalNotice}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date, Signature Block and Footer (Image 1 Style) */}
      <div className="break-inside-avoid mt-2.5">
        <div className="text-right text-[10.5px] font-semibold text-slate-800 mb-3">
          Anajás, {day} de {month} de {year}
        </div>

        {(() => {
          const authorInfo = resolveConsultationAuthor(consultation, currentUser);
          return (
            <ProfessionalSignatureBlock
              name={authorInfo.name}
              profession={authorInfo.profession}
              cbo={authorInfo.cbo}
              councilBody={authorInfo.councilBody}
              councilNumber={authorInfo.councilNumber}
              councilUf={authorInfo.councilUf}
              professionalRegister={authorInfo.professionalRegister}
              digitalStampUrl={authorInfo.digitalStampUrl}
              useDigitalStamp={authorInfo.useDigitalStamp}
              user={authorInfo.authorUser}
              widthClass="w-[280px]"
            />
          );
        })()}

        <div className="text-center text-[8.5px] font-bold text-slate-500 uppercase leading-tight mt-1.5 pt-1 border-t border-slate-200">
          <div>TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000</div>
          <div>SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)</div>
        </div>
      </div>
    </div>
  );
};
