import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  X,
  Search,
  Copy,
  Trash2,
  Calendar,
  Sparkles,
  Check,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { GeneratedPECRecord } from '../types';
import { PROFESSIONS } from '../data/professions';
import { copyToClipboard } from '../services/gemini';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: GeneratedPECRecord[];
  onSelectRecord: (record: GeneratedPECRecord) => void;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectRecord,
  onClearHistory,
  onDeleteRecord,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHistory = history.filter((item) => {
    const profName = PROFESSIONS[item.professionId]?.name?.toLowerCase() || '';
    const term = (searchTerm || '').toLowerCase();
    return (
      profName.includes(term) ||
      (item.avaliacao || '').toLowerCase().includes(term) ||
      (item.plano || '').toLowerCase().includes(term) ||
      (item.rawInputSummary || '').toLowerCase().includes(term)
    );
  });

  const handleCopyFromHistory = async (record: GeneratedPECRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const profName = PROFESSIONS[record.professionId]?.name || record.professionId || 'Profissional';
    let text = `[REGISTRO PEC - ${profName.toUpperCase()}]\n\n--- AVALIAÇÃO ---\n${record.avaliacao}\n\n--- PLANO ---\n${record.plano}`;
    if (record.conduta) {
      text += `\n\n--- CONDUTA ---\n${record.conduta}`;
    }
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(record.id);
      onShowToast('success', 'Prontuário do histórico copiado!', 'Copiado');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="history-drawer-backdrop"
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        >
          <motion.div
            id="history-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-600 text-white shadow-xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Histórico de Atendimentos
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/20">
                      {history.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Registros salvos localmente neste navegador
                  </p>
                </div>
              </div>

              <button
                id="close-history-drawer-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Action Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por profissão ou relato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {history.length > 0 && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500">
                    Mostrando {filteredHistory.length} de {history.length}
                  </span>
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-rose-500 hover:underline text-[11px] font-medium"
                  >
                    Limpar todo histórico
                  </button>
                </div>
              )}
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Nenhum registro encontrado
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Os prontuários gerados serão arquivados aqui automaticamente durante o seu
                    turno de trabalho.
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const prof = PROFESSIONS[item.professionId];
                  return (
                    <div
                      key={item.id}
                      id={`history-item-${item.id}`}
                      onClick={() => {
                        onSelectRecord(item);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 hover:border-teal-500/50 dark:hover:border-teal-500/50 transition-all cursor-pointer shadow-xs group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[11px] font-bold border border-teal-500/20">
                            {prof?.name || 'Profissional'}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.timestamp).toLocaleDateString('pt-BR')} •{' '}
                            {new Date(item.timestamp).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Copiar texto do prontuário"
                            onClick={(e) => handleCopyFromHistory(item, e)}
                            className="p-1 rounded text-slate-400 hover:text-teal-600 transition-colors"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-teal-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Excluir do histórico"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRecord(item.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.avaliacao}
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[200px]">
                          {item.rawInputSummary || 'Atendimento'}
                        </span>
                        <span className="text-teal-600 dark:text-teal-400 font-medium group-hover:underline flex items-center gap-1">
                          Restaurar <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
