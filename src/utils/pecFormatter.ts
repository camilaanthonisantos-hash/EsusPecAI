/**
 * Utility functions for parsing, formatting, and copying e-SUS PEC clinical records.
 * Supports HTML Rich Text (with <strong> and <blockquote>) for native pasting into the PEC web editor,
 * as well as clean plain text fallback.
 */

export interface PecBlock {
  type: 'banner' | 'header' | 'quote' | 'paragraph';
  title?: string;
  lines?: string[];
  text?: string;
}

/**
 * Escapes HTML special characters to prevent XSS and formatting breakage.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses raw PEC text or Markdown into structured blocks.
 */
export function parsePecText(text: string): PecBlock[] {
  if (!text) return [];
  const rawLines = text.split('\n');
  const blocks: PecBlock[] = [];

  let currentQuoteLines: string[] = [];

  const flushQuote = () => {
    if (currentQuoteLines.length > 0) {
      blocks.push({
        type: 'quote',
        lines: [...currentQuoteLines],
      });
      currentQuoteLines = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    // Citation / quote line
    if (trimmed.startsWith('>')) {
      const content = trimmed.replace(/^>\s*/, '');
      currentQuoteLines.push(content);
      continue;
    }

    // Flush any pending quote block before handling non-quote line
    flushQuote();

    if (!trimmed) {
      continue; // Ignore blank lines; separation handled by block structure
    }

    // Banner / Field delimiters like "--- CAMPO: AVALIAÇÃO ---" or "[REGISTRO PEC ...]" or "### CAMPO: ..."
    if (
      trimmed.startsWith('---') ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('###') ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      const cleanBanner = trimmed
        .replace(/^#+\s*/, '')
        .replace(/^[=-]+\s*|\s*[=-]+$/g, '')
        .trim();
      blocks.push({
        type: 'banner',
        text: cleanBanner || trimmed,
      });
      continue;
    }

    // Clean any markdown bolding like **Histórico/Evolução:** or *Histórico/Evolução:*
    const cleanHeaderCandidate = trimmed.replace(/^\*+|\*+$/g, '').trim();

    // Check if it's a section header ending with ':' or matching standard clinical sections
    const isStandardHeaderName =
      /^(HISTÓRICO(\/EVOLUÇÃO)?|EXAME CLÍNICO|DIAGNÓSTICOS DE ENFERMAGEM|DIAGNÓSTICOS|METAS|INTERVENÇÕES|CIAP-2|CID-10|SIGTAP|CONDUTA IMEDIATA|PRESCRIÇÕES|GUIAS DE REFERÊNCIA|RETORNO(\/AGENDAMENTO)?|CONDUTA TERAPÊUTICA|ENCAMINHAMENTOS|AVALIAÇÃO)/i.test(
        cleanHeaderCandidate
      );

    const isHeaderEndingWithColon =
      cleanHeaderCandidate.endsWith(':') &&
      cleanHeaderCandidate.length < 100 &&
      !cleanHeaderCandidate.startsWith('-') &&
      !cleanHeaderCandidate.startsWith('•');

    if (isStandardHeaderName || isHeaderEndingWithColon) {
      let title = cleanHeaderCandidate;
      if (!title.endsWith(':')) {
        title += ':';
      }
      blocks.push({
        type: 'header',
        title: title.toUpperCase(),
      });
      continue;
    }

    // Standard paragraph
    blocks.push({
      type: 'paragraph',
      text: trimmed,
    });
  }

  flushQuote();
  return blocks;
}

/**
 * Converts PEC text into Rich HTML suitable for pasting directly into the e-SUS PEC WYSIWYG editor.
 * Section titles become <strong>UPPERCASE</strong> and content becomes <blockquote> for native quotation boxes.
 */
export function pecToHtml(text: string): string {
  const blocks = parsePecText(text);
  if (blocks.length === 0) return '';

  const htmlParts: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'banner') {
      htmlParts.push(`<p><strong>${escapeHtml(block.text || '')}</strong></p>`);
    } else if (block.type === 'header') {
      htmlParts.push(`<p><strong>${escapeHtml(block.title || '')}</strong></p>`);
    } else if (block.type === 'quote') {
      const formattedLines = (block.lines || []).map((line) => escapeHtml(line)).join('<br>');
      htmlParts.push(`<blockquote><p>${formattedLines}</p></blockquote>`);
    } else if (block.type === 'paragraph') {
      htmlParts.push(`<p>${escapeHtml(block.text || '')}</p>`);
    }
  }

  return htmlParts.join('\n');
}

/**
 * Converts PEC text into clean plain text fallback with uppercase headers and compact citation blocks.
 */
