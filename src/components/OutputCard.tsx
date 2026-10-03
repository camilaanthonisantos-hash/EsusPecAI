import React, { useState, useEffect } from 'react';
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
  Pill,
  Send,
  HeartHandshake,
  FlaskConical,
  CheckCircle2,
  FileCheck2,
  FileCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { GeneratedPECRecord, ProfessionConfig, Patient } from '../types';
import { copyToClipboard } from '../services/gemini';
import { parsePecText } from '../utils/pecFormatter';
import { PecQuickCodesBar } from './PecQuickCodesBar';
import { isDoctorConsultation, cleanDoctorConsultation } from '../utils/doctorConsultationCleaner';
import { canIssueMedicalCertificate, canIssueAttendanceCertificate } from '../data/professions';

function renderFormattedPECContent(text: string) {
  const blocks = parsePecText(text);
  if (blocks.length === 0) {
    return <span className="text-slate-400 italic">Nenhum conteúdo.</span>;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        if (block.type === 'banner') {
          return (
            <div
              key={idx}
              className="font-bold text-xs uppercase tracking-wider text-teal-700 dark:text-teal-300 py-1.5 border-b border-teal-500/20"
            >
              {block.text}
            </div>
          );
        }

        if (block.type === 'header') {
          return (
            <div
              key={idx}
              className="font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 text-sm mt-3.5 mb-1 flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block shadow-xs" />
              <span>{block.title}</span>
            </div>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={idx}
              className="my-1.5 pl-4 py-2 border-l-4 border-teal-500 bg-teal-500/5 dark:bg-teal-950/20 rounded-r-xl italic text-slate-700 dark:text-slate-200 text-sm leading-relaxed"
            >
              {block.lines?.map((line, lIdx) => (
                <div key={lIdx} className={lIdx > 0 ? 'mt-1' : ''}>
                  {line}
                </div>
              ))}
            </blockquote>
          );
        }

        return (
          <div key={idx} className="my-1 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
            {block.text}
          </div>
        );
      })}
    </div>
  );
}

interface OutputCardProps {
  record: GeneratedPECRecord;
  profession: ProfessionConfig;
  patient?: Patient | null;
  onSaveToTimeline?: (record: GeneratedPECRecord, updatedTexts?: { avaliacao?: string; plano?: string; conduta?: string }) => void;
  isSavedToTimeline?: boolean;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenPrescription?: (consultationPlanText: string) => void;
  onOpenReferral?: (planText: string, notesText?: string) => void;
  onOpenPts?: (planText: string, notesText?: string) => void;
  onOpenExamRequest?: (planText: string, notesText?: string) => void;
  onOpenMedicalReport?: () => void;
  onOpenMedicalCertificate?: () => void;
  onOpenAttendanceCertificate?: () => void;
  onOpenExamMedia?: () => void;
  onOpenCompleteModal?: (updatedTexts: { avaliacao: string; plano: string; conduta: string }) => void;
}

