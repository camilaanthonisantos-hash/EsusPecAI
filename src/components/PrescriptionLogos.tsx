import React, { useState } from 'react';
import { LOGO_CAPS_BASE64 } from '../constants/assets';

export { LOGO_CAPS_BASE64 };

interface LogoProps {
  className?: string;
  customUrl?: string;
}

/**
 * Left Logo: Brasão / Logo Oficial do CAPS Anajás
 * Utiliza Base64 embutido para garantia total de renderização no spooler nativo de impressão do Windows
 */
export const CapsLeftLogo: React.FC<LogoProps> = ({ className = 'w-14 h-14', customUrl }) => {
  const [hasError, setHasError] = useState(false);
  const logoUrl = !customUrl || customUrl.includes('logo-caps.jpg') ? LOGO_CAPS_BASE64 : customUrl;

  if (!hasError) {
    return (
      <img
        src={logoUrl}
        alt="Logo CAPS Anajás"
        className={`object-contain ${className}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          imageRendering: 'crisp-edges',
        }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Brasão CAPS Anajás"
    >
      {/* Outer circular gold/green ring */}
      <circle cx="80" cy="80" r="74" stroke="#15803d" strokeWidth="4" fill="#f0fdf4" />
      <circle cx="80" cy="80" r="67" stroke="#ca8a04" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
      
      {/* Laurels / Ramos verdes */}
      <path
        d="M32 95 C25 65, 45 35, 75 25 C65 38, 55 60, 60 85 Z"
        fill="#16a34a"
        opacity="0.85"
      />
      <path
        d="M128 95 C135 65, 115 35, 85 25 C95 38, 105 60, 100 85 Z"
        fill="#16a34a"
        opacity="0.85"
      />
      
      {/* Golden Central Star & Rays */}
      <polygon
        points="80,38 86,52 101,53 89,63 94,77 80,68 66,77 71,63 59,53 74,52"
        fill="#eab308"
        stroke="#ca8a04"
        strokeWidth="1"
      />

      {/* CAPS Central Banner */}
      <rect x="28" y="78" width="104" height="30" rx="6" fill="#15803d" stroke="#166534" strokeWidth="1.5" />
      <text
        x="80"
        y="100"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="sans-serif"
        fontSize="20"
        fontWeight="900"
        letterSpacing="2"
      >
        CAPS
      </text>

      {/* Subtitles & Municipality */}
      <text
        x="80"
        y="120"
        textAnchor="middle"
        fill="#166534"
        fontFamily="sans-serif"
        fontSize="7"
        fontWeight="800"
        letterSpacing="0.5"
      >
        CENTRO DE ATENÇÃO
      </text>
      <text
        x="80"
        y="129"
        textAnchor="middle"
        fill="#166534"
        fontFamily="sans-serif"
        fontSize="7"
        fontWeight="800"
        letterSpacing="0.5"
      >
        PSICOSSOCIAL
      </text>
      <text
        x="80"
        y="142"
        textAnchor="middle"
        fill="#047857"
        fontFamily="sans-serif"
        fontSize="8.5"
        fontWeight="900"
        letterSpacing="1"
      >
        DE ANAJÁS
      </text>
    </svg>
  );
};

/**
 * Right Logo: Emblema / Logo Oficial do CAPS Anajás
 * Utiliza Base64 embutido para garantia total de renderização no spooler nativo de impressão do Windows
 */
export const CapsRightLogo: React.FC<LogoProps> = ({ className = 'w-14 h-14', customUrl }) => {
  const [hasError, setHasError] = useState(false);
  const logoUrl = !customUrl || customUrl.includes('logo-caps.jpg') ? LOGO_CAPS_BASE64 : customUrl;

  if (!hasError) {
    return (
      <img
        src={logoUrl}
        alt="Logo CAPS Anajás"
        className={`object-contain ${className}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'block',
          imageRendering: 'crisp-edges',
        }}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Logo CAPS Saúde Mental"
    >
      {/* Outer soft circle */}
      <circle cx="80" cy="80" r="74" stroke="#16a34a" strokeWidth="3.5" fill="#f8fafc" />
      <circle cx="80" cy="80" r="68" stroke="#22c55e" strokeWidth="1" strokeDasharray="4 2" fill="none" />

      {/* Roof / House representing shelter/mental health care */}
      <path
        d="M40 58 L80 28 L120 58 L114 65 L80 39 L46 65 Z"
        fill="#15803d"
      />
      {/* Chimney / detail */}
      <rect x="100" y="34" width="8" height="14" fill="#15803d" />

      {/* Stylized Family / Group of 3 figures holding hands */}
      {/* Figure 1 - Adult left */}
      <circle cx="62" cy="70" r="7" fill="#0284c7" />
      <path d="M52 92 C52 82 56 78 62 78 C68 78 72 82 72 92 Z" fill="#0284c7" />

      {/* Figure 2 - Center (child or client being welcomed) */}
      <circle cx="80" cy="74" r="6" fill="#eab308" />
      <path d="M71 92 C71 83 75 80 80 80 C85 80 89 83 89 92 Z" fill="#eab308" />

      {/* Figure 3 - Adult right */}
      <circle cx="98" cy="70" r="7" fill="#16a34a" />
      <path d="M88 92 C88 82 92 78 98 78 C104 78 108 82 108 92 Z" fill="#16a34a" />

      {/* Connected hands / arc */}
      <path d="M56 86 Q80 94 104 86" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* CAPS Ribbon Text */}
      <rect x="30" y="98" width="100" height="26" rx="5" fill="#15803d" />
      <text
        x="80"
        y="117"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="sans-serif"
        fontSize="17"
        fontWeight="900"
        letterSpacing="2"
      >
        CAPS
      </text>

      {/* Bottom text */}
      <text
        x="80"
        y="134"
        textAnchor="middle"
        fill="#166534"
        fontFamily="sans-serif"
        fontSize="7.5"
        fontWeight="800"
        letterSpacing="0.5"
      >
        CENTRO DE ATENÇÃO PSICOSSOCIAL
      </text>
      <text
        x="80"
        y="145"
        textAnchor="middle"
        fill="#047857"
        fontFamily="sans-serif"
        fontSize="8.5"
        fontWeight="900"
        letterSpacing="1"
      >
        DE ANAJÁS
      </text>
    </svg>
  );
};
