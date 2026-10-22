import React, { useState, useMemo } from 'react';
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
  UserCheck,
  MessageSquare,
  Database,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { Patient, Consultation, User as UserModel, SystemSettings } from '../types';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { isUserAdmin, DEFAULT_SYSTEM_SETTINGS } from '../data/professions';
import { SpecularButton } from './SpecularButton';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { syncPatientsBatchToDb2, getDb2Config } from '../services/secondarySupabase';
import { isConsultationForPatient } from '../services/firebase';
import { TimelineDateRangePicker } from './TimelineDateRangePicker';

interface PatientsListViewProps {
  patients: Patient[];
  consultations: Consultation[];
  currentUser: UserModel;
  systemSettings?: SystemSettings;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onSelectPatient: (patient: Patient) => void;
  onOpenNewPatientModal: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient?: (patient: Patient) => void;
  onNewConsultationForPatient: (patient: Patient) => void;
  onAddToQueue?: (patient: Patient) => void;
}

/**
 * Safely extracts numerical timestamp (ms) from a consultation
 */
function getConsultationTimestamp(c: any): number {
  if (!c) return 0;
  if (typeof c.timestamp === 'number' && !isNaN(c.timestamp) && c.timestamp > 0) {
    return c.timestamp;
  }
  if (typeof c.createdAt === 'number' && !isNaN(c.createdAt) && c.createdAt > 0) {
    return c.createdAt;
  }
  if (typeof c.timestamp === 'string') {
    const parsed = Date.parse(c.timestamp);
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof c.createdAt === 'string') {
    const parsed = Date.parse(c.createdAt);
    if (!isNaN(parsed)) return parsed;
  }
  if (c.raw_data) {
    return getConsultationTimestamp(c.raw_data);
  }
  return 0;
}

/**
 * Formats admission / registration date to dd/mm/aaaa
 */
