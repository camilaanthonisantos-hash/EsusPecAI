import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, FileText, Hash, Activity, Sparkles } from 'lucide-react';
import {
  extractCiap2Codes,
  extractCid10Codes,
  extractSigtapCodes,
  ExtractedCiap2,
  ExtractedCid10,
  ExtractedSigtap,
} from '../utils/pecFormatter';
import { copyToClipboard } from '../services/gemini';

interface PecQuickCodesBarProps {
  type: 'avaliacao' | 'plano';
  text: string;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

// Standard generic CIAP-2 intervention / procedure codes (60 to 69) for Plano in e-SUS PEC
export const PLANO_CIAP2_CODES_60_TO_69: ExtractedCiap2[] = [
  { code: '60', description: 'Resultados de testes / exames laboratoriais / radiologia', raw: '60' },
  { code: '61', description: 'Resultados de exames / procedimentos de outros prestadores', raw: '61' },
  { code: '62', description: 'Procedimento administrativo / atestado / relatório técnico / guia', raw: '62' },
  { code: '63', description: 'Consulta de seguimento / retorno programado / continuidade do cuidado', raw: '63' },
  { code: '64', description: 'Iniciação / interrupção de tratamento / adesão terapêutica', raw: '64' },
  { code: '65', description: 'Discussão / articulação com outros prestadores / matriciamento', raw: '65' },
  { code: '66', description: 'Aconselhamento / discussão sobre o problema de saúde / conduta', raw: '66' },
  { code: '67', description: 'Educação para a saúde / orientação preventiva / hábitos de vida', raw: '67' },
  { code: '68', description: 'Prescrição / renovação de tratamento medicamentoso / vacinas', raw: '68' },
  { code: '69', description: 'Outras orientações / aconselhamento / educação em saúde', raw: '69' },
];

export const PecQuickCodesBar: React.FC<PecQuickCodesBarProps> = ({
  type,
  text,
  onShowToast,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'ciap' | 'cid' | 'sigtap' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ciap2List = extractCiap2Codes(text);
  const cid10List = extractCid10Codes(text);
  const sigtapList = extractSigtapCodes(text);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async (key: string, value: string, toastLabel: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedKey(key);
      onShowToast(
        'success',
        `"${value}" copiado! Pronto para colar no campo correspondente do PEC.`,
        toastLabel
      );
      setTimeout(() => setCopiedKey(null), 2200);
    } else {
      onShowToast('error', 'Falha ao copiar.', 'Erro');
    }
  };

  const toggleDropdown = (name: 'ciap' | 'cid' | 'sigtap') => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  // Avaliação CIAP fallback / list
  const displayAvaliacaoCiap =
    ciap2List.length > 0
      ? ciap2List
      : [{ code: 'P79', description: 'Outros problemas psicológicos/sociais', raw: 'P79' }];

  // Plano CIAP list with complete 60-69 codes + any extras from text
  const displayPlanoCiap = (() => {
    const list = [...PLANO_CIAP2_CODES_60_TO_69];
    const seenCodes = new Set(list.map((c) => c.code));
    for (const extracted of ciap2List) {
      if (!seenCodes.has(extracted.code)) {
        list.push(extracted);
        seenCodes.add(extracted.code);
      }
    }
    return list;
  })();

  const displayCid =
    cid10List.length > 0
      ? cid10List
      : [{ rawCode: 'Z00.4', cleanCode: 'Z004', description: 'Exame psiquiátrico geral', raw: 'Z00.4' }];

  if (type === 'avaliacao') {
    return (
      <div ref={containerRef} className="mt-3 relative" id="quick-codes-bar-avaliacao">
        {/* Dropdown Toggle Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
            Codificações Rápidas:
          </span>

          {/* CIAP 2 Dropdown Button */}
          <button
            type="button"
            onClick={() => toggleDropdown('ciap')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              openDropdown === 'ciap'
                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-800 dark:text-teal-200 border-teal-500/40 hover:border-teal-500'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>CIAP 2</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                openDropdown === 'ciap'
                  ? 'bg-white/20 text-white'
                  : 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
              }`}
            >
              {displayAvaliacaoCiap.length}
            </span>
            {openDropdown === 'ciap' ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* CID 10 Dropdown Button */}
          <button
            type="button"
            onClick={() => toggleDropdown('cid')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              openDropdown === 'cid'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border-indigo-500/40 hover:border-indigo-500'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>CID 10</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                openDropdown === 'cid'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {displayCid.length}
            </span>
            {openDropdown === 'cid' ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
        </div>

        {/* Dropdown Content Menu for CIAP 2 */}
        {openDropdown === 'ciap' && (
          <div className="mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-teal-500/40 shadow-xl space-y-2 z-20 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-teal-800 dark:text-teal-300 uppercase">
                Lista Suspensa: Códigos CIAP-2 (Avaliação)
              </span>
              <span>Clique para copiar o código</span>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {displayAvaliacaoCiap.map((item, idx) => {
                const key = `ciap-item-${idx}-${item.code}`;
                const isCopied = copiedKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleCopy(key, item.code, `CIAP-2: ${item.code}`)}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-800 dark:text-teal-300 font-mono font-extrabold text-xs border border-teal-500/30">
                        {item.code}
                      </span>
                      {item.description && (
                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600'
                      }`}
                    >
                      {isCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dropdown Content Menu for CID 10 */}
        {openDropdown === 'cid' && (
          <div className="mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/40 shadow-xl space-y-2 z-20 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-indigo-800 dark:text-indigo-300 uppercase">
                Lista Suspensa: Códigos CID-10 (Sem Pontos para o PEC)
              </span>
              <span>Clique para copiar o código</span>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {displayCid.map((item, idx) => {
                const key = `cid-item-${idx}-${item.cleanCode}`;
                const isCopied = copiedKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleCopy(key, item.cleanCode, `CID-10: ${item.cleanCode}`)}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 font-mono font-extrabold text-xs border border-indigo-500/30">
                        {item.cleanCode}
                      </span>
                      {item.rawCode !== item.cleanCode && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({item.rawCode})
                        </span>
                      )}
                      {item.description && (
                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600'
                      }`}
                    >
                      {isCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // type === 'plano'
  return (
    <div ref={containerRef} className="mt-3 relative" id="quick-codes-bar-plano">
      {/* Dropdown Toggle Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
          Codificações Rápidas:
        </span>

        {/* CIAP 2 Dropdown Button (Intervenções 60 a 69) */}
        <button
          type="button"
          onClick={() => toggleDropdown('ciap')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            openDropdown === 'ciap'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-800 dark:text-teal-200 border-teal-500/40 hover:border-teal-500'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>CIAP 2</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              openDropdown === 'ciap'
                ? 'bg-white/20 text-white'
                : 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
            }`}
          >
            {displayPlanoCiap.length}
          </span>
          {openDropdown === 'ciap' ? (
            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        {/* SIGTAP Dropdown Button */}
        <button
          type="button"
          onClick={() => toggleDropdown('sigtap')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            openDropdown === 'sigtap'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 hover:border-emerald-500'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>SIGTAP</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              openDropdown === 'sigtap'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {sigtapList.length + 1}
          </span>
          {openDropdown === 'sigtap' ? (
            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>
      </div>

      {/* Dropdown Content Menu for CIAP 2 (60 a 69) */}
      {openDropdown === 'ciap' && (
        <div className="mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-teal-500/40 shadow-xl space-y-2 z-20 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold text-teal-800 dark:text-teal-300 uppercase flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-teal-600" />
              Lista Suspensa: CIAP-2 do Plano (Intervenções 60 a 69)
            </span>
            <span className="text-[10px]">Clique para copiar o código</span>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {displayPlanoCiap.map((item, idx) => {
              const key = `plano-ciap-${idx}-${item.code}`;
              const isCopied = copiedKey === key;
              const isStandard69 = item.code === '69';

              return (
                <div
                  key={key}
                  onClick={() => handleCopy(key, item.code, `CIAP-2: ${item.code}`)}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer group ${
                    isStandard69
                      ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500/40 hover:bg-teal-100/70 dark:hover:bg-teal-900/40'
                      : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs border shrink-0 ${
                        isStandard69
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30'
                      }`}
                    >
                      {item.code}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.description}
                        </span>
                        {isStandard69 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-600 text-white shrink-0 hidden sm:inline">
                            Padrão PEC
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600'
                    }`}
                  >
                    {isCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dropdown Content Menu for SIGTAP */}
      {openDropdown === 'sigtap' && (
        <div className="mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-xl space-y-2 z-20 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase">
              Lista Suspensa: Procedimentos SIGTAP & Nomenclaturas PEC
            </span>
            <span>Copie para a interface oficial do PEC</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {/* 1. Item Especial: ORIENTAÇÃO INDIVIDUAL EM SAÚDE (Sem Código Numérico) */}
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-teal-900 dark:text-teal-100">
                    ORIENTAÇÃO INDIVIDUAL EM SAÚDE
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-600 text-white">
                    Nomenclatura PEC (Sem Código)
                  </span>
                </div>
                <p className="text-[11px] text-teal-700 dark:text-teal-300">
                  Campo de texto/procedimentos no PEC oficial
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    'orientacao-individual',
                    'ORIENTAÇÃO INDIVIDUAL EM SAÚDE',
                    'Nomenclatura PEC'
                  )
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  copiedKey === 'orientacao-individual'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                }`}
              >
                {copiedKey === 'orientacao-individual' ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedKey === 'orientacao-individual'
                    ? 'Copiado!'
                    : 'Copiar Nomenclatura'}
                </span>
              </button>
            </div>

            {/* 2. Other SIGTAP Procedures */}
            {sigtapList.map((item, idx) => {
              const codeKey = `sigtap-code-${idx}-${item.code}`;
              const fullKey = `sigtap-full-${idx}-${item.code}`;
              const isCodeCopied = copiedKey === codeKey;
              const isFullCopied = copiedKey === fullKey;

              return (
                <div
                  key={item.code}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-extrabold text-xs px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                      {item.code}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">
                        {item.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleCopy(codeKey, item.code, `Código SIGTAP: ${item.code}`)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        isCodeCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                      }`}
                      title={`Copiar código ${item.code}`}
                    >
                      {isCodeCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                      <span>{isCodeCopied ? 'Copiado!' : 'Código'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          fullKey,
                          item.name,
                          `Nome SIGTAP: ${item.name}`
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        isFullCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      }`}
                      title={`Copiar nome "${item.name}"`}
                    >
                      {isFullCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <FileText className="w-3 h-3" />}
                      <span>{isFullCopied ? 'Copiado!' : 'Nome'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
