import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Copy,
  Check,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  FileText,
  ShieldCheck,
  Download,
  Share2,
  AlertTriangle,
} from 'lucide-react';
import { GeneratedPECRecord, ProfessionConfig, Patient } from '../types';
import { copyToClipboard } from '../services/gemini';

function renderFormattedPECContent(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      const content = trimmed.replace(/^>\s*/, '');
      return (
        <div key={idx} className="my-1.5 pl-4 border-l-4 border-teal-500/70 italic text-slate-700 dark:text-slate-300">
          {content}
        </div>
      );
    } else if (trimmed.endsWith(':') && trimmed.length < 50 && !trimmed.startsWith('-')) {
      return (
        <div key={idx} className="font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1">
          {trimmed}
        </div>
      );
    } else if (trimmed === '') {
      return <div key={idx} className="h-2" />;
    } else {
      return (
        <div key={idx} className="my-1 text-slate-800 dark:text-slate-200">
          {line}
        </div>
      );
    }
  });
}

interface OutputCardProps {
  record: GeneratedPECRecord;
  profession: ProfessionConfig;
  patient?: Patient | null;
  onSaveToTimeline?: (record: GeneratedPECRecord, updatedTexts?: { avaliacao?: string; plano?: string; conduta?: string }) => void;
  isSavedToTimeline?: boolean;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const OutputCard: React.FC<OutputCardProps> = ({
  record,
  profession,
  patient,
  onSaveToTimeline,
  isSavedToTimeline = false,
  onShowToast,
}) => {
  // Local state for inline edits
  const [avaliacaoText, setAvaliacaoText] = useState(record.avaliacao);
  const [planoText, setPlanoText] = useState(record.plano);
  const [condutaText, setCondutaText] = useState(record.conduta || '');

  const [isEditingAvaliacao, setIsEditingAvaliacao] = useState(false);
  const [isEditingPlano, setIsEditingPlano] = useState(false);
  const [isEditingConduta, setIsEditingConduta] = useState(false);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopySection = async (sectionName: string, text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedSection(sectionName);
      onShowToast(
        'success',
        `Texto do ${sectionName} copiado para a área de transferência! Pronto para colar no PEC.`,
        'Copiado com 1 Clique'
      );
      setTimeout(() => {
        setCopiedSection(null);
      }, 2500);
    } else {
      onShowToast('error', 'Não foi possível copiar o texto automaticamente.', 'Erro de Cópia');
    }
  };

  const handleCopyFull = async () => {
    let full = `[REGISTRO PEC - ${profession.name.toUpperCase()}]\n\n--- CAMPO: AVALIAÇÃO ---\n${avaliacaoText}\n\n--- CAMPO: PLANO ---\n${planoText}`;
    if (record.conduta || condutaText) {
      full += `\n\n--- CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA ---\n${condutaText}`;
    }
    const success = await copyToClipboard(full);
    if (success) {
      setCopiedSection('full');
      onShowToast(
        'success',
        'Todos os blocos do prontuário foram copiados juntos com sucesso!',
        'Prontuário Completo Copiado'
      );
      setTimeout(() => setCopiedSection(null), 2500);
    }
  };

