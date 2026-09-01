import React, { useState, useRef, useEffect } from 'react';
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
import { Patient, Consultation } from '../types';
import { calculateChronologicalAge } from '../utils/dateCalculator';

interface PatientDropdownSelectorProps {
  patients: Patient[];
  consultations: Consultation[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient | null) => void;
  onOpenNewPatientModal: () => void;
  variant?: 'banner' | 'compact' | 'header';
}

export const PatientDropdownSelector: React.FC<PatientDropdownSelectorProps> = ({
  patients,
  consultations,
  selectedPatient,
  onSelectPatient,
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

  const filteredPatients = patients.filter((patient) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const nameMatch = patient.fullName?.toLowerCase().includes(term);
    const cnsMatch = patient.cns?.includes(term);
    const cpfMatch = patient.cpf?.includes(term);
    const guardianMatch = patient.legalGuardianName?.toLowerCase().includes(term);
    return nameMatch || cnsMatch || cpfMatch || guardianMatch;
  });

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
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl border transition-all cursor-pointer ${
          selectedPatient
            ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-950 dark:text-teal-100 hover:bg-teal-100/70 dark:hover:bg-teal-900/50 shadow-xs'
            : 'bg-white dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-1.5 rounded-xl shrink-0 ${
              selectedPatient
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {selectedPatient ? <UserCheck className="w-4 h-4" /> : <Users className="w-4 h-4" />}
          </div>
          <div className="text-left truncate">
            {selectedPatient ? (
              <div className="flex items-baseline gap-2 truncate">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {selectedPatient.fullName}
                </span>
                <span className="text-[11px] font-medium text-teal-700 dark:text-teal-300 shrink-0">
                  ({calculateChronologicalAge(selectedPatient.birthDate).formatted})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Selecionar Paciente ({patients.length} no banco)
                </span>
              </div>
            )}
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {selectedPatient
                ? `CNS: ${selectedPatient.cns || 'S/N'} • ${getPatientConsultationCount(selectedPatient.id)} atendimentos`
                : 'Clique para escolher um paciente da lista ou cadastrar'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-teal-600' : ''
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
                  placeholder="Buscar paciente por nome, CNS ou CPF..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between px-1 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {filteredPatients.length} paciente(s) disponível(is)
                </span>
                <span className="font-semibold text-teal-600 dark:text-teal-400">
                  Banco Central de Pacientes
                </span>
              </div>
            </div>

            {/* Quick Actions: New Patient Registration or Deselect */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 flex items-center gap-1.5">
              <button
                type="button"
                id="dropdown-new-patient-btn"
                onClick={() => {
                  setIsOpen(false);
                  onOpenNewPatientModal();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Cadastrar Novo Paciente</span>
              </button>

              {selectedPatient && (
                <button
                  type="button"
                  id="dropdown-clear-patient-btn"
                  onClick={() => {
                    onSelectPatient(null);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  title="Desvincular paciente atual"
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
                    Nenhum paciente encontrado com "{searchTerm}".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenNewPatientModal();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Cadastrar novo paciente com este nome
                  </button>
                </div>
              ) : (
                filteredPatients.map((pat) => {
                  const isSelected = selectedPatient?.id === pat.id;
                  const age = calculateChronologicalAge(pat.birthDate);
                  const consCount = getPatientConsultationCount(pat.id);

                  return (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => {
                        onSelectPatient(pat);
                        setIsOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800'
                          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                            isSelected
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
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
