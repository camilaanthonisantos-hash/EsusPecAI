import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Calendar,
  Clock,
  UserCheck,
  Stethoscope,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  HeartHandshake,
  Baby,
  User,
  UserPlus,
} from 'lucide-react';
import {
  Patient,
  User as UserModel,
  ReceptionQueueItem,
  RiskClassification,
  QueuePriorityCategory,
} from '../types';
import { PROFESSIONS } from '../data/professions';
import { calculateChronologicalAge, formatQueueDateTime } from '../utils/dateCalculator';
import { SpecularButton } from './SpecularButton';
import { BrazilianDatePicker } from './BrazilianDatePicker';

interface AddToQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  patients?: Patient[];
  professionals: UserModel[];
  currentUserId?: string;
  onAddToQueue: (item: ReceptionQueueItem) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenNewPatient?: () => void;
  initialProfessionalId?: string;
  initialRisk?: RiskClassification;
  initialPriority?: QueuePriorityCategory;
  initialOrigin?: 'triagem' | 'agendamento' | 'pacientes' | 'conclusao_atendimento';
}

// Diacritic and accent normalization helper for accurate Portuguese search
function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const AddToQueueModal: React.FC<AddToQueueModalProps> = ({
  isOpen,
  onClose,
  patient,
  patients = [],
  professionals,
  currentUserId,
  onAddToQueue,
  onShowToast,
  onOpenNewPatient,
  initialProfessionalId,
  initialRisk,
  initialPriority,
  initialOrigin = 'pacientes',
}) => {
  // Currently active patient in the modal
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patient);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Filter eligible clinical professionals (exclude administrative-only profiles)
  const clinicalProfessionals = useMemo(() => {
    return professionals.filter((p) => p.profession !== 'administrativo');
  }, [professionals]);

  // Selected destination professional
  const [selectedProfId, setSelectedProfId] = useState<string>(() => {
    if (initialProfessionalId) return initialProfessionalId;
    return clinicalProfessionals[0]?.id || '';
  });

  // Scheduled date and time
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const nearestTimeStr = useMemo(() => {
    const d = new Date();
    const minutes = d.getMinutes();
    const roundedMinutes = minutes < 30 ? '30' : '00';
    const hours = minutes < 30 ? d.getHours() : (d.getHours() + 1) % 24;
    return `${String(hours).padStart(2, '0')}:${roundedMinutes}`;
  }, []);

  const [scheduledDate, setScheduledDate] = useState<string>(todayStr);
  const [scheduledTime, setScheduledTime] = useState<string>(nearestTimeStr);
  const [priorityCategory, setPriorityCategory] = useState<QueuePriorityCategory>(
    initialPriority || 'padrao'
  );
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedPatient(patient || null);
      setPatientSearchQuery('');
      if (initialProfessionalId) {
        setSelectedProfId(initialProfessionalId);
      } else if (currentUserId && clinicalProfessionals.some((p) => p.id === currentUserId)) {
        setSelectedProfId(currentUserId);
      } else if (clinicalProfessionals[0]?.id) {
        setSelectedProfId(clinicalProfessionals[0].id);
      }
      setScheduledDate(todayStr);
      setScheduledTime(nearestTimeStr);
      setPriorityCategory(initialPriority || 'padrao');
      setIsPregnant(false);
      setNotes('');
    }
  }, [isOpen, patient, initialProfessionalId, currentUserId, clinicalProfessionals, todayStr, nearestTimeStr, initialPriority]);

  // Filtered patients with smart scoring: direct name matches are top priority
  const filteredPatients = useMemo(() => {
    const rawQuery = patientSearchQuery.trim();
    const q = normalizeSearchText(rawQuery);
    if (q.length < 2) return [];

    const queryTokens = q.split(/\s+/).filter(Boolean);
    const digitsQuery = rawQuery.replace(/\D/g, '');

    const scored: Array<{
      patient: Patient;
      score: number;
      matchedBy: 'name' | 'cpf' | 'cns' | 'guardian' | 'mother';
    }> = [];

    for (const p of patients) {
      const normName = normalizeSearchText(p.fullName || '');
      const normCpf = p.cpf ? p.cpf.replace(/\D/g, '') : '';
      const normCns = p.cns ? p.cns.replace(/\D/g, '') : '';
      const normGuardian = normalizeSearchText(p.legalGuardianName || '');
      const normMother = normalizeSearchText(p.motherName || '');

      let score = 0;
      let matchedBy: 'name' | 'cpf' | 'cns' | 'guardian' | 'mother' = 'name';

      // 1. Patient full name starts with query (e.g. "Maria ...")
      if (normName.startsWith(q)) {
        score = 1000 + (100 - Math.min(100, normName.length));
        matchedBy = 'name';
      }
      // 2. Patient full name contains query substring
      else if (normName.includes(q)) {
        score = 800 + (100 - Math.min(100, normName.length));
        matchedBy = 'name';
      }
      // 3. All tokens present in patient full name
      else if (queryTokens.length > 1 && queryTokens.every((t) => normName.includes(t))) {
        score = 700;
        matchedBy = 'name';
      }
      // 4. Any token starts in words of patient name
      else if (
        queryTokens.length > 0 &&
        queryTokens.some((t) => normName.split(/\s+/).some((w) => w.startsWith(t)))
      ) {
        score = 500;
        matchedBy = 'name';
      }
      // 5. CPF / CNS match
      else if (digitsQuery.length >= 3 && (normCpf.includes(digitsQuery) || normCns.includes(digitsQuery))) {
        score = 400;
        matchedBy = normCpf.includes(digitsQuery) ? 'cpf' : 'cns';
      }
      // 6. Mother or Guardian name match (lower score so direct patient name matches always show first)
      else if (normMother.includes(q) || normGuardian.includes(q)) {
        score = 100;
        matchedBy = normMother.includes(q) ? 'mother' : 'guardian';
      }

      if (score > 0) {
        scored.push({ patient: p, score, matchedBy });
      }
    }

    // Sort descending by score, then alphabetically
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.patient.fullName || '').localeCompare(b.patient.fullName || '', 'pt-BR');
    });

    return scored;
  }, [patients, patientSearchQuery]);

  if (!isOpen) return null;

  const activePatient = selectedPatient;
  const patientAge = activePatient?.birthDate ? calculateChronologicalAge(activePatient.birthDate) : null;
  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const profConfig = selectedProf ? PROFESSIONS[selectedProf.profession] : null;

  const formattedDateTime = formatQueueDateTime(scheduledDate, scheduledTime);

  // Quick time slot pills
  const quickSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  const handleConfirm = () => {
    if (!activePatient) {
      onShowToast('error', 'Selecione um paciente para adicionar à fila.', 'Paciente Obrigatório');
      return;
    }
    if (!selectedProf) {
      onShowToast('error', 'Selecione um profissional para direcionar o atendimento.', 'Profissional Obrigatório');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      onShowToast('error', 'Selecione a data e o horário para o atendimento.', 'Horário Obrigatório');
      return;
    }

    // Compute accurate ordering timestamp
    const [year, month, day] = scheduledDate.split('-').map(Number);
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const itemTimestamp = new Date(year, month - 1, day, hours, minutes, 0).getTime();

    const queueItem: ReceptionQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      patientId: activePatient.id,
      patientName: activePatient.fullName,
      patientCpf: activePatient.cpf,
      patientCns: activePatient.cns,
      patientBirthDate: activePatient.birthDate,
      patientGender: activePatient.gender,
      patientPhone: activePatient.phone,

      professionalId: selectedProf.id,
      professionalName: selectedProf.name,
      professionalProfession: selectedProf.profession,

      scheduledDate,
      scheduledTime,
      timestamp: itemTimestamp,
      formattedDateTime,

      status: 'waiting',
      riskClassification: initialRisk,
      priorityCategory: isPregnant ? 'gestante' : priorityCategory,
      isPregnant,
      origin: (initialOrigin || 'pacientes') as 'triagem' | 'agendamento' | 'pacientes' | 'conclusao_atendimento',
      notes: notes.trim() || undefined,
      createdBy: currentUserId,

      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onAddToQueue(queueItem);
    onShowToast(
      'success',
      `${activePatient.fullName} adicionado(a) à fila de ${selectedProf.name} para ${formattedDateTime}!`,
      'Paciente Adicionado à Fila'
    );
    onClose();
  };

  return (
    <div
      id="add-to-queue-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Adicionar Paciente à Fila de Atendimento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direcione o paciente ao profissional com data e horário programado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Patient Selection / Summary */}
          {activePatient ? (
            <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {activePatient.fullName}
                  </span>
                  {patientAge?.isMinor && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                      <Baby className="w-3 h-3" />
                      <span>Menor</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {patientAge && (
                    <span>
                      Idade: <strong className="text-slate-900 dark:text-slate-100">{patientAge.shortFormatted}</strong>
                    </span>
                  )}
                  {activePatient.cns && (
                    <span>
                      CNS: <strong className="font-mono text-slate-900 dark:text-slate-100">{activePatient.cns}</strong>
                    </span>
                  )}
                  {activePatient.cpf && (
                    <span>
                      CPF: <strong className="font-mono text-slate-900 dark:text-slate-100">{activePatient.cpf}</strong>
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 hover:underline shrink-0 cursor-pointer"
              >
                Trocar Paciente
              </button>
            </div>
          ) : (
            /* Search and Pick Patient */
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Selecione o Paciente *</span>
                </label>
                {onOpenNewPatient && (
                  <button
                    type="button"
                    onClick={onOpenNewPatient}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Novo Paciente</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  placeholder="Digite ao menos 2 caracteres (nome, CPF ou CNS)..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                  autoFocus
                />
                {patientSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPatientSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {patientSearchQuery.trim().length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-1">
                  <Search className="w-5 h-5 text-slate-400/80 dark:text-slate-500/80 mb-0.5" />
                  <span>Digite ao menos 2 caracteres para pesquisar o paciente</span>
                </div>
              ) : patientSearchQuery.trim().length === 1 ? (
                <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-1">
                  <Search className="w-5 h-5 text-teal-500/80 mb-0.5 animate-pulse" />
                  <span>Digite mais 1 caractere para iniciar a busca...</span>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p>Nenhum paciente encontrado com "{patientSearchQuery}".</p>
                  {onOpenNewPatient && (
                    <button
                      type="button"
                      onClick={onOpenNewPatient}
                      className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Cadastrar novo paciente com este nome
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-medium">
                    <span>{filteredPatients.length} paciente(s) encontrado(s)</span>
                    <span className="text-teal-600 dark:text-teal-400 font-semibold">Clique para selecionar</span>
                  </div>

                  <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPatients.map(({ patient: p, matchedBy }) => {
                      const pAge = p.birthDate ? calculateChronologicalAge(p.birthDate) : null;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-teal-50 dark:hover:bg-slate-800/80 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                        >
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                              {p.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                              {pAge && <span>{pAge.shortFormatted}</span>}
                              {p.cpf && <span>• CPF: {p.cpf}</span>}
                              {p.cns && <span>• CNS: {p.cns}</span>}
                              {(matchedBy === 'mother' || matchedBy === 'guardian') && (p.legalGuardianName || p.motherName) && (
                                <span className="text-teal-600 dark:text-teal-400 font-semibold">
                                  • Mãe/Resp: {p.legalGuardianName || p.motherName}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            Selecionar →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1. Target Professional Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Profissional que irá Atender *</span>
            </label>
            <select
              id="queue-select-professional"
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs cursor-pointer"
            >
              {clinicalProfessionals.map((prof) => {
                const pConfig = PROFESSIONS[prof.profession];
                return (
                  <option key={prof.id} value={prof.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {prof.name} — {pConfig?.name || prof.profession} ({prof.workplace})
                  </option>
                );
              })}
            </select>
            {selectedProf && profConfig && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direcionado para <strong className="text-slate-900 dark:text-slate-200">{selectedProf.name}</strong> ({profConfig.name} • {selectedProf.professionalRegister || profConfig.council})
              </p>
            )}
          </div>

          {/* 2. Date & Time Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Data do Atendimento *</span>
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium normal-case">
                  (Digitação DD/MM/AAAA ou Calendário)
                </span>
              </label>
              <BrazilianDatePicker
                id="queue-input-date"
                value={scheduledDate}
                onChange={(newDate) => setScheduledDate(newDate)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Horário Previsto *</span>
              </label>
              <input
                type="time"
                id="queue-input-time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Quick Slots */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Horários Rápidos:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setScheduledTime(slot)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    scheduledTime === slot
                      ? 'bg-teal-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Priority & Condition */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Prioridade / Situação Clínica
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                priorityCategory === 'padrao'
                  ? 'border-teal-500 dark:border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="priority"
                  checked={priorityCategory === 'padrao'}
                  onChange={() => setPriorityCategory('padrao')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>Padrão / Eletivo</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                priorityCategory === 'idoso_60'
                  ? 'border-teal-500 dark:border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="priority"
                  checked={priorityCategory === 'idoso_60'}
                  onChange={() => setPriorityCategory('idoso_60')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>Prioritário (60+)</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                priorityCategory === 'idoso_80'
                  ? 'border-teal-500 dark:border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="priority"
                  checked={priorityCategory === 'idoso_80'}
                  onChange={() => setPriorityCategory('idoso_80')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>Superprioridade (80+)</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                priorityCategory === 'puericultura'
                  ? 'border-teal-500 dark:border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="priority"
                  checked={priorityCategory === 'puericultura'}
                  onChange={() => setPriorityCategory('puericultura')}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>Puericultura / Criança</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                isPregnant
                  ? 'border-teal-500 dark:border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
                <input
                  type="checkbox"
                  checked={isPregnant}
                  onChange={(e) => setIsPregnant(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Gestante</span>
              </label>
            </div>
          </div>

          {/* 4. Notes / Reason (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Observações / Motivo do Encaminhamento (Opcional)
            </label>
            <input
              type="text"
              id="queue-input-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Queixa principal, retorno de exames, acompanhamento continuado..."
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <SpecularButton
            type="button"
            id="confirm-add-to-queue-btn"
            onClick={handleConfirm}
            size="sm"
            radius={12}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md shadow-teal-600/20 border-teal-500/40 cursor-pointer font-bold"
          >
            <UserCheck className="w-4 h-4" />
            <span>Confirmar e Adicionar à Fila</span>
          </SpecularButton>
        </div>
      </motion.div>
    </div>
  );
};
