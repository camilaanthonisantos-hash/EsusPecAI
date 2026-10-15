import { ChronologicalAge } from '../types';

/**
 * Returns current date in YYYY-MM-DD format based on local system time.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a given date string (YYYY-MM-DD) matches today's date.
 */
export function isDateToday(dateString?: string): boolean {
  if (!dateString) return false;
  return dateString.trim() === getTodayDateString();
}

/**
 * Calculates exact chronological age (years, months, and days) from birth date to current date.
 * Essential for pediatric development, puericulture milestones, adult, and elderly care.
 */
export function calculateChronologicalAge(birthDateString: string): ChronologicalAge {
  if (!birthDateString) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      isMinor: false,
      formatted: 'Data inválida',
      shortFormatted: '--',
    };
  }

  // Parse YYYY-MM-DD safely
  const parts = birthDateString.split('-');
  if (parts.length !== 3) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      isMinor: false,
      formatted: 'Data inválida',
      shortFormatted: '--',
    };
  }

  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed
  const birthDay = parseInt(parts[2], 10);

  const birthDate = new Date(birthYear, birthMonth, birthDay);
  const today = new Date();

  if (isNaN(birthDate.getTime()) || birthDate > today) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      isMinor: false,
      formatted: 'Data futura ou inválida',
      shortFormatted: '--',
    };
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    // Days from previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  const diffTime = Math.abs(today.getTime() - birthDate.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isMinor = years < 18;

  // Build human-friendly string (e.g. "7 anos, 4 meses e 12 dias")
  const partsArray: string[] = [];

  if (years > 0) {
    partsArray.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  }
  if (months > 0) {
    partsArray.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  }
  if (days > 0 || partsArray.length === 0) {
    partsArray.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  }

  let formatted = '';
  if (partsArray.length === 1) {
    formatted = partsArray[0];
  } else if (partsArray.length === 2) {
    formatted = `${partsArray[0]} e ${partsArray[1]}`;
  } else if (partsArray.length === 3) {
    formatted = `${partsArray[0]}, ${partsArray[1]} e ${partsArray[2]}`;
  }

  const shortFormatted = `${years}a ${months}m ${days}d`;

  return {
    years,
    months,
    days,
    totalDays,
    isMinor,
    formatted,
    shortFormatted,
  };
}

/**
 * Formats an age concisely without detailing, e.g. "1A", "25A", "5M", "12D".
 */
export function formatSimpleAge(birthDateString?: string | null): string {
  if (!birthDateString) return '';
  const parts = birthDateString.split('-');
  if (parts.length !== 3) return '';

  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);

  const birthDate = new Date(birthYear, birthMonth, birthDay);
  const today = new Date();

  if (isNaN(birthDate.getTime()) || birthDate > today) return '';

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  if (years > 0) {
    return `${years}A`;
  }
  if (months > 0) {
    return `${months}M`;
  }
  return `${Math.max(1, days)}D`;
}

/**
 * Formats a raw string into a CPF mask: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Validates Brazilian CPF checksum
 */
export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  // Reject common repeating patterns
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i), 10) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Formats Cartão Nacional de Saúde (CNS - 15 digits): 000 0000 0000 0000
 */
export function formatCNS(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 15);
  return digits
    .replace(/(\d{3})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d)/, '$1 $2')
    .replace(/(\d{4})(\d{1,4})$/, '$1 $2');
}

/**
 * Validates Cartão Nacional de Saúde (CNS - 15 digits)
 * Supports standard CNS format starting with 1, 2, 7, 8, 9 with modulo 11 validation
 */
export function validateCNS(cns: string): boolean {
  const digits = cns.replace(/\D/g, '');
  if (digits.length !== 15) return false;

  const firstDigit = digits.charAt(0);
  if (!['1', '2', '7', '8', '9'].includes(firstDigit)) {
    return false;
  }

  // Modulo 11 check for numbers starting with 1 or 2
  if (firstDigit === '1' || firstDigit === '2') {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += parseInt(digits.charAt(i), 10) * (15 - i);
    }
    return sum % 11 === 0;
  }

  // Modulo 11 check for numbers starting with 7, 8, 9 (provisional/definitivo)
  if (['7', '8', '9'].includes(firstDigit)) {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      sum += parseInt(digits.charAt(i), 10) * (15 - i);
    }
    return sum % 11 === 0;
  }

  return true;
}

/**
 * Formats date (YYYY-MM-DD) and time (HH:mm) into the required queue format:
 * "dd/mm/aa [dia da semana] às hh:mm"
 * e.g. "18/09/26 [Sexta-feira] às 08:30"
 */
export function formatQueueDateTime(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '--';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr.replace(/\s*\+\s*/g, ' ');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day, 12, 0, 0);
  const dd = String(day).padStart(2, '0');
  const mm = String(month + 1).padStart(2, '0');
  const aa = String(year).slice(-2);

  const daysOfWeek = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  const dayName = daysOfWeek[d.getDay()] || 'Dia';
  const timeFormatted = timeStr || '08:00';

  return `${dd}/${mm}/${aa} [${dayName}] às ${timeFormatted}`;
}

/**
 * Formats patient age with a single unit without mixing months and days.
 * Specifically according to medical report requirement:
 * "idade sem informar meses e dias. Ex: 1 ano ou 10 meses ou 25 dias."
 */
export function formatSingleUnitAge(birthDateString?: string): string {
  if (!birthDateString) return '--';
  const parts = birthDateString.split('-');
  if (parts.length !== 3) return '--';
  const birthYear = parseInt(parts[0], 10);
  const birthMonth = parseInt(parts[1], 10) - 1;
  const birthDay = parseInt(parts[2], 10);

  const birthDate = new Date(birthYear, birthMonth, birthDay);
  const today = new Date();

  if (isNaN(birthDate.getTime()) || birthDate > today) {
    return '--';
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  // Exact rule: If >= 1 year -> show only years (e.g. "1 ano" or "25 anos")
  if (years >= 1) {
    return years === 1 ? '1 ano' : `${years} anos`;
  }
  // If < 1 year but >= 1 month -> show only months (e.g. "10 meses" or "1 mês")
  if (months >= 1) {
    return months === 1 ? '1 mês' : `${months} meses`;
  }
  // If < 1 month -> show only days (e.g. "25 dias" or "1 dia")
  const diffTime = Math.abs(today.getTime() - birthDate.getTime());
  const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  return totalDays === 1 ? '1 dia' : `${totalDays} dias`;
}

/**
 * Formats a date specifically as: "Anajás, dd de [mês por extenso] de aaaa"
 * e.g. "Anajás, 18 de setembro de 2026"
 */
export function formatAnajasDate(dateInput?: Date | number | string): string {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === 'string' && dateInput.includes('-') && dateInput.length === 10) {
    const [y, m, d] = dateInput.split('-').map(Number);
    date = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) date = new Date();

  const day = String(date.getDate()).padStart(2, '0');
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  return `Anajás, ${day} de ${monthName} de ${year}`;
}

/**
 * Formats patient identification document for Laudo: CPF ou CNS
 */
export function formatPatientDocument(cpf?: string, cns?: string): string {
  const parts: string[] = [];
  if (cpf && cpf.trim()) {
    parts.push(`CPF: ${cpf.trim()}`);
  }
  if (cns && cns.trim()) {
    parts.push(`CNS: ${cns.trim()}`);
  }
  return parts.length > 0 ? parts.join(' • ') : 'Documento: Não informado';
}

