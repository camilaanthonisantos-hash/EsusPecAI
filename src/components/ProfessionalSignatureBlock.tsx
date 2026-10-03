import React from 'react';
import { User, ProfessionId } from '../types';
import { DEFAULT_CBO_MAP, PROFESSIONS } from '../data/professions';

export interface ProfessionalSignatureBlockProps {
  name?: string;
  profession?: ProfessionId | string;
  cbo?: string;
  councilBody?: string;
  councilNumber?: string;
  councilUf?: string;
  professionalRegister?: string;
  digitalStampUrl?: string;
  useDigitalStamp?: boolean;
  user?: User | null;
  widthClass?: string;
  className?: string;
}

export const ProfessionalSignatureBlock: React.FC<ProfessionalSignatureBlockProps> = ({
  name,
  profession,
  cbo,
  councilBody,
  councilNumber,
  councilUf,
  professionalRegister,
  digitalStampUrl,
  useDigitalStamp,
  user,
  widthClass = 'w-[280px]',
  className = '',
}) => {
  // Resolve effective values from user object if provided
  const effectiveName = (name || user?.name || 'Profissional de Saúde').trim();
  const effectiveProfession = profession || user?.profession || 'medico';

  // Robust stamp resolution: check provided stamp URL first (if non-empty), then fall back to user stamp
  const candidateStamp = (digitalStampUrl && digitalStampUrl.trim().length > 0)
    ? digitalStampUrl.trim()
    : (user?.digitalStampUrl && user.digitalStampUrl.trim().length > 0 ? user.digitalStampUrl.trim() : '');

  const effectiveStampUrl = candidateStamp;
  const effectiveUseStamp = Boolean(
    effectiveStampUrl &&
    (useDigitalStamp !== undefined ? useDigitalStamp : (user?.useDigitalStamp ?? true))
  );

  // Resolve CBO
  const professionKey = typeof effectiveProfession === 'string' ? effectiveProfession.toLowerCase() : '';
  const defaultCbo = DEFAULT_CBO_MAP[professionKey] || (PROFESSIONS as any)[professionKey]?.cbo || '';
  const effectiveCbo = (cbo || user?.cboCode || user?.cbo || defaultCbo || '').trim();

  // Resolve Council / Register Info
  let councilInfo = '';
  if (councilBody && councilNumber) {
    councilInfo = `${councilBody}${councilUf ? `/${councilUf}` : ''} ${councilNumber}`.trim();
  } else if (user?.councilBody && user?.councilNumber) {
    councilInfo = `${user.councilBody}${user.councilUf ? `/${user.councilUf}` : ''} ${user.councilNumber}`.trim();
  } else if (professionalRegister && professionalRegister.trim().length > 0) {
    councilInfo = professionalRegister.trim();
  } else if (user?.professionalRegister && user.professionalRegister.trim().length > 0) {
    councilInfo = user.professionalRegister.trim();
  }

  // Format CBO line cleanly
  const cboDisplay = effectiveCbo
    ? effectiveCbo.toUpperCase().startsWith('CBO')
      ? effectiveCbo.toUpperCase()
      : `CBO ${effectiveCbo}`
    : '';

  // Prevent duplicate CBO printing if professionalRegister holds the CBO string
  const isCouncilDuplicateOfCbo =
    councilInfo &&
    cboDisplay &&
    (councilInfo.replace(/\D/g, '') === cboDisplay.replace(/\D/g, '') ||
     councilInfo.toUpperCase().startsWith('CBO') ||
     councilInfo.toLowerCase().trim() === cboDisplay.toLowerCase().trim());

  const cleanCouncilInfo = isCouncilDuplicateOfCbo ? '' : councilInfo;

  // Case 1: Digital Stamp / Signature Image enabled and uploaded
  if (effectiveUseStamp && effectiveStampUrl) {
    return (
      <div className={`mx-auto ${widthClass} text-center ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <img
            src={effectiveStampUrl}
            alt={`Carimbo e Assinatura de ${effectiveName}`}
            className="max-h-24 max-w-[260px] object-contain mx-auto print:max-h-24"
          />
        </div>
      </div>
    );
  }

  // Case 2: Traditional Standard Text Box (Nome, CBO e Órgão de Classe)
  return (
    <div className={`mx-auto ${widthClass} text-center ${className}`}>
      <div className="border-t-[1.5px] border-slate-900 mb-1" />
      <div className="font-black text-[11.5px] uppercase tracking-wide text-slate-950">
        {effectiveName}
      </div>
      
      {/* CBO line */}
      {cboDisplay && (
        <div className="text-[10px] font-bold text-slate-700 uppercase mt-0.5">
          {cboDisplay}
        </div>
      )}

      {/* Council Register line (if available and not duplicate of CBO) */}
      {cleanCouncilInfo && (
        <div className="text-[9.5px] font-semibold text-slate-600 uppercase mt-0.2">
          {cleanCouncilInfo}
        </div>
      )}
    </div>
  );
};
