/**
 * Utility functions for sanitizing, formatting, and standardizing
 * medical attendance records (Médico / CRM) for e-SUS PEC and print sheets.
 */

export function isDoctorConsultation(
  professionIdOrName?: string,
  authorRegister?: string
): boolean {
  if (!professionIdOrName && !authorRegister) return false;
  const p = (professionIdOrName || '').toLowerCase();
  const reg = (authorRegister || '').toUpperCase();
  return (
    p === 'medico' ||
    p.includes('médic') ||
    p.includes('medic') ||
    reg.includes('CRM')
  );
}

/**
 * Normalizes and formats the medical attendance fields:
 * - Parte 01 (Avaliação): Retains clean evaluation with History, Clinical Exam, Diagnoses, CIAP-2, and CID-10.
 * - Parte 02 (Plano): Renamed to "PLANO CUIDADO / INTERVENÇÕES / CONDUTAS / DESFECHO" in print.
 *   Removes any duplicated evaluation text from Parte 01.
 *   Relocates "CONDUTA IMEDIATA" and "RETORNO / AGENDAMENTO" into Plano.
 *   Excludes "ENCAMINHAMENTOS E ARTICULAÇÃO DE REDE" and "PRESCRIÇÕES / GUIAS / DOCUMENTOS".
 *   Guarantees standard CIAP-2 and SIGTAP coding.
 * - Parte 03 (Conduta / Campo 06): Excluded for doctor consultations since all items are consolidated into Plano.
 */
