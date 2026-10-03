import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Pill,
  Sparkles,
  Plus,
  Check,
  Filter,
  Info,
  ShieldAlert,
  Clock,
  BookmarkPlus,
  RefreshCw,
  Tag,
  HelpCircle,
} from 'lucide-react';
import { SUSMedication, AdministrationRoute } from '../types';
import { OFFICIAL_SUS_MEDICATIONS } from '../data/susMedications';
import { OFFICIAL_RENAME_ATC_CLASSES } from '../data/renameClasses';
import { RenameClassDropdown } from './RenameClassDropdown';

interface MedicationSelectorProps {
  medications?: SUSMedication[];
  onSelectMedication: (med: {
    name: string;
    route: AdministrationRoute;
    posology: string;
    duration: string;
    schedule: string;
    instructions?: string;
  }) => void;
  onSaveNewMedicationToDb?: (med: SUSMedication) => Promise<void> | void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const MedicationSelector: React.FC<MedicationSelectorProps> = ({
  medications = [],
  onSelectMedication,
  onSaveNewMedicationToDb,
  onShowToast,
}) => {
  // Use passed medications or fallback to official SUS list
  const activeList = useMemo(() => {
    if (medications && medications.length > 0) {
      return medications.filter((m) => m.active !== false);
    }
    return OFFICIAL_SUS_MEDICATIONS;
  }, [medications]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [isOpenList, setIsOpenList] = useState(false);
  const [showAddNewCustom, setShowAddNewCustom] = useState(false);

  // Custom new medication form
  const [customName, setCustomName] = useState('');
  const [customConcentration, setCustomConcentration] = useState('');
  const [customForm, setCustomForm] = useState('Comprimido');
  const [customRoute, setCustomRoute] = useState<AdministrationRoute>('USO ORAL');
  const [customPosology, setCustomPosology] = useState('');
  const [customDuration, setCustomDuration] = useState('DURANTE 7 DIAS');
  const [customSchedule, setCustomSchedule] = useState('');
  const [customClass, setCustomClass] = useState('Geral / Atenção Básica');
  const [customAtcCategory, setCustomAtcCategory] = useState('C: Aparelho cardiovascular');
  const [isSavingDb, setIsSavingDb] = useState(false);

  // Filtered medications by selected ATC class and search query
  const filteredMedications = useMemo(() => {
    let list = activeList;

    // Apply ATC / RENAME class filter
    if (selectedClassId !== 'all') {
      if (selectedClassId === 'comp-cbaf') {
        list = list.filter((m) => m.component === 'Farmácia Básica (CBAF)');
      } else if (selectedClassId === 'comp-raps') {
        list = list.filter((m) => m.component === 'Saúde Mental / RAPS');
      } else if (selectedClassId === 'comp-antimicrobianos') {
        list = list.filter(
          (m) => m.controlCategory === 'Antimicrobiano (2 Vias)' || !!m.awareCategory
        );
      } else if (selectedClassId === 'class-fitoterapicos') {
        list = list.filter(
          (m) =>
            m.atcCategory?.includes('Fitoter') ||
            m.atcClasses?.some((c) => c.includes('Fitoter')) ||
            m.therapeuticClass?.toLowerCase().includes('fitoter')
        );
      } else {
        // e.g. "class-c" -> "C", "class-g" -> "G"
        const targetClass = OFFICIAL_RENAME_ATC_CLASSES.find((c) => c.id === selectedClassId);
        if (targetClass) {
          const letter = targetClass.code.replace('Classe ', '').trim();
          list = list.filter((m) => {
            // Multi-class check
            if (m.atcClasses && m.atcClasses.some((c) => c.startsWith(`${letter}:`))) {
              return true;
            }
            if (m.atcCategory && m.atcCategory.startsWith(`${letter}:`)) {
              return true;
            }
            return false;
          });
        }
      }
    }

    // Apply search query across name, full name, ATC code, category, therapeutic class, and keywords
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return list;
    }

    return list.filter((m) => {
      const matchName = (m.name || '').toLowerCase().includes(query);
      const matchFull = (m.fullName || '').toLowerCase().includes(query);
      const matchConc = (m.concentration || '').toLowerCase().includes(query);
      const matchClass = m.therapeuticClass?.toLowerCase().includes(query);
      const matchAtc = m.atcCode?.toLowerCase().includes(query);
      const matchAtcCat = m.atcCategory?.toLowerCase().includes(query);
      const matchAtcClasses = m.atcClasses?.some((c) => (c || '').toLowerCase().includes(query));
      const matchKeywords = m.keywords?.some((k) => (k || '').toLowerCase().includes(query));
      return (
        matchName ||
        matchFull ||
        matchConc ||
        matchClass ||
        matchAtc ||
        matchAtcCat ||
        matchAtcClasses ||
        matchKeywords
      );
    });
  }, [activeList, selectedClassId, searchTerm]);

  const handleSelectMed = (med: SUSMedication) => {
    onSelectMedication({
      name: med.fullName,
      route: med.route,
      posology: med.defaultPosology,
      duration: med.defaultDuration,
      schedule: med.defaultSchedule || '',
      instructions: med.instructions,
    });
    setIsOpenList(false);
    setSearchTerm('');
    onShowToast?.('success', `${med.name} selecionado com posologia padrão preenchida.`);
  };

  const handleSaveCustomMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      onShowToast?.('error', 'Informe o nome do fármaco.');
      return;
    }

