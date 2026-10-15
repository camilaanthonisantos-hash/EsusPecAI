import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserCheck,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Patient, Consultation, ReceptionQueueItem } from '../types';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { isConsultationForPatient } from '../services/firebase';

interface PatientDropdownSelectorProps {
  patients: Patient[];
  consultations: Consultation[];
  selectedPatient: Patient | null;
  queueItems?: ReceptionQueueItem[];
  onSelectPatient: (patient: Patient | null) => void;
  onAddToQueue: (patient: Patient) => void;
  onOpenNewPatientModal: () => void;
  variant?: 'banner' | 'compact' | 'header';
}

function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const PatientDropdownSelector: React.FC<PatientDropdownSelectorProps> = ({
  patients,
  consultations,
  selectedPatient,
  onSelectPatient,
  onAddToQueue,
  onOpenNewPatientModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Busca inteligente pela digitação da primeira letra/código no próprio campo
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
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
      const nextQuery = (typeSearch + char).slice(-4);
      setTypeSearch(nextQuery);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => setTypeSearch(''), 1200);

      // Localiza o primeiro paciente cujo nome ou documento coincide
      const qNorm = normalizeSearchText(nextQuery);
      const matched = patients.find((p) => {
        const normName = normalizeSearchText(p.fullName || '');
        const normDoc = (p.cpf || p.cns || '').replace(/\D/g, '');
        return normName.startsWith(qNorm) || normDoc.startsWith(nextQuery);
      });

      if (matched) {
        onSelectPatient(matched);
      }
    }
  };

  const displayedPatients = useMemo(() => {
    if (!typeSearch) return patients;
    const qNorm = normalizeSearchText(typeSearch);
    return patients.filter((p) => {
      const normName = normalizeSearchText(p.fullName || '');
      const normDoc = (p.cpf || p.cns || '').replace(/\D/g, '');
      return normName.startsWith(qNorm) || normName.includes(qNorm) || normDoc.includes(typeSearch);
    });
  }, [patients, typeSearch]);

  const getPatientConsultationCount = (patientId: string) => {
    const p = patients.find((pat) => pat.id === patientId);
    if (!p) return consultations.filter((c) => c.patientId === patientId).length;
    return consultations.filter((c) => isConsultationForPatient(c, p)).length;
  };

  return (
    <div className="relative inline-block w-full max-w-md text-left" ref={dropdownRef}>
      {/* Botão de seleção com foco e busca inteligente direta no campo */}
      <button
        type="button"
        id="patient-dropdown-trigger"
        tabIndex={0}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-150 cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-teal-500/50 shadow-xs ${
          selectedPatient
            ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 hover:bg-teal-100 dark:hover:bg-teal-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-500/60'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-1.5 rounded-xl shrink-0 ${
              selectedPatient
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {selectedPatient ? <UserCheck className="w-4 h-4" /> : <Users className="w-4 h-4" />}
          </div>
          <div className="text-left truncate">
            {selectedPatient ? (
              <div className="flex items-baseline gap-2 truncate">
                <span className="text-xs font-extrabold text-teal-950 dark:text-teal-100 truncate">
                  {selectedPatient.fullName}
                </span>
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 shrink-0">
                  ({calculateChronologicalAge(selectedPatient.birthDate).formatted})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Selecionar Cidadão ({patients.length} cadastrados)
                </span>
              </div>
            )}
            <div className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 truncate">
              {selectedPatient
                ? `CNS: ${selectedPatient.cns || 'S/N'} • ${getPatientConsultationCount(selectedPatient.id)} atendimentos`
                : typeSearch
                ? `Buscando: "${typeSearch.toUpperCase()}"...`
                : 'Clique para ver lista simples ou digite a primeira letra'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Lista suspensa simples com espaçamento mínimo, sem barra de busca interna */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 z-50 mt-1 w-full min-w-[320px] max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Cabeçalho simplificado com atalhos */}
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-semibold">
                {displayedPatients.length} cidadão(s) na lista
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenNewPatientModal();
                  }}
                  className="text-teal-600 dark:text-teal-400 font-bold hover:underline text-[11px] cursor-pointer"
                >
                  + Novo Cadastro
                </button>
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPatient(null);
                      setIsOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Itens da lista com espaçamento mínimo e texto simples */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 py-0.5">
              {displayedPatients.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhum cidadão encontrado.
                </div>
              ) : (
                displayedPatients.map((pat) => {
                  const isSelected = selectedPatient?.id === pat.id;
                  const age = calculateChronologicalAge(pat.birthDate);
                  return (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => {
                        onSelectPatient(pat);
                        onAddToQueue(pat);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left transition-colors flex items-center justify-between gap-2 text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 font-bold'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="truncate flex items-baseline gap-2">
                        <span className="truncate">{pat.fullName}</span>
                        <span className="text-[11px] text-slate-400 shrink-0 font-normal">
                          ({age.formatted})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {pat.cns && (
                          <span className="font-mono text-[10px] text-slate-400">
                            CNS: {pat.cns}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
