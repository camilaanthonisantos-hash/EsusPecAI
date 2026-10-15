import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Pill,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  BookOpen,
  Info,
  ShieldCheck,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { SUSMedication, AdministrationRoute } from '../types';
import { OFFICIAL_SUS_MEDICATIONS } from '../data/susMedications';
import { OFFICIAL_RENAME_ATC_CLASSES } from '../data/renameClasses';
import { RenameClassDropdown } from './RenameClassDropdown';

interface MedicationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  medications: SUSMedication[];
  onSaveMedication: (med: SUSMedication) => Promise<void> | void;
  onDeleteMedication: (id: string) => Promise<void> | void;
  onResetToDefaults: () => Promise<void> | void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  isAdmin?: boolean;
}

export const MedicationsDrawer: React.FC<MedicationsDrawerProps> = ({
  isOpen,
  onClose,
  medications = [],
  onSaveMedication,
  onDeleteMedication,
  onResetToDefaults,
  onShowToast,
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [editingMed, setEditingMed] = useState<SUSMedication | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for add/edit
  const [formName, setFormName] = useState('');
  const [formConcentration, setFormConcentration] = useState('');
  const [formRoute, setFormRoute] = useState<AdministrationRoute>('USO ORAL');
  const [formPosology, setFormPosology] = useState('');
  const [formDuration, setFormDuration] = useState('USO CONTÍNUO');
  const [formSchedule, setFormSchedule] = useState('');
  const [formComponent, setFormComponent] = useState<any>('Farmácia Básica (CBAF)');
  const [formControlCategory, setFormControlCategory] = useState<any>('Receita Simples');
  const [formClass, setFormClass] = useState('');
  const [formAtcCategory, setFormAtcCategory] = useState('C: Aparelho cardiovascular');
  const [formAtcCode, setFormAtcCode] = useState('');
  const [formInstructions, setFormInstructions] = useState('');

  const displayList = useMemo(() => {
    return medications.length > 0 ? medications : OFFICIAL_SUS_MEDICATIONS;
  }, [medications]);

  const filtered = useMemo(() => {
    let list = displayList;

    // Apply ATC / RENAME filter
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
        const targetClass = OFFICIAL_RENAME_ATC_CLASSES.find((c) => c.id === selectedClassId);
        if (targetClass) {
          const letter = targetClass.code.replace('Classe ', '').trim();
          list = list.filter((m) => {
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

    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;

    return list.filter((m) => {
      const matchName = m.name.toLowerCase().includes(q);
      const matchFull = m.fullName.toLowerCase().includes(q);
      const matchClass = m.therapeuticClass?.toLowerCase().includes(q);
      const matchAtc = m.atcCode?.toLowerCase().includes(q);
      const matchAtcCat = m.atcCategory?.toLowerCase().includes(q);
      const matchKeywords = m.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchName || matchFull || matchClass || matchAtc || matchAtcCat || matchKeywords;
    });
  }, [displayList, selectedClassId, searchTerm]);

  const handleStartEdit = (med: SUSMedication) => {
    setEditingMed(med);
    setFormName(med.name);
    setFormConcentration(med.concentration);
    setFormRoute(med.route);
    setFormPosology(med.defaultPosology);
    setFormDuration(med.defaultDuration);
    setFormSchedule(med.defaultSchedule || '');
    setFormComponent(med.component);
    setFormControlCategory(med.controlCategory);
    setFormClass(med.therapeuticClass || '');
    setFormAtcCategory(med.atcCategory || 'C: Aparelho cardiovascular');
    setFormAtcCode(med.atcCode || '');
    setFormInstructions(med.instructions || '');
    setIsAddingNew(false);
  };

  const handleStartAddNew = () => {
    setEditingMed(null);
    setFormName('');
    setFormConcentration('');
    setFormRoute('USO ORAL');
    setFormPosology('');
    setFormDuration('USO CONTÍNUO');
    setFormSchedule('');
    setFormComponent('Farmácia Básica (CBAF)');
    setFormControlCategory('Receita Simples');
    setFormClass('');
    setFormAtcCategory('C: Aparelho cardiovascular');
    setFormAtcCode('');
    setFormInstructions('');
    setIsAddingNew(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formConcentration.trim()) {
      onShowToast('error', 'Nome e concentração são obrigatórios.');
      return;
    }

    const full = `${formName.trim().toUpperCase()} ${formConcentration.trim().toUpperCase()}`;
    const payload: SUSMedication = {
      id: editingMed ? editingMed.id : `med-${Date.now()}`,
      name: formName.trim(),
      concentration: formConcentration.trim(),
      pharmaceuticalForm: 'Comprimido / Forma Padrão',
      fullName: full,
      route: formRoute,
      defaultPosology: formPosology.trim() || 'CONFORME PRESCRIÇÃO',
      defaultDuration: formDuration.trim() || 'USO CONTÍNUO',
      defaultSchedule: formSchedule.trim() || 'CONFORME HORÁRIO',
      component: formComponent,
      controlCategory: formControlCategory,
      therapeuticClass: formClass.trim() || 'Atenção Primária',
      atcCategory: formAtcCategory,
      atcClasses: [formAtcCategory],
      atcCode: formAtcCode.trim() || undefined,
      instructions: formInstructions.trim() || undefined,
      keywords: [formName.toLowerCase(), formClass.toLowerCase(), formAtcCategory.toLowerCase()],
      active: true,
      isRemumeDefault: editingMed ? editingMed.isRemumeDefault : false,
      createdAt: editingMed?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    setIsSubmitting(true);
    try {
      await onSaveMedication(payload);
      onShowToast('success', `${payload.fullName} salvo no banco de medicamentos.`);
      setEditingMed(null);
      setIsAddingNew(false);
    } catch (err) {
      console.error(err);
      onShowToast('error', 'Falha ao salvar medicamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir "${name}" do banco municipal?`)) return;
    try {
      await onDeleteMedication(id);
      onShowToast('info', `Medicamento "${name}" removido.`);
    } catch (err) {
      onShowToast('error', 'Erro ao excluir medicamento.');
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Deseja restaurar todo o catálogo padrão de medicamentos do SUS/RENAME (mais de 100 fármacos oficiais com posologia e classes ATC padronizadas)?'
      )
    )
      return;
    try {
      await onResetToDefaults();
      onShowToast('success', 'Catálogo oficial do SUS restaurado com sucesso!');
    } catch (err) {
      onShowToast('error', 'Erro ao restaurar catálogo de medicamentos.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Banco de Medicamentos SUS / REMUME</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono">
                    {displayList.length} Fármacos
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Catálogo RENAME 2022 com classificação ATC por classes terapêuticas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStartAddNew}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por princípio ativo, classe, indicação (ex: Nifedipino, Losartana, Amoxicilina, Risperidona)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Intelligent RENAME ATC Dropdown Selector */}
            <RenameClassDropdown
              selectedClassId={selectedClassId}
              onSelectClass={(classId) => setSelectedClassId(classId)}
              medications={displayList}
            />
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Inline Add / Edit Form */}
            {(isAddingNew || editingMed) && (
              <form
                onSubmit={handleSaveSubmit}
                className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>{editingMed ? `Editar: ${editingMed.name}` : 'Cadastrar Novo Fármaco SUS'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMed(null);
                      setIsAddingNew(false);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    ✕ Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <div className="sm:col-span-5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fármaco (Princípio Ativo / DCB) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Nifedipino"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Concentração *
                    </label>
                    <input
                      type="text"
                      required
                      value={formConcentration}
                      onChange={(e) => setFormConcentration(e.target.value)}
                      placeholder="Ex: 20 mg Retard"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Classificação ATC RENAME
                    </label>
                    <select
                      value={formAtcCategory}
                      onChange={(e) => setFormAtcCategory(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
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
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Via
                    </label>
                    <select
                      value={formRoute}
                      onChange={(e) => setFormRoute(e.target.value as AdministrationRoute)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    >
                      <option value="USO ORAL">USO ORAL</option>
                      <option value="USO IM">USO IM</option>
                      <option value="USO IV">USO IV</option>
                      <option value="USO SC">USO SC</option>
                      <option value="USO TÓPICO">USO TÓPICO</option>
                      <option value="USO INALATÓRIO">USO INALATÓRIO</option>
                      <option value="USO VAGINAL">USO VAGINAL</option>
                      <option value="USO OFTÁLMICO">USO OFTÁLMICO</option>
                    </select>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Posologia Sugerida
                    </label>
                    <input
                      type="text"
                      value={formPosology}
                      onChange={(e) => setFormPosology(e.target.value)}
                      placeholder="Ex: TOMAR 1 COMPRIMIDO DE 12/12h"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Código ATC (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formAtcCode}
                      onChange={(e) => setFormAtcCode(e.target.value)}
                      placeholder="Ex: C08CA05"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Componente SUS
                    </label>
                    <select
                      value={formComponent}
                      onChange={(e) => setFormComponent(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    >
                      <option value="Farmácia Básica (CBAF)">Farmácia Básica (CBAF)</option>
                      <option value="Saúde Mental / RAPS">Saúde Mental / RAPS</option>
                      <option value="Componente Especializado (CEAF)">
                        Componente Especializado (CEAF)
                      </option>
                      <option value="Componente Estratégico">Componente Estratégico</option>
                    </select>
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Categoria de Receita / Controle
                    </label>
                    <select
                      value={formControlCategory}
                      onChange={(e) => setFormControlCategory(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    >
                      <option value="Receita Simples">Receita Simples</option>
                      <option value="Antimicrobiano (2 Vias)">Antimicrobiano (2 Vias)</option>
                      <option value="Controle Especial C1 (Branca 2 Vias)">
                        Controle Especial C1 (Branca 2 Vias)
                      </option>
                      <option value="Notificação B (Azul - Psicotrópicos)">
                        Notificação B (Azul - Psicotrópicos)
                      </option>
                      <option value="Notificação A (Amarela - Entorpecentes)">
                        Notificação A (Amarela - Entorpecentes)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMed(null);
                      setIsAddingNew(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar no Catálogo'}
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {filtered.map((med) => (
              <div
                key={med.id}
                className="p-3.5 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-600 transition-all space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {med.fullName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {med.route}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                        {med.component}
                      </span>
                      {med.atcCode && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-mono font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          ATC: {med.atcCode}
                        </span>
                      )}
                    </div>

                    {/* Classes Tags */}
                    {med.atcClasses && med.atcClasses.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
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

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {med.therapeuticClass} • {med.controlCategory}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(med)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!med.isRemumeDefault && (
                      <button
                        type="button"
                        onClick={() => handleDelete(med.id, med.fullName)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-400 font-semibold">Posologia padrão:</span>{' '}
                    <strong>{med.defaultPosology}</strong>
                  </div>
                  <div className="text-slate-500">
                    {med.defaultDuration} {med.defaultSchedule && `• ${med.defaultSchedule}`}
                  </div>
                </div>

                {med.instructions && (
                  <p className="text-[10px] text-teal-700 dark:text-teal-400 italic">
                    Orientação: {med.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors"
              title="Restaurar lista oficial RENAME / SUS"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Catálogo Oficial RENAME</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
