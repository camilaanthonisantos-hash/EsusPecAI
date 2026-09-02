import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Search,
  UserPlus,
  Calendar,
  CreditCard,
  HeartHandshake,
  Clock,
  ChevronRight,
  FileEdit,
  Sparkles,
  PlusCircle,
  Baby,
  User,
  Trash2,
} from 'lucide-react';
import { Patient, Consultation, User as UserModel } from '../types';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { isUserAdmin } from '../data/professions';
import { SpecularButton } from './SpecularButton';


interface PatientsListViewProps {
  patients: Patient[];
  consultations: Consultation[];
  currentUser: UserModel;
  onSelectPatient: (patient: Patient) => void;
  onOpenNewPatientModal: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient?: (patient: Patient) => void;
  onNewConsultationForPatient: (patient: Patient) => void;
}

export const PatientsListView: React.FC<PatientsListViewProps> = ({
  patients,
  consultations,
  currentUser,
  onSelectPatient,
  onOpenNewPatientModal,
  onEditPatient,
  onDeletePatient,
  onNewConsultationForPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const isAdmin = isUserAdmin(currentUser);

  const filteredPatients = patients.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(term) ||
      (p.cns && p.cns.includes(term)) ||
      (p.cpf && p.cpf.includes(term)) ||
      (p.legalGuardianName && p.legalGuardianName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6" id="patients-list-view">
      {/* Top Banner & Action Controls */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                Gestão de Pacientes & Histórico Longitudinal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhamento multiprofissional contínuo com cálculo cronológico exato
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SpecularButton
            type="button"
            id="open-new-patient-modal-btn"
            onClick={onOpenNewPatientModal}
            size="sm"
            radius={12}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/20 shrink-0 border-teal-500/40"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Cadastrar Paciente</span>
          </SpecularButton>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          id="patient-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por Nome do Paciente, Cartão SUS (CNS), CPF ou Responsável Legal..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs"
        />
        {searchTerm && (
          <SpecularButton
            type="button"
            onClick={() => setSearchTerm('')}
            size="sm"
            radius={8}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 border-transparent"
          >
            Limpar
          </SpecularButton>
        )}
      </div>

      {/* Patients List Grid */}
      {filteredPatients.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhum paciente encontrado.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchTerm
              ? 'Tente ajustar os termos de busca pelo nome ou número de documento.'
              : 'Comece cadastrando o primeiro paciente para iniciar o registro clínico.'}
          </p>
          <SpecularButton
            type="button"
            onClick={onOpenNewPatientModal}
            size="sm"
            radius={12}
            className="mt-2 px-4 py-2 bg-teal-600 text-white hover:bg-teal-500 border-teal-500/40"
          >
            + Cadastrar Novo Paciente
          </SpecularButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredPatients.map((patient, index) => {
            const age = calculateChronologicalAge(patient.birthDate);
            const patientConsultations = consultations.filter((c) => c.patientId === patient.id);
            const latestConsultation = [...patientConsultations].sort(
              (a, b) => b.timestamp - a.timestamp
            )[0];

            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
                id={`patient-list-card-${patient.id}`}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/40 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Section */}
                  <div
                    className="space-y-2 flex-1 cursor-pointer"
                    onClick={() => onSelectPatient(patient)}
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {patient.fullName}
                      </h3>

                      {patient.cns && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-mono text-[11px] font-semibold border border-teal-200 dark:border-teal-800">
                          CNS: {patient.cns}
                        </span>
                      )}

                      {patient.cpf && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          CPF: {patient.cpf}
                        </span>
                      )}

                      {age.isMinor && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/20 flex items-center gap-1">
                          <Baby className="w-3 h-3" />
                          <span>Puericultura / Menor</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>
                          Idade:{' '}
                          <strong className="text-teal-700 dark:text-teal-300 font-bold">
                            {age.formatted}
                          </strong>
                        </span>
                      </div>

                      {patient.legalGuardianName && (
                        <div className="flex items-center gap-1.5">
                          <HeartHandshake className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>
                            Responsável:{' '}
                            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                              {patient.legalGuardianName} ({patient.guardianKinship || 'Responsável'})
                            </strong>
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {patientConsultations.length}{' '}
                          {patientConsultations.length === 1 ? 'atendimento' : 'atendimentos'}{' '}
                          multiprofissionais
                        </span>
                      </div>
                    </div>

                    {latestConsultation && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        Último atendimento:{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(latestConsultation.timestamp).toLocaleDateString('pt-BR')}
                        </span>{' '}
                        por{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {latestConsultation.authorName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <SpecularButton
                      type="button"
                      onClick={() => onEditPatient(patient)}
                      size="icon"
                      radius={12}
                      className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent"
                      title="Editar Paciente"
                    >
                      <FileEdit className="w-4 h-4" />
                    </SpecularButton>

                    {isAdmin && onDeletePatient && (
                      <SpecularButton
                        type="button"
                        onClick={() => setPatientToDelete(patient)}
                        size="icon"
                        radius={12}
                        className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-transparent"
                        title="Excluir Paciente (Admin)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </SpecularButton>
                    )}

                    <SpecularButton
                      type="button"
                      onClick={() => onNewConsultationForPatient(patient)}
                      size="sm"
                      radius={12}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs border-emerald-500/40"
                      title="Novo Atendimento para este Paciente"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Atender</span>
                    </SpecularButton>

                    <SpecularButton
                      type="button"
                      onClick={() => onSelectPatient(patient)}
                      size="sm"
                      radius={12}
                      className="px-4 py-2 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800"
                    >
                      <span>Ver Linha do Tempo</span>
                      <ChevronRight className="w-4 h-4" />
                    </SpecularButton>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Patient Deletion */}
      <AnimatePresence>
        {patientToDelete && (
          <div
            id="confirm-delete-patient-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
            onClick={() => setPatientToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Excluir Paciente
                </h3>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {patientToDelete.fullName}
                </p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-mono mt-0.5">
                  CNS: {patientToDelete.cns || 'S/N'} {patientToDelete.cpf ? `• CPF: ${patientToDelete.cpf}` : ''}
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tem certeza que deseja excluir este paciente? Esta ação é restrita a administradores e removerá permanentemente o cadastro e todo o histórico clínico do paciente no Cloud Firestore.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <SpecularButton
                  type="button"
                  onClick={() => setPatientToDelete(null)}
                  size="sm"
                  radius={12}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-transparent"
                >
                  Cancelar
                </SpecularButton>
                <SpecularButton
                  type="button"
                  id="confirm-delete-patient-action-btn"
                  onClick={() => {
                    if (onDeletePatient && patientToDelete) {
                      onDeletePatient(patientToDelete);
                      setPatientToDelete(null);
                    }
                  }}
                  size="sm"
                  radius={12}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border-rose-500/40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Exclusão</span>
                </SpecularButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