function formatAdmissionDate(patient: Patient): string {
  const raw = patient.createdAt || (patient as any).created_at;
  if (!raw) return 'Não informada';
  const d = typeof raw === 'number' ? new Date(raw) : new Date(String(raw));
  if (isNaN(d.getTime())) return 'Não informada';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Checks if a timestamp falls within a date range [startIso, endIso] inclusive
 */
function isTimestampInDateRange(ts: number, startIso: string, endIso: string): boolean {
  if (!ts) return false;
  const [sY, sM, sD] = startIso.split('-').map(Number);
  const startEpoch = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();

  const [eY, eM, eD] = endIso.split('-').map(Number);
  const endEpoch = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();

  return ts >= startEpoch && ts <= endEpoch;
}

export const PatientsListView: React.FC<PatientsListViewProps> = ({
  patients,
  consultations,
  currentUser,
  systemSettings,
  onShowToast,
  onSelectPatient,
  onOpenNewPatientModal,
  onEditPatient,
  onDeletePatient,
  onNewConsultationForPatient,
  onAddToQueue,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilterStart, setDateFilterStart] = useState<string | null>(null);
  const [dateFilterEnd, setDateFilterEnd] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [selectedChatPatient, setSelectedChatPatient] = useState<Patient | null>(null);
  const [isSyncingDb2, setIsSyncingDb2] = useState(false);
  const isAdmin = isUserAdmin(currentUser);

  const handleSyncWithDb2 = async () => {
    const config = getDb2Config();
    if (!config.url || !config.key) {
      if (onShowToast) {
        onShowToast(
          'info',
          'Configure a URL e Chave do Banco de Dados 2 em "Configurações do Sistema > Gestão Global de Dados" para sincronizar.',
          'Configuração Necessária'
        );
      }
      return;
    }

    if (!patients.length) {
      if (onShowToast) {
        onShowToast('info', 'Não há pacientes cadastrados para sincronizar.', 'Sem Pacientes');
      }
      return;
    }

    setIsSyncingDb2(true);
    try {
      const res = await syncPatientsBatchToDb2(patients);
      if (onShowToast) {
        onShowToast(
          'success',
          `Sincronização com Banco 2 concluída: ${res.success} sincronizados/atualizados, ${res.skipped} ignorados (sem CPF/CNS), ${res.errors} erros.`,
          'Sincronização Finalizada'
        );
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast('error', `Falha ao sincronizar com o Banco 2: ${err?.message || String(err)}`, 'Erro');
      }
    } finally {
      setIsSyncingDb2(false);
    }
  };

  // Precompute patient timeline info for fast sorting and filtering
  const patientTimelineMap = useMemo(() => {
    const map = new Map<
      string,
      {
        consultations: Consultation[];
        latestConsultation: Consultation | null;
        latestAttendanceTimestamp: number;
        consultationsCount: number;
      }
    >();

    patients.forEach((patient) => {
      const patientConsultations = consultations
        .filter((c) => isConsultationForPatient(c, patient))
        .sort((a, b) => getConsultationTimestamp(b) - getConsultationTimestamp(a));

      const latest = patientConsultations[0] || null;
      // ONLY use real attendance timestamp (0 if patient has no attendances)
      const latestAttendanceTs = latest ? getConsultationTimestamp(latest) : 0;

      map.set(patient.id, {
        consultations: patientConsultations,
        latestConsultation: latest,
        latestAttendanceTimestamp: latestAttendanceTs,
        consultationsCount: patientConsultations.length,
      });
    });

    return map;
  }, [patients, consultations]);

  // Filter and sort patients:
  // Base strictly on the date of clinical attendance in the timeline:
  // Patients with attendances are sorted descending (most recent attendance at the very top).
  // Patients without any attendance appear at the bottom.
  const filteredAndSortedPatients = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    const cleanTermDigits = term.replace(/\D/g, '');

    // 1. Filter by search term and date range
    const filtered = patients.filter((p) => {
      if (term) {
        const matchName = (p.fullName || '').toLowerCase().includes(term);

        // Strip non-digit characters for numerical CPF and CNS filtering
        const rawCns = p.cns ? p.cns.replace(/\D/g, '') : '';
        const rawCpf = p.cpf ? p.cpf.replace(/\D/g, '') : '';

        const matchCns = Boolean(
          (p.cns && p.cns.toLowerCase().includes(term)) ||
          (cleanTermDigits.length > 0 && rawCns.includes(cleanTermDigits))
        );
        const matchCpf = Boolean(
          (p.cpf && p.cpf.toLowerCase().includes(term)) ||
          (cleanTermDigits.length > 0 && rawCpf.includes(cleanTermDigits))
        );

        const matchGuardian = Boolean(p.legalGuardianName && p.legalGuardianName.toLowerCase().includes(term));
        const matchUbs = Boolean(p.referenceUbs && p.referenceUbs.toLowerCase().includes(term));
        const matchAcs = Boolean(p.acsName && p.acsName.toLowerCase().includes(term));
        if (!matchName && !matchCns && !matchCpf && !matchGuardian && !matchUbs && !matchAcs) {
          return false;
        }
      }

      // Filter by attendance date on timeline
      if (dateFilterStart) {
        const startIso = dateFilterStart;
        const endIso = dateFilterEnd || dateFilterStart;
        const info = patientTimelineMap.get(p.id);
        const patConsultations = info?.consultations || [];

        // Only include patient if they have an attendance within this date or date range
        const hasConsultationInRange = patConsultations.some((c) => {
          const ts = getConsultationTimestamp(c);
          return isTimestampInDateRange(ts, startIso, endIso);
        });

        if (!hasConsultationInRange) {
          return false;
        }
      }

      return true;
    });

    // 2. Sort descending strictly by latest attendance timestamp on the timeline:
    // Patients with attendances ALWAYS come first, ordered from most recent attendance to oldest.
    // Patients with 0 attendances ALWAYS come after all attended patients.
    return filtered.sort((a, b) => {
      const infoA = patientTimelineMap.get(a.id);
      const infoB = patientTimelineMap.get(b.id);
      const tsA = infoA?.latestAttendanceTimestamp || 0;
      const tsB = infoB?.latestAttendanceTimestamp || 0;

      // Both have attendances on timeline: compare attendance dates descending
      if (tsA > 0 && tsB > 0) {
        if (tsB !== tsA) {
          return tsB - tsA; // Most recent attendance at the top
        }
      }

      // One has attendance, the other does not:
      if (tsA > 0 && tsB === 0) return -1; // A comes first (has attendance)
      if (tsB > 0 && tsA === 0) return 1;  // B comes first (has attendance)

      // Neither has attendance on timeline: sort alphabetically by full name
      return (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR');
    });
  }, [patients, searchTerm, dateFilterStart, dateFilterEnd, patientTimelineMap]);

  const hasActiveDateFilter = Boolean(dateFilterStart);

  return (
    <div className="space-y-6" id="patients-list-view">
      {/* 1. Top Banner & Action Controls */}
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
            id="sync-patients-db2-btn"
            onClick={handleSyncWithDb2}
            disabled={isSyncingDb2}
            size="sm"
            radius={12}
            className="px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0 border-indigo-200 dark:border-indigo-800"
            title="Sincronizar pacientes cadastrados com o Banco de Dados 2 (Produção/BPA)"
          >
            <Database className={`w-4 h-4 ${isSyncingDb2 ? 'animate-spin' : ''}`} />
            <span>{isSyncingDb2 ? 'Sincronizando...' : 'Sincronizar Banco 2'}</span>
          </SpecularButton>

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

      {/* 2. Search Bar & Date Filter Lado a Lado (CSS selector 3: div:nth-of-type(2) > input#patient-search-input:nth-of-type(1)) */}
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 sm:top-1/2 sm:-translate-y-1/2 pointer-events-none z-10" />
        <input
          type="text"
          id="patient-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por Nome do Paciente, Cartão SUS (CNS), CPF ou Responsável Legal..."
          className="flex-1 min-w-0 w-full pl-11 pr-14 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs"
        />

        {searchTerm && (
          <SpecularButton
            type="button"
            onClick={() => setSearchTerm('')}
            size="sm"
            radius={8}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-3 sm:right-[260px] top-3.5 sm:top-1/2 sm:-translate-y-1/2 px-2 py-1 border-transparent z-10"
          >
            Limpar
          </SpecularButton>
        )}

        {/* Date Filter side-by-side with interactive calendar range picker */}
        <TimelineDateRangePicker
          startDate={dateFilterStart}
          endDate={dateFilterEnd}
          onChange={(start, end) => {
            setDateFilterStart(start);
            setDateFilterEnd(end);
          }}
          onClear={() => {
            setDateFilterStart(null);
            setDateFilterEnd(null);
          }}
          totalFilteredCount={filteredAndSortedPatients.length}
        />
      </div>

      {/* 3. Patients List Grid / Container (CSS selector 2: div:nth-of-type(3)) */}
      {filteredAndSortedPatients.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhum paciente encontrado.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchTerm || hasActiveDateFilter
              ? 'Tente ajustar os termos de busca ou o período de atendimento selecionado.'
              : 'Comece cadastrando o primeiro paciente para iniciar o registro clínico.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {(searchTerm || hasActiveDateFilter) && (
              <SpecularButton
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDateFilterStart(null);
                  setDateFilterEnd(null);
                }}
                size="sm"
                radius={12}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border-transparent"
              >
                Limpar Filtros
              </SpecularButton>
            )}
            <SpecularButton
              type="button"
              onClick={onOpenNewPatientModal}
              size="sm"
              radius={12}
              className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-500 border-teal-500/40"
            >
              + Cadastrar Novo Paciente
            </SpecularButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredAndSortedPatients.map((patient, index) => {
            const age = calculateChronologicalAge(patient.birthDate);
            const info = patientTimelineMap.get(patient.id);
            const patientConsultations = info?.consultations || [];
            const latestConsultation = info?.latestConsultation || null;

            return (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
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
                      {/* Data de Admissão do Paciente (Cadastro no Sistema) */}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>
                          Admissão:{' '}
                          <strong className="text-slate-800 dark:text-slate-200 font-bold">
                            {formatAdmissionDate(patient)}
                          </strong>
                        </span>
                      </div>

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

                      {patient.referenceUbs && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                          <span>
                            UBS:{' '}
                            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                              {patient.referenceUbs}
                            </strong>
                            {patient.referenceUbsContact && (
                              <span className="text-slate-500 text-[11px] ml-1">
                                ({patient.referenceUbsContact})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {patient.acsName && (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            ACS:{' '}
                            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                              {patient.acsName}
                            </strong>
                            {patient.acsContact && (
                              <span className="text-slate-500 text-[11px] ml-1">
                                ({patient.acsContact})
                              </span>
                            )}
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
                          {new Date(getConsultationTimestamp(latestConsultation)).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}{' '}
                          às{' '}
                          {new Date(getConsultationTimestamp(latestConsultation)).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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

                    {/* CRM WhatsApp Humanizado */}
                    <SpecularButton
                      type="button"
                      id={`patient-btn-crm-${patient.id}`}
                      onClick={() => setSelectedChatPatient(patient)}
                      size="sm"
                      radius={12}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs border-emerald-500/40 font-bold"
                      title="Abrir CRM de Interação Humanizada"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>CRM</span>
                    </SpecularButton>

                    <SpecularButton
                      type="button"
                      id={`patient-btn-add-fila-${patient.id}`}
                      onClick={() => {
                        if (onAddToQueue) {
                          onAddToQueue(patient);
                        } else {
                          onNewConsultationForPatient(patient);
                        }
                      }}
                      size="sm"
                      radius={12}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs border-emerald-500/40 font-bold"
                      title="Adicionar Paciente à Fila de Atendimento"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Add Fila</span>
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

      {/* Modal de CRM WhatsApp para o Paciente */}
      {selectedChatPatient && (
        <WhatsAppChatModal
          isOpen={Boolean(selectedChatPatient)}
          onClose={() => setSelectedChatPatient(null)}
          patient={selectedChatPatient}
          currentUser={currentUser}
          systemSettings={systemSettings || DEFAULT_SYSTEM_SETTINGS}
          onShowToast={onShowToast || (() => {})}
          hideAutomaticReminder={true}
        />
      )}
    </div>
  );
};
