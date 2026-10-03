import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Scale,
  Ruler,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ShieldCheck,
  UserCheck,
  Copy,
  FileText,
  RotateCcw,
  Calendar,
  Clock,
  Flame,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  Patient,
  ProfessionConfig,
  User,
  GeneratedPECRecord,
  TriageVitalsData,
  ReceptionQueueItem,
  RiskClassification,
  QueuePriorityCategory,
} from '../types';
import { PROFESSIONS } from '../data/professions';
import { formatQueueDateTime } from '../utils/dateCalculator';
import { BrazilianDatePicker } from './BrazilianDatePicker';

interface TriageFormProps {
  profession: ProfessionConfig;
  patient: Patient;
  currentUser: User;
  professionals?: User[];
  onFinishTriage: (record: GeneratedPECRecord) => void;
  onAddToQueueItem?: (item: ReceptionQueueItem) => void;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
}

export const TriageForm: React.FC<TriageFormProps> = ({
  profession,
  patient,
  currentUser,
  professionals = [],
  onFinishTriage,
  onAddToQueueItem,
  onShowToast,
}) => {
  // Clinical Diagnoses Toggles (Green = Sem, Red = Com)
  const [hasDpoc, setHasDpoc] = useState<boolean>(false);
  const [isHypertensive, setIsHypertensive] = useState<boolean>(false);

  // Vital Signs Inputs
  const [paSystolic, setPaSystolic] = useState<string>('');
  const [paDiastolic, setPaDiastolic] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [sao2, setSao2] = useState<string>('');
  const [bloodGlucose, setBloodGlucose] = useState<string>('');
  const [glucoseCondition, setGlucoseCondition] = useState<'jejum' | 'casual' | 'pos_prandial'>('casual');
  const [heartRate, setHeartRate] = useState<string>('');
  const [respiratoryRate, setRespiratoryRate] = useState<string>('');

  // Anthropometry
  const [weightKg, setWeightKg] = useState<string>(''); // in kg, accepts numbers, comma and dot (e.g. 70.5 or 80)
  const [heightCm, setHeightCm] = useState<string>('');
  const [observations, setObservations] = useState<string>('');

  // Queue Destination & Risk Classification for Técnico / Auxiliar
  const [riskClassification, setRiskClassification] = useState<RiskClassification>('verde');
  const [isPregnant, setIsPregnant] = useState<boolean>(false);
  const [priorityCategory, setPriorityCategory] = useState<QueuePriorityCategory>('padrao');

  // Filter clinical professionals (exclude administrative and nursing aux/tech themselves)
  const clinicalProfessionals = useMemo(() => {
    return professionals.filter(
      (p) =>
        p.profession !== 'administrativo' &&
        p.profession !== 'auxiliar_enfermagem' &&
        p.profession !== 'tecnico_enfermagem'
    );
  }, [professionals]);

  const [targetProfessionalId, setTargetProfessionalId] = useState<string>(() => {
    return clinicalProfessionals[0]?.id || professionals[0]?.id || '';
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nearestTimeStr = useMemo(() => {
    const d = new Date();
    const minutes = d.getMinutes();
    const roundedMinutes = minutes < 30 ? '30' : '00';
    const hours = minutes < 30 ? d.getHours() : (d.getHours() + 1) % 24;
    return `${String(hours).padStart(2, '0')}:${roundedMinutes}`;
  }, []);

  const [scheduledDate, setScheduledDate] = useState<string>(todayStr);
  const [scheduledTime, setScheduledTime] = useState<string>(nearestTimeStr);

  // -------------------------------------------------------------
  // PURE DETERMINISTIC CLINICAL LOGIC (NO AI)
  // -------------------------------------------------------------

  // 1. Blood Pressure Classification
  const paClassification = useMemo(() => {
    const sys = parseInt(paSystolic, 10);
    const dia = parseInt(paDiastolic, 10);
    if (isNaN(sys) || isNaN(dia)) return null;

    if (sys < 90 || dia < 60) {
      return { label: 'Hipotensão Arterial', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }

    if (isHypertensive) {
      if (sys < 140 && dia < 90) {
        return { label: 'PA Controlada (Paciente Hipertenso)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
      }
      if (sys >= 180 || dia >= 110) {
        return { label: 'PA Não Controlada - Estágio 3 (Risco Iminente)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
      }
      if (sys >= 160 || dia >= 100) {
        return { label: 'PA Não Controlada - Estágio 2', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
      }
      return { label: 'PA Não Controlada - Estágio 1', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }

    // Non-hypertensive standard scale
    if (sys < 120 && dia < 80) {
      return { label: 'PA Ótima', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
    }
    if (sys <= 129 && dia <= 84) {
      return { label: 'PA Normal', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
    }
    if (sys <= 139 || dia <= 89) {
      return { label: 'Pré-Hipertensão', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }
    if (sys >= 180 || dia >= 110) {
      return { label: 'Hipertensão Estágio 3 (Risco de Crise)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
    }
    if (sys >= 160 || dia >= 100) {
      return { label: 'Hipertensão Estágio 2', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
    }
    return { label: 'Hipertensão Estágio 1', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
  }, [paSystolic, paDiastolic, isHypertensive]);

  // 2. Temperature Classification
  const tempClassification = useMemo(() => {
    if (!temperature.trim()) return null;
    const num = parseFloat(temperature.replace(',', '.'));
    if (isNaN(num)) return null;

    if (num < 35.0) {
      return { label: 'Hipotermia (< 35,0 °C)', color: 'text-cyan-600 dark:text-cyan-400', badge: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300' };
    }
    if (num <= 37.2) {
      return { label: 'Afebril (Normotermia)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
    }
    if (num <= 37.7) {
      return { label: 'Estado Subfebril / Febrícula', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }
    if (num < 39.5) {
      return { label: 'Febre / Estado Febril', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
    }
    return { label: 'Hiperpirexia (Febre Alta ≥ 39,5 °C)', color: 'text-rose-700 dark:text-rose-300 font-bold', badge: 'bg-rose-200 dark:bg-rose-900 text-rose-950 dark:text-rose-100 border-rose-400' };
  }, [temperature]);

  // 3. SAO2 Classification
  const sao2Classification = useMemo(() => {
    const num = parseInt(sao2, 10);
    if (isNaN(num)) return null;

    if (hasDpoc) {
      if (num >= 88 && num <= 92) {
        return { label: 'Normoxemia Alvo (DPOC: 88-92%)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
      }
      if (num > 92) {
        return { label: 'Adequado na DPOC (> 92%)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
      }
      return { label: 'Hipoxemia Grave em Paciente com DPOC (< 88%)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
    }

    // Non-DPOC
    if (num >= 95) {
      return { label: 'Normoxemia', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
    }
    if (num >= 90) {
      return { label: 'Hipoxemia Leve / Moderada (90-94%)', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }
    return { label: 'Hipoxemia Grave (< 90%)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
  }, [sao2, hasDpoc]);

  // 4. Blood Glucose Classification
  const glucoseClassification = useMemo(() => {
    const num = parseInt(bloodGlucose, 10);
    if (isNaN(num)) return null;

    if (num < 70) {
      return { label: 'Hipoglicemia (< 70 mg/dL)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
    }

    if (glucoseCondition === 'jejum') {
      if (num <= 99) {
        return { label: 'Normoglicemia (Jejum)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
      }
      if (num <= 125) {
        return { label: 'Glicemia de Jejum Alterada (100-125 mg/dL)', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
      }
      return { label: 'Hiperglicemia de Jejum (≥ 126 mg/dL)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
    }

    // Casual or Pós-prandial
    if (num <= 139) {
      return { label: 'Normoglicemia', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
    }
    if (num <= 199) {
      return { label: 'Tolerância à Glicose Diminuída (140-199 mg/dL)', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }
    return { label: 'Hiperglicemia Acentuada (≥ 200 mg/dL)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
  }, [bloodGlucose, glucoseCondition]);

  // 5. Heart Rate Classification
  const hrClassification = useMemo(() => {
    const num = parseInt(heartRate, 10);
    if (isNaN(num)) return null;

    if (num < 60) {
      return { label: 'Bradicardia (< 60 bpm)', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }
    if (num <= 100) {
      return { label: 'Normocárdico (60-100 bpm)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
    }
    return { label: 'Taquicardia (> 100 bpm)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
  }, [heartRate]);

  // 6. Respiratory Rate Classification
  const rrClassification = useMemo(() => {
    const num = parseInt(respiratoryRate, 10);
    if (isNaN(num)) return null;

    if (num < 12) {
      return { label: 'Bradipneico (< 12 rpm)', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300' };
    }
    if (num <= 20) {
      return { label: 'Eupneico (12-20 rpm)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' };
    }
    return { label: 'Taquipneico (> 20 rpm)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300' };
  }, [respiratoryRate]);

  // 7. BMI & Anthropometry Calculation (Weight in Kg)
  const imcResult = useMemo(() => {
    if (!weightKg.trim() || !heightCm.trim()) return null;
    const wKg = parseFloat(weightKg.replace(',', '.'));
    const hCm = parseFloat(heightCm);
    if (isNaN(wKg) || isNaN(hCm) || wKg <= 0 || hCm <= 0) {
      return null;
    }

    const heightM = hCm / 100;
    const imc = wKg / (heightM * heightM);
    const imcFormatted = imc.toFixed(2);

    let classification = '';
    let badgeClass = '';
    let textClass = '';

    if (imc < 16.0) {
      classification = 'Magreza acentuada';
      badgeClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300';
      textClass = 'text-rose-600 dark:text-rose-400';
    } else if (imc < 17.0) {
      classification = 'Magreza moderada';
      badgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300';
      textClass = 'text-amber-600 dark:text-amber-400';
    } else if (imc < 18.5) {
      classification = 'Magreza';
      badgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300';
      textClass = 'text-amber-600 dark:text-amber-400';
    } else if (imc < 25.0) {
      classification = 'Eutrófico';
      badgeClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300';
      textClass = 'text-emerald-600 dark:text-emerald-400';
    } else if (imc < 30.0) {
      classification = 'Sobrepeso';
      badgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300';
      textClass = 'text-amber-600 dark:text-amber-400';
    } else if (imc < 35.0) {
      classification = 'Obesidade Grau I';
      badgeClass = 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300';
      textClass = 'text-orange-600 dark:text-orange-400';
    } else if (imc < 40.0) {
      classification = 'Obesidade Grau II';
      badgeClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300';
      textClass = 'text-rose-600 dark:text-rose-400';
    } else {
      classification = 'Obesidade Grau III';
      badgeClass = 'bg-rose-200 dark:bg-rose-900 text-rose-950 dark:text-rose-100 border-rose-400 font-bold';
      textClass = 'text-rose-700 dark:text-rose-300';
    }

    return {
      imc: imcFormatted,
      classification,
      weightKg: wKg.toFixed(2),
      heightM: heightM.toFixed(2),
      badgeClass,
      textClass,
    };
  }, [weightKg, heightCm]);

  // Handle Input Sanitizers
  const handleDigitsOnly = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/\D/g, '');
    setter(clean);
  };

  const handleTempInput = (val: string) => {
    // Only allows digits, dots, and commas
    const clean = val.replace(/[^0-9.,]/g, '');
    setTemperature(clean);
  };

  const handleWeightInput = (val: string) => {
    // Only allows digits, dots, and commas (e.g. 70.5 or 80)
    const clean = val.replace(/[^0-9.,]/g, '');
    setWeightKg(clean);
  };

  const handleClearForm = () => {
    setPaSystolic('');
    setPaDiastolic('');
    setTemperature('');
    setSao2('');
    setBloodGlucose('');
    setHeartRate('');
    setRespiratoryRate('');
    setWeightKg('');
    setHeightCm('');
    setObservations('');
    setHasDpoc(false);
    setIsHypertensive(false);
    onShowToast('info', 'Campos de triagem reiniciados.');
  };

  // Finalize Triage handler
  const handleFinalize = () => {
    // Validation check: at least some parameters should be filled
    const hasAnyVitals =
      paSystolic ||
      temperature ||
      sao2 ||
      bloodGlucose ||
      heartRate ||
      respiratoryRate ||
      weightKg ||
      heightCm;

    if (!hasAnyVitals) {
      onShowToast('error', 'Preencha ao menos um dos sinais vitais ou dados antropométricos para registrar a triagem.', 'Dados Insuficientes');
      return;
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Format single unified "Triagem" block ready for copy
    let triageText = `[TRIAGEM E SINAIS VITAIS - TRIAGEM]\n`;
    triageText += `PROFISSIONAL: ${currentUser.name.toUpperCase()} (${profession.name.toUpperCase()} • ${currentUser.councilRegister || profession.council})\n`;
    triageText += `DATA/HORA: ${dateFormatted} às ${timeFormatted}\n`;
    triageText += `PACIENTE: ${patient.fullName.toUpperCase()} (CNS: ${patient.cns || 'Não informado'})\n\n`;

    triageText += `--- CONDIÇÕES CLÍNICAS PRÉVIAS ---\n`;
    triageText += `• Diagnóstico de DPOC: ${hasDpoc ? 'SIM (Paciente com diagnóstico de DPOC)' : 'NÃO (Sem diagnóstico de DPOC)'}\n`;
    triageText += `• Diagnóstico de Hipertensão (HAS): ${isHypertensive ? 'SIM (Diagnóstico de HAS Confirmado)' : 'NÃO (Sem histórico de HAS)'}\n\n`;

    triageText += `--- SINAIS VITAIS E PARÂMETROS CLÍNICOS ---\n`;
    if (paSystolic && paDiastolic) {
      triageText += `• Pressão Arterial (PA): ${paSystolic}/${paDiastolic} mmHg (${paClassification?.label || 'Aferida'})\n`;
    }
    if (temperature) {
      triageText += `• Temperatura Axilar: ${temperature} °C (${tempClassification?.label || 'Aferida'})\n`;
    }
    if (sao2) {
      triageText += `• Saturação de Oxigênio (SaO2): ${sao2}% (${sao2Classification?.label || 'Aferida'})\n`;
    }
    if (bloodGlucose) {
      const condLabel = glucoseCondition === 'jejum' ? 'Jejum' : glucoseCondition === 'pos_prandial' ? 'Pós-prandial' : 'Casual';
      triageText += `• Glicemia Capilar: ${bloodGlucose} mg/dL (Momento: ${condLabel} • ${glucoseClassification?.label || 'Aferida'})\n`;
    }
    if (heartRate) {
      triageText += `• Frequência Cardíaca (FC): ${heartRate} bpm (${hrClassification?.label || 'Aferida'})\n`;
    }
    if (respiratoryRate) {
      triageText += `• Frequência Respiratória (FR): ${respiratoryRate} rpm (${rrClassification?.label || 'Aferida'})\n`;
    }

    triageText += `\n--- ANTROPOMETRIA E ÍNDICE DE MASSA CORPORAL (IMC) ---\n`;
    if (weightKg) {
      const wKgFormatted = weightKg.replace('.', ',');
      triageText += `• Peso: ${wKgFormatted} kg\n`;
    }
    if (heightCm) {
      const m = (parseFloat(heightCm) / 100).toFixed(2);
      triageText += `• Altura: ${heightCm} cm (${m} m)\n`;
    }
    if (imcResult) {
      triageText += `• IMC: ${imcResult.imc} kg/m² - Classificação: ${imcResult.classification}\n`;
    }

    if (observations.trim()) {
      triageText += `\n--- OBSERVAÇÕES DO ACOLHIMENTO ---\n${observations.trim()}\n`;
    }

    const targetProf = professionals.find((p) => p.id === targetProfessionalId) || clinicalProfessionals[0];
    const targetProfConfig = targetProf ? PROFESSIONS[targetProf.profession] : null;

    const riskLabelMap: Record<RiskClassification, string> = {
      vermelho: 'Vermelho (Emergência - Imediato)',
      laranja: 'Laranja (Muito Urgente - até 10 min)',
      amarelo: 'Amarelo (Urgente - até 50-60 min)',
      verde: 'Verde (Pouco Urgente - até 120 min)',
      azul: 'Azul (Não Urgente - até 240 min)',
    };

    const priorityLabelMap: Record<QueuePriorityCategory, string> = {
      padrao: 'Padrão',
      gestante: 'Gestante',
      idoso_60: 'Idoso 60+',
      idoso_80: 'Idoso 80+ (Superprioridade)',
      puericultura: 'Puericultura / Criança',
      pcd: 'Pessoa com Deficiência (PcD)',
    };

    const effectivePriority = isPregnant ? 'gestante' : priorityCategory;

    // Required user conduct format:
    // "Paciente encaminhado para Atendimento e Avaliação do(a) [Nome do Profissional] às [Hora]."
    const conductStr = targetProf
      ? `Sinais vitais e parâmetros antropométricos registrados. Classificação de Risco: ${riskLabelMap[riskClassification]}. Paciente encaminhado para Atendimento e Avaliação do(a) ${targetProf.name} às ${scheduledTime}.`
      : `Sinais vitais e parâmetros antropométricos registrados. Classificação de Risco: ${riskLabelMap[riskClassification]}. Paciente encaminhado para atendimento na unidade de saúde.`;

    triageText += `\n--- CLASSIFICAÇÃO DE RISCO (MANCHESTER) & ENCAMINHAMENTO ---\n`;
    triageText += `• Classificação de Risco: ${riskLabelMap[riskClassification]}\n`;
    triageText += `• Prioridade na Fila: ${priorityLabelMap[effectivePriority]}\n`;
    if (isPregnant) {
      triageText += `• Condição Especial: Gestante Confirmada\n`;
    }
    if (targetProf) {
      triageText += `• Profissional Destino: ${targetProf.name} (${targetProfConfig?.name || targetProf.profession})\n`;
      triageText += `• Horário Agendado na Fila: ${scheduledDate} às ${scheduledTime}\n`;
    }

    triageText += `\n--- CONDUTA DA TRIAGEM ---\n${conductStr}`;

    const vitalsData: TriageVitalsData = {
      paSystolic: paSystolic || undefined,
      paDiastolic: paDiastolic || undefined,
      paFormatted: paSystolic && paDiastolic ? `${paSystolic}/${paDiastolic} mmHg` : undefined,
      paClassification: paClassification?.label,
      isHypertensivePatient: isHypertensive,
      temperature: temperature || undefined,
      temperatureClassification: tempClassification?.label,
      sao2: sao2 || undefined,
      sao2Classification: sao2Classification?.label,
      hasDpoc: hasDpoc,
      bloodGlucose: bloodGlucose || undefined,
      bloodGlucoseCondition: glucoseCondition,
      bloodGlucoseClassification: glucoseClassification?.label,
      heartRate: heartRate || undefined,
      heartRateClassification: hrClassification?.label,
      respiratoryRate: respiratoryRate || undefined,
      respiratoryRateClassification: rrClassification?.label,
      weightKg: weightKg || undefined,
      weightGrams: weightKg ? String(Math.round(parseFloat(weightKg.replace(',', '.')) * 1000)) : undefined,
      heightCm: heightCm || undefined,
      imc: imcResult?.imc,
      imcClassification: imcResult?.classification,
      observations: observations || undefined,
    };

    const record: GeneratedPECRecord = {
      id: `triage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      professionId: profession.id,
      modelUsed: 'triagem-direta-sem-ia',
      patientId: patient.id,
      patientName: patient.fullName,
      avaliacao: triageText,
      plano: '',
      conduta: conductStr,
      fullText: triageText,
      rawInputSummary: `Triagem realizada por ${currentUser.name} (${profession.name})`,
      isTriage: true,
      triageData: vitalsData,
      qualitativeChecks: {
        hasQualitativeVitals: true,
        hasFixedCiapSigtap: false,
      },
    };

    // If queue dispatch callback is provided and targetProf is selected, add to reception queue
    if (targetProf && onAddToQueueItem) {
      const parsedTime = new Date(`${scheduledDate}T${scheduledTime}:00`).getTime();
      const itemTimestamp = isNaN(parsedTime) ? Date.now() : parsedTime;

      const queueItem: ReceptionQueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientCpf: patient.cpf,
        patientCns: patient.cns,
        patientBirthDate: patient.birthDate,
        patientGender: patient.gender,
        patientPhone: patient.phone,
        professionalId: targetProf.id,
        professionalName: targetProf.name,
        professionalProfession: targetProf.profession,
        scheduledDate,
        scheduledTime,
        timestamp: itemTimestamp,
        formattedDateTime: formatQueueDateTime(scheduledDate, scheduledTime),
        status: 'waiting',
        riskClassification,
        priorityCategory: effectivePriority,
        isPregnant,
        origin: 'triagem',
        triageSummary: `PA: ${paSystolic || '-'}/${paDiastolic || '-'} | Temp: ${temperature || '-'}°C | SaO2: ${sao2 || '-'}%`,
        notes: observations.trim() || undefined,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onAddToQueueItem(queueItem);
    }

    onFinishTriage(record);
    onShowToast('success', 'Triagem finalizada e paciente adicionado à fila de atendimento com sucesso!', 'Triagem e Fila Concluídas');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Triagem e Sinais Vitais</span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {profession.name}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registro direto de sinais vitais, cálculo automático de IMC e formatação de campo único para o PEC.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearForm}
          className="self-start sm:self-auto text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpar Campos</span>
        </button>
      </div>

      {/* 1. CLNICAL CONDITION BUTTONS (DPOC & HIPERTENSÃO) */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Condições Clínicas Diagnosticadas do Paciente
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* DPOC Toggle Button */}
          <button
            type="button"
            onClick={() => setHasDpoc(!hasDpoc)}
            className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs ${
              hasDpoc
                ? 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
                : 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Wind className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wide">
                  {hasDpoc ? 'Com Diagnóstico de DPOC' : 'Sem Diagnóstico de DPOC'}
                </div>
                <div className="text-[11px] text-white/90 font-medium mt-0.5">
                  {hasDpoc
                    ? 'Faixa alvo SaO2 ajustada para 88% a 92%'
                    : 'Faixa alvo SaO2 padrão (≥ 95% = Normoxemia)'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/25 uppercase tracking-wider">
              {hasDpoc ? 'DPOC Confirmado' : 'Sem DPOC'}
            </span>
          </button>

          {/* Hipertensão (HAS) Toggle Button */}
          <button
            type="button"
            onClick={() => setIsHypertensive(!isHypertensive)}
            className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs ${
              isHypertensive
                ? 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
                : 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wide">
                  {isHypertensive ? 'Com Diagnóstico de Hipertensão (HAS)' : 'Sem Diagnóstico de Hipertensão'}
                </div>
                <div className="text-[11px] text-white/90 font-medium mt-0.5">
                  {isHypertensive
                    ? 'Classificação ajustada para metas em paciente hipertenso'
                    : 'Classificação padrão conforme Diretrizes de Hipertensão'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/25 uppercase tracking-wider">
              {isHypertensive ? 'HAS Confirmada' : 'Sem HAS'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. SINAIS VITAIS GRID */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Aferição de Sinais Vitais (Números, Pontos e Vírgulas nos Casos de Temperatura)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Pressão Arterial (PA) */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>PA (mmHg)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Sist / Diast</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={paSystolic}
                onChange={(e) => handleDigitsOnly(e.target.value, setPaSystolic)}
                placeholder="120"
                maxLength={3}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <span className="text-slate-400 font-bold">/</span>
              <input
                type="text"
                inputMode="numeric"
                value={paDiastolic}
                onChange={(e) => handleDigitsOnly(e.target.value, setPaDiastolic)}
                placeholder="80"
                maxLength={3}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {paClassification && (
              <div className={`text-[11px] font-bold px-2 py-1 rounded-lg border text-center ${paClassification.badge}`}>
                {paClassification.label}
              </div>
            )}
          </div>

          {/* Temperatura Axilar */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-500" />
                <span>Temperatura Axilar (°C)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Números, . ou ,</span>
            </div>

            <input
              type="text"
              value={temperature}
              onChange={(e) => handleTempInput(e.target.value)}
              placeholder="36.5 ou 36,5"
              maxLength={5}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />

            {tempClassification && (
              <div className={`text-[11px] font-bold px-2 py-1 rounded-lg border text-center ${tempClassification.badge}`}>
                {tempClassification.label}
              </div>
            )}
          </div>

          {/* Saturação de Oxigênio (SaO2) */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-sky-500" />
                <span>SaO2 / SpO2 (%)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Porcentagem</span>
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={sao2}
              onChange={(e) => handleDigitsOnly(e.target.value, setSao2)}
              placeholder="98"
              maxLength={3}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />

            {sao2Classification && (
              <div className={`text-[11px] font-bold px-2 py-1 rounded-lg border text-center ${sao2Classification.badge}`}>
                {sao2Classification.label}
              </div>
            )}
          </div>

          {/* Glicemia Capilar */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-indigo-500" />
                <span>Glicemia Capilar (mg/dL)</span>
              </label>
              <select
                value={glucoseCondition}
                onChange={(e) => setGlucoseCondition(e.target.value as any)}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="casual">Casual</option>
                <option value="jejum">Jejum</option>
                <option value="pos_prandial">Pós-prandial</option>
              </select>
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={bloodGlucose}
              onChange={(e) => handleDigitsOnly(e.target.value, setBloodGlucose)}
              placeholder="95"
              maxLength={3}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />

            {glucoseClassification && (
              <div className={`text-[11px] font-bold px-2 py-1 rounded-lg border text-center ${glucoseClassification.badge}`}>
                {glucoseClassification.label}
              </div>
            )}
          </div>

          {/* Frequência Cardíaca (FC) */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>FC (BPM)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Batimentos/min</span>
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={heartRate}
              onChange={(e) => handleDigitsOnly(e.target.value, setHeartRate)}
              placeholder="75"
              maxLength={3}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />

            {hrClassification && (
              <div className={`text-[11px] font-bold px-2 py-1 rounded-lg border text-center ${hrClassification.badge}`}>
                {hrClassification.label}
              </div>
            )}
          </div>

          {/* Frequência Respiratória (FR) */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-teal-500" />
                <span>FR (RPM)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Respirações/min</span>
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={respiratoryRate}
              onChange={(e) => handleDigitsOnly(e.target.value, setRespiratoryRate)}
              placeholder="16"
              maxLength={2}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-center text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />

            {rrClassification && (
              <div className={`text-[11px] font-bold px-2 py-1 rounded-lg border text-center ${rrClassification.badge}`}>
                {rrClassification.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. ANTROPOMETRIA & CÁLCULO DE IMC */}
      <div className="p-4 sm:p-5 rounded-2xl border border-teal-200 dark:border-teal-800/40 bg-teal-50/30 dark:bg-teal-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-teal-600" />
            <span>Antropometria e Cálculo Automático de IMC</span>
          </label>
          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded-md">
            Peso com referência em Kg
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Peso em Kg */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-teal-600" />
                <span>Peso em Kg</span>
                <span className="text-rose-500">*</span>
              </label>
              {weightKg && !isNaN(parseFloat(weightKg.replace(',', '.'))) && (
                <span className="text-[10.5px] font-bold text-teal-700 dark:text-teal-300">
                  {Math.round(parseFloat(weightKg.replace(',', '.')) * 1000)} g
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => handleWeightInput(e.target.value)}
              placeholder="Ex: 70.5 ou 80"
              maxLength={6}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <p className="text-[10px] text-slate-500">
              Digite o peso em quilogramas (aceita números, pontos e vírgulas).
            </p>
          </div>

          {/* Altura em cm */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-teal-600" />
                <span>Altura em cm</span>
                <span className="text-rose-500">*</span>
              </label>
              {heightCm && (
                <span className="text-[10.5px] font-bold text-teal-700 dark:text-teal-300">
                  ≈ {(parseFloat(heightCm) / 100).toFixed(2)} m
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={heightCm}
              onChange={(e) => handleDigitsOnly(e.target.value, setHeightCm)}
              placeholder="Ex: 170"
              maxLength={3}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <p className="text-[10px] text-slate-500">
              Digite a altura em centímetros (ex: 175 para 1,75m).
            </p>
          </div>

          {/* IMC Resultado Automático */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/40 text-center space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              IMC Calculado Automaticamente
            </div>
            {imcResult ? (
              <>
                <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  {imcResult.imc} <span className="text-xs font-normal text-slate-500">kg/m²</span>
                </div>
                <div className={`text-xs font-bold px-2.5 py-0.5 rounded-md border inline-block ${imcResult.badgeClass}`}>
                  {imcResult.classification}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 italic py-2">
                Informe peso (kg) e altura (cm) para cálculo imediato.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. OBSERVAÇÕES OPCIONAIS DO ACOLHIMENTO */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>Observações / Queixa Relatada no Acolhimento (Opcional)</span>
          <span className="text-[10.5px] font-normal text-slate-400">Para complementar o registro</span>
        </label>
        <textarea
          rows={2}
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Ex: Cidadão relata cefaleia holocraniana há 2 dias. Nega outros sintomas agudos..."
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
        />
      </div>

      {/* 5. CLASSIFICAÇÃO DE RISCO (MANCHESTER) & ENCAMINHAMENTO PARA FILA */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 dark:from-slate-850 dark:to-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/50 dark:border-teal-800/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-600 text-white">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Classificação de Risco & Encaminhamento para Fila
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Atribua a cor do Protocolo de Manchester e direcione para a agenda do profissional de saúde.
              </p>
            </div>
          </div>

          {/* Gestante Toggle */}
          <button
            type="button"
            id="triage-toggle-pregnant"
            onClick={() => setIsPregnant(!isPregnant)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 self-start sm:self-auto ${
              isPregnant
                ? 'bg-pink-600 text-white border-pink-700 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-pink-300'
            }`}
          >
            <span>🤰 Gestante:</span>
            <span className="uppercase">{isPregnant ? 'Sim' : 'Não'}</span>
          </button>
        </div>

        {/* Manchester Color Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-teal-600" />
            <span>Classificação de Risco (Manchester) *</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(
              [
                { id: 'vermelho', name: 'Vermelho', desc: 'Emergência (Imediato)', active: 'bg-red-600 text-white border-red-700 ring-2 ring-red-400' },
                { id: 'laranja', name: 'Laranja', desc: 'Muito Urgente (10m)', active: 'bg-orange-500 text-white border-orange-600 ring-2 ring-orange-400' },
                { id: 'amarelo', name: 'Amarelo', desc: 'Urgente (50-60m)', active: 'bg-amber-400 text-slate-950 border-amber-500 ring-2 ring-amber-300 font-bold' },
                { id: 'verde', name: 'Verde', desc: 'Pouco Urgente (120m)', active: 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400' },
                { id: 'azul', name: 'Azul', desc: 'Não Urgente (240m)', active: 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400' },
              ] as const
            ).map((color) => {
              const isSelected = riskClassification === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  id={`triage-risk-btn-${color.id}`}
                  onClick={() => setRiskClassification(color.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? color.active
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-black">{color.name}</div>
                  <div className="text-[10px] opacity-90 leading-tight mt-0.5">{color.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority, Destination Professional and Date/Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Destination Professional */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>Direcionar Atendimento para o Profissional *</span>
            </label>
            <select
              id="triage-target-prof-select"
              value={targetProfessionalId}
              onChange={(e) => setTargetProfessionalId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {clinicalProfessionals.map((p) => {
                const pConfig = PROFESSIONS[p.profession];
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} — {pConfig?.name || p.profession} ({p.workplace})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Priority Category */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Prioridade Legal
            </label>
            <select
              id="triage-priority-category-select"
              value={priorityCategory}
              onChange={(e) => setPriorityCategory(e.target.value as QueuePriorityCategory)}
              disabled={isPregnant}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-60"
            >
              <option value="padrao">Padrão</option>
              <option value="idoso_60">Idoso (60+ anos)</option>
              <option value="idoso_80">Idoso 80+ (Superprioridade)</option>
              <option value="puericultura">Puericultura / Criança</option>
            </select>
          </div>
        </div>

        {/* Date and Time on Queue */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Data na Fila de Atendimento</span>
            </label>
            <BrazilianDatePicker
              value={scheduledDate}
              onChange={(newDate) => setScheduledDate(newDate)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Horário Previsto mais Próximo</span>
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 6. BOTÃO FINALIZAR ATENDIMENTO */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Ao finalizar, será gravado o prontuário e o paciente entrará automaticamente na fila do profissional indicado.</span>
        </div>

        <button
          type="button"
          id="btn-triage-finalize"
          onClick={handleFinalize}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Finalizar Triagem e Add Fila</span>
        </button>
      </div>
    </div>
  );
};
