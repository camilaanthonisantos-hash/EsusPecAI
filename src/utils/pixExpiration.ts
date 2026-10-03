/**
 * Utilitários para parsing, contagem regressiva e expiração de códigos PIX (PagBank / n8n)
 */

export interface ParsedPixExpiration {
  timestamp: number; // Timestamp epoch em milissegundos
  formatted: string; // Ex: "14/09/2026 às 23:59:59"
  isValid: boolean;
}

export interface RemainingPixTime {
  isExpired: boolean;
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedCountdown: string; // Ex: "23h 59m 10s" ou "14:32"
  percentageRemaining: number; // 0 a 100
}

/**
 * Converte qualquer formato de data/hora retornado pelo webhook n8n/PagBank para timestamp e texto legível
 * Exemplos suportados:
 * - "14/09/2026 às 23:59:59"
 * - "14/09/2026 23:59:59"
 * - "2026-09-14T23:59:59.000Z"
 * - "2026-09-14 23:59:59"
 * - Timestamp numérico em segundos ou milissegundos
 */
export function parsePixExpiration(
  rawExpiration: any,
  defaultDurationMinutes: number = 30
): ParsedPixExpiration {
  const now = Date.now();
  let timestamp = 0;

  if (typeof rawExpiration === 'number' && !isNaN(rawExpiration)) {
    if (rawExpiration > 1e11) {
      timestamp = rawExpiration; // já em milissegundos
    } else if (rawExpiration > 1e9) {
      timestamp = rawExpiration * 1000; // segundos -> milissegundos
    }
  } else if (typeof rawExpiration === 'string' && rawExpiration.trim().length > 0) {
    const cleanStr = rawExpiration.trim();

    // 1. Tenta formato brasileiro: "DD/MM/YYYY às HH:mm:ss" ou "DD/MM/YYYY HH:mm:ss"
    const brRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:(?:\s+às\s+|\s+)(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/i;
    const match = cleanStr.match(brRegex);

    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      const hours = match[4] !== undefined ? parseInt(match[4], 10) : 23;
      const minutes = match[5] !== undefined ? parseInt(match[5], 10) : 59;
      const seconds = match[6] !== undefined ? parseInt(match[6], 10) : 59;

      // As datas brasileiras (PagBank / n8n) estão no fuso horário de Brasília (UTC-3)
      const pad = (n: number) => String(n).padStart(2, '0');
      const isoWithBrTz = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}-03:00`;
      const dateObj = new Date(isoWithBrTz);
      if (!isNaN(dateObj.getTime())) {
        timestamp = dateObj.getTime();
      }
    }

    // 2. Se for formato ISO sem indicador de fuso, assume horário de Brasília (UTC-3)
    if (!timestamp && cleanStr.includes('T') && !cleanStr.endsWith('Z') && !cleanStr.match(/[+-]\d{2}:?\d{2}$/)) {
      const withTz = `${cleanStr}-03:00`;
      const parsedWithTz = new Date(withTz).getTime();
      if (!isNaN(parsedWithTz) && parsedWithTz > 0) {
        timestamp = parsedWithTz;
      }
    }

    // 3. Se não casou acima, tenta ISO / Date nativo
    if (!timestamp) {
      const isoParsed = new Date(cleanStr).getTime();
      if (!isNaN(isoParsed) && isoParsed > 0) {
        timestamp = isoParsed;
      }
    }

    // 4. Se for string puramente numérica (timestamp epoch)
    if (!timestamp && /^\d+$/.test(cleanStr)) {
      const numVal = parseInt(cleanStr, 10);
      if (numVal > 1e11) timestamp = numVal;
      else if (numVal > 1e9) timestamp = numVal * 1000;
    }
  }

  // Se não foi possível obter ou se a data for inválida, usa fallback padrão (ex: 30 minutos a partir de agora)
  const isValid = timestamp > 0;
  if (!isValid || timestamp <= now) {
    // Se a data calculada já expirou imediatamente no ato da criação (ex: discrepância de relógio/fuso),
    // concede a janela padrão de 30 minutos a partir de agora para garantir que o usuário consiga pagar
    timestamp = now + defaultDurationMinutes * 60 * 1000;
  }

  const d = new Date(timestamp);
  const dayStr = String(d.getDate()).padStart(2, '0');
  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
  const yearStr = d.getFullYear();
  const hoursStr = String(d.getHours()).padStart(2, '0');
  const minutesStr = String(d.getMinutes()).padStart(2, '0');
  const secondsStr = String(d.getSeconds()).padStart(2, '0');

  const formatted = `${dayStr}/${monthStr}/${yearStr} às ${hoursStr}:${minutesStr}:${secondsStr}`;

  return {
    timestamp,
    formatted,
    isValid,
  };
}

/**
 * Calcula o tempo restante para expiração do PIX e formatação para contagem regressiva
 */
export function calculatePixRemainingTime(
  expiresAt: number,
  createdAt?: number
): RemainingPixTime {
  const now = Date.now();
  const diffMs = expiresAt - now;

  if (diffMs <= 0) {
    return {
      isExpired: true,
      totalSeconds: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedCountdown: '00:00',
      percentageRemaining: 0,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formattedCountdown = '';
  if (hours > 0) {
    formattedCountdown = `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  } else {
    formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Calcula percentual restante se createdAt estiver disponível
  let percentageRemaining = 100;
  if (createdAt && createdAt < expiresAt) {
    const totalDuration = expiresAt - createdAt;
    const elapsed = now - createdAt;
    percentageRemaining = Math.max(0, Math.min(100, 100 - (elapsed / totalDuration) * 100));
  }

  return {
    isExpired: false,
    totalSeconds,
    hours,
    minutes,
    seconds,
    formattedCountdown,
    percentageRemaining,
  };
}

/**
 * Converte qualquer formato de subscription_expires_at (string BR, ISO, timestamp epoch, objeto Timestamp Firestore)
 * em um número epoch em milissegundos confiável para comparação em JavaScript.
 */
export function normalizeSubscriptionExpiresAt(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;

  // 1. Objeto Firestore Timestamp { seconds, nanoseconds } ou { toMillis() }
  if (typeof val === 'object') {
    if (typeof val.toMillis === 'function') {
      try {
        const ms = val.toMillis();
        if (typeof ms === 'number' && !isNaN(ms) && ms > 0) return ms;
      } catch {}
    }
    if (typeof val.seconds === 'number') {
      return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
    }
    if (typeof val._seconds === 'number') {
      return val._seconds * 1000;
    }
  }

  // 2. Número
  if (typeof val === 'number' && !isNaN(val)) {
    if (val > 1e11) return val; // milissegundos
    if (val > 1e9) return val * 1000; // segundos
    return val;
  }

  // 3. String
  if (typeof val === 'string') {
    const cleanStr = val.trim();
    if (!cleanStr) return undefined;

    // String puramente numérica
    if (/^\d+$/.test(cleanStr)) {
      const num = parseInt(cleanStr, 10);
      if (num > 1e11) return num;
      if (num > 1e9) return num * 1000;
      return num;
    }

    // Formato brasileiro: "DD/MM/YYYY HH:mm:ss" ou "DD/MM/YYYY às HH:mm:ss" ou "DD/MM/YYYY"
    const brRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:(?:\s+às\s+|\s+)(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/i;
    const match = cleanStr.match(brRegex);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      const hours = match[4] !== undefined ? parseInt(match[4], 10) : 23;
      const minutes = match[5] !== undefined ? parseInt(match[5], 10) : 59;
      const seconds = match[6] !== undefined ? parseInt(match[6], 10) : 59;
      const pad = (n: number) => String(n).padStart(2, '0');
      const isoWithBrTz = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}-03:00`;
      const dateObj = new Date(isoWithBrTz);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.getTime();
      }
    }

    // ISO string sem fuso horário explícito (aplica fuso horário de Brasília UTC-3)
    if (cleanStr.includes('T') && !cleanStr.endsWith('Z') && !cleanStr.match(/[+-]\d{2}:?\d{2}$/)) {
      const withTz = `${cleanStr}-03:00`;
      const parsed = new Date(withTz).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // Outros formatos de data nativos
    const parsed = new Date(cleanStr).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

/**
 * Valida de forma abrangente se o usuário possui assinatura ativa paga.
 * Suporta formatos legados, novos, strings e objetos de timestamp.
 */
export function isUserSubscriptionActive(user?: { role?: string; subscription_status?: string; subscription_expires_at?: any } | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.subscription_status !== 'pago') return false;

  const exp = normalizeSubscriptionExpiresAt(user.subscription_expires_at);
  // Se o status está como 'pago' e não há data de expiração, considera ativo (vitalício/indefinido)
  if (!exp) return true;
  return exp > Date.now();
}