export function pecToPlainText(text: string): string {
  const blocks = parsePecText(text);
  if (blocks.length === 0) return '';

  const parts: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'banner') {
      parts.push(`--- ${block.text} ---`);
    } else if (block.type === 'header') {
      parts.push(`${block.title}`);
    } else if (block.type === 'quote') {
      const quoteText = (block.lines || []).map((line) => `> ${line}`).join('\n');
      parts.push(quoteText);
    } else if (block.type === 'paragraph') {
      parts.push(block.text || '');
    }
  }

  let result = '';
  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];
    const part = parts[i];

    if (i > 0) {
      const prev = blocks[i - 1];
      // Header followed immediately by quote -> single newline (no blank line in between)
      if (prev.type === 'header' && current.type === 'quote') {
        result += '\n' + part;
      } else {
        result += '\n\n' + part;
      }
    } else {
      result += part;
    }
  }

  return result;
}

/**
 * Normalizes PEC text ensuring consistent uppercase headers and tight citations.
 */
export function formatPecText(text: string): string {
  return pecToPlainText(text);
}

/**
 * Copies PEC text to the clipboard with BOTH 'text/html' (for rich-text editors like e-SUS PEC)
 * and 'text/plain' (for standard inputs/editors).
 */
export async function copyPecToClipboard(text: string, customHtml?: string): Promise<boolean> {
  if (!text) return false;

  const html = customHtml || pecToHtml(text);
  const plain = pecToPlainText(text);

  // 1. Try modern async Clipboard API with text/html and text/plain ClipboardItem
  if (navigator?.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plain], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    } catch (err) {
      console.warn('ClipboardItem write failed, trying event-based copy fallback', err);
    }
  }

  // 2. Try copy event listener with document.execCommand('copy')
  try {
    let copySuccessful = false;
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/html', html);
        e.clipboardData.setData('text/plain', plain);
        copySuccessful = true;
      }
    };

    document.addEventListener('copy', onCopy);
    try {
      document.execCommand('copy');
    } finally {
      document.removeEventListener('copy', onCopy);
    }

    if (copySuccessful) return true;
  } catch (err) {
    console.warn('execCommand copy event failed, trying writeText', err);
  }

  // 3. Fallback to navigator.clipboard.writeText
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(plain);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed', err);
    }
  }

  // 4. Final textarea fallback
  try {
    const textArea = document.createElement('textarea');
    textArea.value = plain;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export interface ExtractedCiap2 {
  code: string;
  description: string;
  raw: string;
}

export interface ExtractedCid10 {
  rawCode: string;
  cleanCode: string; // purely letters and numbers, without dots (e.g. Z00.4 -> Z004)
  description: string;
  raw: string;
}

export interface ExtractedSigtap {
  code: string;
  name: string;
  isFixed?: boolean;
}

/**
 * Extracts CIAP-2 codes and descriptions from clinical text.
 */
export function extractCiap2Codes(text: string): ExtractedCiap2[] {
  if (!text) return [];
  const results: ExtractedCiap2[] = [];
  const seen = new Set<string>();

  const lines = text.split('\n');
  let inCiapSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^CIAP-2:?/i.test(trimmed)) {
      inCiapSection = true;
      const inlineMatch = trimmed.match(/^CIAP-2:?\s*(?:-?\s*)?([A-Za-z]\d{2}|\b-?\d{2,3}\b)(?:\s*[-–—:]\s*|\s*\((.*?)\)|\s+(.*))?/i);
      if (inlineMatch && inlineMatch[1]) {
        const code = inlineMatch[1].replace(/^-/, '').toUpperCase();
        const desc = (inlineMatch[2] || inlineMatch[3] || '').trim();
        if (!seen.has(code)) {
          seen.add(code);
          results.push({ code, description: desc, raw: trimmed });
        }
      }
      continue;
    }

    if (
      inCiapSection &&
      (/^(CID-10|SIGTAP|EXAME|HISTÓRICO|DIAGNÓSTICOS|METAS|INTERVENÇÕES|CONDUTA|CAMPO)/i.test(trimmed) ||
        (trimmed.endsWith(':') && !trimmed.startsWith('-')))
    ) {
      inCiapSection = false;
    }

    const match = trimmed.match(/^(?:>\s*)?(?:[-*•]\s*)?([A-Za-z]\d{2}|\b-?\d{2,3}\b)(?:\s*\((.*?)\)|\s*[-–—:]\s*(.*?))?$/);
    if (match && (inCiapSection || /^[A-Za-z]\d{2}$/.test(match[1]))) {
      const code = match[1].replace(/^-/, '').toUpperCase();
      const desc = (match[2] || match[3] || '').trim();
      if (!seen.has(code)) {
        seen.add(code);
        results.push({ code, description: desc, raw: trimmed });
      }
    }
  }

  // Fallback regex over full text if section parser found nothing
  if (results.length === 0) {
    const regex = /\b([A-Za-z]\d{2})\b(?:\s*\((.*?)\)|\s*[-–—]\s*([^\n,]+))?/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const code = m[1].toUpperCase();
      if (!seen.has(code)) {
        seen.add(code);
        results.push({ code, description: (m[2] || m[3] || '').trim(), raw: m[0] });
      }
    }
  }

  return results;
}

