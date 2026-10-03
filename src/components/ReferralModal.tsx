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
} from 'lucide-react';
import { ReferralData, ReferralPriority, Patient, User, Consultation } from '../types';
import { openReferralInNewTab } from '../utils/printReferral';

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
    shortTitle: 'Surto Psicótico / Agitação',
    cid10: 'F23.9 / F20.0',
    ciap2: 'P98 / P71',
    destination: 'Hospital Geral / Pronto-Socorro / Retaguarda Psiquiátrica',
    priority: 'Urgência/Emergência',
    hypotheses: 'F23.9 (Transtorno psicótico agudo) / F20.0 (Esquizofrenia paranoide) / CIAP-2: P98',
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
    hypotheses: 'Z91.5 (História pessoal de automutilação / risco iminente de suicídio) / CID-10: X84 / CIAP-2: P77',
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
    hypotheses: 'F10.4 (Transtornos mentais e comportamentais devidos ao uso de álcool - estado de abstinência com delirium) / CIAP-2: P15',
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
    hypotheses: 'I21.9 (Infarto agudo do miocárdio não especificado) / I20.0 (Angina instável) / CIAP-2: K75',
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
    hypotheses: 'I64 (Acidente vascular cerebral, não especificado) / CIAP-2: K90',
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
    hypotheses: 'G41.9 (Estado de mal epiléptico não especificado) / G40.9 (Epilepsia não especificada) / CIAP-2: N88',
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
    hypotheses: 'I10 (Hipertensão essencial) com suspeita de lesão aguda de órgão-alvo / CIAP-2: K87',
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
    hypotheses: 'E16.2 (Hipoglicemia não especificada) / CIAP-2: T87',
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

