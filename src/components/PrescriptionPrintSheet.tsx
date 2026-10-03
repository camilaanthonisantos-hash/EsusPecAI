import React from 'react';
import { PrescriptionData, PrescribedMedicationItem, User } from '../types';
import { CapsLeftLogo, CapsRightLogo } from './PrescriptionLogos';
import { ProfessionalSignatureBlock } from './ProfessionalSignatureBlock';
import { resolveDocumentAuthor } from '../utils/authorResolver';

interface PrescriptionPrintSheetProps {
  prescription: PrescriptionData;
  isPrintOnly?: boolean;
  currentUser?: User | null;
}

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

/**
 * Single Via Component: Renders one of the two identical prescription copies
 */
export const PrescriptionSingleVia: React.FC<{
  prescription: PrescriptionData;
  viaLabel?: string;
  currentUser?: User | null;
}> = ({ prescription, viaLabel, currentUser }) => {
  const type = prescription?.type || 'PRESCRIÇÃO';
  const patientName = prescription?.patientName || 'PACIENTE NÃO IDENTIFICADO';
  const patientAge = prescription?.patientAge || '--';
  const dateFormatted = prescription?.dateFormatted || 'Anajás, ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const header = prescription?.header || {
    unitName: 'CENTRO DE ATENÇÃO PSICOSSOCIAL',
    authorityName: 'SECRETARIA MUNICIPAL DE SAÚDE',
    cityPrefecture: 'PREFEITURA MUNICIPAL DE ANAJÁS',
  };
  const footer = prescription?.footer || {
    addressLine1: 'TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000',
    addressLine2: 'SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)',
  };
  const defaultRoute = prescription?.defaultRoute || 'USO ORAL';
  const items = prescription?.items || [];
  const professionalName = prescription?.professionalName || 'Profissional de Saúde';
  const professionalRegister = prescription?.professionalRegister || 'Registro Profissional';

  // Group medications by route if items have distinct routes, otherwise defaultRoute
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

  // Global sequential counter across all administration route groups
  let globalMedIndex = 1;

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
            <h1 className="text-[11px] font-black tracking-tight text-blue-950 uppercase leading-tight">
              {header?.unitName || 'CENTRO DE ATENÇÃO PSICOSSOCIAL'}
            </h1>
            <h2 className="text-[10px] font-bold text-slate-800 uppercase leading-tight mt-0.5">
              {header?.authorityName || 'SECRETARIA MUNICIPAL DE SAÚDE'}
            </h2>
            <h3 className="text-[10px] font-extrabold text-blue-900 uppercase leading-tight">
              {header?.cityPrefecture || 'PREFEITURA MUNICIPAL DE ANAJÁS'}
            </h3>
          </div>

          {/* Right Logo */}
          <div className="w-14 h-14 flex items-center justify-center shrink-0">
            <CapsRightLogo className="w-14 h-14" customUrl={header?.rightLogoUrl} />
          </div>
        </div>

        {/* Prescription Title (PRESCRIÇÃO ou TRANSCRIÇÃO) */}
        <div className="text-center relative pt-1">
          <span className="text-base font-black tracking-wider text-blue-800 uppercase px-4 py-0.5">
            {type || 'PRESCRIÇÃO'}
          </span>
          {viaLabel && (
            <span className="absolute right-0 top-1 text-[9px] font-semibold text-slate-500 uppercase tracking-widest">
              {viaLabel}
            </span>
          )}
        </div>

        {/* Patient Info Box (Tabela com Bordas: NOME | [NOME] | IDADE | [IDADE]) */}
        <div className="border border-slate-900 rounded-none overflow-hidden text-[11px] leading-tight">
          <div className="grid grid-cols-12 divide-x divide-slate-900">
            {/* Fixed Label NOME */}
            <div className="col-span-2 bg-slate-100 font-extrabold text-slate-900 px-2 py-1 flex items-center justify-center uppercase tracking-wider text-[10px]">
              NOME
            </div>
            {/* Patient Name Value */}
            <div className="col-span-7 font-bold text-slate-900 px-2 py-1 uppercase truncate flex items-center">
              {patientName || 'PACIENTE NÃO IDENTIFICADO'}
            </div>
            {/* Fixed Label IDADE */}
            <div className="col-span-1 bg-slate-100 font-extrabold text-slate-900 px-1 py-1 flex items-center justify-center uppercase tracking-wider text-[10px]">
              IDADE
            </div>
            {/* Patient Age Value */}
            <div className="col-span-2 font-bold text-slate-900 px-1.5 py-1 text-center flex items-center justify-center">
              {patientAge || '--'}
            </div>
          </div>
        </div>

        {/* Medication Route & Prescribed Items */}
        <div className="pt-2 space-y-3">
          {sortedRouteEntries.map(([route, routeItems], rIdx) => (
            <div key={rIdx} className="space-y-1.5">
              {/* Route Centered (e.g. USO ORAL, USO IM, USO IV, etc.) */}
              <div className="text-center">
                <span className="text-xs font-black tracking-wide text-slate-900 uppercase border-b border-slate-800 pb-0.5 inline-block">
                  {route}
                </span>
              </div>

              {/* Numbered Items List */}
              <div className="space-y-2.5 pt-1 pl-1">
                {routeItems.length === 0 ? (
                  <div className="text-slate-400 italic text-center text-[10px] py-4">
                    Nenhum medicamento adicionado ainda.
                  </div>
                ) : (
                  routeItems.map((item, idx) => {
                    // Global continuous item number across all route groups
                    const itemNumber = globalMedIndex++;
                    return (
                      <div key={item.id || idx} className="text-[11px] leading-tight text-slate-900">
                        {/* Line 1: 1- SULFATO FERROSO 40MG – 30CP */}
                        <div className="font-extrabold tracking-tight uppercase">
                          {itemNumber}- {item.medicationName}
                        </div>

                        {/* Posology & Details (Indented like the template) */}
                        <div className="pl-4 pt-0.5 space-y-0.5 text-slate-800 font-medium text-[10.5px]">
                          {item.posology && (
                            <div className="uppercase font-semibold">{item.posology}</div>
                          )}
                          {item.duration && (
                            <div className="uppercase">{item.duration}</div>
                          )}
                          {item.scheduleInstructions && (
                            <div className="uppercase">{item.scheduleInstructions}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Date, Professional Signature & Footer */}
      <div className="space-y-3 pt-4">
        {/* Date (Right-aligned, e.g. "Anajás, 02 de setembro de 2026") */}
        <div className="text-right text-[11px] font-medium text-slate-800 pr-2">
          {dateFormatted || 'Anajás, ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>

        {/* Signature Line */}
        {(() => {
          const docAuthor = resolveDocumentAuthor(prescription, currentUser);
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
              widthClass="max-w-[260px]"
            />
          );
        })()}

        {/* Footer (Rodapé com Endereço e Unidade ~1.25cm) */}
        <div className="text-center text-[8.5px] font-semibold text-slate-600 uppercase tracking-tight leading-tight border-t border-slate-200 pt-1">
          <div>{footer?.addressLine1 || 'TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000'}</div>
          <div>{footer?.addressLine2 || 'SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)'}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Full A4 Landscape Print Sheet (2 Vias Idênticas)
 * Formatted strictly for A4 Landscape (297mm x 210mm) with 1.27cm narrow margins
 */
export const PrescriptionPrintSheet: React.FC<PrescriptionPrintSheetProps> = ({
  prescription,
  isPrintOnly = false,
  currentUser,
}) => {
  if (!prescription) return null;

  return (
    <div
      className={`w-full bg-white text-slate-900 ${
        isPrintOnly ? 'printable-prescription-target' : ''
      }`}
      style={{
        // A4 Landscape aspect ratio
        width: '100%',
        maxWidth: '297mm',
        minHeight: '195mm',
        margin: '0 auto',
        backgroundColor: '#ffffff',
      }}
    >
      {/* 2 Vias Idênticas Lado a Lado (50% / 50%) */}
      <div className="grid grid-cols-2 h-full min-h-[190mm] relative divide-x divide-dashed divide-slate-300">
        {/* 1ª Via (Lado Esquerdo) */}
        <div className="h-full pr-3 sm:pr-4">
          <PrescriptionSingleVia prescription={prescription} viaLabel="1ª VIA: FARMÁCIA" currentUser={currentUser} />
        </div>

        {/* 2ª Via (Lado Direito - CÓPIA IDÊNTICA) */}
        <div className="h-full pl-3 sm:pl-4">
          <PrescriptionSingleVia prescription={prescription} viaLabel="2ª VIA: PACIENTE" currentUser={currentUser} />
        </div>

        {/* Central Scissors / Cut line indicator */}
        <div
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 pointer-events-none flex flex-col items-center justify-between py-2 text-slate-300 print:text-slate-400 no-print"
          style={{ width: '16px' }}
        >
          <span className="text-[10px] transform -rotate-90">✂</span>
          <span className="text-[8px] font-mono transform -rotate-90 tracking-widest opacity-60">
            CORTE
          </span>
          <span className="text-[10px] transform -rotate-90">✂</span>
        </div>
      </div>
    </div>
  );
};
