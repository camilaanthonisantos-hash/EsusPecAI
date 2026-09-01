import React, { useState } from 'react';
import { Copy, Check, Hash, Activity, FileText, CheckCircle2 } from 'lucide-react';
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

export const PecQuickCodesBar: React.FC<PecQuickCodesBarProps> = ({
  type,
  text,
  onShowToast,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const ciap2List = extractCiap2Codes(text);
  const cid10List = extractCid10Codes(text);
  const sigtapList = extractSigtapCodes(text);

  const handleCopyCode = async (key: string, value: string, label: string) => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopiedKey(key);
      onShowToast('success', `Código ${value} copiado! Pronto para colar no campo de busca do PEC.`, label);
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      onShowToast('error', 'Falha ao copiar código.', 'Erro');
    }
  };

  if (type === 'avaliacao') {
    const hasCiap = ciap2List.length > 0;
    const hasCid = cid10List.length > 0;

    if (!hasCiap && !hasCid) {
      return null;
    }

    return (
      <div
        id="quick-codes-bar-avaliacao"
        className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-teal-500/30 shadow-xs space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-600 text-white">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Codificação Rápida para o PEC (CIAP-2 & CID-10)
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300">
                  1-Clique
                </span>
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Copie apenas os códigos limpos para os campos de diagnóstico do e-SUS PEC (CID-10 sem pontos).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* CIAP-2 List */}
          {hasCiap && (
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                CIAP-2 (Condições / Problemas)
              </span>
              <div className="flex flex-wrap gap-2">
                {ciap2List.map((item, idx) => {
                  const key = `ciap-${idx}-${item.code}`;
                  const isCopied = copiedKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCopyCode(key, item.code, `CIAP-2: ${item.code}`)}
                      title={`Copiar código ${item.code} (${item.description || 'CIAP-2'})`}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-800 dark:text-slate-200 border-teal-500/40 hover:border-teal-500 shadow-2xs'
                      }`}
                    >
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300 group-hover:text-teal-600">
                        {item.code}
                      </span>
                      {item.description && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                          {item.description}
                        </span>
                      )}
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 stroke-[3] text-white shrink-0 ml-auto" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-teal-600 shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CID-10 List */}
          {hasCid && (
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                CID-10 (Código Limpo sem Pontos)
              </span>
              <div className="flex flex-wrap gap-2">
                {cid10List.map((item, idx) => {
                  const key = `cid-${idx}-${item.cleanCode}`;
                  const isCopied = copiedKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCopyCode(key, item.cleanCode, `CID-10: ${item.cleanCode}`)}
                      title={`Copiar código ${item.cleanCode} (${item.description || 'CID-10'})`}
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-800 dark:text-slate-200 border-indigo-500/40 hover:border-indigo-500 shadow-2xs'
                      }`}
                    >
                      <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 group-hover:text-indigo-600">
                        {item.cleanCode}
                      </span>
                      {item.rawCode !== item.cleanCode && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({item.rawCode})
                        </span>
                      )}
                      {item.description && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                          {item.description}
                        </span>
                      )}
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 stroke-[3] text-white shrink-0 ml-auto" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // type === 'plano'
  return (
    <div
      id="quick-codes-bar-plano"
      className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-emerald-500/30 shadow-xs space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Procedimentos e Codificações para o PEC (CIAP-2 & SIGTAP / SIA)
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                1-Clique
              </span>
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Copie o código SIA ou a nomenclatura completa para lançar no campo de Procedimentos do PEC.
            </p>
          </div>
        </div>
      </div>

      {/* CIAP-2 of Plano (e.g. 69 or others) */}
      {ciap2List.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            CIAP-2 do Plano
          </span>
          <div className="flex flex-wrap gap-2">
            {ciap2List.map((item, idx) => {
              const key = `plano-ciap-${idx}-${item.code}`;
              const isCopied = copiedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCopyCode(key, item.code, `CIAP-2: ${item.code}`)}
                  title={`Copiar código CIAP-2 ${item.code}`}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-800 dark:text-slate-200 border-teal-500/40 hover:border-teal-500 shadow-2xs'
                  }`}
                >
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                    {item.code}
                  </span>
                  {item.description && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.description}
                    </span>
                  )}
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 stroke-[3] text-white shrink-0" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-teal-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SIGTAP List */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Procedimentos SIGTAP / SIA (e-SUS PEC)
        </span>

        <div className="grid grid-cols-1 gap-2">
          {sigtapList.map((item, idx) => {
            const codeKey = `sigtap-code-${idx}-${item.code}`;
            const fullKey = `sigtap-full-${idx}-${item.code}`;
            const isCodeCopied = copiedKey === codeKey;
            const isFullCopied = copiedKey === fullKey;

            return (
              <div
                key={item.code}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-extrabold text-xs px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    {item.code}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {item.name}
                      {item.isFixed && (
                        <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                          Padrão Fixo
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  {/* Button to copy only the code */}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeKey, item.code, `Código SIGTAP: ${item.code}`)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCodeCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-200'
                    }`}
                    title={`Copiar apenas o código ${item.code}`}
                  >
                    {isCodeCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                    <span>{isCodeCopied ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>

                  {/* Button to copy code + nomenclature */}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCode(
                        fullKey,
                        `${item.code} - ${item.name}`,
                        `SIGTAP Completo: ${item.code}`
                      )
                    }
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isFullCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300/60 dark:border-emerald-700/60'
                    }`}
                    title={`Copiar "${item.code} - ${item.name}"`}
                  >
                    {isFullCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <FileText className="w-3 h-3" />}
                    <span>{isFullCopied ? 'Copiado!' : 'Copiar Nome + Código'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
