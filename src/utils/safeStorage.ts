/**
 * Quota-Safe LocalStorage Utility for PEC Multiprofissional
 * Handles QuotaExceededError, strips heavy media/base64 payloads before persisting,
 * and ensures that React state sync never crashes the application ErrorBoundary.
 */

// Helper to strip heavy fields (audio, full base64 images, large media) before localStorage caching
export function sanitizeForLocalStorage(key: string, value: any): any {
  if (!value) return value;

  // Consultations: Strip heavy audio, images, or large media reports to preserve 5MB quota
  if (key === 'pec_consultations' && Array.isArray(value)) {
    // Keep most recent 50 consultations with trimmed media payloads
    return value.slice(0, 50).map((item) => {
      if (!item || typeof item !== 'object') return item;
      const sanitized = { ...item };
      
      // Strip raw audio or heavy image payloads if present
      if (sanitized.rawAudio) delete sanitized.rawAudio;
      if (sanitized.audioData) delete sanitized.audioData;
      if (Array.isArray(sanitized.images)) {
        sanitized.images = sanitized.images.slice(0, 2).map((img: any) => {
          if (typeof img === 'string' && img.length > 500) {
            return img.substring(0, 500) + '...[truncated]';
          }
          if (img && typeof img === 'object' && img.data && img.data.length > 500) {
            return { ...img, data: img.data.substring(0, 500) + '...[truncated]' };
          }
          return img;
        });
      }
      if (Array.isArray(sanitized.examMedia)) {
        sanitized.examMedia = sanitized.examMedia.slice(0, 3).map((m: any) => {
          if (m && typeof m === 'object' && m.dataUrl && m.dataUrl.length > 500) {
            return { ...m, dataUrl: '' };
          }
          return m;
        });
      }
      return sanitized;
    });
  }

  // History: Keep max 30 items
  if (key === 'pec_history' && Array.isArray(value)) {
    return value.slice(0, 30).map((item) => {
      if (!item || typeof item !== 'object') return item;
      const sanitized = { ...item };
      if (sanitized.audioData) delete sanitized.audioData;
      if (sanitized.images) delete sanitized.images;
      return sanitized;
    });
  }

  return value;
}

/**
 * Safely saves data to localStorage, catching and handling QuotaExceededError
 */
export function safeSetItem(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const sanitized = sanitizeForLocalStorage(key, value);
    const serialized = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] Quota exceeded or error writing key "${key}":`, err?.message || err);

    // If quota exceeded, attempt cleanup and aggressive compaction
    try {
      if (key === 'pec_consultations' && Array.isArray(value)) {
        // Drastically compact to last 15 items with minimal fields
        const minimalList = value.slice(0, 15).map((c: any) => ({
          id: c.id,
          patientId: c.patientId,
          patientName: c.patientName,
          authorName: c.authorName,
          authorProfession: c.authorProfession,
          timestamp: c.timestamp,
          avaliacao: typeof c.avaliacao === 'string' ? c.avaliacao.substring(0, 300) : '',
          plano: typeof c.plano === 'string' ? c.plano.substring(0, 300) : '',
          conduta: typeof c.conduta === 'string' ? c.conduta.substring(0, 300) : '',
        }));
        localStorage.setItem(key, JSON.stringify(minimalList));
        return true;
      }
    } catch {
      // If still failing, gracefully ignore to prevent React ErrorBoundary crashes
    }

    return false;
  }
}

/**
 * Safely retrieves and parses data from localStorage
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely gets a raw string from localStorage
 */
export function safeGetString(key: string, defaultValue: string = ''): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw !== null && raw !== undefined ? raw : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely removes a key from localStorage
 */
export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