  const handleDownloadTxt = () => {
    let content = `========================================================\n`;
    content += `PRONTUÁRIO CLÍNICO E-SUS / PEC - ATENÇÃO PRIMÁRIA & RAPS\n`;
    content += `PROFISSIONAL: ${profession.name.toUpperCase()} (${profession.council})\n`;
    content += `DATA/HORA: ${new Date(record.timestamp).toLocaleString('pt-BR')}\n`;
    content += `MODELO IA: ${record.modelUsed}\n`;
    content += `========================================================\n\n`;

    content += `[CAMPO: AVALIAÇÃO]\n${avaliacaoText}\n\n`;
    content += `--------------------------------------------------------\n`;
    content += `[CAMPO: PLANO]\n${planoText}\n\n`;

    if (condutaText) {
      content += `--------------------------------------------------------\n`;
      content += `[CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA]\n${condutaText}\n\n`;
    }

    content += `========================================================\n`;
    content += `Gerado automaticamente via e-SUS PEC Multiprofissional AI\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PEC_${profession.id}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast('info', 'Arquivo TXT exportado com sucesso.', 'Download Concluído');
  };

  return (
    <div id="output-records-container" className="space-y-6">
      {/* Top Status & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-teal-900/10 dark:bg-teal-950/40 border border-teal-500/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Prontuário PEC Gerado com Sucesso
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-500/30">
                {profession.name}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Copie cada bloco individualmente para a aba correspondente no PEC do e-SUS.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSaveToTimeline && (
            <button
              id="save-to-patient-timeline-btn"
              onClick={() =>
                onSaveToTimeline(record, {
                  avaliacao: avaliacaoText,
                  plano: planoText,
                  conduta: condutaText,
                })
              }
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSavedToTimeline
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {isSavedToTimeline ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Salvo na Linha do Tempo</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Salvar na Linha do Tempo</span>
                </>
              )}
            </button>
          )}

          <button
            id="copy-full-record-btn"
            onClick={handleCopyFull}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-transform active:scale-95 cursor-pointer"
          >
            {copiedSection === 'full' ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                Prontuário Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar Prontuário Completo
              </>
            )}
          </button>

          <button
            id="download-txt-record-btn"
            onClick={handleDownloadTxt}
            title="Baixar como arquivo .TXT"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Compliance / Verification Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border ${
            record.isFirstConsultation
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {record.isFirstConsultation
              ? 'Primeiro Atendimento / Acolhimento'
              : 'Retorno / Reavaliação'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sinais Vitais Qualitativos</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          <span>CIAP-2: -69 & SIGTAP: 0301080445 Inclusos</span>
        </div>
        {profession.id === 'enfermeiro' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>NANDA-I / NOC / NIC + Conduta 06</span>
          </div>
        )}
      </div>

      {/* Clinical Audit Alert Callout (Cross-checking with previous history) */}
      {record.clinicalAudit && (
        <motion.div
          id="card-clinical-audit-alert"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400/80 dark:border-amber-600/70 shadow-sm space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Auditoria Clínica Cruzada: Pendências do Histórico Anterior</span>
            </div>
            <button
              type="button"
              id="copy-clinical-audit-btn"
              onClick={() => handleCopySection('Auditoria Clínica', record.clinicalAudit!)}
              className="text-xs font-semibold text-amber-900 dark:text-amber-200 hover:text-amber-950 bg-amber-200/70 dark:bg-amber-900/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-300 dark:border-amber-700"
            >
              {copiedSection === 'Auditoria Clínica' ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Pendências</span>
                </>
              )}
            </button>
          </div>
          <div className="text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed font-mono bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-amber-300/60 dark:border-amber-800/60">
            {record.clinicalAudit}
          </div>
        </motion.div>
      )}

      {/* ================= CARD 1: CAMPO AVALIAÇÃO ================= */}
      <motion.div
        id="card-campo-avaliacao"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden relative group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-bold">
              1
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                CAMPO: AVALIAÇÃO
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  (e-SUS / PEC)
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {profession.id === 'enfermeiro'
                  ? 'Histórico, Exame Clínico/Mental, Diagnósticos NANDA-I, CIAP-2 e CID-10'
                  : 'Relato, Avaliação Clínico-Comportamental/Funcional, CIAP-2 e CID-10'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="edit-avaliacao-toggle-btn"
              onClick={() => setIsEditingAvaliacao(!isEditingAvaliacao)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
              title={isEditingAvaliacao ? 'Concluir edição' : 'Editar texto antes de copiar'}
            >
              {isEditingAvaliacao ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {isEditingAvaliacao ? 'Salvar Edição' : 'Editar'}
              </span>
            </button>

            {/* Prominent Copy Button */}
            <button
              id="copy-avaliacao-btn"
              onClick={() => handleCopySection('Campo Avaliação', avaliacaoText)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer"
            >
              {copiedSection === 'Campo Avaliação' ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Avaliação
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5">
          {isEditingAvaliacao ? (
            <textarea
              id="textarea-edit-avaliacao"
              value={avaliacaoText}
              onChange={(e) => setAvaliacaoText(e.target.value)}
              rows={8}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-teal-500/50 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y leading-relaxed"
            />
          ) : (
            <div
              id="content-preview-avaliacao"
              className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-sans text-sm leading-relaxed"
            >
              {renderFormattedPECContent(avaliacaoText)}
            </div>
          )}

          {/* Footer character counter */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>{avaliacaoText.length} caracteres • {avaliacaoText.split(/\s+/).filter(Boolean).length} palavras</span>
            <span className="text-teal-600 dark:text-teal-400 font-medium">
              Pronto para colar no campo de Avaliação do PEC
            </span>
          </div>
        </div>
      </motion.div>

      {/* ================= CARD 2: CAMPO PLANO ================= */}
      <motion.div
        id="card-campo-plano"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden relative group"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-bold">
              2
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                CAMPO: PLANO
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  (e-SUS / PEC)
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {profession.id === 'enfermeiro'
                  ? 'Metas NOC, Intervenções NIC e Códigos Fixos CIAP-2/SIGTAP'
                  : 'Conduta Terapêutica, Encaminhamentos, Articulação e Códigos Fixos'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="edit-plano-toggle-btn"
              onClick={() => setIsEditingPlano(!isEditingPlano)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
              title={isEditingPlano ? 'Concluir edição' : 'Editar texto antes de copiar'}
            >
              {isEditingPlano ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {isEditingPlano ? 'Salvar Edição' : 'Editar'}
              </span>
            </button>

            {/* Prominent Copy Button */}
            <button
              id="copy-plano-btn"
              onClick={() => handleCopySection('Campo Plano', planoText)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer"
            >
              {copiedSection === 'Campo Plano' ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Plano
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5">
          {isEditingPlano ? (
            <textarea
              id="textarea-edit-plano"
              value={planoText}
              onChange={(e) => setPlanoText(e.target.value)}
              rows={8}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-teal-500/50 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y leading-relaxed"
            />
          ) : (
            <div
              id="content-preview-plano"
              className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-sans text-sm leading-relaxed"
            >
              {renderFormattedPECContent(planoText)}
            </div>
          )}

          {/* Footer character counter & Fixed Code Highlight */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>{planoText.length} caracteres • {planoText.split(/\s+/).filter(Boolean).length} palavras</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              CIAP-2: -69 | SIGTAP: 0301080445 Presentes
            </span>
          </div>
        </div>
      </motion.div>

      {/* ================= CARD 3: CAMPO 06 - FINALIZAÇÃO / CONDUTA ================= */}
      {(profession.id === 'enfermeiro' || condutaText.length > 0) && (
        <motion.div
          id="card-campo-06-conduta"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden relative group"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-bold">
                3
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA
                  <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                    (Enfermagem PEC)
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Conduta Imediata, Prescrições/Transcrições, Guias de Referência e Agendamentos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="edit-conduta-toggle-btn"
                onClick={() => setIsEditingConduta(!isEditingConduta)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
                title={isEditingConduta ? 'Concluir edição' : 'Editar texto antes de copiar'}
              >
                {isEditingConduta ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">
                  {isEditingConduta ? 'Salvar Edição' : 'Editar'}
                </span>
              </button>

              {/* Prominent Copy Button */}
              <button
                id="copy-conduta-btn"
                onClick={() => handleCopySection('Campo 06 - Conduta', condutaText)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
              >
                {copiedSection === 'Campo 06 - Conduta' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Condutas / Guias
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5">
            {isEditingConduta ? (
              <textarea
                id="textarea-edit-conduta"
                value={condutaText}
                onChange={(e) => setCondutaText(e.target.value)}
                rows={7}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-indigo-500/50 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed"
              />
            ) : (
              <div
                id="content-preview-conduta"
                className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-sans text-sm leading-relaxed"
              >
                {condutaText ? renderFormattedPECContent(condutaText) : 'Nenhuma conduta ou prescrição específica informada.'}
              </div>
            )}

            {/* Footer character counter */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{condutaText.length} caracteres</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                Pronto para colar na aba 06 de Finalização/Condutas do PEC
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
