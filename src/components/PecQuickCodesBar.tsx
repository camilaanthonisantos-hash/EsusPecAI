import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Hash,
  Activity,
  Search,
  ShieldCheck,
  Info,
  Filter,
} from 'lucide-react';
import {
  extractCiap2Codes,
  extractCid10Codes,
  ExtractedCiap2,
  ExtractedCid10,
} from '../utils/pecFormatter';
import { copyToClipboard } from '../services/gemini';
import {
  getCapsProceduresForProfession,
  CapsProcedure,
  CapsInstrument,
} from '../data/capsProcedures';
import { PROFESSIONS } from '../data/professions';

interface PecQuickCodesBarProps {
  type: 'avaliacao' | 'plano';
  text: string;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  professionId?: string;
  userCbo?: string;
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
  professionId = 'enfermeiro',
  userCbo,
}) => {
  const [openDropdown, setOpenDropdown] = useState<'ciap' | 'cid' | 'caps' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [instrumentFilter, setInstrumentFilter] = useState<'ALL' | CapsInstrument>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const ciap2List = extractCiap2Codes(text);
  const cid10List = extractCid10Codes(text);

  // Informações da profissão logada / autora
  const professionConfig = PROFESSIONS[professionId] || {
    id: professionId,
    name: professionId.charAt(0).toUpperCase() + professionId.slice(1),
    cbo: userCbo || '2235-05',
    councilAbbr: 'SUS/MS',
  };

  // Obter exclusivamente os procedimentos operacionais CAPS compatíveis com o CBO da profissão
  const allowedCapsProcedures = useMemo(() => {
    return getCapsProceduresForProfession(professionId, userCbo);
  }, [professionId, userCbo]);

  // Procedimentos filtrados pela busca e pela aba de instrumento
  const filteredProcedures = useMemo(() => {
    return allowedCapsProcedures.filter((proc) => {
      // Filtro por instrumento
      if (instrumentFilter !== 'ALL' && proc.instrument !== instrumentFilter) {
        return false;
      }
      // Filtro por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode =
          proc.code.toLowerCase().includes(q) || proc.numericCode.includes(q);
        const matchesName = proc.name.toLowerCase().includes(q);
        const matchesRule = proc.rule.toLowerCase().includes(q);
        return matchesCode || matchesName || matchesRule;
      }
      return true;
    });
  }, [allowedCapsProcedures, instrumentFilter, searchQuery]);

  // Contadores por instrumento
  const bpaICount = allowedCapsProcedures.filter((p) => p.instrument === 'BPA-I').length;
  const raasCount = allowedCapsProcedures.filter((p) => p.instrument === 'RAAS-PSI').length;
  const bpaCCount = allowedCapsProcedures.filter((p) => p.instrument === 'BPA-C').length;

  // Fechar dropdown ao clicar fora
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

  const toggleDropdown = (name: 'ciap' | 'cid' | 'caps') => {
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
      : [{ rawCode: 'F99', cleanCode: 'F99', description: 'Transtorno mental não especificado', raw: 'F99' }];

  // Renderização para BLOCO 1: AVALIAÇÃO (CIAP-2 & CID-10)
  if (type === 'avaliacao') {
    return (
      <div ref={containerRef} className="mt-2.5 relative" id="quick-codes-bar-avaliacao">
        {/* Dropdown Toggle Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
            Códigos Rápidos:
          </span>

          {/* CIAP 2 Dropdown Button */}
          <button
            type="button"
            onClick={() => toggleDropdown('ciap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
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

        {/* Dropdown Content Menu for CIAP 2 (Avaliação) */}
        {openDropdown === 'ciap' && (
          <div className="mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-teal-500/40 shadow-xl space-y-2 z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-teal-800 dark:text-teal-300 uppercase flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-teal-600" />
                Códigos CIAP-2 Identificados na Avaliação
              </span>
              <span className="text-[10px]">Clique para copiar</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {displayAvaliacaoCiap.map((item, idx) => {
                const key = `avaliacao-ciap-${idx}-${item.code}`;
                const isCopied = copiedKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleCopy(key, item.code, `CIAP-2: ${item.code}`)}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 shrink-0">
                        {item.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group-hover:bg-teal-600 group-hover:text-white'
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
          <div className="mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/40 shadow-xl space-y-2 z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-bold text-indigo-800 dark:text-indigo-300 uppercase flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                Códigos CID-10 Diagnósticos Identificados
              </span>
              <span className="text-[10px]">Clique para copiar</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {displayCid.map((item, idx) => {
                const key = `avaliacao-cid-${idx}-${item.cleanCode}`;
                const isCopied = copiedKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleCopy(key, item.cleanCode, `CID-10: ${item.cleanCode}`)}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30 shrink-0">
                        {item.rawCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 group-hover:bg-indigo-600 group-hover:text-white'
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

  // Renderização para BLOCO 2: PLANO (CIAP-2 60-69 & PROCEDIMENTOS OFICIAIS CAPS POR CBO)
  return (
    <div ref={containerRef} className="mt-2.5 relative" id="quick-codes-bar-plano">
      {/* Dropdown Toggle Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
          Produção & Procedimentos:
        </span>

        {/* Botão Procedimentos CAPS Oficiais (BPA-I, RAAS-PSI, BPA-C) */}
        <button
          type="button"
          onClick={() => toggleDropdown('caps')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            openDropdown === 'caps'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 hover:border-emerald-500'
          }`}
          title={`Procedimentos operacionais do CAPS autorizados para o CBO de ${professionConfig.name}`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Procedimentos CAPS (BPA / RAAS)</span>
          <span
            className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
              openDropdown === 'caps'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {allowedCapsProcedures.length}
          </span>
          {openDropdown === 'caps' ? (
            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        {/* CIAP 2 Plano Dropdown Button */}
        <button
          type="button"
          onClick={() => toggleDropdown('ciap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            openDropdown === 'ciap'
              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-800 dark:text-teal-200 border-teal-500/40 hover:border-teal-500'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>CIAP 2 (60 a 69)</span>
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
      </div>

      {/* PAINEL COMPLETO: PROCEDIMENTOS CAPS POR CBO */}
      {openDropdown === 'caps' && (
        <div className="mt-2 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3 z-30 animate-in fade-in zoom-in-95 duration-150">
          {/* Cabeçalho do Catálogo com Identificação CBO */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-emerald-900 dark:text-emerald-200 text-xs uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Procedimentos Operacionais CAPS (Ministério da Saúde)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  CBO {professionConfig.cbo || 'Ativo'}: {professionConfig.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Exibindo estritamente os códigos autorizados para o perfil do profissional logado.
              </p>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Total: <strong>{allowedCapsProcedures.length} procedimentos compatíveis</strong>
            </div>
          </div>

          {/* Barra de Filtros por Instrumento e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Abas dos Instrumentos Oficiais */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setInstrumentFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  instrumentFilter === 'ALL'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Todos ({allowedCapsProcedures.length})
              </button>

              <button
                type="button"
                onClick={() => setInstrumentFilter('BPA-I')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  instrumentFilter === 'BPA-I'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                }`}
              >
                BPA-I ({bpaICount})
              </button>

              <button
                type="button"
                onClick={() => setInstrumentFilter('RAAS-PSI')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  instrumentFilter === 'RAAS-PSI'
                    ? 'bg-teal-600 text-white'
                    : 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                }`}
              >
                RAAS-PSI ({raasCount})
              </button>

              <button
                type="button"
                onClick={() => setInstrumentFilter('BPA-C')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  instrumentFilter === 'BPA-C'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                }`}
              >
                BPA-C ({bpaCCount})
              </button>
            </div>

            {/* Input de Busca Rápida */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar código ou termo..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Lista Rolável de Procedimentos */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredProcedures.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                Nenhum procedimento encontrado para o filtro aplicado.
              </div>
            ) : (
              filteredProcedures.map((proc) => {
                const codeKey = `caps-code-${proc.numericCode}`;
                const cleanKey = `caps-clean-${proc.numericCode}`;
                const fullKey = `caps-full-${proc.numericCode}`;

                const isCodeCopied = copiedKey === codeKey;
                const isCleanCopied = copiedKey === cleanKey;
                const isFullCopied = copiedKey === fullKey;

                // Cores dinâmicas por instrumento
                const badgeColor =
                  proc.instrument === 'BPA-I'
                    ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                    : proc.instrument === 'RAAS-PSI'
                    ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700'
                    : 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';

                return (
                  <div
                    key={proc.code}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-2xs">
                          {proc.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                          {proc.instrument}
                        </span>
                        {proc.isInitialContact && (
                          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-blue-500 text-white">
                            1º Contato / Caso Novo
                          </span>
                        )}
                        {proc.isCrisisOrNight && (
                          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                            Crise / Noturno
                          </span>
                        )}
                      </div>

                      {/* Botões de Ação de Cópia */}
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(codeKey, proc.code, `Código CAPS: ${proc.code}`)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            isCodeCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                          }`}
                          title={`Copiar código oficial com pontuação: ${proc.code}`}
                        >
                          {isCodeCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                          <span>{isCodeCopied ? 'Copiado!' : 'Código'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(cleanKey, proc.numericCode, `Código Limpo: ${proc.numericCode}`)}
                          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            isCleanCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                          }`}
                          title={`Copiar código numérico direto (10 dígitos para PEC): ${proc.numericCode}`}
                        >
                          {isCleanCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                          <span>{isCleanCopied ? 'Copiado!' : 'Numérico'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              fullKey,
                              `${proc.code} – ${proc.name}`,
                              'Procedimento CAPS'
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            isFullCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                          }`}
                          title="Copiar código formatado e nome completo do procedimento"
                        >
                          {isFullCopied ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                          <span>{isFullCopied ? 'Copiado!' : 'Completo'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {proc.name}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {proc.rule}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <Info className="w-3 h-3 text-emerald-600" />
                        Instrumento: <strong>{proc.instrumentFullName}</strong>
                      </span>
                      <span>
                        Nível: <strong>{proc.requiresHigherEducation ? 'Nível Superior' : 'Superior e Técnico/Médio'}</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Dropdown Content Menu for CIAP 2 (60 a 69) */}
      {openDropdown === 'ciap' && (
        <div className="mt-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-teal-500/40 shadow-xl space-y-2 z-30 animate-in fade-in zoom-in-95 duration-150">
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
    </div>
  );
};
