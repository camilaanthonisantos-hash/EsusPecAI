import React, { useState } from 'react';
import { Building2, Plus, Check, X, Sparkles } from 'lucide-react';
import { DEFAULT_WORKPLACE_PRESETS } from '../data/professions';

interface WorkplaceSelectInputProps {
  value: string;
  onChange: (value: string) => void;
  availableWorkplaces?: string[];
  onAddNewWorkplace?: (newWorkplace: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  helperText?: string;
}

export const WorkplaceSelectInput: React.FC<WorkplaceSelectInputProps> = ({
  value,
  onChange,
  availableWorkplaces = DEFAULT_WORKPLACE_PRESETS,
  onAddNewWorkplace,
  label = 'Unidade de Lotação',
  required = true,
  disabled = false,
  id = 'workplace-select',
  helperText,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  // Unify and deduplicate all workplaces list
  const allUnits = Array.from(
    new Set([
      ...availableWorkplaces,
      ...(value && !availableWorkplaces.includes(value) ? [value] : []),
    ])
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW_WORKPLACE__') {
      setIsAdding(true);
      return;
    }
    onChange(val);
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUnitName.trim();
    if (!clean) return;

    if (onAddNewWorkplace) {
      onAddNewWorkplace(clean);
    }
    onChange(clean);
    setNewUnitName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
        >
          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        <button
          type="button"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
          className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer disabled:opacity-50"
          title="Adicionar nova Unidade de Lotação no Banco de Dados"
        >
          <Plus className="w-3 h-3" />
          <span>ADD</span>
        </button>
      </div>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={handleSelectChange}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none cursor-pointer"
        >
          {allUnits.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
          <option value="__ADD_NEW_WORKPLACE__" className="text-teal-600 font-bold">
            + Cadastrar Nova Unidade no Banco de Dados...
          </option>
        </select>
      </div>

      {helperText && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{helperText}</p>
      )}

      {/* POPUP / INLINE FORM: ADICIONAR NOVA UNIDADE NO BANCO DE DADOS */}
      {isAdding && (
        <div className="p-3 rounded-2xl bg-teal-50/90 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 space-y-2 animate-fadeIn mt-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Nova Unidade de Lotação (Persistência no BD)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Ex: CAPS III Leste / UBS Vila Nova..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100"
              autoFocus
            />
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={!newUnitName.trim()}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Salvar no BD</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