/**
 * Extracts CID-10 codes and descriptions from clinical text.
 * Cleans the code so it contains ONLY alphanumeric characters (e.g. Z00.4 -> Z004).
 */
export function extractCid10Codes(text: string): ExtractedCid10[] {
  if (!text) return [];
  const results: ExtractedCid10[] = [];
  const seen = new Set<string>();

  const lines = text.split('\n');
  let inCidSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^CID-10:?/i.test(trimmed)) {
      inCidSection = true;
      const inlineMatch = trimmed.match(/^CID-10:?\s*(?:-?\s*)?([A-Za-z]\d{2}(?:\.\d{1,2})?|[A-Za-z]\d{3})(?:\s*[-–—:]\s*|\s*\((.*?)\)|\s+(.*))?/i);
      if (inlineMatch && inlineMatch[1]) {
        const rawCode = inlineMatch[1].toUpperCase();
        const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const desc = (inlineMatch[2] || inlineMatch[3] || '').trim();
        if (!seen.has(cleanCode)) {
          seen.add(cleanCode);
          results.push({ rawCode, cleanCode, description: desc, raw: trimmed });
        }
      }
      continue;
    }

    if (
      inCidSection &&
      (/^(CIAP-2|SIGTAP|EXAME|HISTÓRICO|DIAGNÓSTICOS|METAS|INTERVENÇÕES|CONDUTA|CAMPO)/i.test(trimmed) ||
        (trimmed.endsWith(':') && !trimmed.startsWith('-')))
    ) {
      inCidSection = false;
    }

    const match = trimmed.match(/^(?:>\s*)?(?:[-*•]\s*)?([A-Za-z]\d{2}(?:\.\d{1,2})?|[A-Za-z]\d{3})(?:\s*\((.*?)\)|\s*[-–—:]\s*(.*?))?$/);
    if (match && (inCidSection || /\.[0-9]/.test(match[1]) || /^[A-Z]\d{3}$/.test(match[1]))) {
      const rawCode = match[1].toUpperCase();
      const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const desc = (match[2] || match[3] || '').trim();
      if (!seen.has(cleanCode)) {
        seen.add(cleanCode);
        results.push({ rawCode, cleanCode, description: desc, raw: trimmed });
      }
    }
  }

  // Fallback regex over full text
  if (results.length === 0) {
    const regex = /\b([A-Za-z]\d{2}(?:\.\d{1,2})?|[A-Za-z]\d{3})\b(?:\s*\((.*?)\)|\s*[-–—]\s*([^\n,]+))?/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const rawCode = m[1].toUpperCase();
      const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!seen.has(cleanCode) && (rawCode.includes('.') || cleanCode.length >= 4 || rawCode.startsWith('Z') || rawCode.startsWith('F') || rawCode.startsWith('I'))) {
        seen.add(cleanCode);
        results.push({ rawCode, cleanCode, description: (m[2] || m[3] || '').trim(), raw: m[0] });
      }
    }
  }

  return results;
}

export const STANDARD_SIGTAP_PROCEDURES: ExtractedSigtap[] = [
  {
    code: '0301080445',
    name: 'ORIENTAÇÃO INDIVIDUAL EM SAÚDE',
    isFixed: true,
  },
  {
    code: '0301100012',
    name: 'ADMINISTRAÇÃO DE MEDICAMENTOS NA ATENÇÃO ESPECIALIZADA',
    isFixed: false,
  },
  {
    code: '0301070288',
    name: 'ALTA POR OBJETIVOS TERAPÊUTICOS ALCANÇADOS DA REABILITAÇÃO NA ATENÇÃO ESPECIALIZADA',
    isFixed: false,
  },
];

/**
 * Extracts SIGTAP codes from text and combines with standard procedures.
 */
export function extractSigtapCodes(text: string): ExtractedSigtap[] {
  const list: ExtractedSigtap[] = [...STANDARD_SIGTAP_PROCEDURES];
  const seenCodes = new Set(list.map((item) => item.code));

  if (!text) return list;

  // Search for any additional 10 digit SIGTAP codes
  const regex = /\b(0\d{9})\b(?:\s*\((.*?)\)|\s*[-–—:]\s*([^\n]+))?/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const code = m[1];
    if (!seenCodes.has(code)) {
      seenCodes.add(code);
      const name = (m[2] || m[3] || 'Procedimento Clínico').trim();
      list.push({ code, name: name.toUpperCase(), isFixed: false });
    }
  }

  return list;
}