export const OutputCard: React.FC<OutputCardProps> = ({
  record,
  profession,
  patient,
  onSaveToTimeline,
  isSavedToTimeline = false,
  onShowToast,
  onOpenPrescription,
  onOpenReferral,
  onOpenPts,
  onOpenExamRequest,
  onOpenMedicalReport,
  onOpenMedicalCertificate,
  onOpenAttendanceCertificate,
  onOpenExamMedia,
  onOpenCompleteModal,
}) => {
  const isDoctor = isDoctorConsultation(profession.id, profession.cbo);
  const initialDoctorData = isDoctor
    ? cleanDoctorConsultation(record.avaliacao, record.plano, record.conduta)
    : null;

  // Local state for inline edits
  const [avaliacaoText, setAvaliacaoText] = useState(initialDoctorData ? initialDoctorData.avaliacao : record.avaliacao);
  const [planoText, setPlanoText] = useState(initialDoctorData ? initialDoctorData.plano : record.plano);
  const [condutaText, setCondutaText] = useState(initialDoctorData ? '' : (record.conduta || ''));

  useEffect(() => {
    if (isDoctor) {
      const cleaned = cleanDoctorConsultation(record.avaliacao, record.plano, record.conduta);
      setAvaliacaoText(cleaned.avaliacao);
      setPlanoText(cleaned.plano);
      setCondutaText('');
    } else {
      setAvaliacaoText(record.avaliacao);
      setPlanoText(record.plano);
      setCondutaText(record.conduta || '');
    }
  }, [record, isDoctor]);

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

  const isTriage =
    record.isTriage ||
    profession.isTriageOnly ||
    record.professionId === 'tecnico_enfermagem' ||
    record.professionId === 'auxiliar_enfermagem';

  const handleCopyFull = async () => {
    if (isTriage) {
      const success = await copyToClipboard(avaliacaoText);
      if (success) {
        setCopiedSection('full');
        onShowToast(
          'success',
          'Registro de Triagem copiado com sucesso! Pronto para colar no PEC.',
          'Triagem Copiada'
        );
        setTimeout(() => setCopiedSection(null), 2500);
      }
      return;
    }

    let full = `[REGISTRO PEC - ${profession.name.toUpperCase()}]\n\n--- CAMPO: AVALIAÇÃO ---\n${avaliacaoText}\n\n--- CAMPO: PLANO ---\n${planoText}`;
    if (!isDoctor && (record.conduta || condutaText)) {
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

    if (!isDoctor && condutaText) {
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
          {onOpenCompleteModal && (
            <button
              type="button"
              id="btn-concluir-atendimento"
              onClick={() =>
                onOpenCompleteModal({
                  avaliacao: avaliacaoText,
                  plano: planoText,
                  conduta: condutaText,
                })
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Concluir Atendimento Clínico (Gravar na Linha do Tempo e/ou Encaminhar para Fila)"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir Atendimento</span>
            </button>
          )}

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

          {(profession.id === 'enfermeiro' || profession.id === 'medico') && onOpenPrescription && (
            <button
              type="button"
              id="emit-prescription-btn"
              onClick={() => onOpenPrescription(`${planoText}\n${condutaText}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800 transition-all cursor-pointer shadow-xs"
              title="Emitir Prescrição ou Transcrição de Medicamentos em 2 Vias A4 Paisagem"
            >
              <Pill className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Prescrever Medicamentos (2 Vias A4)</span>
            </button>
          )}

          {onOpenReferral && (
            <button
              type="button"
              id="emit-referral-btn"
              onClick={() => onOpenReferral(`${planoText}\n${condutaText}`, avaliacaoText)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-800 transition-all cursor-pointer shadow-xs"
              title="Emitir Guia de Encaminhamento e Referência SUS em Folha A4 Retrato"
            >
              <Send className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Encaminhamento (A4)</span>
            </button>
          )}

          {onOpenPts && (
            <button
              type="button"
              id="emit-pts-btn"
              onClick={() => onOpenPts(`${planoText}\n${condutaText}`, avaliacaoText)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 transition-all cursor-pointer shadow-xs"
              title="Elaborar Projeto Terapêutico Singular (PTS) Multiprofissional em Folha A4"
            >
              <HeartHandshake className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Elaborar PTS (A4)</span>
            </button>
          )}

          {onOpenExamRequest && (
            <button
              type="button"
              id="emit-exam-request-btn"
              onClick={() => onOpenExamRequest(`${planoText}\n${condutaText}`, avaliacaoText)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 transition-all cursor-pointer shadow-xs"
              title="Solicitar Exames Laboratoriais e de Imagem em Folha A4 Paisagem (2 Vias)"
            >
              <FlaskConical className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Exames (2 Vias A4)</span>
            </button>
          )}

          {canIssueMedicalCertificate(profession.id) && onOpenMedicalCertificate && (
            <button
              type="button"
              id="emit-medical-certificate-btn"
              onClick={() => onOpenMedicalCertificate()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 transition-all cursor-pointer shadow-xs"
              title="Emitir Atestado Médico com quantidade de dias de afastamento e CID-10 (Exclusivo Médico)"
            >
              <FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Atestado Médico (A4)</span>
            </button>
          )}

          {canIssueAttendanceCertificate(profession.id, profession.cbo) && onOpenAttendanceCertificate && (
            <button
              type="button"
              id="emit-attendance-certificate-btn"
              onClick={() => onOpenAttendanceCertificate()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-800 transition-all cursor-pointer shadow-xs"
              title="Emitir Atestado de Comparecimento para comprovar o dia do atendimento (Nível Superior)"
            >
              <FileCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Atestado de Comparecimento (A4)</span>
            </button>
          )}

          {profession.id === 'medico' && onOpenMedicalReport && (
            <button
              type="button"
              id="emit-medical-report-btn"
              onClick={() => onOpenMedicalReport()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-xs"
              title="Emitir Laudo Médico Oficial em Folha A4 com auxílio de IA (Exclusivo da Classe Médica)"
            >
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Laudo Médico (A4)</span>
            </button>
          )}

          {onOpenExamMedia && (
            <button
              type="button"
              id="emit-exam-media-btn"
              onClick={() => onOpenExamMedia()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 transition-all cursor-pointer shadow-xs"
              title="Anexar Imagens e QR Code de Vídeos em Folha A4 (Até 6 por Página)"
            >
              <ImageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Imagens e Vídeos (A4)</span>
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
            {isTriage
              ? 'Triagem & Sinais Vitais (Sem IA)'
              : record.isFirstConsultation
              ? 'Primeiro Atendimento / Acolhimento'
              : 'Retorno / Reavaliação'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isTriage ? 'Sinais Vitais & Antropometria em Gramas' : 'Sinais Vitais Qualitativos'}</span>
        </div>
        {!isTriage && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
            <span>CIAP-2: -69 & SIGTAP: 0301080445 Inclusos</span>
          </div>
        )}
        {profession.id === 'enfermeiro' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>NANDA-I / NOC / NIC + Conduta 06</span>
          </div>
        )}
      </div>

      {/* ================= SPECIALIZED SINGLE CARD: CAMPO TRIAGEM (TÉC. & AUX. DE ENFERMAGEM) ================= */}
      {isTriage ? (
        <motion.div
          id="card-campo-triagem"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden relative group"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-teal-50/50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-xs">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  CAMPO ÚNICO: TRIAGEM
                  <span className="text-[11px] font-normal text-teal-700 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    e-SUS / PEC
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Registro completo de sinais vitais, cálculo de IMC e parâmetros clínicos pronto para cópia.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="edit-triagem-toggle-btn"
                onClick={() => setIsEditingAvaliacao(!isEditingAvaliacao)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                title={isEditingAvaliacao ? 'Concluir edição' : 'Editar texto antes de copiar'}
              >
                {isEditingAvaliacao ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">
                  {isEditingAvaliacao ? 'Salvar Edição' : 'Editar'}
                </span>
              </button>

              {/* Prominent Copy Button */}
              <button
                id="copy-triagem-btn"
                onClick={() => handleCopySection('Triagem', avaliacaoText)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer"
              >
                {copiedSection === 'Triagem' || copiedSection === 'full' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Triagem
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-4">
            {isEditingAvaliacao ? (
              <textarea
                id="textarea-edit-triagem"
                value={avaliacaoText}
                onChange={(e) => setAvaliacaoText(e.target.value)}
                rows={12}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-teal-500/50 text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y leading-relaxed"
              />
            ) : (
              <div
                id="content-preview-triagem"
                className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-sans text-sm leading-relaxed whitespace-pre-wrap bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"
              >
                {avaliacaoText}
              </div>
            )}

            {/* Footer character counter */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>{avaliacaoText.length} caracteres • {avaliacaoText.split(/\s+/).filter(Boolean).length} palavras</span>
              <span className="text-teal-600 dark:text-teal-400 font-medium">
                Pronto para colar no campo de Triagem / Atendimento do PEC
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
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
                <span style={{ color: '#041124' }} className="text-[11px] font-normal text-[#041124] dark:text-[#041124]">
                  (e-SUS / PEC)
                </span>
              </h4>
              <p style={{ color: '#0c2754' }} className="text-[11px] text-[#0c2754] dark:text-[#0c2754]">
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
              <span style={{ color: '#061a36' }} className="hidden sm:inline text-[#061a36] dark:text-[#061a36]">
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

          {/* Quick-Copy Codes Bar (CIAP-2 & Clean CID-10) */}
          <PecQuickCodesBar
            type="avaliacao"
            text={avaliacaoText}
            onShowToast={onShowToast}
            professionId={profession.id}
            userCbo={profession.cbo}
          />

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
                <span style={{ color: '#04142b' }} className="text-[11px] font-normal text-[#04142b] dark:text-[#04142b]">
                  (e-SUS / PEC)
                </span>
              </h4>
              <p style={{ color: '#091a33' }} className="text-[11px] text-[#091a33] dark:text-[#091a33]">
                {profession.id === 'enfermeiro'
                  ? 'Metas NOC, Intervenções NIC e Códigos Fixos CIAP-2/SIGTAP'
                  : isDoctor
                  ? 'Metas e Objetivos Terapêuticos, Intervenções e Condutas Técnicas, CIAP-2 e SIGTAP'
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

          {/* Quick-Copy Codes Bar (CIAP-2 & SIGTAP / SIA) */}
          <PecQuickCodesBar
            type="plano"
            text={planoText}
            onShowToast={onShowToast}
            professionId={profession.id}
            userCbo={profession.cbo}
          />

          {/* Footer character counter & Fixed Code Highlight */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>{planoText.length} caracteres • {planoText.split(/\s+/).filter(Boolean).length} palavras</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              Procedimentos Oficiais CAPS • CBO {profession.cbo}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ================= CARD 3: CAMPO 06 - FINALIZAÇÃO / CONDUTA ================= */}
      {!isDoctor && (profession.id === 'enfermeiro' || condutaText.length > 0) && (
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
                <h4 style={{ color: '#092038' }} className="text-sm font-bold text-[#092038] dark:text-[#092038] flex items-center gap-2">
                  CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA
                  <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                    (e-SUS / PEC)
                  </span>
                </h4>
                <p style={{ color: '#081f3d' }} className="text-[11px] text-[#081f3d] dark:text-[#081f3d]">
                  Conduta Imediata, Articulação de Rede, Encaminhamentos/Guias e Agendamentos
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
                <span style={{ color: '#09182e' }} className="hidden sm:inline text-[#09182e] dark:text-[#09182e]">
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
        </>
      )}
    </div>
  );
};
