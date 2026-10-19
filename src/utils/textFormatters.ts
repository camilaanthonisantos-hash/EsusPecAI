export const formatName = (text?: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos'];
  
  return text
    .toLowerCase()
    .split(/\s+/) // handle multiple spaces
    .map((word, index) => {
      // Handle empty words from multiple spaces
      if (!word) return word;

      // Always capitalize the first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      
      // Check if it's an exception
      if (exceptions.includes(word)) {
        return word;
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export const formatEmail = (email?: string): string => {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim();
};

export const cleanDuplicateSignatureLines = (text?: string): string => {
  if (!text || typeof text !== 'string') return '';

  // 1. Normalize spelling of Psicissocial -> Psicossocial
  let cleaned = text.replace(/Psicissocial/gi, 'Psicossocial');

  // Helper to normalize a line for similarity checking (remove markdown, spaces, accents, punctuation)
  const normalizeForCheck = (line: string): string => {
    return line
      .toLowerCase()
      .replace(/[*_~`]/g, '')
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const lines = cleaned.split('\n');
  const resultLines: string[] = [];
  const seenNormalizedLines = new Set<string>();
  let hasAtenciosamente = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const normalized = normalizeForCheck(trimmed);

    // Empty lines handling
    if (!trimmed) {
      if (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === '') {
        continue;
      }
      resultLines.push('');
      continue;
    }

    // Check for "Atenciosamente"
    if (normalized.startsWith('atenciosamente')) {
      if (hasAtenciosamente) {
        continue;
      }
      hasAtenciosamente = true;
      resultLines.push(rawLine);
      seenNormalizedLines.add(normalized);
      continue;
    }

    // Check for unit signature lines (e.g. CAPS, UBS Central, Atenção Primária, etc.)
    const isUnitSignatureLine =
      normalized.includes('caps') ||
      normalized.includes('psicossocial') ||
      normalized.includes('ubs') ||
      normalized.includes('atencao primaria') ||
      normalized.includes('primaria') ||
      normalized.includes('unidade') ||
      (normalized.includes('centro') && normalized.includes('atencao'));

    // If we're after Atenciosamente, strip any unit signature line or exact duplicate
    if (hasAtenciosamente) {
      if (isUnitSignatureLine || seenNormalizedLines.has(normalized)) {
        continue;
      }
    } else if (isUnitSignatureLine) {
      if (seenNormalizedLines.has(normalized)) {
        continue;
      }
      seenNormalizedLines.add(normalized);
    }

    // Check if line is identical to immediate previous non-empty line
    let prevNonEmpty = '';
    for (let j = resultLines.length - 1; j >= 0; j--) {
      if (resultLines[j].trim() !== '') {
        prevNonEmpty = normalizeForCheck(resultLines[j]);
        break;
      }
    }
    if (prevNonEmpty && prevNonEmpty === normalized) {
      continue;
    }

    resultLines.push(rawLine);
    seenNormalizedLines.add(normalized);
  }

  // Remove trailing empty lines
  while (resultLines.length > 0 && resultLines[resultLines.length - 1].trim() === '') {
    resultLines.pop();
  }

  return resultLines.join('\n');
};

/**
 * Formata telefone brasileiro com máscara:
 * Ex: [91985958041] -> (91) 98595-8041 (DDD + 9º dígito + 8 números)
 * Fixos de 10 dígitos: (XX) XXXX-XXXX
 */
export const formatPhoneBR = (value?: string): string => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};
