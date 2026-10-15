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
 * Normalizes medical attendance fields without stripping or truncating clinical content.
 * Guarantees that all evaluation, plan, and conduta texts remain completely intact in full.
 */
export function cleanDoctorConsultation(
  avaliacao: string,
  plano: string,
  conduta?: string
): { avaliacao: string; plano: string; conduta: string } {
  const cleanAvaliacao = (avaliacao || '').trim();
  let cleanPlano = (plano || '').trim();
  const cleanConduta = (conduta || '').trim();

  // Gentle header prefix removal if duplicated explicitly at start of string
  if (cleanPlano.startsWith('--- CAMPO: PLANO ---')) {
    cleanPlano = cleanPlano.replace(/^---\s*CAMPO:\s*PLANO\s*---\s*/i, '').trim();
  }

  return {
    avaliacao: cleanAvaliacao,
    plano: cleanPlano,
    conduta: cleanConduta,
  };
}

