import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Users,
  GraduationCap,
  Brain,
  Apple,
  Dumbbell,
  Stethoscope,
  Check,
  ChevronDown,
} from 'lucide-react';
import { ProfessionId, ProfessionConfig } from '../types';
import { PROFESSIONS } from '../data/professions';

interface ProfessionSelectorProps {
  selectedId: ProfessionId;
  onSelect: (id: ProfessionId) => void;
  disabled?: boolean;
}

const ICONS_MAP: Record<string, React.ElementType> = {
  Activity,
  Users,
  GraduationCap,
  Brain,
  Apple,
  Dumbbell,
  Stethoscope,
};

export const ProfessionSelector: React.FC<ProfessionSelectorProps> = ({
  selectedId,
  onSelect,
  disabled = false,
}) => {
  const professionsList = Object.values(PROFESSIONS);

  return (
    <div id="profession-selector-wrapper" className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Profissão do Atendimento (SUS / PEC)
        </label>
        <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800/40">
          9 Categorias Profissionais eMulti / APS / RAPS
        </span>
      </div>

      {/* Dropdown Selector with Icon & Modern Typography */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 pointer-events-none">
          {(() => {
            const IconComponent = ICONS_MAP[PROFESSIONS[selectedId]?.iconName] || Stethoscope;
            return <IconComponent className="w-4 h-4" />;
          })()}
        </div>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value as ProfessionId)}
          disabled={disabled}
          className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all appearance-none cursor-pointer shadow-xs"
        >
          {professionsList.map((prof: ProfessionConfig) => (
            <option key={prof.id} value={prof.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1.5">
              {prof.name} • {prof.council} {prof.cbo ? `(CBO ${prof.cbo})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {/* Selected Profession Notice / Focus */}
      <div className="p-2.5 rounded-xl bg-[#2d1aa8] border border-indigo-900/40 text-xs text-white flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            Foco no PEC ({PROFESSIONS[selectedId]?.name || 'Profissional'}):
          </span>
          <span className="text-indigo-100">
            {PROFESSIONS[selectedId]?.shortDesc}
          </span>
        </div>
        <div className="text-[11px] font-mono text-indigo-200 whitespace-nowrap">
          {PROFESSIONS[selectedId]?.isTriageOnly
            ? 'Campo Único de Triagem'
            : PROFESSIONS[selectedId]?.hasBlock3
            ? '3 Blocos (com Conduta 06)'
            : '2 Blocos PEC Padrão'}
        </div>
      </div>
    </div>
  );
};
