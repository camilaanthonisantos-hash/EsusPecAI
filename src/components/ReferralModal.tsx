import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Save,
  Send,
  Sparkles,
  AlertTriangle,
  Building2,
  Stethoscope,
  Clock,
  FileText,
  ShieldAlert,
  Flame,
  HeartPulse,
  Brain,
  Zap,
  Mic,
  Square,
  Loader2,
  Activity,
  Check,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { ReferralData, ReferralPriority, Patient, User, Consultation } from '../types';
import { openReferralInNewTab } from '../utils/printReferral';
import {
  generateReferralAI,
  COMMON_REFERRAL_SPECIALTIES,
} from '../services/referralService';
import { useWhisperTranscription } from '../hooks/useWhisperTranscription';

export interface EmergencyReasonItem {
  id: string;
  category: 'Psiquiátrica Aguda' | 'Clínica Geral no CAPS';
  title: string;
  shortTitle: string;
  cid10: string;
  ciap2: string;
  destination: string;
  priority: ReferralPriority;
  clinicalIndication: string;
  hypotheses: string;
  proceduresRequested: string;
}

export const CAPS_EMERGENCY_REASONS: EmergencyReasonItem[] = [
  {
    id: 'surto-psicotico',
    category: 'Psiquiátrica Aguda',
    title: 'Surto Psicótico Agudo com Agitação Psicomotora Grave',
    shortTitle: 'Surto Psicótico / Agitação Grave',
    cid10: 'F23.9 / F20.0',
    ciap2: 'P98 / P71',
    destination: 'Hospital Geral / Pronto-Socorro / Retaguarda Psiquiátrica',
    priority: 'Urgência/Emergência',
    hypotheses: 'F23.9 (Transtorno psicótico agudo) / F20.0 (Esquizofrenia paranoide) / CIAP-2: P98 (Psicose aguda)',
    clinicalIndication: 'Paciente acolhido no CAPS I em crise psicótica aguda severa, com desagregação do pensamento, delírios persecutórios e agitação psicomotora intensa com risco de heteroagressividade/autoagressão. O CAPS I é serviço ambulatorial de atenção psicossocial e NÃO dispõe de infraestrutura para contenção intensiva contínua, sedação monitorada ou retaguarda hospitalar de urgência. Encaminhado imediatamente para estabilização clínica e leito de suporte especializado.',
    proceduresRequested: 'Acolhimento médico imediato em emergência hospitalar, contenção farmacológica supervisionada por médico emergencista, avaliação diagnóstica e retaguarda em leito de saúde mental.',
  },
  {
    id: 'risco-suicidio',
    category: 'Psiquiátrica Aguda',
    title: 'Risco Iminente de Autoextermínio / Tentativa Grave',
    shortTitle: 'Risco Iminente de Autoextermínio',
    cid10: 'X84 / Z91.5',
    ciap2: 'P77',
    destination: 'Pronto-Socorro Municipal / Hospital Geral / SAMU 192',
    priority: 'Urgência/Emergência',
    hypotheses: 'Z91.5 (História pessoal de automutilação / risco iminente de suicídio) / CID-10: X84 / CIAP-2: P77 (Suicídio / tentativa)',
    clinicalIndication: 'Paciente em acolhimento no CAPS I apresentando ideação suicida grave e estruturada com planos imediatos / lesões auto-infligidas agudas com alto potencial de letalidade e risco iminente de autoextermínio. A unidade ambulatorial do CAPS I não possui infraestrutura de vigilância contínua 24h ou leitos de observação protegida contra autoagressão.',
    proceduresRequested: 'Avaliação emergencial psiquiátrica/médica, monitoramento contínuo em leito de observação hospitalar, suporte intensivo e avaliação de internação breve protetiva.',
  },
  {
    id: 'delirium-tremens',
    category: 'Psiquiátrica Aguda',
    title: 'Síndrome de Abstinência Alcoólica Grave / Delirium Tremens',
    shortTitle: 'Abstinência Alcoólica / Delirium Tremens',
    cid10: 'F10.4 / F10.3',
    ciap2: 'P15',
    destination: 'Pronto-Socorro Municipal / Hospital Geral',
    priority: 'Urgência/Emergência',
    hypotheses: 'F10.4 (Transtornos mentais devidos ao uso de álcool - estado de abstinência com delirium) / CIAP-2: P15 (Abuso crônico de álcool)',
    clinicalIndication: 'Quadro clínico agudo de abstinência alcoólica grave com tremores grosseiros generalizados, diaforese profusa, taquicardia, desorientação têmporo-espacial e alucinações vívidas (Delirium Tremens). Risco iminente de convulsões e colapso hemodinâmico. O CAPS I não dispõe de suporte para desintoxicação aguda monitorada ou terapia intensiva.',
    proceduresRequested: 'Hidratação venosa imediata, reposição parenteral de tiamina (vitamina B1) prévia à glicose, administração monitorada de benzodiazepínicos e vigilância neurológica hospitalar.',
  },
  {
    id: 'overdose-intoxicacao',
    category: 'Psiquiátrica Aguda',
    title: 'Intoxicação Aguda por Substâncias Psicoativas / Overdose',
    shortTitle: 'Overdose / Intoxicação Aguda',
    cid10: 'F19.0 / T40 / T42',
    ciap2: 'P19 / A84',
    destination: 'SAMU 192 / Pronto-Socorro Municipal / UPA',
    priority: 'Urgência/Emergência',
    hypotheses: 'T40 (Intoxicação por narcóticos/psicodislépticos) / F19.0 (Intoxicação aguda por múltiplas drogas) / CIAP-2: P19',
    clinicalIndication: 'Paciente em acolhimento no CAPS I apresentando rebaixamento agudo do nível de consciência, miose/midríase fixa, bradipneia e instabilidade hemodinâmica por suspeita de intoxicação aguda/overdose por substâncias psicoativas ou psicotrópicos. Unidade CAPS I sem capacidade instalada para suporte ventilatório avançado.',
    proceduresRequested: 'Regulação via SAMU 192, garantia de permeabilidade de vias aéreas, oxigenioterapia, monitorização contínua, acesso venoso e avaliação de antídotos específicos (Naloxona/Flumazenil).',
  },
  {
    id: 'sindrome-neuroleptica',
    category: 'Psiquiátrica Aguda',
    title: 'Síndrome Neuroléptica Maligna / Distonia Aguda Grave',
    shortTitle: 'Síndrome Neuroléptica Maligna',
    cid10: 'G21.0 / T43.3',
    ciap2: 'A85',
    destination: 'Pronto-Socorro / Hospital Geral',
    priority: 'Urgência/Emergência',
    hypotheses: 'G21.0 (Síndrome neuroléptica maligna) / T43.3 (Intoxicação/reação adversa a antipsicóticos) / CIAP-2: A85',
    clinicalIndication: 'Suspeita de Síndrome Neuroléptica Maligna em paciente em uso de psicofármacos, apresentando rigidez muscular acentuada ("em cano de chumbo"), hipertermia, diaforese, taquicardia, flutuação pressórica e alteração do nível de consciência. Quadro com alto índice de mortalidade que exige intervenção hospitalar e suporte de UTI.',
    proceduresRequested: 'Suspensão imediata de antipsicóticos, resfriamento corporal, reposição hídrica agressiva, monitorização eletrocardiográfica e internação hospitalar imediata.',
  },
  {
    id: 'infarto-iam',
    category: 'Clínica Geral no CAPS',
    title: 'Suspeita de Infarto Agudo do Miocárdio (IAM) / Dor Torácica Típica',
    shortTitle: 'Suspeita de IAM / Dor Torácica',
    cid10: 'I21.9 / I20.0',
    ciap2: 'K75 / K74',
    destination: 'SAMU 192 / Hospital Geral / Pronto-Socorro',
    priority: 'Urgência/Emergência',
    hypotheses: 'I21.9 (Infarto agudo do miocárdio não especificado) / I20.0 (Angina instável) / CIAP-2: K75 (Infarto agudo do miocárdio)',
    clinicalIndication: 'Paciente em permanência no CAPS I evoluiu subitamente com dor precordial opressiva de forte intensidade com irradiação para membro superior esquerdo e mandíbula, sudorese fria, palidez e sensação de morte iminente. O CAPS I é serviço ambulatorial e não dispõe de eletrocardiógrafo de emergência, dosagem de troponina ou terapia trombolítica.',
    proceduresRequested: 'Acionamento imediato do SAMU 192, suporte de oxigênio se SpO2 < 90%, realização de ECG de 12 derivações em até 10 minutos no hospital de destino e protocolo institucional de dor torácica.',
  },
  {
    id: 'avc-agudo',
    category: 'Clínica Geral no CAPS',
    title: 'Suspeita de Acidente Vascular Cerebral (AVC) Agudo',
    shortTitle: 'Suspeita de AVC Agudo',
    cid10: 'I64',
    ciap2: 'K90',
    destination: 'SAMU 192 / Hospital Geral (Centro de AVC)',
    priority: 'Urgência/Emergência',
    hypotheses: 'I64 (Acidente vascular cerebral, não especificado) / CIAP-2: K90 (Acidente vascular cerebral)',
    clinicalIndication: 'Aparecimento súbito de déficit neurológico focal (assimetria da rima bucal / face, hemiparesia/perda de força em dimídio e disartria/afasia) durante acolhimento no CAPS I. Quadro em janela terapêutica com suspeita de AVC isquêmico/hemorrágico. Necessidade imediata de neuroimagem e suporte intensivo hospitalar.',
    proceduresRequested: 'Regulação prioritária em código vermelho (SAMU 192), manter decúbito elevado a 30°, glicemia capilar imediata e realização urgente de Tomografia Computadorizada de Crânio.',
  },
  {
    id: 'crise-convulsiva',
    category: 'Clínica Geral no CAPS',
    title: 'Crise Convulsiva Prolongada / Estado de Mal Epiléptico',
    shortTitle: 'Crise Convulsiva / Mal Epiléptico',
    cid10: 'G41.9 / G40.9',
    ciap2: 'N88',
    destination: 'Pronto-Socorro Municipal / Hospital Geral',
    priority: 'Urgência/Emergência',
    hypotheses: 'G41.9 (Estado de mal epiléptico não especificado) / G40.9 (Epilepsia não especificada) / CIAP-2: N88 (Epilepsia)',
    clinicalIndication: 'Crise convulsiva tônico-clônica generalizada com duração superior a 5 minutos ou crises sucessivas sem recuperação da consciência no CAPS I. Risco iminente de hipóxia cerebral e parada respiratória. Ausência de suporte para assistência ventilatória mecânica no CAPS I.',
    proceduresRequested: 'Proteção de via aérea, oxigenioterapia em alto fluxo, administração de benzodiazepínico parenteral conforme protocolo e transferência imediata para pronto-socorro.',
  },
  {
    id: 'insuficiencia-respiratoria',
    category: 'Clínica Geral no CAPS',
    title: 'Insuficiência Respiratória Aguda / Broncoespasmo Severo',
    shortTitle: 'Insuficiência Respiratória Aguda',
    cid10: 'J96.0 / J45.9',
    ciap2: 'R99 / R96',
    destination: 'Pronto-Socorro / Hospital Geral / SAMU 192',
    priority: 'Urgência/Emergência',
    hypotheses: 'J96.0 (Insuficiência respiratória aguda) / J45.9 (Asma / Broncoespasmo grave) / CIAP-2: R99',
    clinicalIndication: 'Dispneia intensa de início súbito, tiragem intercostal, estridor/sibilos difusos, cianose de extremidades e queda acentuada da SpO2 durante permanência no CAPS I. Unidade ambulatorial sem suporte de gasometria arterial ou ventilação mecânica não invasiva/invasiva.',
    proceduresRequested: 'Oxigenioterapia de suporte imediata, inalação com broncodilatador de resgate, avaliação de via aérea e transferência hospitalar para estabilização respiratória.',
  },
  {
    id: 'crise-hipertensiva',
    category: 'Clínica Geral no CAPS',
    title: 'Crise Hipertensiva de Emergência com Sintomas Neurovasculares',
    shortTitle: 'Crise Hipertensiva de Emergência',
    cid10: 'I10 / I50',
    ciap2: 'K87',
    destination: 'Pronto-Socorro Municipal',
    priority: 'Urgência/Emergência',
    hypotheses: 'I10 (Hipertensão essencial) com suspeita de lesão aguda de órgão-alvo / CIAP-2: K87 (Hipertensão com complicações)',
    clinicalIndication: 'Elevação severa da pressão arterial (PA >= 180x120 mmHg) associada a cefaleia occipital intensa, turvação visual, náuseas e agitação. Suspeita de emergência hipertensiva com iminência de dano vascular. CAPS I não conta com monitoramento hemodinâmico contínuo ou drogas anti-hipertensivas parenterais em bomba de infusão.',
    proceduresRequested: 'Aferição seriada de sinais vitais, acesso venoso, avaliação médica emergencial e titulação de medicação anti-hipertensiva hospitalar.',
  },
  {
    id: 'hipoglicemia-severa',
    category: 'Clínica Geral no CAPS',
    title: 'Hipoglicemia Severa com Rebaixamento do Nível de Consciência',
    shortTitle: 'Hipoglicemia Severa',
    cid10: 'E16.2',
    ciap2: 'T87',
    destination: 'Pronto-Socorro Municipal / Hospital Geral',
    priority: 'Urgência/Emergência',
    hypotheses: 'E16.2 (Hipoglicemia não especificada) / CIAP-2: T87 (Hipoglicemia)',
    clinicalIndication: 'Paciente acolhido no CAPS I apresentou sudorese fria, sonolência profunda evoluindo para torpor/rebaixamento com glicemia capilar severamente reduzida (< 40 mg/dL), sem possibilidade de deglutição segura por via oral.',
    proceduresRequested: 'Administração endovenosa imediata de glicose hipertônica a 50%, monitorização glicêmica seriada e suporte clínico hospitalar.',
  },
];

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: ReferralData) => void;
  onSaveReferral?: (data: ReferralData) => void;
  initialData?: Partial<ReferralData> | null;
  existingReferral?: Partial<ReferralData> | null;
  patient?: Patient | null;
  consultationSummary?: { avaliacao?: string; plano?: string; conduta?: string };
  initialPlanText?: string;
  initialNotesText?: string;
  initialConsultation?: Consultation | null;
  currentUser?: User | null;
  consultationId?: string;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveReferral,
  initialData,
  existingReferral,
  patient,
  consultationSummary,
  initialPlanText,
  initialNotesText,
  initialConsultation,
  currentUser,
  consultationId,
  onShowToast,
}) => {
  const activeInitial = initialData || existingReferral;
  const activeSummary = consultationSummary || {
    avaliacao: initialNotesText || initialConsultation?.avaliacao,
    plano: initialPlanText || initialConsultation?.plano,
    conduta: initialConsultation?.conduta,
  };

  const [destination, setDestination] = useState(activeInitial?.destination || '');
  const [priority, setPriority] = useState<ReferralPriority>(activeInitial?.priority || 'Eletivo');
  const [clinicalIndication, setClinicalIndication] = useState(activeInitial?.clinicalIndication || '');
  const [hypotheses, setHypotheses] = useState(activeInitial?.hypotheses || '');
  const [proceduresRequested, setProceduresRequested] = useState(activeInitial?.proceduresRequested || '');
  const [examsConducted, setExamsConducted] = useState(activeInitial?.examsConducted || '');

  // AI Prompt reason input (Free text or Voice)
  const [reasonDescription, setReasonDescription] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Emergency selector tab & active protocol indicator
  const [emergencyTab, setEmergencyTab] = useState<'psiquiatrica' | 'clinica'>('psiquiatrica');
  const [activeEmergencyProtocol, setActiveEmergencyProtocol] = useState<string | null>(null);

  // Audio recording hook for popular description dictation
  const {
    isRecording,
    isProcessing: isTranscribing,
    formattedDuration,
    audioLevel,
    errorMessage: audioError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useWhisperTranscription({
    onTranscriptionComplete: (transcription) => {
      setReasonDescription((prev) => (prev ? `${prev} ${transcription}` : transcription));
      if (onShowToast) {
        onShowToast('success', 'Áudio transcrito com sucesso para o relato do motivo!', 'Áudio Transcrito');
      }
    },
    onError: (err) => {
      if (onShowToast) {
        onShowToast('error', `Falha na transcrição do áudio: ${err}`, 'Erro de Áudio');
      }
    },
  });

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      const init = initialData || existingReferral;
      const summary = consultationSummary || {
        avaliacao: initialNotesText || initialConsultation?.avaliacao,
        plano: initialPlanText || initialConsultation?.plano,
        conduta: initialConsultation?.conduta,
      };

      if (init) {
        setDestination(init.destination || '');
        setPriority(init.priority || 'Eletivo');
        setClinicalIndication(init.clinicalIndication || '');
        setHypotheses(init.hypotheses || '');
        setProceduresRequested(init.proceduresRequested || '');
        setExamsConducted(init.examsConducted || '');
      } else {
        setDestination('');
        setPriority('Eletivo');
        // Pre-fill from consultation plan/assessment if available
        if (summary?.plano || summary?.conduta || summary?.avaliacao) {
          setClinicalIndication(
            `Solicito avaliação especializada para o paciente, com base no seguinte quadro:\n${summary.avaliacao?.slice(0, 300) || ''}`
          );
          setProceduresRequested(
            summary.plano?.slice(0, 200) || summary.conduta?.slice(0, 200) || ''
          );
        } else {
          setClinicalIndication('');
          setProceduresRequested('');
        }
        setHypotheses('');
        setExamsConducted('');
      }
      setReasonDescription('');
      setAiSuccessMessage(null);
      setActiveEmergencyProtocol(null);
    }
  }, [isOpen, initialData, existingReferral, consultationSummary, initialPlanText, initialNotesText, initialConsultation]);

  if (!isOpen) return null;

  const buildCurrentReferralData = (): ReferralData => {
    const now = Date.now();
    const init = initialData || existingReferral;
    return {
      id: init?.id || `ref-${now}`,
      destination: destination.trim() || 'SERVIÇO ESPECIALIZADO',
      priority,
      clinicalIndication: clinicalIndication.trim() || 'Acompanhamento e avaliação clínica especializada.',
      hypotheses: hypotheses.trim() || 'Avaliação clínica.',
      proceduresRequested: proceduresRequested.trim() || undefined,
      examsConducted: examsConducted.trim() || undefined,
      dateFormatted:
        init?.dateFormatted ||
        'Anajás, ' +
          new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
      professionalName: init?.professionalName || initialConsultation?.authorName || currentUser?.name || 'Profissional Solicitante',
      professionalRole: init?.professionalRole || initialConsultation?.authorProfession || (currentUser?.role === 'admin' ? 'Coordenador / Profissional' : (currentUser?.profession || 'Profissional de Saúde')),
      professionalRegister: init?.professionalRegister || initialConsultation?.authorRegister || currentUser?.professionalRegister || '',
      professionalStampUrl: init?.professionalStampUrl || (initialConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl),
      useDigitalStamp: init?.useDigitalStamp ?? (initialConsultation?.authorUseDigitalStamp ?? (currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
      workplace: init?.workplace || initialConsultation?.workplace || currentUser?.workplace || 'CENTRO DE ATENÇÃO PSICOSSOCIAL - CAPS',
      createdAt: init?.createdAt || now,
      consultationId: consultationId || initialConsultation?.id || init?.consultationId,
    };
  };

  const handleApplyEmergencyProtocol = (reason: EmergencyReasonItem) => {
    setDestination(reason.destination);
    setPriority(reason.priority);
    setHypotheses(reason.hypotheses);
    setClinicalIndication(reason.clinicalIndication);
    setProceduresRequested(reason.proceduresRequested);
    setActiveEmergencyProtocol(reason.title);

    if (onShowToast) {
      onShowToast(
        'info',
        `Protocolo de Referência Aplicado: ${reason.shortTitle} (${reason.cid10})`,
        'Protocolo de Emergência'
      );
    }
  };

  const handleGenerateWithAI = async () => {
    const promptText = reasonDescription.trim() || destination.trim() || activeSummary?.avaliacao || '';
    if (!promptText) {
      if (onShowToast) {
        onShowToast(
          'error',
          'Por favor, digite ou dite o motivo do encaminhamento (ou selecione a especialidade).',
          'Motivo Necessário'
        );
      }
      return;
    }

    setIsGeneratingAI(true);
    setAiSuccessMessage(null);

    try {
      const result = await generateReferralAI({
        destination: destination.trim(),
        reasonDescription: promptText,
        patient,
        consultationContext: activeSummary,
      });

      if (result.clinicalIndication) {
        setClinicalIndication(result.clinicalIndication);
      }
      if (result.hypotheses) {
        setHypotheses(result.hypotheses);
      }
      if (result.proceduresRequested) {
        setProceduresRequested(result.proceduresRequested);
      }
      if (result.destination && !destination.trim()) {
        setDestination(result.destination);
      }
      if (result.priority) {
        setPriority(result.priority);
      }

      setAiSuccessMessage(`Justificativa e Hipótese geradas com IA (${result.modelUsed || 'Gemini 3.7 Flash'}). Você pode editar os campos abaixo livremente.`);
      if (onShowToast) {
        onShowToast(
          'success',
          'Justificativa clínica e hipótese diagnóstica (CID-10 / CIAP-2) estruturadas com IA! Campos liberados para edição.',
          'IA: Encaminhamento Gerado'
        );
      }
    } catch (err: any) {
      console.error('Erro ao gerar encaminhamento com IA:', err);
      if (onShowToast) {
        onShowToast(
          'error',
          'Não foi possível gerar com IA no momento. Você pode preencher os campos manualmente.',
          'Erro na Geração'
        );
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSaveOnly = () => {
    if (!destination.trim()) {
      alert('Por favor, informe a especialidade ou serviço de destino.');
      return;
    }
    const data = buildCurrentReferralData();
    const saveFn = onSave || onSaveReferral;
    if (saveFn) {
      saveFn(data);
    }
    if (onShowToast) {
      onShowToast('success', 'Guia de Encaminhamento salva com sucesso!', 'Encaminhamento');
    }
    onClose();
  };

  const handleSaveAndPrint = () => {
    if (!destination.trim()) {
      alert('Por favor, informe a especialidade ou serviço de destino.');
      return;
    }
    const data = buildCurrentReferralData();
    const saveFn = onSave || onSaveReferral;
    if (saveFn) {
      saveFn(data);
    }
    if (onShowToast) {
      onShowToast('success', 'Encaminhamento salvo! Abrindo visualização de impressão A4...', 'Imprimir Guia');
    }
    openReferralInNewTab(data, patient || undefined, currentUser);
    onClose();
  };

  const handleAutoFillFromNotes = () => {
    const summary = consultationSummary || {
      avaliacao: initialNotesText || initialConsultation?.avaliacao,
      plano: initialPlanText || initialConsultation?.plano,
      conduta: initialConsultation?.conduta,
    };

    if (summary) {
      if (summary.avaliacao) {
        setReasonDescription((prev) =>
          prev ? `${prev}\n\n${summary.avaliacao}` : (summary.avaliacao || '')
        );
        setClinicalIndication((prev) =>
          prev
            ? `${prev}\n\n[Resumo do Atendimento]:\n${summary.avaliacao}`
            : (summary.avaliacao || '')
        );
      }
      if (summary.plano || summary.conduta) {
        setProceduresRequested((prev) =>
          prev
            ? `${prev}\n\n[Plano Proposto]:\n${summary.plano || summary.conduta}`
            : (summary.plano || summary.conduta || '')
        );
      }
      if (onShowToast) {
        onShowToast('info', 'Dados do atendimento copiados para o relato e campos.', 'Dados Importados');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-sky-700 via-sky-800 to-sky-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs">
              <Send className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
                GUIA DE ENCAMINHAMENTO / REFERÊNCIA SUS
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-100 border border-sky-400/30">
                  A4 Retrato
                </span>
              </h3>
              <p className="text-xs text-sky-200 font-medium">
                {patient ? `Paciente: ${patient.fullName}` : 'Encaminhamento Intersetorial / Rede de Atenção à Saúde'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
          {/* Quick Auto-Fill action if consultation text is present */}
          {activeSummary && (activeSummary.avaliacao || activeSummary.plano) && (
            <div className="flex items-center justify-between p-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-sky-950 dark:text-sky-200 font-semibold">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Importar queixa e dados clínicos deste atendimento para estruturação</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillFromNotes}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                Preencher
              </button>
            </div>
          )}

          {/* ================= SECTION: IA GENERATOR - RELATO POPULAR / ÁUDIO / TEXTO ================= */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/90 via-sky-100/40 to-blue-50/70 dark:from-slate-850 dark:via-sky-950/30 dark:to-slate-900 border-2 border-sky-300/80 dark:border-sky-800/80 shadow-md space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sky-950 dark:text-sky-100">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide text-sky-950 dark:text-sky-200">
                    Gerador Inteligente de Justificativa e Hipótese com IA
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                    Relate o problema de forma livre/popular por <strong>áudio ou texto</strong>. A IA gera a justificativa técnica padronizada e sugere a hipótese diagnóstica (CID-10 / CIAP-2).
                  </p>
                </div>
              </div>
            </div>

            {/* Specialty Quick Chips */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Especialidade ou Serviço de Destino:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {COMMON_REFERRAL_SPECIALTIES.map((spec) => {
                  const isSelected = destination.toLowerCase().includes(spec.id) || destination.toLowerCase() === spec.destination.toLowerCase();
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setDestination(spec.destination)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-sky-700 text-white border-sky-800 shadow-xs ring-1 ring-sky-400'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {spec.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Popular/Clinical Reason Textarea + Mic Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  Relato do Motivo / Queixa (em linguagem popular ou técnica):
                </label>
                {reasonDescription && (
                  <button
                    type="button"
                    onClick={() => setReasonDescription('')}
                    className="text-[11px] text-slate-500 hover:text-rose-600 transition-colors font-medium"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={reasonDescription}
                  onChange={(e) => setReasonDescription(e.target.value)}
                  rows={2}
                  placeholder="Ex: Paciente com dor de dente intensa há 4 dias, dente quebrado e gengiva inchada; ou perda visual progressiva; ou acolhimento em crise..."
                  className="w-full p-2.5 pr-14 rounded-xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden leading-relaxed shadow-xs"
                />

                {/* Inline Dictation Button */}
                <div className="absolute right-2 top-2">
                  {!isRecording && !isTranscribing ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="p-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                      title="Gravar áudio / Ditar motivo com microfone"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  ) : isRecording ? (
                    <div className="flex items-center gap-1 bg-rose-600 text-white px-2 py-1 rounded-lg text-xs font-bold animate-pulse">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{formattedDuration}</span>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="p-1 hover:bg-white/20 rounded cursor-pointer ml-1"
                        title="Concluir gravação"
                      >
                        <Square className="w-3 h-3 fill-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {audioError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                  {audioError}
                </p>
              )}
            </div>

            {/* Action Bar with Generate Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                * A justificativa não conterá nome/idade (já impressos nos dados do paciente).
              </div>

              <button
                type="button"
                onClick={handleGenerateWithAI}
                disabled={isGeneratingAI || isRecording || isTranscribing}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-sky-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Estruturando com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-200" />
                    <span>Gerar Justificativa & Hipótese com IA</span>
                  </>
                )}
              </button>
            </div>

            {aiSuccessMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-950 dark:text-emerald-100 font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* ================= COMPONENT 2: EMERGENCY REFERENCE HUB (CLEANED & CONTRAST-ENHANCED) ================= */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/90 border-2 border-slate-300 dark:border-slate-700 space-y-2.5 shadow-sm">
            {/* Category Sub-Tabs with High Contrast */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-2.5">
              <span className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 mr-1 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Protocolos Rápidos de Emergência (CAPS I):
              </span>
              <button
                type="button"
                onClick={() => setEmergencyTab('psiquiatrica')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                  emergencyTab === 'psiquiatrica'
                    ? 'bg-rose-700 text-white border-rose-800 shadow-md ring-1 ring-rose-400'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Emergências Psiquiátricas Agudas</span>
              </button>
              <button
                type="button"
                onClick={() => setEmergencyTab('clinica')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                  emergencyTab === 'clinica'
                    ? 'bg-red-800 text-white border-red-900 shadow-md ring-1 ring-red-400'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Emergências Clínicas Gerais</span>
              </button>
            </div>

            {/* Emergency Chips Grid - Enhanced Contrast & Readability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              {CAPS_EMERGENCY_REASONS.filter((item) =>
                emergencyTab === 'psiquiatrica'
                  ? item.category === 'Psiquiátrica Aguda'
                  : item.category === 'Clínica Geral no CAPS'
              ).map((reason) => {
                const isSelected = activeEmergencyProtocol === reason.title;
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => handleApplyEmergencyProtocol(reason)}
                    className={`p-3 rounded-xl text-left border-2 transition-all text-xs flex flex-col justify-between gap-1.5 group cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/80 border-red-600 dark:border-red-500 text-red-950 dark:text-red-50 shadow-md ring-2 ring-red-500/40'
                        : 'bg-white dark:bg-slate-800 hover:bg-red-50/80 dark:hover:bg-red-950/40 border-slate-300 dark:border-slate-700 hover:border-red-500 text-slate-900 dark:text-slate-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-black text-slate-950 dark:text-white text-xs leading-snug group-hover:text-red-700 dark:group-hover:text-red-400">
                        {reason.shortTitle}
                      </span>
                      <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-red-700 text-white shrink-0 font-mono shadow-xs">
                        {reason.cid10.split('/')[0].trim()}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 pt-0.5 border-t border-slate-200 dark:border-slate-700/60">
                      <span className="truncate">CIAP: {reason.ciap2}</span>
                      <span className="text-[11px] text-red-700 dark:text-red-400 font-black group-hover:underline">
                        Aplicar Protocolo ⚡
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeEmergencyProtocol && (
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/80 border-2 border-red-400 dark:border-red-800 flex items-center justify-between text-xs text-red-950 dark:text-red-100 font-bold animate-in fade-in duration-200">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-600" />
                  Protocolo aplicado: {activeEmergencyProtocol}
                </span>
                <span className="text-[11px] font-black text-red-800 dark:text-red-300">
                  Prioridade alterada para Urgência / Emergência 🔴
                </span>
              </div>
            )}
          </div>

          {/* Destination & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Serviço ou Especialidade de Destino *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex: Odontologia, Oftalmologia, Psiquiatria, Pronto-Socorro..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Grau de Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReferralPriority)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden ${
                  priority === 'Urgência/Emergência'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 font-extrabold'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <option value="Eletivo">🟢 Eletivo (Rotina)</option>
                <option value="Prioritário">🟡 Prioritário</option>
                <option value="Urgência/Emergência">🔴 Urgência / Emergência</option>
              </select>
            </div>
          </div>

          {/* ================= EDITABLE FORM FIELDS (1, 2, 3, 4) ================= */}
          {/* 1. Clinical Indication / Justification */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                1. Resumo do Quadro Clínico e Justificativa do Encaminhamento *
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                (Sempre editável)
              </span>
            </div>
            <textarea
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              rows={4}
              placeholder="Descreva a história clínica relevante, motivos e justificativa técnica do encaminhamento..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-y font-medium text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* 2. Diagnostic Hypotheses */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                2. Hipóteses Diagnósticas / Demandas de Suporte (CID-10 / CIAP-2) *
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                (Sempre editável)
              </span>
            </div>
            <input
              type="text"
              value={hypotheses}
              onChange={(e) => setHypotheses(e.target.value)}
              placeholder="Ex: K02.9 (Cárie dentária) / CIAP-2: D19 (Dor de dente)..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* 3. Procedures & Assessments Requested */}
          <div className="space-y-1">
            <label className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-sky-600" />
              3. Condutas, Procedimentos ou Avaliações Solicitadas (Opcional)
            </label>
            <textarea
              value={proceduresRequested}
              onChange={(e) => setProceduresRequested(e.target.value)}
              rows={2}
              placeholder="Ex: Avaliação odontológica especializada, radiografia periapical, restauração..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-y font-medium"
            />
          </div>

          {/* 4. Exams Conducted */}
          <div className="space-y-1">
            <label className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
              4. Exames Já Realizados ou Antecedentes Relevantes (Opcional)
            </label>
            <input
              type="text"
              value={examsConducted}
              onChange={(e) => setExamsConducted(e.target.value)}
              placeholder="Ex: Hemograma recente sem alterações, dextro normal no acolhimento..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-medium"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Emissão oficial para a Rede de Atenção à Saúde do SUS (A4 Retrato)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button
              type="button"
              onClick={handleSaveAndPrint}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-sky-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Salvar e Imprimir Guia A4
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