const COMMON_DESTINATIONS = [
  'Psiquiatria Infantil / CAPSi',
  'Psiquiatria Adulto / CAPS',
  'Neurologia Clínica / Pediátrica',
  'CRAS / CREAS (Assistência Social)',
  'Ortopedia e Traumatologia',
  'Cardiologia Clínica',
  'Fisioterapia e Reabilitação',
  'Oftalmologia',
  'Ginecologia e Obstetrícia',
  'Conselho Tutelar / Proteção à Criança',
  'NASF / eMulti Multiprofissional',
  'Regulação / Exames Especializados',
];

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

  // Emergency selector tab & active protocol indicator
  const [emergencyTab, setEmergencyTab] = useState<'psiquiatrica' | 'clinica'>('psiquiatrica');
  const [activeEmergencyProtocol, setActiveEmergencyProtocol] = useState<string | null>(null);

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
        if (summary?.plano || summary?.conduta) {
          setClinicalIndication(
            `Solicito avaliação especializada para o(a) paciente, com base no seguinte quadro:\n${summary.avaliacao?.slice(0, 300) || ''}`
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-sky-700 via-sky-800 to-sky-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Send className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2">
                GUIA DE ENCAMINHAMENTO / REFERÊNCIA SUS
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-100 border border-sky-400/30">
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
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
          {/* Quick Auto-Fill action if consultation text is present */}
          {activeSummary && (activeSummary.avaliacao || activeSummary.plano) && (
            <div className="flex items-center justify-between p-2.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-sky-900 dark:text-sky-300 font-medium">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Preencher automaticamente com dados deste atendimento clínico</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillFromNotes}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
              >
                Preencher
              </button>
            </div>
          )}

          {/* CAPS I Emergency Reference Protocol Hub */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-extrabold text-xs text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                    Protocolo de Referência de Emergência (CAPS I)
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    Ambulatorial • Sem suporte intensivo
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                  O <strong>CAPS I não realiza atendimento de emergência médica ou suporte intensivo</strong>. Clique em uma das causas abaixo para carregar imediatamente os <strong>códigos oficiais (CID-10 / CIAP-2)</strong>, justificativa técnica de encaminhamento emergencial e condutas para o <strong>Hospital Geral / Pronto-Socorro / SAMU 192</strong>:
                </p>
              </div>
            </div>

            {/* Category Sub-Tabs */}
            <div className="flex items-center gap-1.5 border-b border-amber-200/80 dark:border-amber-800/40 pb-2">
              <button
                type="button"
                onClick={() => setEmergencyTab('psiquiatrica')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  emergencyTab === 'psiquiatrica'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-rose-50'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Emergências Psiquiátricas Agudas</span>
              </button>
              <button
                type="button"
                onClick={() => setEmergencyTab('clinica')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  emergencyTab === 'clinica'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-red-50'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Emergências Clínicas Gerais no CAPS</span>
              </button>
            </div>

            {/* Emergency Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                    className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between gap-1 group ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500 dark:border-red-500 text-red-950 dark:text-red-100 shadow-sm ring-1 ring-red-400'
                        : 'bg-white dark:bg-slate-850 hover:bg-red-50/60 dark:hover:bg-red-950/30 border-slate-200 dark:border-slate-750 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-bold leading-tight group-hover:text-red-600 dark:group-hover:text-red-400">
                        {reason.shortTitle}
                      </span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 shrink-0 font-mono">
                        {reason.cid10.split('/')[0].trim()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                      <span className="truncate">CIAP: {reason.ciap2}</span>
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold group-hover:underline">
                        Aplicar Código ⚡
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeEmergencyProtocol && (
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/70 border border-red-300 dark:border-red-800/80 flex items-center justify-between text-xs text-red-900 dark:text-red-200 font-medium animate-in fade-in duration-200">
                <span className="flex items-center gap-1.5 font-bold">
                  <Flame className="w-4 h-4 text-red-600" />
                  Protocolo aplicado: {activeEmergencyProtocol}
                </span>
                <span className="text-[11px] font-bold text-red-700 dark:text-red-300">
                  Prioridade alterada para Urgência / Emergência 🔴
                </span>
              </div>
            )}
          </div>

          {/* Destination & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                Serviço ou Especialidade de Destino *
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex: Pronto-Socorro Municipal, Hospital Geral, Psiquiatria Infantil..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Grau de Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReferralPriority)}
                className={`w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden ${
                  priority === 'Urgência/Emergência'
                    ? 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <option value="Eletivo">🟢 Eletivo (Rotina)</option>
                <option value="Prioritário">🟡 Prioritário</option>
                <option value="Urgência/Emergência">🔴 Urgência / Emergência</option>
              </select>
            </div>
          </div>

          {/* Destination Quick Chips (Rotina) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Sugestões de Rotina:</span>
            {COMMON_DESTINATIONS.slice(0, 6).map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => setDestination(dest)}
                className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-sky-950 text-slate-700 dark:text-slate-300 hover:text-sky-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                {dest}
              </button>
            ))}
          </div>

          {/* Clinical Indication / Justification */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              1. Resumo do Quadro Clínico e Justificativa *
            </label>
            <textarea
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              rows={3}
              placeholder="Descreva a história clínica relevante, motivos e justificativa do encaminhamento..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-y"
            />
          </div>

          {/* Diagnostic Hypotheses */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
              2. Hipóteses Diagnósticas / Demandas de Suporte (CID-10 / CIAP-2)
            </label>
            <input
              type="text"
              value={hypotheses}
              onChange={(e) => setHypotheses(e.target.value)}
              placeholder="Ex: F23.9, F20.0, I21.9, F10.4, Z91.5..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden font-medium"
            />
          </div>

          {/* Procedures & Assessments Requested */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-sky-600" />
              3. Condutas, Procedimentos ou Avaliações Solicitadas
            </label>
            <textarea
              value={proceduresRequested}
              onChange={(e) => setProceduresRequested(e.target.value)}
              rows={2}
              placeholder="Ex: Avaliação médica imediata, monitoramento em leito hospitalar, exames laboratoriais..."
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-y"
            />
          </div>

          {/* Exams Conducted */}
          <div className="space-y-1">
            <label className="font-bold text-xs text-slate-700 dark:text-slate-300">
              4. Exames Já Realizados ou Antecedentes Relevantes (Opcional)
            </label>
            <input
              type="text"
              value={examsConducted}
              onChange={(e) => setExamsConducted(e.target.value)}
              placeholder="Ex: Hemograma normal (10/08), dextro capilar realizado no acolhimento..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Emissão oficial para a Rede de Atenção à Saúde do SUS
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button
              type="button"
              onClick={handleSaveAndPrint}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-sky-600/20"
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
