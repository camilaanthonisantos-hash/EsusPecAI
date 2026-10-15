import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Calendar,
  Briefcase,
  FileText,
  Save,
  Sparkles,
  Copy,
  Check,
  Plus,
  Minus,
  CheckCircle2,
  Building2,
  Mic,
  MicOff,
  ChevronDown,
  X,
  UserCheck,
  AlertTriangle,
  Info,
  Edit3,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  CapsProcedure,
  CBO_LABELS,
  getDefaultCboForProfession,
  formatCboWithHyphen,
  formatFirstAndLastName,
  isCboHabilitatedForProcedure,
} from '../data/capsProcedures';
import { PROFESSIONS } from '../data/professions';
import { recordBpaCInDb2, formatReferenceMonth, CAPS_CNES, CAPS_MODALITY } from '../services/secondarySupabase';
import {
  saveCollectiveActionToFirestore,
  getCollectiveActionsFromFirestore,
  deleteCollectiveActionFromFirestore,
} from '../services/firebase';
import { SpecularButton } from './SpecularButton';
import { User, ProfessionId, CollectiveActionRecord } from '../types';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

export interface SelectedExecutant {
  userId?: string;
  name: string;
  shortName: string;
  cbo: string;
  cboFormatted: string;
  profession: string;
  professionLabel: string;
}

interface CollectiveActionPanelProps {
  selectedProcedure: CapsProcedure;
  currentUser: User;
  selectedProfession: ProfessionId;
  allUsers?: User[];
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
  onRecordSaved?: (data: any) => void;
}

/**
 * Catálogo especializado de temas da rotina do CAPS I por procedimento
 */
const SPECIALIZED_THEMES_BY_PROCEDURE: Record<string, string[]> = {
  '03.01.08.025-9': [
    'Articulação Intersetorial CAPS I e CRAS para Alinhamento do Fluxo de Famílias em Vulnerabilidade',
    'Reunião de Comitê Gestor Territorial: Fortalecimento das Linhas de Cuidado da RAPS',
    'Pactuação Intersetorial entre Saúde Mental, Assistência Social e Conselho Tutelar',
    'Alinhamento Técnico com Secretarias Municipais de Educação e Habitação para Suporte Psicossocial',
  ],
  '03.01.08.026-7': [
    'Assembleia Geral de Usuários e Familiares: Protagonismo, Cidadania e Construção Coletiva do Cuidado',
    'Fórum de Fortalecimento de Vínculos Familiares e Participação no Controle Social do SUS',
    'Roda de Conversa sobre Direitos dos Usuários e Autonomia no Processo de Reabilitação Psicossocial',
    'Comissão de Eventos e Integração Cultural Coordenada por Usuários e Familiares do CAPS',
  ],
  '03.01.08.030-5': [
    'Apoio Matricial com Equipe de Saúde da Família: Discussão de Casos e Compartilhamento do Cuidado Territorial',
    'Matriciamento na Atenção Básica: Abordagem Clínica Compartilhada e Fluxo de Encaminhamentos',
    'Supervisão Clínica Compartilhada: Estratégias de Manejo do Sofrimento Psíquico na Atenção Primária',
    'Construção Conjunta de Projeto Terapêutico Singular (PTS) com a Equipe da UBS / eMulti',
  ],
  '03.01.08.039-9': [
    'Matriciamento Institucional: Alinhamento de Fluxos Assistenciais entre CAPS I, SAMU e Hospital Geral',
    'Pactuação de Rede de Urgência e Emergência: Desospitalização e Transição Segura para o Território',
    'Articulação Técnica Hospitalar para Prevenção de Internações Prolongadas e Vinculação Territorial',
    'Mesa Redonda sobre Manejo Humanizado de Crises Psiquiátricas na Rede de Urgência e Emergência',
  ],
  '03.01.08.031-3': [
    'Roda de Redução de Danos: Práticas de Autocuidado, Consciência Corporal e Estratégias Protetivas',
    'Ação Comunitária de Redução de Danos e Prevenção de ISTs no Território para Usuários de SPA',
    'Grupo Reflexivo: Manejo da Fissura e Construção de Estratégias Protetivas no Uso de Substâncias',
    'Oficina de Cuidado Integral: Hidratação, Nutrição e Redução de Riscos Associados ao Álcool e Drogas',
  ],
  '03.01.08.032-1': [
    'Acompanhamento e Apoio Técnico ao Serviço Residencial Terapêutico (SRT): Rotina e Autonomia',
    'Supervisão Psicossocial dos Moradores de SRT: Estímulo à Convivência Comunitária e Cidadania',
    'Reunião de Equipe com Cuidadores do SRT para Alinhamento dos Projetos Terapêuticos Singulares',
  ],
  '03.01.08.033-0': [
    'Apoio Técnico ao Serviço Residencial Transitório: Acompanhamento da Reabilitação e Plano Terapêutico',
    'Suporte Multiprofissional e Articulação de Cuidado Territorial em Acolhimento Transitório',
    'Visita de Supervisão Compartilhada: Avaliação Psicossocial e Fortalecimento de Vínculos Familiares',
  ],
  '01.01.01.002-8': [
    'Atividade Educativa em Grupo: Higiene do Sono, Manejo do Estresse e Saúde Integral no Cotidiano',
    'Roda de Educação em Saúde Mental: Informações sobre Medicamentos, Nutrição e Bem-Estar Emocional',
    'Orientação em Grupo: Fortalecimento da Rede de Apoio e Prevenção de Crises Psicossociais',
    'Encontro Temático: Promoção da Saúde, Atividade Física e Redução do Isolamento Social',
  ],
  '01.01.03.002-9': [
    'Visita Domiciliar Interdisciplinar: Avaliação Singular do Ambiente Familiar e Reavaliação do PTS',
    'Visita Institucional e Territorial por Nível Superior: Mapeamento de Recursos Comunitários',
    'Atendimento Territorial Compartilhado para Usuários com Dificuldade de Deslocamento ao CAPS',
  ],
  '03.01.04.003-6': [
    'Terapia em Grupo: Elaboração de Conflitos, Regulação Emocional e Compartilhamento de Vivências',
    'Círculo Terapêutico Grupal: Resiliência, Manejo da Ansiedade e Reconstrução da Autoestima',
    'Grupo Psicoterapêutico Reflexivo: Fortalecimento de Laços Afetivos e Estratégias de Enfrentamento',
    'Sessão Psicoterapêutica Grupal: Superação do Estigma e Fortalecimento da Identidade Pessoal',
  ],
  '03.01.08.014-3': [
    'Oficina Terapêutica de Convivência e Artesanato: Trabalho Manual e Reinserção Social',
    'Oficina de Reabilitação Psicossocial: Produção Artesanal, Recreação e Fortalecimento de Habilidades',
    'Oficina de Marcenaria e Reciclagem Criativa: Estímulo à Concentração e Socialização no CAPS',
  ],
  '03.01.08.015-1': [
    'Oficina Expressiva de Escrita Criativa e Projeto de Vida: Narrativas e Construção de Autonomia',
    'Oficina Terapêutica Avançada de Expressão Artística e Corporeidade: Reabilitação Psicossocial',
    'Oficina de Música e Expressão Sonora: Estimulação Cognitiva, Afetividade e Expressão de Emoções',
  ],
  '03.01.05.013-9': [
    'Busca Ativa Territorial: Reaproximação e Escuta Qualificada de Usuários Ausentes do Tratamento',
    'Ação de Busca Ativa Comunitária para Usuários em Situação de Vulnerabilidade Social e Descontinuidade',
    'Mapeamento Territorial de Casos Prioritários e Restabelecimento de Vínculo com a Rede de Cuidado',
  ],
  '03.01.10.001-2': [
    'Administração Segura de Medicamentos e Orientações Técnicas sobre Farmacoterapia em Saúde Mental',
    'Aplicação de Terapêutica Injetável e Monitoramento Clínico de Efeitos Adversos no CAPS',
    'Sessão de Orientação sobre Adesão Terapêutica, Dosagens e Horários dos Psicofármacos',
  ],
};