export function cleanDoctorConsultation(
  avaliacao: string,
  plano: string,
  conduta?: string
): { avaliacao: string; plano: string; conduta: string } {
  const cleanAvaliacao = (avaliacao || '').trim();
  let cleanPlano = (plano || '').trim();
  const rawConduta = (conduta || '').trim();

  // 1. Remove duplicated evaluation content from plano if present
  if (cleanPlano.includes('--- CAMPO: PLANO ---')) {
    cleanPlano = cleanPlano.split('--- CAMPO: PLANO ---')[1].trim();
  } else if (/CAMPO:?\s*PLANO/i.test(cleanPlano)) {
    cleanPlano = cleanPlano.replace(/^[\s\S]*?CAMPO:?\s*PLANO\s*[-—–]*\s*/i, '').trim();
  } else {
    // If it starts with repeated evaluation text and has METAS E OBJETIVOS
    const metasIdx = cleanPlano.search(/METAS(\s+E\s+OBJETIVOS\s+TERAP[ÊE]UTICOS)?:\s*/i);
    if (metasIdx > 0) {
      cleanPlano = cleanPlano.substring(metasIdx).trim();
    }
  }

  // Remove any leftover evaluation headers from plano
  cleanPlano = cleanPlano
    .replace(
      /^(?:HISTÓRICO|AVALIAÇÃO TÉCNICA|EXAME CLÍNICO|DIAGNÓSTICOS|CID-10|CIAP-2:?\s*-[^6])[\s\S]*?(?=(?:METAS|INTERVENÇÕES|CONDUTA IMEDIATA|RETORNO|CIAP-2:?\s*-?\s*69))/im,
      ''
    )
    .trim();

  // 2. Helper to remove excluded sections: ENCAMINHAMENTOS and PRESCRIÇÕES / GUIAS
  const removeExcludedSections = (text: string) => {
    return text
      .replace(
        /ENCAMINHAMENTOS\s*(?:E\s*ARTICULA[ÇC][ÃA]O\s*DE\s*REDE)?:\s*[\s\S]*?(?=(?:PRESCRI[ÇC][ÕO]ES|RETORNO|CIAP-2|SIGTAP|CONDUTA|$))/gi,
        ''
      )
      .replace(
        /PRESCRI[ÇC][ÕO]ES\s*(?:\/\s*GUIAS\s*\/\s*DOCUMENTOS)?:\s*[\s\S]*?(?=(?:RETORNO|CIAP-2|SIGTAP|CONDUTA|$))/gi,
        ''
      )
      .trim();
  };

  cleanPlano = removeExcludedSections(cleanPlano);
  const filteredConduta = removeExcludedSections(rawConduta);

  // 3. Extract CONDUTA IMEDIATA from conduta or plano
  let condutaImediataContent = '';
  const combinedSource = `${filteredConduta}\n\n${cleanPlano}`;
  const condutaImediataMatch = combinedSource.match(
    /CONDUTA\s*IMEDIATA:\s*([\s\S]*?)(?=(?:RETORNO|CIAP-2|SIGTAP|ENCAMINHAMENTOS|PRESCRI[ÇC][ÕO]ES|$))/i
  );
  if (condutaImediataMatch && condutaImediataMatch[1]?.trim()) {
    condutaImediataContent = condutaImediataMatch[1].trim();
  }

  // 4. Extract RETORNO / AGENDAMENTO from conduta or plano
  let retornoContent = '';
  const retornoMatch = combinedSource.match(
    /RETORNO(?:\s*\/\s*AGENDAMENTO)?:\s*([\s\S]*?)(?=(?:CIAP-2|SIGTAP|ENCAMINHAMENTOS|PRESCRI[ÇC][ÕO]ES|CONDUTA|$))/i
  );
  if (retornoMatch && retornoMatch[1]?.trim()) {
    retornoContent = retornoMatch[1].trim();
  }

  // 5. Remove CONDUTA IMEDIATA, RETORNO, CIAP-2, SIGTAP from cleanPlano to assemble in clean order
  cleanPlano = cleanPlano
    .replace(/CONDUTA\s*IMEDIATA:\s*[\s\S]*?(?=(?:RETORNO|CIAP-2|SIGTAP|$))/gi, '')
    .replace(/RETORNO(?:\s*\/\s*AGENDAMENTO)?:\s*[\s\S]*?(?=(?:CIAP-2|SIGTAP|$))/gi, '')
    .trim();

  // 6. Extract CIAP-2 and SIGTAP
  let ciap2Content = '';
  const ciap2Match = cleanPlano.match(/CIAP-2:\s*([\s\S]*?)(?=(?:SIGTAP|$))/i);
  if (ciap2Match) {
    ciap2Content = ciap2Match[1].trim();
    cleanPlano = cleanPlano.replace(/CIAP-2:\s*[\s\S]*?(?=(?:SIGTAP|$))/gi, '').trim();
  }

  let sigtapContent = '';
  const sigtapMatch = cleanPlano.match(/SIGTAP:\s*([\s\S]*?)$/i);
  if (sigtapMatch) {
    sigtapContent = sigtapMatch[1].trim();
    cleanPlano = cleanPlano.replace(/SIGTAP:\s*[\s\S]*?$/gi, '').trim();
  }

  if (!ciap2Content || !ciap2Content.includes('69')) {
    ciap2Content = '> - 69 (Outras orientações / Aconselhamento / Educação em saúde)';
  }
  if (!sigtapContent || !sigtapContent.includes('ORIENTAÇÃO INDIVIDUAL')) {
    sigtapContent = '> - ORIENTAÇÃO INDIVIDUAL EM SAÚDE';
  }

  const formatAsQuote = (text: string) => {
    return text
      .split('\n')
      .map((line) => {
        const tr = line.trim();
        if (!tr) return '';
        return tr.startsWith('>') ? tr : `> ${tr}`;
      })
      .filter(Boolean)
      .join('\n');
  };

  const parts: string[] = [];
  if (cleanPlano) {
    parts.push(cleanPlano);
  }
  if (condutaImediataContent) {
    parts.push(`CONDUTA IMEDIATA:\n${formatAsQuote(condutaImediataContent)}`);
  }
  if (retornoContent) {
    parts.push(`RETORNO / AGENDAMENTO:\n${formatAsQuote(retornoContent)}`);
  }
  parts.push(
    `CIAP-2:\n${ciap2Content.startsWith('>') ? ciap2Content : formatAsQuote(ciap2Content)}`
  );
  parts.push(
    `SIGTAP:\n${sigtapContent.startsWith('>') ? sigtapContent : formatAsQuote(sigtapContent)}`
  );

  return {
    avaliacao: cleanAvaliacao,
    plano: parts.join('\n\n'),
    conduta: '',
  };
}
