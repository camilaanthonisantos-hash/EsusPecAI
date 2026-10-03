import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FlaskConical,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  BookOpen,
  Camera,
  Heart,
  Activity,
  Layers,
  Sparkles,
  Clock,
  Loader2,
} from 'lucide-react';
import { SUSExam, ExamCategory } from '../types';
import { OFFICIAL_SUS_EXAMS } from '../data/susExams';

interface ExamsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  exams: SUSExam[];
  onSaveExam: (exam: SUSExam) => Promise<void> | void;
  onDeleteExam: (id: string) => Promise<void> | void;
  onResetToDefaults: () => Promise<void> | void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  isAdmin?: boolean;
}

const CATEGORY_TABS: { id: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'Todos os Exames', icon: Layers },
  { id: 'Laboratorial', label: 'Laboratoriais', icon: FlaskConical },
  { id: 'Imagem', label: 'Imagem / Raio-X / USG', icon: Camera },
  { id: 'Cardiológico', label: 'Cardiológicos', icon: Heart },
  { id: 'Ginecológico/Obstétrico', label: 'Gineco / Obstétricos', icon: Activity },
  { id: 'Outros', label: 'Outros Procedimentos', icon: BookOpen },
];

export const ExamsDrawer: React.FC<ExamsDrawerProps> = ({
  isOpen,
  onClose,
  exams = [],
  onSaveExam,
  onDeleteExam,
  onResetToDefaults,
  onShowToast,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingExam, setEditingExam] = useState<SUSExam | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for add/edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ExamCategory>('Laboratorial');
  const [formSigtap, setFormSigtap] = useState('');
  const [formIndication, setFormIndication] = useState('');
  const [formPreparation, setFormPreparation] = useState('');

  const displayList = useMemo(() => {
    return exams.length > 0 ? exams : OFFICIAL_SUS_EXAMS;
  }, [exams]);

  const filtered = useMemo(() => {
    let list = displayList;

    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.category === selectedCategory);
    }

    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;

    return list.filter((e) => {
      const matchName = (e.name || '').toLowerCase().includes(q);
      const matchSigtap = e.sigtapCode?.toLowerCase().includes(q);
      const matchInd = e.clinicalIndication?.toLowerCase().includes(q);
      const matchPrep = e.preparation?.toLowerCase().includes(q);
      const matchKeywords = e.keywords?.some((k) => (k || '').toLowerCase().includes(q));
      return matchName || matchSigtap || matchInd || matchPrep || matchKeywords;
    });
  }, [displayList, selectedCategory, searchTerm]);

  const handleStartAdd = () => {
    setEditingExam(null);
    setFormName('');
    setFormCategory('Laboratorial');
    setFormSigtap('');
    setFormIndication('');
    setFormPreparation('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (exam: SUSExam) => {
    setIsAddingNew(false);
    setEditingExam(exam);
    setFormName(exam.name);
    setFormCategory(exam.category);
    setFormSigtap(exam.sigtapCode || '');
    setFormIndication(exam.clinicalIndication || '');
    setFormPreparation(exam.preparation || '');
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingExam(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      onShowToast('error', 'O nome do exame é obrigatório.', 'Campo Inválido');
      return;
    }

    const cleanName = formName.trim().toUpperCase();
    const examData: SUSExam = {
      id: editingExam ? editingExam.id : `exam-custom-${Date.now()}`,
      name: cleanName,
      category: formCategory,
      sigtapCode: formSigtap.trim() || undefined,
      clinicalIndication: formIndication.trim() || undefined,
      preparation: formPreparation.trim() || undefined,
      keywords: (cleanName || '').toLowerCase().split(/\s+/),
      active: true,
      isDefault: editingExam ? editingExam.isDefault : false,
      createdAt: editingExam ? editingExam.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    setIsSubmitting(true);
    try {
      await onSaveExam(examData);
      onShowToast(
        'success',
        `Exame "${cleanName}" ${editingExam ? 'atualizado' : 'cadastrado'} com sucesso!`,
        'Banco Atualizado'
      );
      handleCancelForm();
    } catch (err) {
      console.error('Erro ao salvar exame no catálogo:', err);
      onShowToast('error', 'Falha ao salvar o exame no banco de dados.', 'Erro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir o exame "${name}" do catálogo oficial?`)) {
      return;
    }
    try {
      await onDeleteExam(id);
      onShowToast('info', `Exame "${name}" removido do catálogo.`, 'Excluído');
    } catch (err) {
      onShowToast('error', 'Não foi possível excluir o exame.', 'Erro');
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        'Deseja restaurar a base oficial de exames SUS com a relação padrão completa? (Itens customizados não serão perdidos se estiverem ativos)'
      )
    ) {
      return;
    }
    try {
      await onResetToDefaults();
      onShowToast(
        'success',
        'Base oficial de exames restaurada com sucesso!',
        'Restauração Concluída'
      );
    } catch (err) {
      onShowToast('error', 'Erro ao restaurar a base oficial de exames.', 'Erro');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Catálogo de Exames SUS / APS / Imagem
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {displayList.length} exames disponíveis no banco de dados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartAdd}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-98 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo Exame</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Restaurar base padrão de exames SUS"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome, código SIGTAP, indicação clínica..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add / Edit Form Modal Inline */}
          {(isAddingNew || editingExam) && (
            <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xs uppercase text-blue-950 dark:text-blue-100">
                  {editingExam ? 'Editar Exame Cadastrado' : 'Cadastrar Novo Exame'}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      Nome do Exame *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: HEMOGRAMA COMPLETO"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold uppercase text-xs"
                      required
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      Categoria
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ExamCategory)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="Laboratorial">Laboratorial</option>
                      <option value="Imagem">Imagem / Raio-X / USG</option>
                      <option value="Cardiológico">Cardiológico</option>
                      <option value="Ginecológico/Obstétrico">Gineco / Obstétrico</option>
                      <option value="Outros">Outros Procedimentos</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      Código SIGTAP
                    </label>
                    <input
                      type="text"
                      value={formSigtap}
                      onChange={(e) => setFormSigtap(e.target.value)}
                      placeholder="Ex: 02.02.01.047-3"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      Indicação Clínica Padrão
                    </label>
                    <input
                      type="text"
                      value={formIndication}
                      onChange={(e) => setFormIndication(e.target.value)}
                      placeholder="Ex: Rastreio de anemias e infecções"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-12">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      Instruções de Preparo ao Paciente
                    </label>
                    <input
                      type="text"
                      value={formPreparation}
                      onChange={(e) => setFormPreparation(e.target.value)}
                      placeholder="Ex: Jejum obrigatório de 8 a 12 horas"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-98 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Salvar no Catálogo</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Exams */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">Nenhum exame localizado.</p>
              </div>
            ) : (
              filtered.map((exam) => (
                <div
                  key={exam.id}
                  className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                        {exam.name}
                      </h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        {exam.category}
                      </span>
                      {exam.sigtapCode && (
                        <span className="text-[9px] font-mono text-slate-400">
                          SIGTAP: {exam.sigtapCode}
                        </span>
                      )}
                    </div>

                    {exam.clinicalIndication && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {exam.clinicalIndication}
                      </p>
                    )}

                    {exam.preparation && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>Preparo: {exam.preparation}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(exam)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Editar exame"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(exam.id, exam.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir exame do catálogo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
