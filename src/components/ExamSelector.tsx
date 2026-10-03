import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Plus,
  Check,
  Filter,
  Layers,
  FlaskConical,
  Camera,
  Activity,
  Heart,
  FolderPlus,
  X,
  Clock,
  Loader2,
  Info,
} from 'lucide-react';
import { SUSExam, ExamCategory, RequestedExamItem } from '../types';
import { OFFICIAL_SUS_EXAMS, ROUTINE_EXAM_PACKAGES } from '../data/susExams';

interface ExamSelectorProps {
  exams?: SUSExam[];
  selectedExams: RequestedExamItem[];
  onAddExam: (exam: {
    examId?: string;
    name: string;
    category?: string;
    clinicalIndication?: string;
    urgency?: boolean;
  }) => void;
  onAddMultipleExams?: (
    exams: {
      examId?: string;
      name: string;
      category?: string;
      clinicalIndication?: string;
    }[]
  ) => void;
  onSaveNewExamToDb?: (exam: SUSExam) => Promise<void> | void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const CATEGORIES: { id: string; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'Todos os Exames', icon: Filter },
  { id: 'Laboratorial', label: 'Laboratoriais', icon: FlaskConical },
  { id: 'Imagem', label: 'Imagem / Raio-X / USG', icon: Camera },
  { id: 'Cardiológico', label: 'Cardiológicos / ECG', icon: Heart },
  { id: 'Ginecológico/Obstétrico', label: 'Ginecológicos / Obstétricos', icon: Activity },
  { id: 'Outros', label: 'Outros Procedimentos', icon: Layers },
];