    const full = `${customName.trim().toUpperCase()} ${customConcentration.trim().toUpperCase()} – ${customPosology ? 'PRESCRIÇÃO' : ''}`.trim();
    const newMed: SUSMedication = {
      id: `med-custom-${Date.now()}`,
      name: customName.trim(),
      concentration: customConcentration.trim() || 'Dose padrão',
      pharmaceuticalForm: customForm,
      fullName: full,
      route: customRoute,
      defaultPosology: customPosology.trim() || 'CONFORME PRESCRIÇÃO',
      defaultDuration: customDuration.trim() || 'DURANTE O TRATAMENTO',
      defaultSchedule: customSchedule.trim() || 'CONFORME HORÁRIO',
      component: 'Farmácia Básica (CBAF)',
      controlCategory: 'Receita Simples',
      therapeuticClass: customClass.trim() || 'Outros',
      atcCategory: customAtcCategory,
      atcClasses: [customAtcCategory],
      keywords: [(customName || '').toLowerCase(), 'customizado', 'municipal'],
      active: true,
      isRemumeDefault: false,
      createdAt: Date.now(),
    };

    setIsSavingDb(true);
    try {
      if (onSaveNewMedicationToDb) {
        await onSaveNewMedicationToDb(newMed);
      }
      onSelectMedication({
        name: newMed.fullName,
        route: newMed.route,
        posology: newMed.defaultPosology,
        duration: newMed.defaultDuration,
        schedule: newMed.defaultSchedule || '',
      });
      setShowAddNewCustom(false);
      setCustomName('');
      setCustomConcentration('');
      setCustomPosology('');
      onShowToast?.('success', 'Novo medicamento salvo no Banco de Dados Municipal e inserido!');
    } catch (err) {
      console.error('Erro ao salvar medicamento customizado:', err);
      onShowToast?.('error', 'Não foi possível salvar o medicamento no banco.');
    } finally {
      setIsSavingDb(false);
    }
  };

  // Helper for badge colors
  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'Antimicrobiano (2 Vias)':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'Controle Especial C1 (Branca 2 Vias)':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'Notificação B (Azul - Psicotrópicos)':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'Notificação A (Amarela - Entorpecentes)':
        return 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      default:
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Search Header Bar with Dropdown Trigger */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsOpenList(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpenList(true);
              }}
              placeholder="Buscar no Banco SUS / RENAME (ex: Nifedipino, Losartana, Amoxicilina, Risperidona, Gliclazida)..."
              className="w-full pl-10 pr-10 py-2.5 bg-blue-50/50 dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAddNewCustom(!showAddNewCustom)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs"
            title="Cadastrar novo medicamento no banco municipal"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">+ Novo no BD SUS</span>
          </button>
        </div>

        {/* Intelligent RENAME ATC Classification Dropdown & Quick Selector */}
        <div className="mt-2">
          <RenameClassDropdown
            selectedClassId={selectedClassId}
            onSelectClass={(classId) => {
              setSelectedClassId(classId);
              setIsOpenList(true);
            }}
            medications={activeList}
          />
        </div>

        {/* Dropdown / Floating Search Results */}
        {isOpenList && (
          <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-80 overflow-y-auto z-30 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs text-slate-500 font-semibold sticky top-0 backdrop-blur-xs z-10 border-b border-slate-200 dark:border-slate-700">
              <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
                <Pill className="w-3.5 h-3.5" />
                {filteredMedications.length} fármacos encontrados no SUS / RENAME
              </span>
              <button
                type="button"
                onClick={() => setIsOpenList(false)}
                className="text-[11px] hover:text-slate-800 dark:hover:text-slate-200 font-bold px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Fechar ✕
              </button>
            </div>

            {filteredMedications.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Nenhum fármaco encontrado com o filtro aplicado.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNewCustom(true);
                    setCustomName(searchTerm);
                    setIsOpenList(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar "{searchTerm || 'Novo Fármaco'}" no Banco SUS</span>
                </button>
              </div>
            ) : (
              filteredMedications.map((med) => (
                <div
                  key={med.id}
                  onClick={() => handleSelectMed(med)}
                  className="p-3 hover:bg-blue-50/70 dark:hover:bg-slate-800/80 cursor-pointer transition-colors flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {med.fullName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {med.route}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getBadgeStyle(
                          med.controlCategory
                        )}`}
                      >
                        {med.controlCategory}
                      </span>
                      {med.atcCode && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          ATC: {med.atcCode}
                        </span>
                      )}
                      {med.awareCategory && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold ${
                            med.awareCategory === 'Acesso'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          AWaRe: {med.awareCategory}
                        </span>
                      )}
                    </div>

                    {/* Classes Tags (Shows all linked classes e.g. Cardio + Genito for Nifedipino) */}
                    {med.atcClasses && med.atcClasses.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {med.atcClasses.map((cls, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.2 rounded-md font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                          >
                            {cls}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        Posologia padrão:{' '}
                        <strong className="text-slate-900 dark:text-slate-100">
                          {med.defaultPosology}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>{med.defaultDuration}</span>
                      {med.defaultSchedule && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {med.defaultSchedule}
                          </span>
                        </>
                      )}
                    </div>

                    {med.instructions && (
                      <p className="text-[10px] text-teal-700 dark:text-teal-300 italic">
                        Orientação ao paciente: {med.instructions}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="px-2.5 py-1.5 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    <span>Inserir</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Custom Medication Inline Modal / Form */}
      {showAddNewCustom && (
        <form
          onSubmit={handleSaveCustomMedication}
          className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 uppercase tracking-wider">
              <BookmarkPlus className="w-4 h-4 text-emerald-600" />
              <span>Cadastrar Novo Fármaco no Banco SUS / REMUME Municipal</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddNewCustom(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
            >
              ✕ Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
            <div className="sm:col-span-4">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Fármaco (Princípio Ativo / DCB) *
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Espironolactona"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Concentração *
              </label>
              <input
                type="text"
                required
                value={customConcentration}
                onChange={(e) => setCustomConcentration(e.target.value)}
                placeholder="Ex: 25 mg – 30CP"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Classificação Anatômica RENAME
              </label>
              <select
                value={customAtcCategory}
                onChange={(e) => setCustomAtcCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-emerald-500"
              >
                <option value="C: Aparelho cardiovascular">C: Aparelho cardiovascular</option>
                <option value="G: Aparelho geniturinário e hormônios sexuais">
                  G: Aparelho geniturinário e hormônios sexuais
                </option>
                <option value="A: Aparelho digestivo e metabolismo">
                  A: Aparelho digestivo e metabolismo
                </option>
                <option value="J: Anti-infecciosos para uso sistêmico">
                  J: Anti-infecciosos para uso sistêmico
                </option>
                <option value="N: Sistema nervoso">N: Sistema nervoso</option>
                <option value="R: Aparelho respiratório">R: Aparelho respiratório</option>
                <option value="M: Sistema musculoesquelético">M: Sistema musculoesquelético</option>
                <option value="B: Sangue e órgãos hematopoéticos">
                  B: Sangue e órgãos hematopoéticos
                </option>
                <option value="D: Medicamentos dermatológicos">
                  D: Medicamentos dermatológicos
                </option>
                <option value="P: Produtos antiparasitários, inseticidas e repelentes">
                  P: Produtos antiparasitários
                </option>
                <option value="H: Preparações hormonais sistêmicas">
                  H: Preparações hormonais sistêmicas
                </option>
                <option value="S: Órgãos sensitivos">S: Órgãos sensitivos</option>
                <option value="H*: Fitoterápicos">H*: Fitoterápicos</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Via de Administração
              </label>
              <select
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value as AdministrationRoute)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-emerald-500"
              >
                <option value="USO ORAL">USO ORAL</option>
                <option value="USO IM">USO IM</option>
                <option value="USO IV">USO IV</option>
                <option value="USO SC">USO SC</option>
                <option value="USO TÓPICO">USO TÓPICO</option>
                <option value="USO INALATÓRIO">USO INALATÓRIO</option>
                <option value="USO VAGINAL">USO VAGINAL</option>
                <option value="USO OFTÁLMICO">USO OFTÁLMICO</option>
                <option value="USO NASAL">USO NASAL</option>
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Posologia Sugerida (Padrão)
              </label>
              <input
                type="text"
                value={customPosology}
                onChange={(e) => setCustomPosology(e.target.value)}
                placeholder="Ex: TOMAR 1 COMPRIMIDO PELA MANHÃ"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duração
              </label>
              <input
                type="text"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="Ex: USO CONTÍNUO"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horário
              </label>
              <input
                type="text"
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
                placeholder="Ex: MANHÃ (8h)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddNewCustom(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingDb}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              {isSavingDb ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no BD...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar no Banco SUS e Inserir</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
