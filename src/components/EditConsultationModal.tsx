import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileEdit,
  X,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Calendar,
  Building,
} from 'lucide-react';
import { Consultation, User, ProfessionId } from '../types';
import { PROFESSIONS } from '../data/professions';

interface EditConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: Consultation | null;
  currentUser: User;
  onSave: (updatedConsultation: Consultation) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const EditConsultationModal: React.FC<EditConsultationModalProps> = ({
  isOpen,
  onClose,
  consultation,
  currentUser,
  onSave,
  onShowToast,
}) => {
  if (!consultation) return null;

  const [avaliacao, setAvaliacao] = useState(consultation.avaliacao || '');
  const [plano, setPlano] = useState(consultation.plano || '');
  const [conduta, setConduta] = useState(consultation.conduta || '');
  const [authorName, setAuthorName] = useState(consultation.authorName || '');
  const [authorRegister, setAuthorRegister] = useState(consultation.authorRegister || '');
  const [workplace, setWorkplace] = useState(consultation.workplace || '');

  const profession = PROFESSIONS[consultation.authorProfession] || PROFESSIONS.enfermeiro;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!avaliacao.trim() || !plano.trim()) {
      onShowToast('error', 'Os campos Avaliação e Plano são obrigatórios.', 'Campos Vazios');
      return;
    }

    const updated: Consultation = {
      ...consultation,
      avaliacao: avaliacao.trim(),
      plano: plano.trim(),
      conduta: conduta.trim() ? conduta.trim() : undefined,
      authorName: authorName.trim() || consultation.authorName,
      authorRegister: authorRegister.trim() || consultation.authorRegister,
      workplace: workplace.trim() || consultation.workplace,
    };

    onSave(updated);
    onShowToast('success', 'Atendimento atualizado com sucesso!', 'Prontuário Salvo');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="edit-consultation-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            id="edit-consultation-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Editar Atendimento Clínico (PEC)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paciente: <strong className="text-slate-800 dark:text-slate-200">{consultation.patientName}</strong> • {new Date(consultation.timestamp).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-edit-consultation-modal-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Professional Meta Info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">
                    Profissional Responsável
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">
                    Registro / Conselho
                  </label>
                  <input
                    type="text"
                    value={authorRegister}
                    onChange={(e) => setAuthorRegister(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">
                    Unidade de Saúde
                  </label>
                  <input
                    type="text"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              {/* Bloco 1: Avaliação */}
              <div>
                <label className="text-xs font-bold text-teal-800 dark:text-teal-300 block mb-1 uppercase tracking-wider">
                  Campo: Avaliação (Subjetivo, Objetivo, Exame Físico e Diagnósticos) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  value={avaliacao}
                  onChange={(e) => setAvaliacao(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono leading-relaxed focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Descreva a avaliação clínica completa..."
                />
              </div>

              {/* Bloco 2: Plano */}
              <div>
                <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1 uppercase tracking-wider">
                  Campo: Plano (Intervenções, Prescrições, Metas e Códigos Fixos) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  value={plano}
                  onChange={(e) => setPlano(e.target.value)}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Descreva o plano terapêutico e condutas..."
                />
              </div>

              {/* Bloco 3: Conduta (se enfermagem ou preenchido) */}
              {(profession.hasBlock3 || conduta) && (
                <div>
                  <label className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block mb-1 uppercase tracking-wider">
                    Campo 06: Conduta / Finalização do Atendimento
                  </label>
                  <textarea
                    rows={4}
                    value={conduta}
                    onChange={(e) => setConduta(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Descreva a finalização de conduta e encaminhamentos..."
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="save-edited-consultation-btn"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