export const ExamSelector: React.FC<ExamSelectorProps> = ({
  exams = [],
  selectedExams,
  onAddExam,
  onAddMultipleExams,
  onSaveNewExamToDb,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPackages, setShowPackages] = useState(false);
  const [showAddNewCustom, setShowAddNewCustom] = useState(false);

  // Custom Exam Form State
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ExamCategory>('Laboratorial');
  const [customSigtap, setCustomSigtap] = useState('');
  const [customIndication, setCustomIndication] = useState('');
  const [customPreparation, setCustomPreparation] = useState('');
  const [isSavingDb, setIsSavingDb] = useState(false);

  // Active list of exams
  const activeList = useMemo(() => {
    if (exams && exams.length > 0) {
      return exams.filter((e) => e.active !== false);
    }
    return OFFICIAL_SUS_EXAMS;
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    let list = activeList;

    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.category === selectedCategory);
    }

    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return list;
    }

    return list.filter((e) => {
      const matchName = (e.name || '').toLowerCase().includes(query);
      const matchSigtap = e.sigtapCode?.toLowerCase().includes(query);
      const matchCat = (e.category || '').toLowerCase().includes(query);
      const matchInd = e.clinicalIndication?.toLowerCase().includes(query);
      const matchPrep = e.preparation?.toLowerCase().includes(query);
      const matchKeywords = e.keywords?.some((k) => (k || '').toLowerCase().includes(query));
      return matchName || matchSigtap || matchCat || matchInd || matchPrep || matchKeywords;
    });
  }, [activeList, selectedCategory, searchTerm]);

  // Set of already selected exam names for quick check
  const selectedNamesSet = useMemo(() => {
    return new Set(selectedExams.map((i) => i.name.trim().toUpperCase()));
  }, [selectedExams]);

  const handleSaveCustomExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      onShowToast?.('error', 'Por favor, informe o nome do exame.');
      return;
    }

    const cleanName = customName.trim().toUpperCase();
    const newExamId = `exam-custom-${Date.now()}`;
    const newExam: SUSExam = {
      id: newExamId,
      name: cleanName,
      category: customCategory,
      sigtapCode: customSigtap.trim() || undefined,
      clinicalIndication: customIndication.trim() || undefined,
      preparation: customPreparation.trim() || undefined,
      keywords: (cleanName || '').toLowerCase().split(/\s+/),
      active: true,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setIsSavingDb(true);
    try {
      if (onSaveNewExamToDb) {
        await onSaveNewExamToDb(newExam);
      }

      // Add to currently requested items
      onAddExam({
        examId: newExamId,
        name: cleanName,
        category: customCategory,
        clinicalIndication: customIndication.trim() || undefined,
      });

      onShowToast?.(
        'success',
        `Exame "${cleanName}" cadastrado e adicionado com sucesso!`,
        'Salvo no Banco'
      );

      // Reset form
      setCustomName('');
      setCustomSigtap('');
      setCustomIndication('');
      setCustomPreparation('');
      setShowAddNewCustom(false);
    } catch (err) {
      console.error('Erro ao salvar exame personalizado:', err);
      onShowToast?.('error', 'Não foi possível salvar o novo exame no banco de dados.');
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleApplyPackage = (pkg: (typeof ROUTINE_EXAM_PACKAGES)[0]) => {
    const examsToAdd: {
      name: string;
      category?: string;
      clinicalIndication?: string;
    }[] = [];

    pkg.examNames.forEach((examName) => {
      const match = activeList.find(
        (e) => e.name.trim().toUpperCase() === examName.trim().toUpperCase()
      );
      examsToAdd.push({
        name: match ? match.name : examName,
        category: match ? match.category : 'Laboratorial',
        clinicalIndication: match ? match.clinicalIndication : undefined,
      });
    });

    if (onAddMultipleExams) {
      onAddMultipleExams(examsToAdd);
    } else {
      examsToAdd.forEach((item) => onAddExam(item));
    }

    onShowToast?.(
      'success',
      `Pacote "${pkg.name}" aplicado! ${examsToAdd.length} exames adicionados à lista.`,
      'Exames Inseridos'
    );
  };

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm">
      {/* Top Header with Quick Package Toggle & Custom Add */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Catálogo Inteligente de Exames SUS / APS / Imagem
          </h3>
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
            {activeList.length} cadastrados
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPackages(!showPackages)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              showPackages
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
            }`}
            title="Pacotes de Exames de Rotina (Check-up, Pré-Natal, Hipertensão/DM, Saúde Mental)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pacotes de Rotina APS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddNewCustom(!showAddNewCustom)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              showAddNewCustom
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
            }`}
            title="Cadastrar um novo exame no banco de dados"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Novo Exame</span>
          </button>
        </div>
      </div>

      {/* Routine Packages Accordion Section */}
      {showPackages && (
        <div className="p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wide">
              Selecione um Pacote de Exames Clínicos Predefinido:
            </span>
            <span className="text-[10px] text-blue-700 dark:text-blue-300">
              Clique para incluir todos os exames do protocolo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {ROUTINE_EXAM_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/60 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {pkg.name}
                    </h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 rounded">
                      {pkg.categoryBadge}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {pkg.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyPackage(pkg)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-xs active:scale-98 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Incluir {pkg.examNames.length} Exames</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline Form to Add New Custom Exam to Firestore */}
      {showAddNewCustom && (
        <form
          onSubmit={handleSaveCustomExam}
          className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-emerald-200/70 dark:border-emerald-800/50 pb-2">
            <div className="flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-bold text-xs uppercase">
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              <span>Cadastrar Novo Exame no Banco de Dados</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddNewCustom(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nome Completo do Exame *
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: BIÓPSIA DE PELE / ANATOMOPATOLÓGICO"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as ExamCategory)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold"
              >
                <option value="Laboratorial">Laboratorial</option>
                <option value="Imagem">Imagem / Raio-X / USG</option>
                <option value="Cardiológico">Cardiológico</option>
                <option value="Ginecológico/Obstétrico">Ginecológico/Obstétrico</option>
                <option value="Outros">Outros Procedimentos</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Código SIGTAP / SIA (Opcional)
              </label>
              <input
                type="text"
                value={customSigtap}
                onChange={(e) => setCustomSigtap(e.target.value)}
                placeholder="Ex: 02.03.01.001-9"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Indicação Clínica Padrão (Opcional)
              </label>
              <input
                type="text"
                value={customIndication}
                onChange={(e) => setCustomIndication(e.target.value)}
                placeholder="Ex: Investigação de lesão suspeita dérmica"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instruções de Preparo / Orientações (Opcional)
              </label>
              <input
                type="text"
                value={customPreparation}
                onChange={(e) => setCustomPreparation(e.target.value)}
                placeholder="Ex: Jejum de 8h / Bexiga cheia"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddNewCustom(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingDb}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingDb ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no banco...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Exame e Adicionar</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Search Input and Category Filter Chips */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisa inteligente de exames (ex: Hemograma, Glicemia, Raio-X, USG, Lítio, TSH, Urina, ECG, etc.)..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtered Exams List Results */}
      <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/50">
        {filteredExams.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Nenhum exame encontrado para "{searchTerm}".
            </p>
            <button
              type="button"
              onClick={() => {
                setCustomName(searchTerm.toUpperCase());
                setShowAddNewCustom(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Cadastrar "{searchTerm.toUpperCase()}" agora</span>
            </button>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const isSelected = selectedNamesSet.has(exam.name.trim().toUpperCase());
            return (
              <div
                key={exam.id}
                className={`pt-1.5 first:pt-0 flex items-start justify-between gap-2 p-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                      {exam.name}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded">
                      {exam.category}
                    </span>
                    {exam.sigtapCode && (
                      <span className="text-[8.5px] font-mono text-slate-400 dark:text-slate-500">
                        SIGTAP: {exam.sigtapCode}
                      </span>
                    )}
                  </div>

                  {exam.clinicalIndication && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1">
                      {exam.clinicalIndication}
                    </p>
                  )}

                  {exam.preparation && (
                    <p className="text-[9.5px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                      <span>{exam.preparation}</span>
                    </p>
                  )}
                </div>

                <div className="shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onAddExam({
                        examId: exam.id,
                        name: exam.name,
                        category: exam.category,
                        clinicalIndication: exam.clinicalIndication,
                      });
                      onShowToast?.(
                        'success',
                        `Exame "${exam.name}" adicionado à solicitação!`,
                        'Exame Selecionado'
                      );
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white'
                    }`}
                    title={isSelected ? 'Adicionado (clique para adicionar novamente ou conferir)' : 'Adicionar este exame à solicitação'}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3 text-white" />
                        <span>Adicionado</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
