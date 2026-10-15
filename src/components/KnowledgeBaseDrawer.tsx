import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  X,
  Plus,
  Trash2,
  Check,
  FileCheck,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { KnowledgeItem } from '../types';
import { saveKnowledgeItemToFirestore, deleteKnowledgeItemFromFirestore } from '../services/firebase';

interface KnowledgeBaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeList: KnowledgeItem[];
  setKnowledgeList: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const KnowledgeBaseDrawer: React.FC<KnowledgeBaseDrawerProps> = ({
  isOpen,
  onClose,
  knowledgeList,
  setKnowledgeList,
  onShowToast,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<KnowledgeItem['category']>('personalizado');
  const [newContent, setNewContent] = useState('');

  const toggleItemActive = (id: string) => {
    const target = knowledgeList.find((k) => k.id === id);
    if (target) {
      const updated = { ...target, isActive: !target.isActive };
      setKnowledgeList((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      saveKnowledgeItemToFirestore(updated).catch(console.warn);
    }
  };

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      onShowToast('error', 'Preencha o título e o conteúdo da diretriz.');
      return;
    }

    const newItem: KnowledgeItem = {
      id: `custom-kb-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim(),
      isActive: true,
      isSystemDefault: false,
    };

    setKnowledgeList((prev) => [newItem, ...prev]);
    setNewTitle('');
    setNewContent('');
    setIsAddingNew(false);
    
    try {
      await saveKnowledgeItemToFirestore(newItem);
      onShowToast('success', 'Nova diretriz municipal salva no Firestore!', 'Diretriz Salva');
    } catch {
      onShowToast('success', 'Nova diretriz municipal cadastrada localmente!', 'Diretriz Salva');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setKnowledgeList((prev) => prev.filter((item) => item.id !== id));
    try {
      await deleteKnowledgeItemFromFirestore(id);
    } catch {
      // ignore
    }
    onShowToast('info', 'Diretriz removida da base de conhecimento.');
  };

  const activeCount = knowledgeList.filter((k) => k.isActive).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="knowledge-base-backdrop"
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        >
          <motion.div
            id="knowledge-base-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Base de Conhecimento Local
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/20">
                      {activeCount} ativa(s)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Diretrizes municipais e REMUME injetadas na IA
                  </p>
                </div>
              </div>

              <button
                id="close-knowledge-drawer-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Fechar painel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Injection Notice */}
            <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/30 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                As diretrizes ativas abaixo são <strong>injetadas automaticamente</strong> no
                prompt da IA como contexto clínico específico do seu município para padronizar
                prescrições, fluxos e condutas.
              </p>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Add New Button */}
              {!isAddingNew ? (
                <button
                  id="add-knowledge-item-btn"
                  onClick={() => setIsAddingNew(true)}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-teal-500/40 hover:border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Nova Diretriz / Protocolo Municipal
                </button>
              ) : (
                /* Form to add custom knowledge */
                <form
                  onSubmit={handleCreateNewItem}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-teal-500/40 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Nova Diretriz Municipal
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Título do Protocolo / REMUME
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Ex: Protocolo Pré-Natal SMS ou REMUME 2026"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Categoria
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) =>
                        setNewCategory(e.target.value as KnowledgeItem['category'])
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="remume">REMUME (Medicamentos)</option>
                      <option value="protocolo_aps">Protocolo APS</option>
                      <option value="raps">Saúde Mental / RAPS</option>
                      <option value="personalizado">Nota Técnica / Geral</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Conteúdo e Regras a Injetar
                    </label>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={4}
                      placeholder="Cole aqui a lista de medicamentos disponíveis, fluxos de encaminhamento ou critérios de estratificação..."
                      className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none resize-y font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                  >
                    Salvar e Ativar Diretriz
                  </button>
                </form>
              )}

              {/* Knowledge items list */}
              <div className="space-y-3">
                {knowledgeList.map((item) => (
                  <div
                    key={item.id}
                    id={`kb-item-${item.id}`}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.isActive
                        ? 'bg-white dark:bg-slate-900 border-teal-500/40 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id={`toggle-kb-${item.id}`}
                          checked={item.isActive}
                          onChange={() => toggleItemActive(item.id)}
                          className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <label
                            htmlFor={`toggle-kb-${item.id}`}
                            className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer block"
                          >
                            {item.title}
                          </label>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-semibold">
                            {item.category.replace('_', ' ')}
                            {item.isSystemDefault && ' • Padrão SUS'}
                          </span>
                        </div>
                      </div>

                      {!item.isSystemDefault && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                          title="Excluir diretriz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 line-clamp-4 whitespace-pre-wrap">
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {activeCount} de {knowledgeList.length} ativas
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
