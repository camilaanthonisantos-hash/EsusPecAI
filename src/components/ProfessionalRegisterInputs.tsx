import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Building2, Briefcase, Hash, MapPin, Sparkles } from 'lucide-react';
import { ProfessionConfig, ProfessionId } from '../types';
import {
  BRAZILIAN_UFS,
  DEFAULT_COUNCIL_BODIES,
  DEFAULT_CBO_MAP,
  DEFAULT_PROFESSION_COUNCIL_MAP,
  PROFESSIONS,
} from '../data/professions';

interface ProfessionalRegisterInputsProps {
  // Especialidade
  selectedProfession: ProfessionId;
  onProfessionChange: (professionId: ProfessionId) => void;
  allProfessions?: Record<string, ProfessionConfig>;
  onAddNewProfession?: (newProf: ProfessionConfig) => void;

  // Três Campos: Órgão de Classe, Num/Cod, UF
  councilBody: string;
  onCouncilBodyChange: (body: string) => void;
  councilNumber: string;
  onCouncilNumberChange: (num: string) => void;
  councilUf: string;
  onCouncilUfChange: (uf: string) => void;

  availableCouncilBodies?: string[];
  onAddNewCouncilBody?: (newBody: string) => void;

  // Customização visual e modo
  variant?: 'card' | 'compact' | 'auth';
  disabled?: boolean;
}

