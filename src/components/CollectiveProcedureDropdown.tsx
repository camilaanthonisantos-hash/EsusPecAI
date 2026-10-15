import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Users } from 'lucide-react';
import {
  CapsProcedure,
  CAPS_COLLECTIVE_PROCEDURES,
  getCapsCollectiveProceduresForCbo,
} from '../data/capsProcedures';

interface CollectiveProcedureDropdownProps {
  selectedProcedure: CapsProcedure | null;
  onSelectProcedure: (proc: CapsProcedure) => void;
  showOnlyCodes?: boolean; // Se true, exibe apenas os códigos em números conforme solicitado
  currentUserCbo?: string;
  currentUserProfession?: string;
}

export const CollectiveProcedureDropdown: React.FC<CollectiveProcedureDropdownProps> = ({
  selectedProcedure,
  onSelectProcedure,
  showOnlyCodes = false,
  currentUserCbo,
  currentUserProfession,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchLetter, setSearchLetter] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filtra apenas procedimentos que o CBO do profissional logado tem habilitação para executar
  const availableProcedures = useMemo(() => {
    return getCapsCollectiveProceduresForCbo(currentUserCbo, currentUserProfession);
  }, [currentUserCbo, currentUserProfession]);

  // Se o procedimento atualmente selecionado não for habilitado para o CBO do usuário, seleciona o primeiro disponível
  useEffect(() => {
    if (availableProcedures.length > 0) {
      const isStillAvailable = availableProcedures.some(
        (p) => p.code === selectedProcedure?.code
      );
      if (!isStillAvailable) {
        onSelectProcedure(availableProcedures[0]);
      }
    }
  }, [availableProcedures, selectedProcedure, onSelectProcedure]);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Busca inteligente pela digitação da primeira letra/número no próprio campo
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      setIsOpen((prev) => !prev);
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const char = e.key.toLowerCase();
      const newLetter = (searchLetter + char).slice(-3);
      setSearchLetter(newLetter);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        setSearchLetter('');
      }, 1000);

      // Localiza o primeiro procedimento que começa com o caractere entre os habilitados
      const match = availableProcedures.find((p) => {
        if (showOnlyCodes) {
          const num = p.numericCode || p.code.replace(/\D/g, '');
          return num.startsWith(newLetter) || p.code.startsWith(newLetter);
        }
        const nameNorm = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const codeClean = p.code.replace(/\D/g, '');
        return nameNorm.startsWith(newLetter) || codeClean.startsWith(newLetter);
      });

      if (match) {
        onSelectProcedure(match);
      }
    }
  };

  const displayText = useMemo(() => {
    if (!selectedProcedure) {
      return showOnlyCodes ? 'Selecione o código SIGTAP...' : 'Selecione o procedimento coletivo...';
    }
    if (showOnlyCodes) {
      return selectedProcedure.code;
    }
    return `${selectedProcedure.code} - ${selectedProcedure.name}`;
  }, [selectedProcedure, showOnlyCodes]);

  return (
    <div ref={containerRef} className="relative w-full text-left" onKeyDown={handleKeyDown}>
      {/* Botão principal de seleção com foco e captura de teclado */}
      <button
        type="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium hover:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <Users className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate">{displayText}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-teal-600' : ''
          }`}
        />
      </button>

      {/* Lista suspensa simples com espaçamento mínimo, sem barra de pesquisa interna */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {availableProcedures.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              Nenhum procedimento habilitado para o seu CBO.
            </div>
          ) : (
            availableProcedures.map((proc) => {
              const isSelected = selectedProcedure?.code === proc.code;
              return (
                <button
                  key={proc.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectProcedure(proc);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  {showOnlyCodes ? (
                    <span className="font-mono text-xs font-semibold tracking-wide">
                      {proc.code}
                    </span>
                  ) : (
                    <div className="truncate">
                      <span className="font-mono font-semibold text-teal-700 dark:text-teal-300 mr-2">
                        {proc.code}
                      </span>
                      <span className="truncate">{proc.name}</span>
                    </div>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
