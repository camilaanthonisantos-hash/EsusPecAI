import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  UserCheck,
  UserPlus,
  ChevronDown,
  X,
  Check,
  CreditCard,
  Calendar,
  Clock,
  ShieldCheck,
  Baby,
} from 'lucide-react';
import { Patient, Consultation, ReceptionQueueItem } from '../types';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { SpecularButton } from './SpecularButton';

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
  queueItems = [],
  onSelectPatient,
  onAddToQueue,
  onOpenNewPatientModal,
  variant = 'banner',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Auto-focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const filteredPatients = useMemo(() => {
    const raw = searchTerm.trim();
    const q = normalizeSearchText(raw);
    if (!q) return patients;

    const queryTokens = q.split(/\s+/).filter(Boolean);
    const digitsQuery = raw.replace(/\D/g, '');

    const scored: Array<{ patient: Patient; score: number }> = [];

    for (const p of patients) {
      const normName = normalizeSearchText(p.fullName || '');
      const normCpf = p.cpf ? p.cpf.replace(/\D/g, '') : '';
      const normCns = p.cns ? p.cns.replace(/\D/g, '') : '';
      const normGuardian = normalizeSearchText(p.legalGuardianName || '');

      let score = 0;
      if (normName.startsWith(q)) {
        score = 1000 + (100 - Math.min(100, normName.length));
      } else if (normName.includes(q)) {
        score = 800 + (100 - Math.min(100, normName.length));
      } else if (queryTokens.length > 1 && queryTokens.every((t) => normName.includes(t))) {
        score = 700;
      } else if (queryTokens.some((t) => normName.split(/\s+/).some((w) => w.startsWith(t)))) {
        score = 500;
      } else if (digitsQuery.length >= 3 && (normCpf.includes(digitsQuery) || normCns.includes(digitsQuery))) {
        score = 400;
      } else if (normGuardian.includes(q)) {
        score = 100;
      }

      if (score > 0) {
        scored.push({ patient: p, score });
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.patient.fullName || '').localeCompare(b.patient.fullName || '', 'pt-BR');
    });

    return scored.map((s) => s.patient);
  }, [patients, searchTerm]);

  const getPatientConsultationCount = (patientId: string) => {
    return consultations.filter((c) => c.patientId === patientId).length;
  };

  return (
    <div className="relative inline-block w-full max-w-md text-left" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        id="patient-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-150 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-teal-500/50 shadow-xs ${
          selectedPatient
            ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 hover:bg-teal-100 dark:hover:bg-teal-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-500/60 dark:hover:border-teal-500/60'
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
                  Selecionar Cidadão ({patients.length} no banco)
                </span>
              </div>
            )}
            <div className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 truncate">
              {selectedPatient
                ? `CNS: ${selectedPatient.cns || 'S/N'} • ${getPatientConsultationCount(selectedPatient.id)} atendimentos`
                : 'Clique para selecionar e direcionar à Fila de Atendimento'}
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

      {/* Dropdown Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-50 mt-1.5 w-full min-w-[320px] max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Header: Search Box */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  id="patient-search-dropdown-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar cidadão por nome, CNS ou CPF..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {searchTerm && (
                  <SpecularButton
                    type="button"
                    onClick={() => setSearchTerm('')}
                    size="icon"
                    radius={8}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 border-transparent"
                  >
                    <X className="w-3.5 h-3.5" />
                  </SpecularButton>
                )}
              </div>
              <div className="flex items-center justify-between px-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {filteredPatients.length} cidadão(s) disponível(is)
                </span>
                <span className="font-semibold text-teal-600 dark:text-teal-400">
                  Clique para direcionar à Fila
                </span>
              </div>
            </div>

            {/* Quick Actions: New Patient Registration or Deselect */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 flex items-center gap-1.5">
              <SpecularButton
                type="button"
                id="dropdown-new-patient-btn"
                onClick={() => {
                  setIsOpen(false);
                  onOpenNewPatientModal();
                }}
                size="sm"
                radius={12}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-xs border-teal-500/40"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Cadastrar Novo Cidadão</span>
              </SpecularButton>

              {selectedPatient && (
                <button
                  type="button"
                  id="dropdown-clear-patient-btn"
                  onClick={() => {
                    onSelectPatient(null);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                  title="Desvincular cidadão atual"
                >
                  Desvincular
                </button>
              )}
            </div>

            {/* Patient List Items */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
              {filteredPatients.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Nenhum cidadão encontrado com "{searchTerm}".
                  </p>
                  <SpecularButton
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenNewPatientModal();
                    }}
                    size="sm"
                    radius={12}
                    className="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline border-transparent"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Cadastrar novo cidadão com este nome
                  </SpecularButton>
                </div>
              ) : (
                filteredPatients.map((pat) => {
                  const isSelected = selectedPatient?.id === pat.id;
                  const queueItem = queueItems?.find(
                    (q) => q.patientId === pat.id && (q.status === 'waiting' || q.status === 'in_service')
                  );
                  const isQueued = Boolean(queueItem);
                  const age = calculateChronologicalAge(pat.birthDate);
                  const consCount = getPatientConsultationCount(pat.id);

                  return (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => {
                        onAddToQueue(pat);
                        setIsOpen(false);
                      }}
                      className={`w-full p-2.5 text-left transition-colors flex items-center justify-between gap-3 rounded-xl cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-700'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-xs'
                              : isQueued
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {pat.fullName?.charAt(0)?.toUpperCase() || 'P'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected
                                  ? 'text-teal-900 dark:text-teal-100'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {pat.fullName}
                            </span>
                            <span className="text-[11px] text-teal-700 dark:text-teal-300 shrink-0 font-medium">
                              {age.formatted}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {pat.cns && <span>CNS: {pat.cns}</span>}
                            {pat.cpf && <span>• CPF: {pat.cpf}</span>}
                            <span className="text-teal-600 dark:text-teal-400 font-semibold">
                              • {consCount} atendimento(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>Ativo</span>
                          </span>
                        ) : queueItem ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              queueItem.status === 'in_service'
                                ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                                : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{queueItem.status === 'in_service' ? 'Em Atendimento' : 'Na Fila'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 transition-colors">
                            <UserPlus className="w-3 h-3" />
                            <span>+ Fila</span>
                          </span>
                        )}
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

