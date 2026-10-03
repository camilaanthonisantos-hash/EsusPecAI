import React from 'react';
import { ExamRequestData, RequestedExamItem, User } from '../types';
import { CapsLeftLogo, CapsRightLogo } from './PrescriptionLogos';
import { sortExamsAlphabetically } from '../utils/printExamRequest';
import { ProfessionalSignatureBlock } from './ProfessionalSignatureBlock';
import { resolveDocumentAuthor } from '../utils/authorResolver';

interface ExamRequestPrintSheetProps {
  examRequest: ExamRequestData;
  isPrintOnly?: boolean;
  currentUser?: User | null;
}

/**
 * Single Via Component: Renders one of the two identical exam request copies
 */
export const ExamRequestSingleVia: React.FC<{
  examRequest: ExamRequestData;
  viaLabel?: string;
  currentUser?: User | null;
}> = ({ examRequest, viaLabel, currentUser }) => {
  const title = examRequest?.title || 'SOLICITAÇÃO DE EXAMES';
  const patientName = examRequest?.patientName || 'PACIENTE NÃO IDENTIFICADO';
  const patientAge = examRequest?.patientAge || '--';
  const patientCns = examRequest?.patientCns || '';
  const patientCpf = examRequest?.patientCpf || '';
  const clinicalIndication = examRequest?.clinicalIndicationGeneral || '';
  const dateFormatted =
    examRequest?.dateFormatted ||
    'Anajás, ' +
      new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
  const header = examRequest?.header || {
    unitName: 'CENTRO DE ATENÇÃO PSICOSSOCIAL',
    authorityName: 'SECRETARIA MUNICIPAL DE SAÚDE',
    cityPrefecture: 'PREFEITURA MUNICIPAL DE ANAJÁS',
  };
  const footer = examRequest?.footer || {
    addressLine1: 'TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000',
    addressLine2: 'SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)',
  };
  const professionalName = examRequest?.professionalName || 'Profissional de Saúde';
  const professionalRegister = examRequest?.professionalRegister || 'Registro Profissional';
  const professionalRole = examRequest?.professionalRole || 'Enfermeiro';

  // Always keep exams in strict alphabetical order (A-Z)
  const sortedExams = sortExamsAlphabetically(examRequest?.items || []);

  return (
    <div className="flex flex-col justify-between h-full text-slate-900 bg-white font-sans text-xs select-text box-border px-3 py-1">
      {/* Top Header & Patient Section */}
      <div className="space-y-2">
        {/* Institutional Header (approx 2.5cm) */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-1.5 min-h-[64px]">
          {/* Left Logo */}
          <div className="w-14 h-14 flex items-center justify-center shrink-0">
            <CapsLeftLogo className="w-14 h-14" customUrl={header?.leftLogoUrl} />
          </div>

          {/* Center Municipal Authority Lines */}
          <div className="text-center flex-1 px-1">
            <h1 className="text-[11px] font-black tracking-wide text-slate-900 uppercase leading-tight font-bold">
              {header?.unitName || 'CENTRO DE ATENÇÃO PSICOSSOCIAL'}
            </h1>
            <h2 className="text-[9.5px] font-bold text-slate-800 uppercase leading-tight mt-0.5">
              {header?.authorityName || 'SECRETARIA MUNICIPAL DE SAÚDE'}
            </h2>
            <h3 className="text-[8.5px] font-medium text-slate-600 uppercase leading-tight mt-0.5">
              {header?.cityPrefecture || 'PREFEITURA MUNICIPAL DE ANAJÁS'}
            </h3>
          </div>

          {/* Right Logo */}
          <div className="w-14 h-14 flex items-center justify-center shrink-0">
            <CapsRightLogo className="w-14 h-14" customUrl={header?.rightLogoUrl} />
          </div>
        </div>

        {/* Title Bar */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1 pt-0.5">
          <span className="text-xs font-black tracking-wider uppercase text-slate-900">{title}</span>
          <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 uppercase">
            {viaLabel || '1ª VIA - PRESTADOR / LABORATÓRIO'}
          </span>
        </div>

        {/* Patient Identification Box with strict borders */}
        <div className="border border-slate-400 text-[10px] overflow-hidden rounded-sm">
          <div className="grid grid-cols-12 border-b border-slate-300 divide-x divide-slate-300 bg-slate-50">
            <div className="col-span-2 px-1.5 py-0.5 font-bold text-slate-700 uppercase text-[9px] flex items-center">
              NOME
            </div>
            <div className="col-span-7 px-2 py-0.5 font-black uppercase text-slate-900 truncate">
              {patientName}
            </div>
            <div className="col-span-1 px-1 py-0.5 font-bold text-slate-700 uppercase text-[8.5px] flex items-center justify-center">
              IDADE
            </div>
            <div className="col-span-2 px-1.5 py-0.5 font-black text-center text-slate-900">
              {patientAge}
            </div>
          </div>
          {(patientCns || patientCpf) && (
            <div className="grid grid-cols-12 divide-x divide-slate-300 bg-white">
              <div className="col-span-2 px-1.5 py-0.5 font-bold text-slate-700 uppercase text-[9px] flex items-center">
                {patientCns ? 'CNS' : 'CPF'}
              </div>
              <div className="col-span-10 px-2 py-0.5 font-medium text-slate-800 text-[9.5px]">
                {patientCns || patientCpf}
              </div>
            </div>
          )}
        </div>

        {/* Alphabetical Exam Items List */}
        <div className="space-y-1 mt-2">
          <div className="space-y-1 pt-0.5 max-h-[410px] overflow-y-auto pr-1">
            {sortedExams.length === 0 ? (
              <div className="text-center py-4 text-slate-400 italic text-[10px]">
                Nenhum exame selecionado na solicitação.
              </div>
            ) : (
              sortedExams.map((item: RequestedExamItem, idx: number) => (
                <div
                  key={item.id || idx}
                  className="px-2 py-0.5 rounded bg-slate-50/70 border border-slate-200/80 text-[9.5px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blue-700 shrink-0 text-[9px]">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span className="font-bold text-slate-900 uppercase tracking-tight leading-snug">
                      {item.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Date, Professional Stamp/Signature & Footer */}
      <div className="pt-2 mt-auto border-t border-slate-200 space-y-2">
        {/* Date Line */}
        <div className="text-right text-[9.5px] font-semibold text-slate-700">
          {dateFormatted}
        </div>

        {/* Signature Box */}
        {(() => {
          const docAuthor = resolveDocumentAuthor(examRequest, currentUser);
          return (
            <ProfessionalSignatureBlock
              name={docAuthor.name}
              profession={docAuthor.role}
              cbo={docAuthor.authorUser?.cboCode || docAuthor.authorUser?.cbo}
              councilBody={docAuthor.authorUser?.councilBody}
              councilNumber={docAuthor.authorUser?.councilNumber}
              councilUf={docAuthor.authorUser?.councilUf}
              professionalRegister={docAuthor.register}
              digitalStampUrl={docAuthor.stampUrl}
              useDigitalStamp={docAuthor.useStamp}
              user={docAuthor.authorUser}
              widthClass="max-w-[220px]"
            />
          );
        })()}

        {/* Institutional Footer */}
        <div className="border-t border-slate-200 pt-1 text-center text-[8px] text-slate-500 uppercase leading-tight">
          <p>{footer?.addressLine1 || 'TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000'}</p>
          <p>{footer?.addressLine2 || 'SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)'}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Full A4 Landscape Sheet Component (2 Vias Idênticas lado a lado)
 */
export const ExamRequestPrintSheet: React.FC<ExamRequestPrintSheetProps> = ({
  examRequest,
  isPrintOnly = false,
  currentUser,
}) => {
  return (
    <div
      className={`bg-white select-text w-full mx-auto relative ${
        isPrintOnly
          ? 'print:m-0 print:p-0'
          : 'shadow-lg border border-slate-300 rounded overflow-hidden max-w-[1050px]'
      }`}
      style={{
        aspectRatio: '297 / 210', // A4 Landscape ratio
      }}
    >
      <div className="grid grid-cols-2 h-full relative divide-x divide-dashed divide-slate-400">
        {/* 1ª Via: Prestador / Laboratório */}
        <div className="h-full p-2 overflow-hidden flex flex-col">
          <ExamRequestSingleVia
            examRequest={examRequest}
            viaLabel="1ª VIA - PRESTADOR / LABORATÓRIO"
            currentUser={currentUser}
          />
        </div>

        {/* 2ª Via: Paciente / Prontuário */}
        <div className="h-full p-2 overflow-hidden flex flex-col">
          <ExamRequestSingleVia
            examRequest={examRequest}
            viaLabel="2ª VIA - PACIENTE / PRONTUÁRIO"
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
};