export const ProfessionalRegisterInputs: React.FC<ProfessionalRegisterInputsProps> = ({
  selectedProfession,
  onProfessionChange,
  allProfessions = PROFESSIONS,
  onAddNewProfession,
  councilBody,
  onCouncilBodyChange,
  councilNumber,
  onCouncilNumberChange,
  councilUf,
  onCouncilUfChange,
  availableCouncilBodies = DEFAULT_COUNCIL_BODIES as unknown as string[],
  onAddNewCouncilBody,
  variant = 'card',
  disabled = false,
}) => {
  // Modals / Popovers para Add Especialidade e Add Órgão
  const [isAddingProfession, setIsAddingProfession] = useState(false);
  const [newProfName, setNewProfName] = useState('');
  const [newProfCategory, setNewProfCategory] = useState<'APS' | 'RAPS' | 'eMulti'>('eMulti');
  const [newProfCbo, setNewProfCbo] = useState('');
  const [newProfCouncil, setNewProfCouncil] = useState('');

  const [isAddingCouncil, setIsAddingCouncil] = useState(false);
  const [newCouncilName, setNewCouncilName] = useState('');

  // Sincronização inteligente: quando a profissão muda ou quando o órgão é alterado para CBO
  useEffect(() => {
    // Se o usuário selecionou 'CBO', preenche automaticamente com o CBO da profissão atual
    if (councilBody.toUpperCase() === 'CBO') {
      const cboFromProf =
        allProfessions[selectedProfession]?.cbo ||
        DEFAULT_CBO_MAP[selectedProfession] ||
        '';
      if (cboFromProf) {
        onCouncilNumberChange(cboFromProf);
      }
    }
  }, [councilBody, selectedProfession, allProfessions]);

  const handleProfessionSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW_PROFESSION__') {
      setIsAddingProfession(true);
      return;
    }

    onProfessionChange(val as ProfessionId);

    // Sugere o órgão padrão da profissão se o conselho estiver vazio ou padrão
    const profConfig = allProfessions[val];
    const defaultCouncil =
      profConfig?.councilAbbr ||
      DEFAULT_PROFESSION_COUNCIL_MAP[val] ||
      (val.includes('acs') || val.includes('ace') ? 'CBO' : 'CRM');

    // Se o órgão atual era CBO ou estava vazio, atualiza de acordo
    if (!councilBody || councilBody === 'CBO') {
      onCouncilBodyChange(defaultCouncil);
      if (defaultCouncil === 'CBO') {
        const cbo = profConfig?.cbo || DEFAULT_CBO_MAP[val] || '';
        onCouncilNumberChange(cbo);
      }
    }
  };

  const handleCouncilBodySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW_COUNCIL__') {
      setIsAddingCouncil(true);
      return;
    }

    onCouncilBodyChange(val);

    if (val.toUpperCase() === 'CBO') {
      const cbo =
        allProfessions[selectedProfession]?.cbo ||
        DEFAULT_CBO_MAP[selectedProfession] ||
        '';
      onCouncilNumberChange(cbo);
    } else if (councilBody.toUpperCase() === 'CBO') {
      // Se estava em CBO e trocou para conselho, limpa o CBO para o usuário digitar o registro
      onCouncilNumberChange('');
    }
  };

  const handleConfirmAddProfession = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProfName.trim();
    if (!cleanName) return;

    const id = cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 30);

    const councilStr = newProfCouncil.trim().toUpperCase() || 'CBO';
    const cboStr = newProfCbo.trim();

    const newConfig: ProfessionConfig = {
      id,
      name: cleanName,
      category: newProfCategory,
      council: councilStr,
      councilAbbr: councilStr,
      cbo: cboStr,
      color: 'teal',
      accentBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
      iconName: 'Sparkles',
      shortDesc: `Especialidade ${cleanName} cadastrada no sistema`,
      pecFocus: 'Avaliação Clínica Multiprofissional e Conduta Longitudinal',
      hasBlock3: false,
    };

    if (onAddNewProfession) {
      onAddNewProfession(newConfig);
    }

    if (councilStr && onAddNewCouncilBody && !availableCouncilBodies.includes(councilStr)) {
      onAddNewCouncilBody(councilStr);
    }

    onProfessionChange(id as ProfessionId);
    onCouncilBodyChange(councilStr);
    if (councilStr === 'CBO' && cboStr) {
      onCouncilNumberChange(cboStr);
    }

    setIsAddingProfession(false);
    setNewProfName('');
    setNewProfCbo('');
    setNewProfCouncil('');
  };

  const handleConfirmAddCouncil = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCouncil = newCouncilName.trim().toUpperCase();
    if (!cleanCouncil) return;

    if (onAddNewCouncilBody) {
      onAddNewCouncilBody(cleanCouncil);
    }

    onCouncilBodyChange(cleanCouncil);
    setIsAddingCouncil(false);
    setNewCouncilName('');
  };

  const isCboSelected = councilBody.toUpperCase() === 'CBO';

  return (
    <div className="space-y-3">
      {/* 1. SELEÇÃO DE ESPECIALIDADE COM BOTÃO DE ADD */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span>Especialidade / Profissão</span>
            <span className="text-rose-500">*</span>
          </label>

          <button
            type="button"
            onClick={() => setIsAddingProfession(true)}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
            title="Adicionar nova especialidade ou profissão"
          >
            <Plus className="w-3 h-3" />
            <span>Add Especialidade</span>
          </button>
        </div>

        <div className="relative">
          <select
            value={selectedProfession}
            onChange={handleProfessionSelectChange}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            {Object.values(allProfessions).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.category ? `(${p.category})` : ''} {p.cbo ? `• CBO ${p.cbo}` : ''}
              </option>
            ))}
            <option value="__ADD_NEW_PROFESSION__" className="text-indigo-600 font-bold">
              + Cadastrar Nova Especialidade...
            </option>
          </select>
        </div>
      </div>

      {/* POPUP / INLINE FORM: ADICIONAR NOVA ESPECIALIDADE */}
      {isAddingProfession && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Nova Especialidade / Profissão</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAddingProfession(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                Nome da Especialidade *
              </label>
              <input
                type="text"
                value={newProfName}
                onChange={(e) => setNewProfName(e.target.value)}
                placeholder="Ex: Fisioterapeuta, Fonoaudiólogo..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                CBO Padrão
              </label>
              <input
                type="text"
                value={newProfCbo}
                onChange={(e) => setNewProfCbo(e.target.value)}
                placeholder="Ex: 2236-05"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                Órgão / Sigla (ou CBO)
              </label>
              <input
                type="text"
                value={newProfCouncil}
                onChange={(e) => setNewProfCouncil(e.target.value.toUpperCase())}
                placeholder="Ex: CREFITO, CRF, CBO..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingProfession(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmAddProfession}
              disabled={!newProfName.trim()}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
            >
              Salvar Especialidade
            </button>
          </div>
        </div>
      )}

      {/* 2. OS TRÊS CAMPOS SUBSTITUINDO "REGISTRO DO CONSELHO":
             - CAMPO 1: Órgão de classe (com sigla de todos + CBO + opção Add)
             - CAMPO 2: Num/Cod (popular automático se CBO ou digitado se conselho)
             - CAMPO 3: UF (todas as 27 UFs)
      */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        {/* CAMPO 1: Órgão de classe (4 cols) */}
        <div className="sm:col-span-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Órgão de classe</span>
              <span className="text-rose-500">*</span>
            </label>

            <button
              type="button"
              onClick={() => setIsAddingCouncil(true)}
              className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
              title="Adicionar novo órgão de classe"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Add</span>
            </button>
          </div>

          <select
            value={councilBody.toUpperCase()}
            onChange={handleCouncilBodySelectChange}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
          >
            {availableCouncilBodies.map((body) => (
              <option key={body} value={body}>
                {body} {body === 'CBO' ? '(Classificação Brasileira de Ocupações)' : ''}
              </option>
            ))}
            <option value="__ADD_NEW_COUNCIL__" className="text-teal-600 font-bold">
              + Cadastrar Novo Órgão...
            </option>
          </select>
        </div>

        {/* CAMPO 2: Num/Cod (5 cols) */}
        <div className="sm:col-span-5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isCboSelected ? 'Código CBO' : 'Num/Cod (Registro)'}</span>
              <span className="text-rose-500">*</span>
            </label>
            {isCboSelected && (
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Auto CBO
              </span>
            )}
          </div>

          <input
            type="text"
            required
            value={councilNumber}
            onChange={(e) => onCouncilNumberChange(e.target.value)}
            disabled={disabled}
            placeholder={
              isCboSelected
                ? 'Ex: 2235-05 (CBO Automático)'
                : `Ex: 123456 (${councilBody || 'Conselho'})`
            }
            className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${
              isCboSelected
                ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-900 dark:text-emerald-200'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
            }`}
          />
        </div>

        {/* CAMPO 3: UF (3 cols) */}
        <div className="sm:col-span-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span>UF</span>
            <span className="text-rose-500">*</span>
          </label>

          <select
            value={councilUf.toUpperCase()}
            onChange={(e) => onCouncilUfChange(e.target.value.toUpperCase())}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
          >
            {BRAZILIAN_UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* POPUP / INLINE FORM: ADICIONAR NOVO ÓRGÃO DE CLASSE */}
      {isAddingCouncil && (
        <div className="p-3 rounded-2xl bg-teal-50/90 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-950 dark:text-teal-200">
              Cadastrar Sigla do Órgão de Classe
            </span>
            <button
              type="button"
              onClick={() => setIsAddingCouncil(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCouncilName}
              onChange={(e) => setNewCouncilName(e.target.value.toUpperCase())}
              placeholder="Ex: CRTR, CRBio, COFFITO..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
              autoFocus
            />
            <button
              type="button"
              onClick={handleConfirmAddCouncil}
              disabled={!newCouncilName.trim()}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
