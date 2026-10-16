import React from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Patient } from '../types';
import {
  INDIVIDUAL_PROFILE_PROCEDURES,
  IndividualProfileProcedure,
} from '../data/capsProcedures';
import { resolvePatientDocumentForDb2 } from '../services/secondarySupabase';

interface IndividualProcedureMappingCardProps {
  selectedProcedureCode: string;
  onSelectProcedureCode: (code: string) => void;
  activePatient: Patient | null;
}

export const IndividualProcedureMappingCard: React.FC<IndividualProcedureMappingCardProps> = ({
  selectedProcedureCode,
  onSelectProcedureCode,
  activePatient,
}) => {
  // Encontra o procedimento ativo ou fallback para o primeiro (0102010242 da imagem)
  const currentProc =
    INDIVIDUAL_PROFILE_PROCEDURES.find(
      (p) =>
        p.code === selectedProcedureCode ||
        p.formattedCode === selectedProcedureCode ||
        selectedProcedureCode.replace(/\D/g, '') === p.code
    ) || INDIVIDUAL_PROFILE_PROCEDURES[0];

  // Resolve os dados do paciente ativo para espelhar a validação do BD 2 conforme a imagem
  const docInfo = activePatient ? resolvePatientDocumentForDb2(activePatient) : null;
  const genderChar = activePatient?.gender?.trim().toUpperCase().startsWith('F')
    ? 'F'
    : 'M';
  const cleanNumber =
    activePatient?.number?.trim() &&
    !/^(s\/n|sn|s\.n|sem\s*n[uú]mero|0)$/i.test(activePatient.number.trim())
      ? activePatient.number.trim()
      : '00';

  return (
    <div
      id="card-mapeamento-procedimento-bd2"
      className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-teal-500/30 dark:border-teal-700/60 shadow-xs space-y-4 transition-all"
    >
      {/* Lista Suspensa (Dropdown) dos Procedimentos Perfil */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-900 dark:text-slate-100">
          Tipo Atendimento
        </label>
        <select
          id="select-individual-procedure-bd2"
          value={currentProc.code}
          onChange={(e) => onSelectProcedureCode(e.target.value)}
          className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 cursor-pointer shadow-xs font-mono"
        >
          {INDIVIDUAL_PROFILE_PROCEDURES.map((p) => (
            <option
              key={p.code}
              value={p.code}
              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium py-1.5"
            >
              {p.displayLabel}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