export const CollectiveActionPanel: React.FC<CollectiveActionPanelProps> = ({
  selectedProcedure,
  currentUser,
  selectedProfession,
  allUsers = [],
  onShowToast,
  onRecordSaved,
}) => {
  // ID único da ação coletiva no banco de dados para controle de duplicidade de CBO
  const [actionId, setActionId] = useState<string>(() => {
    return `act-bpac-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  });

  // Estado da data da atividade (padrão hoje no formato YYYY-MM-DD)
  const [activityDate, setActivityDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Executantes selecionados (Multi-select)
  // Formato obrigatório: [CBO] - [Profissão] - [1º e último nome do profissional]
  const [selectedExecutants, setSelectedExecutants] = useState<SelectedExecutant[]>(() => {
    const cboClean = currentUser.cbo?.replace(/\D/g, '') || getDefaultCboForProfession(selectedProfession);
    const shortName = formatFirstAndLastName(currentUser.name);
    const profLabel = PROFESSIONS[selectedProfession]?.name || currentUser.profession || 'Profissional';
    return [
      {
        userId: currentUser.id,
        name: currentUser.name,
        shortName,
        cbo: cboClean,
        cboFormatted: formatCboWithHyphen(cboClean),
        profession: selectedProfession,
        professionLabel: profLabel,
      },
    ];
  });

  // Dropdown aberto de seleção de executantes
  const [isExecutantsDropdownOpen, setIsExecutantsDropdownOpen] = useState(false);
  const executantsDropdownRef = useRef<HTMLDivElement | null>(null);

  // Quantidade de participantes da atividade coletiva
  const [participantsCount, setParticipantsCount] = useState<number>(8);

  // Tema / Objetivo da atividade
  const [theme, setTheme] = useState<string>('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [themeSuggestionIndex, setThemeSuggestionIndex] = useState(0);

  // Relato / Memória técnica da atividade
  const [description, setDescription] = useState<string>('');

  // Status de gravação
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Reconhecimento de voz para ditar relato
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Histórico de Ações Coletivas (Sincronizado entre Banco 1 e LocalStorage)
  const [historyRecords, setHistoryRecords] = useState<CollectiveActionRecord[]>(() => {
    return safeGetItem<CollectiveActionRecord[]>('pec_collective_records', []) || [];
  });

  // Estado de edição de ação existente do histórico
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);

  // Estados para Modal de Confirmação de Exclusão (100% funcional em iframe)
  const [actionPendingDelete, setActionPendingDelete] = useState<CollectiveActionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para Modal de Edição Rápida da Ação
  const [actionPendingEdit, setActionPendingEdit] = useState<CollectiveActionRecord | null>(null);
  const [editModalTheme, setEditModalTheme] = useState<string>('');
  const [editModalDescription, setEditModalDescription] = useState<string>('');
  const [editModalParticipants, setEditModalParticipants] = useState<number>(1);
  const [editModalDate, setEditModalDate] = useState<string>('');
  const [isSavingEditModal, setIsSavingEditModal] = useState(false);

  // Carrega ações persistidas do Banco 1 ao inicializar e sincroniza com o histórico local
  useEffect(() => {
    getCollectiveActionsFromFirestore()
      .then((records) => {
        if (records && records.length > 0) {
          setHistoryRecords(records);
        }
      })
      .catch((err) => {
        console.warn('Aviso: Não foi possível carregar histórico de ações do Banco 1:', err);
      });
  }, []);

  // Fecha dropdown de executantes ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        executantsDropdownRef.current &&
        !executantsDropdownRef.current.contains(e.target as Node)
      ) {
        setIsExecutantsDropdownOpen(false);
      }
    };
    if (isExecutantsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExecutantsDropdownOpen]);

  // Atualiza executante logado quando a profissão ou o procedimento mudar
  useEffect(() => {
    const cboClean = currentUser.cbo?.replace(/\D/g, '') || getDefaultCboForProfession(selectedProfession);
    const shortName = formatFirstAndLastName(currentUser.name);
    const profLabel = PROFESSIONS[selectedProfession]?.name || currentUser.profession || 'Profissional';

    // Garante que o profissional logado esteja sempre presente como executante padrão
    setSelectedExecutants((prev) => {
      const exists = prev.some((e) => e.userId === currentUser.id);
      if (!exists) {
        return [
          {
            userId: currentUser.id,
            name: currentUser.name,
            shortName,
            cbo: cboClean,
            cboFormatted: formatCboWithHyphen(cboClean),
            profession: selectedProfession,
            professionLabel: profLabel,
          },
          ...prev,
        ];
      }
      return prev;
    });
  }, [currentUser, selectedProfession, selectedProcedure]);

  // Limpa feedback de sucesso ao mudar procedimento
  useEffect(() => {
    setSaveSuccess(null);
  }, [selectedProcedure]);

  // Competência calculada em tempo real
  const currentCompetence = formatReferenceMonth(activityDate);

  // Lista de CBOs distintos vinculados atualmente à ação coletiva
  // Regra oficial BPA-C: Cada ação conta exatamente 1 vez para cada CBO distinto participante
  const distinctCbosList = useMemo(() => {
    return Array.from(new Set(selectedExecutants.map((e) => e.cbo.replace(/\D/g, ''))));
  }, [selectedExecutants]);

  // Lista de todos os profissionais do sistema habilitados para o procedimento selecionado
  const candidateExecutants = useMemo(() => {
    const candidates: SelectedExecutant[] = [];
    const pool = allUsers && allUsers.length > 0 ? allUsers : [currentUser];

    pool.forEach((user) => {
      const cboClean = user.cbo?.replace(/\D/g, '') || getDefaultCboForProfession(user.profession);
      // Verifica se o profissional é habilitado para este procedimento
      const isHabilitated = isCboHabilitatedForProcedure(cboClean, selectedProcedure);
      if (isHabilitated) {
        const shortName = formatFirstAndLastName(user.name);
        const profLabel = PROFESSIONS[user.profession]?.name || user.profession || 'Profissional';
        candidates.push({
          userId: user.id,
          name: user.name,
          shortName,
          cbo: cboClean,
          cboFormatted: formatCboWithHyphen(cboClean),
          profession: user.profession,
          professionLabel: profLabel,
        });
      }
    });

    // Se o usuário atual não estava na lista (ex: dados parciais), adiciona
    if (!candidates.some((c) => c.userId === currentUser.id)) {
      const cboClean = currentUser.cbo?.replace(/\D/g, '') || getDefaultCboForProfession(selectedProfession);
      candidates.unshift({
        userId: currentUser.id,
        name: currentUser.name,
        shortName: formatFirstAndLastName(currentUser.name),
        cbo: cboClean,
        cboFormatted: formatCboWithHyphen(cboClean),
        profession: selectedProfession,
        professionLabel: PROFESSIONS[selectedProfession]?.name || 'Profissional',
      });
    }

    return candidates;
  }, [allUsers, currentUser, selectedProfession, selectedProcedure]);

  // Alterna seleção de um executante na lista múltipla
  const handleToggleExecutant = (candidate: SelectedExecutant) => {
    setSelectedExecutants((prev) => {
      const isSelected = prev.some(
        (e) => (e.userId && e.userId === candidate.userId) || e.name === candidate.name
      );
      if (isSelected) {
        if (prev.length <= 1) {
          onShowToast(
            'warning',
            'A ação coletiva deve conter ao menos um profissional executante.',
            'Atenção'
          );
          return prev;
        }
        return prev.filter(
          (e) => !((e.userId && e.userId === candidate.userId) || e.name === candidate.name)
        );
      } else {
        return [...prev, candidate];
      }
    });
  };

  // Gerador de Tema com IA Especializada
  const handleGenerateAiTheme = () => {
    setIsGeneratingTheme(true);
    try {
      const procedureThemes =
        SPECIALIZED_THEMES_BY_PROCEDURE[selectedProcedure.code] || [
          `Atividade Coletiva de ${selectedProcedure.name} no CAPS I`,
          `Roda de Cuidado e Reabilitação Psicossocial: ${selectedProcedure.name}`,
        ];

      const nextTheme = procedureThemes[themeSuggestionIndex % procedureThemes.length];
      setThemeSuggestionIndex((prev) => prev + 1);
      setTheme(nextTheme);

      onShowToast(
        'success',
        `Tema especializado gerado com base no procedimento "${selectedProcedure.name}".`,
        'Tema Gerado com IA'
      );
    } catch {
      onShowToast('error', 'Não foi possível gerar sugestão de tema.', 'Erro');
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  // Manipulação de microfone (Speech Recognition Web API)
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onShowToast('warning', 'Reconhecimento de voz não suportado neste navegador.', 'Voz Indisponível');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      setRecognitionInstance(recognition);
      setIsRecording(true);
      onShowToast('info', 'Gravando voz... Fale o relato da atividade coletiva.', 'Microfone Ativo');
    } catch {
      setIsRecording(false);
    }
  };

  // Gerador de síntese técnica da atividade
  const handleGenerateAiSummary = () => {
    const defaultTheme = theme.trim() || selectedProcedure.name;
    const executantsNames = selectedExecutants.map((e) => `${e.shortName} (${e.cboFormatted})`).join(', ');

    const generatedReport = `Atividade coletiva realizada no CAPS I em ${new Date(activityDate + 'T12:00:00Z').toLocaleDateString('pt-BR')} com a participação de ${participantsCount} usuários.
Tema da Ação: ${defaultTheme}.
Profissionais Executantes: ${executantsNames}.
Procedimento: ${selectedProcedure.code} - ${selectedProcedure.name}.
Objetivos: Promoção do protagonismo, fortalecimento de vínculos comunitários, estabilização clínica e ampliação do repertório psicossocial no território.
Desenvolvimento: Acolhimento inicial dos participantes, apresentação da proposta da atividade pelos executantes, participação ativa dos usuários nas dinâmicas e fechamento com avaliação grupal positiva. Todos os participantes demonstraram boa adesão e colaboração mútua.`;

    setDescription(generatedReport);
    if (!theme) setTheme(defaultTheme);
    onShowToast('success', 'Relato técnico estruturado gerado com sucesso!', 'Relato IA Pronto');
  };

  // Copiar ata da atividade
  const handleCopyRecord = async () => {
    const executantsText = selectedExecutants
      .map((e) => `• ${e.cboFormatted} - ${e.professionLabel} - ${e.shortName}`)
      .join('\n');

    const textToCopy = `ATA DE ATIVIDADE COLETIVA - CAPS I (${CAPS_CNES})
Data: ${new Date(activityDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
Procedimento: ${selectedProcedure.code} - ${selectedProcedure.name}
Competência: ${currentCompetence}
ID Único da Ação: ${actionId}
Total de Participantes: ${participantsCount}
Tema: ${theme || 'Não informado'}

CBO(s) EXECUTANTE(S) (${selectedExecutants.length} profissionais):
${executantsText}

MEMÓRIA / RELATO DA AÇÃO:
${description || 'Sem anotações registradas.'}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      onShowToast('success', 'Ata da atividade coletiva copiada com sucesso!', 'Copiado');
    } catch {
      onShowToast('error', 'Falha ao copiar texto.', 'Erro');
    }
  };

  // Iniciar edição de uma ação pelo formulário principal (topo)
  const handleStartEditAction = (item: CollectiveActionRecord) => {
    setEditingActionId(item.id);
    setActionId(item.actionId || item.id);
    setActivityDate(item.dateService || new Date().toISOString().split('T')[0]);
    setTheme(item.theme || '');
    setDescription(item.description || '');
    setParticipantsCount(Number(item.participantsCount) || 1);
    if (item.executants && Array.isArray(item.executants) && item.executants.length > 0) {
      setSelectedExecutants(item.executants);
    }
    setSaveSuccess(null);
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onShowToast('info', `Ação "${item.theme || item.procedureName}" carregada no formulário para edição.`, 'Modo Edição');
  };

  // Abrir modal de edição rápida (edição direta na tela)
  const handleOpenEditModal = (item: CollectiveActionRecord) => {
    setActionPendingEdit(item);
    setEditModalTheme(item.theme || '');
    setEditModalDescription(item.description || '');
    setEditModalParticipants(Number(item.participantsCount) || 1);
    setEditModalDate(item.dateService || new Date().toISOString().split('T')[0]);
  };

  // Salvar alterações da ação através do Modal de Edição
  const handleSaveEditModal = async () => {
    if (!actionPendingEdit) return;
    if (editModalParticipants <= 0) {
      onShowToast('warning', 'A quantidade de participantes deve ser no mínimo 1.', 'Aviso');
      return;
    }

    setIsSavingEditModal(true);
    try {
      const updatedItem: CollectiveActionRecord = {
        ...actionPendingEdit,
        theme: editModalTheme.trim() || actionPendingEdit.procedureName,
        description: editModalDescription.trim(),
        participantsCount: editModalParticipants,
        dateService: editModalDate || actionPendingEdit.dateService,
      };

      // 1. Grava no Banco de Dados 1 (Supabase em coluna única raw_data) e Servidor
      await saveCollectiveActionToFirestore(updatedItem);

      // 2. Atualiza estado e storage local
      setHistoryRecords((prev) => {
        const updated = prev.map((r) => (r.id === updatedItem.id ? updatedItem : r));
        safeSetItem('pec_collective_records', updated);
        return updated;
      });

      // Se o formulário principal estava com esta ação em edição, sincroniza os campos
      if (editingActionId === updatedItem.id) {
        setTheme(updatedItem.theme);
        setDescription(updatedItem.description);
        setParticipantsCount(updatedItem.participantsCount);
        setActivityDate(updatedItem.dateService);
      }

      onShowToast('success', 'Ação coletiva atualizada com sucesso no Histórico e no Banco de Dados 1!', 'Ação Atualizada');
      setActionPendingEdit(null);
    } catch (err: any) {
      onShowToast('error', `Erro ao salvar alterações: ${err?.message || String(err)}`, 'Erro de Edição');
    } finally {
      setIsSavingEditModal(false);
    }
  };

  // Cancelar modo de edição
  const handleCancelEdit = () => {
    setEditingActionId(null);
    setActionId(`act-bpac-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    setTheme('');
    setDescription('');
    onShowToast('info', 'Edição cancelada. Pronto para formular nova ação.', 'Edição Cancelada');
  };

  // Confirmar e executar a exclusão da ação (sem depender de window.confirm)
  const handleConfirmDelete = async () => {
    if (!actionPendingDelete) return;
    const item = actionPendingDelete;
    setIsDeleting(true);

    try {
      // 1. Remove do Banco 1 (Supabase e Servidor)
      await deleteCollectiveActionFromFirestore(item.id);

      // 2. Remove do estado e storage local
      setHistoryRecords((prev) => {
        const updated = prev.filter((r) => r.id !== item.id && (item.actionId ? r.actionId !== item.actionId : true));
        safeSetItem('pec_collective_records', updated);
        return updated;
      });

      if (editingActionId === item.id) {
        handleCancelEdit();
      }

      onShowToast('success', `Ação "${item.theme || item.procedureName}" excluída com sucesso do Histórico e do Banco de Dados 1.`, 'Ação Excluída');
      setActionPendingDelete(null);
    } catch (err: any) {
      onShowToast('error', `Falha ao excluir ação: ${err?.message || String(err)}`, 'Erro ao Excluir');
    } finally {
      setIsDeleting(false);
    }
  };



  // Gravar no Banco de Dados 2 (BPA-C) com ID Único e Regra de CBOs Distintos + Gravar no Banco de Dados 1
  const handleSaveToDb2 = async () => {
    if (selectedExecutants.length === 0) {
      onShowToast('warning', 'Selecione pelo menos um profissional executante.', 'Campo Obrigatório');
      return;
    }
    if (participantsCount <= 0) {
      onShowToast('warning', 'Informe a quantidade de participantes (mínimo 1).', 'Campo Obrigatório');
      return;
    }

    // 1. Extrai todos os CBOs distintos (6 dígitos numéricos)
    // Regra oficial do BPA-C: A produção contabiliza uma ação para cada CBO vinculado.
    // Se CBOs se repetirem (ex: 2 enfermeiros), contabiliza apenas UMA vez para o CBO de enfermeiro.
    const distinctCbos = Array.from(
      new Set(selectedExecutants.map((e) => e.cbo.replace(/\D/g, '')))
    );

    // 2. Se não estiver em modo de edição, verifica se esta ação com actionId já foi gravada
    const previouslyRecordedActions = historyRecords.filter(
      (r: any) => r.actionId === actionId && r.id !== editingActionId
    );
    const alreadyLinkedCbos = new Set(
      previouslyRecordedActions.flatMap((r: any) => r.registeredCbos || [r.cbo])
    );

    const duplicateCbos = distinctCbos.filter((cbo) => alreadyLinkedCbos.has(cbo));
    const newCbosToRegister = editingActionId
      ? distinctCbos.filter((cbo) => !alreadyLinkedCbos.has(cbo))
      : distinctCbos.filter((cbo) => !alreadyLinkedCbos.has(cbo));

    // Se todos os CBOs já foram vinculados para esta ação (e não for edição), bloqueia e avisa
    if (!editingActionId && duplicateCbos.length > 0 && newCbosToRegister.length === 0) {
      const dupLabels = duplicateCbos.map(formatCboWithHyphen).join(', ');
      onShowToast(
        'warning',
        `Esta ação coletiva já foi vinculada anteriormente para o(s) CBO(s): ${dupLabels}. No BPA-C cada ação é registrada uma única vez por CBO.`,
        'Ação Já Vinculada a esse CBO'
      );
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);

    try {
      // Se houver novos CBOs a registrar na produção BPA-C
      if (newCbosToRegister.length > 0) {
        for (const cbo of newCbosToRegister) {
          try {
            await recordBpaCInDb2({
              dateService: activityDate,
              cbo,
              procedureCode: selectedProcedure.code,
              procedureName: selectedProcedure.name,
              participantsCount, // Controle interno e memória da ata
              actionQuantity: 1, // Exatamente 1 ação para fins de produção BPA-C
              theme: theme.trim() || selectedProcedure.name,
              description: description.trim(),
              authorName: currentUser.name,
            });
          } catch (db2Err) {
            console.warn('[BPA-C DB2 Aviso]:', db2Err);
          }
        }
      }

      // Registra o item completo da Ação Coletiva (com tema, participantes, profissionais e relato)
      const newHistoryItem: CollectiveActionRecord = {
        id: editingActionId || `bpac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actionId,
        timestamp: Date.now(),
        dateService: activityDate,
        cnes: CAPS_CNES,
        cbo: distinctCbos.join(', '),
        cboLabel: distinctCbos.map(formatCboWithHyphen).join(', '),
        procedureCode: selectedProcedure.code,
        procedureName: selectedProcedure.name,
        participantsCount, // Apenas para controle interno
        actionQuantityPerCbo: 1,
        productionQuantityTotal: distinctCbos.length,
        theme: theme.trim() || selectedProcedure.name,
        description: description.trim(),
        authorName: currentUser.name,
        executants: selectedExecutants,
        totalExecutants: selectedExecutants.length,
        registeredCbos: Array.from(new Set([...Array.from(alreadyLinkedCbos), ...distinctCbos])),
        status: 'Finalizado',
        db2Synced: true,
        db2Message: `+${distinctCbos.length} ação(ões) na produção BPA-C (1 por CBO distinto)`,
      };

      // 1. Grava no Banco de Dados 1 em coluna única raw_data (armazenando o objeto completo da ação coletiva)
      try {
        await saveCollectiveActionToFirestore(newHistoryItem);
      } catch (db1Err) {
        console.warn('Aviso ao sincronizar ação no Banco 1:', db1Err);
      }

      // 2. Atualiza estado e storage local
      if (editingActionId) {
        setHistoryRecords((prev) => {
          const updated = prev.map((r) => (r.id === editingActionId ? newHistoryItem : r));
          safeSetItem('pec_collective_records', updated);
          return updated;
        });
        setEditingActionId(null);
      } else {
        setHistoryRecords((prev) => {
          const updated = [newHistoryItem, ...prev];
          safeSetItem('pec_collective_records', updated);
          return updated;
        });
      }

      const successMsg = editingActionId
        ? `Ação Coletiva atualizada com sucesso no Histórico de Ações e no Banco de Dados 1! Produção: ${newCbosToRegister.length} ação(ões) no BPA-C.`
        : `Ação Coletiva gravada com sucesso no Banco 1 (Histórico) e no Banco 2 (BPA-C)! Produção: ${newCbosToRegister.length} ação(ões) no lote BPA-C (1 para cada CBO distinto: ${newCbosToRegister.map(formatCboWithHyphen).join(', ')}). ${participantsCount} participante(s) registrado(s) para controle interno.`;

      setSaveSuccess(successMsg);
      onShowToast('success', successMsg, editingActionId ? 'Ação Atualizada' : 'Ação Gravada nos Bancos');

      if (onRecordSaved) {
        onRecordSaved(newHistoryItem);
      }
    } catch (err: any) {
      onShowToast('error', `Falha na gravação do BPA-C: ${err?.message || String(err)}`, 'Erro de Gravação');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={formTopRef} className="space-y-6">
      {/* Banner de Edição de Ação Existente */}
      {editingActionId && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 dark:text-amber-100 flex flex-wrap items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">Modo de Edição de Ação</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/60 font-bold">
                  {actionId}
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Altere os dados desejados e clique no botão verde abaixo para <strong>Salvar Alterações</strong> no Banco 1 e no BPA-C.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancelar Edição</span>
          </button>
        </div>
      )}

      {/* Cabeçalho de Badges Informativos */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
            <Users className="w-3.5 h-3.5" />
            Instrumento: BPA-C (Consolidado)
          </span>
          <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            CNES: {CAPS_CNES} ({CAPS_MODALITY})
          </span>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Status Automático: Finalizado
        </span>
      </div>

      {/* Card do Procedimento Coletivo Selecionado */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                {selectedProcedure.code}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {selectedProcedure.name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {selectedProcedure.rule}
            </p>
          </div>
        </div>

        {selectedProcedure.typicalCbos && selectedProcedure.typicalCbos.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400">CBOs Habilitados:</span>
            {selectedProcedure.typicalCbos
              .filter((c) => /^\d{4}-?\d{2}$/.test(c))
              .slice(0, 10)
              .map((cbo, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-medium"
                >
                  {formatCboWithHyphen(cbo)}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Grade de Parâmetros da Ação Coletiva */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Data da Atividade (3 colunas em lg) */}
        <div className="lg:col-span-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            Data da Atividade:
          </label>
          <input
            type="date"
            value={activityDate}
            onChange={(e) => setActivityDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Competência:</span>
            <span className="font-bold text-teal-700 dark:text-teal-400">{currentCompetence}</span>
          </div>
        </div>

        {/* 2. CBO Executante (Multi-select com contagem automática e formato CBO - Profissão - 1º e último nome) (6 colunas em lg) */}
        <div
          ref={executantsDropdownRef}
          className="lg:col-span-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 relative"
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              CBO Executante:
            </label>
            {/* Mostra aqui o número de profissionais selecionados de forma automática e fixa */}
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-black border border-indigo-200/80 dark:border-indigo-800 shadow-2xs">
              {selectedExecutants.length} {selectedExecutants.length === 1 ? 'profissional selecionado' : 'profissionais selecionados'}
            </span>
          </div>

          {/* Exibição dos Profissionais Selecionados (Formato: CBO - Profissão - 1º e último nome) */}
          <div className="min-h-[42px] p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex flex-wrap items-center gap-1.5">
            {selectedExecutants.map((exec) => (
              <span
                key={exec.userId || exec.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-100 text-xs font-semibold border border-indigo-200 dark:border-indigo-800"
              >
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {exec.cboFormatted}
                </span>
                <span>-</span>
                <span className="truncate">{exec.professionLabel}</span>
                <span>-</span>
                <span className="font-bold">{exec.shortName}</span>
                {selectedExecutants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleToggleExecutant(exec)}
                    className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-md transition-colors cursor-pointer text-indigo-500 hover:text-indigo-800"
                    title="Remover executante"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

            {/* Botão para abrir lista suspensa de seleção múltipla */}
            <button
              type="button"
              onClick={() => setIsExecutantsDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs ml-auto"
            >
              <span>+ Adicionar / Alterar</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isExecutantsDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
            Selecione um ou mais profissionais habilitados. A produção contabiliza uma ação para cada CBO distinto.
          </p>

          {/* Menu Suspenso de Seleção Múltipla com Espaçamento Mínimo */}
          {isExecutantsDropdownOpen && (
            <div className="absolute left-4 right-4 top-full mt-1 z-50 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-850 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                <span>Profissionais Habilitados para {selectedProcedure.code}</span>
                <span className="text-teal-600 dark:text-teal-400">Múltipla Escolha</span>
              </div>
              {candidateExecutants.length === 0 ? (
                <div className="p-3 text-center text-slate-500">
                  Nenhum profissional habilitado encontrado na equipe.
                </div>
              ) : (
                candidateExecutants.map((candidate) => {
                  const isChecked = selectedExecutants.some(
                    (e) => (e.userId && e.userId === candidate.userId) || e.name === candidate.name
                  );
                  return (
                    <button
                      key={candidate.userId || candidate.name}
                      type="button"
                      onClick={() => handleToggleExecutant(candidate)}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                          {candidate.cboFormatted}
                        </span>
                        <span>-</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {candidate.professionLabel}
                        </span>
                        <span>-</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {candidate.shortName}
                        </span>
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 3. Participantes da Atividade (Apenas Controle Interno / Não é Quantidade BPA-C) (3 colunas em lg) */}
        <div className="lg:col-span-3 p-4 rounded-2xl bg-gradient-to-b from-white via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 border border-amber-300/80 dark:border-amber-800/80 shadow-xs space-y-2.5 transition-all">
          <div className="flex items-center justify-between gap-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Participantes da Ação:</span>
            </label>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/80 text-[10px] font-black uppercase tracking-wider">
              Controle Interno
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setParticipantsCount((prev) => Math.max(1, prev - 1))}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs font-bold"
              title="Diminuir participantes"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min={1}
              max={999}
              value={participantsCount}
              onChange={(e) => setParticipantsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="flex-1 text-center font-mono text-lg font-black py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-amber-300/80 dark:border-amber-700/80 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => setParticipantsCount((prev) => prev + 1)}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs font-bold"
              title="Aumentar participantes"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Atalhos:</span>
            <div className="flex gap-1">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setParticipantsCount(n)}
                  className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 cursor-pointer"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/40 text-[10.5px] text-amber-950 dark:text-amber-200 leading-tight">
            <span className="font-bold">Aviso Oficial:</span> Este número serve apenas para <strong>controle interno e ata</strong>. No BPA-C, a produção contabiliza <strong>1 ação por CBO distinto</strong>.
          </div>
        </div>
      </div>

      {/* Painel de Transparência da Regra de Produção BPA-C vs Controle Interno */}
      <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/80 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
              <Info className="w-4 h-4" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-100">
              Regra Oficial de Produção BPA-C (Ministério da Saúde / CAPS)
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-extrabold font-mono">
            Produção no Banco: +{distinctCbosList.length} {distinctCbosList.length === 1 ? 'ação' : 'ações'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Profissionais Vinculados</span>
            <p className="font-extrabold text-slate-800 dark:text-slate-100">
              {selectedExecutants.length} {selectedExecutants.length === 1 ? 'profissional' : 'profissionais'}
            </p>
            <p className="text-[11px] text-slate-500 truncate" title={selectedExecutants.map((e) => e.shortName).join(', ')}>
              {selectedExecutants.map((e) => e.shortName).join(', ')}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CBOs Distintos na Ação</span>
            <p className="font-extrabold text-indigo-700 dark:text-indigo-300">
              {distinctCbosList.length} {distinctCbosList.length === 1 ? 'CBO distinto' : 'CBOs distintos'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              {distinctCbosList.map(formatCboWithHyphen).join(', ')}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contabilização BPA-C</span>
            <p className="font-extrabold text-emerald-700 dark:text-emerald-400">
              1 ação p/ cada CBO distinto
            </p>
            <p className="text-[11px] text-slate-500">
              Total: {distinctCbosList.length} {distinctCbosList.length === 1 ? 'ação no mês' : 'ações no mês'} (sem duplicar CBO)
            </p>
          </div>
        </div>

        <p className="text-[11px] text-indigo-900/85 dark:text-indigo-300/85 leading-relaxed pt-1">
          📌 <strong>Esclarecimento Normativo:</strong> O quantitativo de participantes ({participantsCount}) é estritamente para controle interno institucional e ata. Na base de dados BPA-C do SUS, a produção não multiplica pelo número de participantes: cada ação realizada contabiliza <strong>1 ação para o médico e 1 ação para o psicólogo</strong> (totalizando 2 ações neste mês, 1 para cada CBO sem repetir o CBO do psicólogo).
        </p>
      </div>

      {/* Tema da Atividade com Criação Manual OU Geração Especializada com IA */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            Tema / Objetivo da Ação Coletiva:
          </label>

          {/* Botão Gerar Tema com IA Especializada */}
          <button
            type="button"
            onClick={handleGenerateAiTheme}
            disabled={isGeneratingTheme}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
            title="Gerar sugestão de tema especializada de acordo com o procedimento selecionado"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>{isGeneratingTheme ? 'Gerando Tema...' : 'Gerar Tema com IA'}</span>
          </button>
        </div>

        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Digite o tema da atividade ou clique em 'Gerar Tema com IA'..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        />
      </div>

      {/* Relato / Memória Técnica da Atividade */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            Relato Técnico / Memória da Atividade (Texto ou Voz):
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRecording}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                isRecording
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-teal-600" />}
              <span>{isRecording ? 'Parar Gravação' : 'Ditar por Voz'}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateAiSummary}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Gerar Relato Técnico com IA</span>
            </button>

            <button
              type="button"
              onClick={handleCopyRecord}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copiado!' : 'Copiar Ata'}</span>
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva a dinâmica da atividade grupal, participação dos usuários, interações psicossociais, materiais utilizados e desfechos clínicos..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 leading-relaxed resize-y"
        />
      </div>

      {/* Apenas o Botão de Gravação (Card 'RESUMO DO REGISTRO NO BANCO DE DADOS 2' excluído conforme solicitação) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/5 to-transparent border border-teal-500/20 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-xs">
          <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" />
            Lote BPA-C • Competência {currentCompetence}
          </span>
          <p className="text-slate-500 dark:text-slate-400">
            Contabilização por CBO distinta. ID da ação: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{actionId}</span>
          </p>
        </div>

        <SpecularButton
          type="button"
          onClick={handleSaveToDb2}
          disabled={isSaving}
          size="lg"
          radius={16}
          className={`w-full sm:w-auto px-8 py-3.5 text-white font-bold shadow-lg inline-flex items-center justify-center gap-2.5 cursor-pointer shrink-0 disabled:opacity-60 transition-all ${
            editingActionId
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
              : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/25'
          }`}
        >
          <Save className="w-5 h-5" />
          <span>
            {isSaving
              ? 'Gravando...'
              : editingActionId
              ? 'SALVAR ALTERAÇÕES NA AÇÃO'
              : 'GRAVAR PRODUÇÃO NO BPA-C'}
          </span>
        </SpecularButton>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{saveSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionId(`act-bpac-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
              setTheme('');
              setDescription('');
              setEditingActionId(null);
              setSaveSuccess(null);
              onShowToast('info', 'Pronto para formular um novo registro de ação coletiva.', 'Nova Ação');
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-500 transition-colors shrink-0 cursor-pointer"
          >
            + Iniciar Nova Ação
          </button>
        </div>
      )}

      {/* Componente 1: Histórico de Ações */}
      <div id="component-historico-acoes" className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            Histórico de Ações
          </h4>
        </div>

        {historyRecords.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-dashed border-slate-200 dark:border-slate-800 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Nenhuma ação coletiva registrada até o momento.
            </p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Ao preencher a ata e clicar em <strong>"Gravar Produção no BPA-C"</strong>, a ação completa será guardada no <strong>Banco de Dados 1</strong> (tabela <code>collective_actions</code>) e no lote de produção.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
            {historyRecords.map((item: any) => (
              <div
                key={item.id}
                className={`py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors rounded-xl px-2.5 ${
                  editingActionId === item.id
                    ? 'bg-amber-50/80 dark:bg-amber-950/50 border border-amber-300/80 dark:border-amber-700/80'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-850/60'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-1.5 py-0.5 rounded text-[11px]">
                      {item.procedureCode}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.procedureName}
                    </span>
                    {item.actionId && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        ID: {item.actionId}
                      </span>
                    )}
                    {editingActionId === item.id && (
                      <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                        Em Edição no Topo
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                    <span>📅 {new Date(item.dateService + 'T12:00:00Z').toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      👥 {item.participantsCount} participantes (controle interno)
                    </span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold font-mono text-[10.5px]">
                      +{item.productionQuantityTotal || (item.registeredCbos ? item.registeredCbos.length : 1)} ação(ões) BPA-C
                    </span>
                    {item.totalExecutants && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {item.totalExecutants} profissional(is) vinculado(s)
                        </span>
                      </>
                    )}
                  </div>

                  {item.theme && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic truncate">
                      Tema: "{item.theme}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Botão Editar Ação (Abre modal de edição imediata) */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(item)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Editar dados desta ação coletiva"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  {/* Botão Excluir Ação (Abre confirmação inline sem depender de window.confirm) */}
                  <button
                    type="button"
                    onClick={() => setActionPendingDelete(item)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Excluir ação do Histórico e do Banco de Dados 1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão (100% Funcional sem window.confirm) */}
      {actionPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm uppercase tracking-wider">
                <Trash2 className="w-5 h-5" />
                <span>Excluir Ação Coletiva</span>
              </div>
              <button
                type="button"
                onClick={() => setActionPendingDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-100">
                {actionPendingDelete.procedureCode} - {actionPendingDelete.procedureName}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Data: <strong>{new Date(actionPendingDelete.dateService + 'T12:00:00Z').toLocaleDateString('pt-BR')}</strong> • Participantes: <strong>{actionPendingDelete.participantsCount}</strong>
              </p>
              {actionPendingDelete.theme && (
                <p className="italic text-slate-500 dark:text-slate-400 truncate">
                  "{actionPendingDelete.theme}"
                </p>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tem certeza que deseja excluir esta ação? O registro será removido do <strong>Histórico de Ações</strong> e do <strong>Banco de Dados 1</strong> (Supabase).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActionPendingDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Ação'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição Rápida da Ação */}
      {actionPendingEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-xl p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
                    Editar Ação Coletiva
                  </h3>
                  <span className="font-mono text-[10px] text-slate-400">
                    ID: {actionPendingEdit.actionId || actionPendingEdit.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionPendingEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Procedimento:
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-200">
                  {actionPendingEdit.procedureCode} - {actionPendingEdit.procedureName}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Atividade:
                  </label>
                  <input
                    type="date"
                    value={editModalDate}
                    onChange={(e) => setEditModalDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Participantes (Controle Interno):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditModalParticipants((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={editModalParticipants}
                      onChange={(e) => setEditModalParticipants(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-20 text-center px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setEditModalParticipants((p) => p + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tema / Objetivo da Ação:
                </label>
                <input
                  type="text"
                  value={editModalTheme}
                  onChange={(e) => setEditModalTheme(e.target.value)}
                  placeholder="Tema da ação..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Relato Técnico / Ata da Atividade:
                </label>
                <textarea
                  rows={4}
                  value={editModalDescription}
                  onChange={(e) => setEditModalDescription(e.target.value)}
                  placeholder="Descrição da atividade..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 leading-relaxed resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleStartEditAction(actionPendingEdit);
                  setActionPendingEdit(null);
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                Editar no Formulário Principal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActionPendingEdit(null)}
                  disabled={isSavingEditModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  disabled={isSavingEditModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEditModal ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
