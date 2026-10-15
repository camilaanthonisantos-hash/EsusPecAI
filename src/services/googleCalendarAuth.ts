import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';

export interface SecondaryGoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
}

export interface FetchCalendarsResult {
  success: boolean;
  userEmail: string;
  totalCalendarsFound: number;
  secondaryCalendars: SecondaryGoogleCalendar[];
  primaryCalendar?: SecondaryGoogleCalendar;
  error?: string;
}

// In-memory token cache (persisted only in memory per security rules)
let inMemoryCalendarToken: string | null = null;
let lastAuthenticatedEmail: string | null = null;

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Initiates Google OAuth popup with Calendar scopes and fetches user's secondary calendars.
 */
export async function connectAndFetchSecondaryCalendars(
  loginHint?: string
): Promise<FetchCalendarsResult> {
  const provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));

  const customParams: Record<string, string> = {
    prompt: 'select_account',
  };
  if (loginHint && loginHint.includes('@')) {
    customParams.login_hint = loginHint.trim();
  }
  provider.setCustomParameters(customParams);

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Não foi possível obter o token de autorização do Google Calendar.');
    }

    inMemoryCalendarToken = token;
    const email = result.user.email || loginHint || '';
    lastAuthenticatedEmail = email;

    return await fetchCalendarsWithToken(token, email);
  } catch (err: any) {
    console.error('Erro no fluxo OAuth do Google Calendar:', err);
    let errorMsg = 'Falha ao autenticar com o Google.';
    if (err.code === 'auth/popup-closed-by-user') {
      errorMsg = 'A janela de autenticação do Google foi fechada antes de concluir.';
    } else if (err.code === 'auth/cancelled-popup-request') {
      errorMsg = 'Requisição de autenticação cancelada.';
    } else if (
      err.message?.includes('access_denied') ||
      err.code?.includes('access_denied') ||
      err.message?.includes('não concluiu o processo de verificação')
    ) {
      errorMsg =
        'O projeto Google Cloud está em modo de teste e requer que seu e-mail seja adicionado como "Usuário de teste" no Google Cloud Console, ou insira o ID da agenda secundária manualmente.';
    } else if (err.message) {
      errorMsg = err.message;
    }
    return {
      success: false,
      userEmail: loginHint || '',
      totalCalendarsFound: 0,
      secondaryCalendars: [],
      error: errorMsg,
    };
  }
}

/**
 * Fetches calendar list directly using a provided token or cached token.
 */
export async function fetchCalendarsWithToken(
  token: string,
  userEmail: string
): Promise<FetchCalendarsResult> {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `Erro da API do Google Calendar (${res.status})`;
      return {
        success: false,
        userEmail,
        totalCalendarsFound: 0,
        secondaryCalendars: [],
        error: msg,
      };
    }

    const data = await res.json();
    const items: any[] = data.items || [];

    const secondaryCalendars: SecondaryGoogleCalendar[] = [];
    let primaryCalendar: SecondaryGoogleCalendar | undefined;

    for (const item of items) {
      const isPrimary = Boolean(item.primary) || Boolean(item.id && userEmail && item.id.toLowerCase() === userEmail.toLowerCase());
      const calObj: SecondaryGoogleCalendar = {
        id: item.id,
        summary: item.summary || 'Agenda sem nome',
        description: item.description || '',
        primary: isPrimary,
        timeZone: item.timeZone,
        backgroundColor: item.backgroundColor,
        foregroundColor: item.foregroundColor,
        accessRole: item.accessRole,
      };

      if (isPrimary) {
        primaryCalendar = calObj;
      } else {
        // Only secondary agendas: either explicitly ending with @group.calendar.google.com or not primary
        secondaryCalendars.push(calObj);
      }
    }

    return {
      success: true,
      userEmail,
      totalCalendarsFound: items.length,
      secondaryCalendars,
      primaryCalendar,
    };
  } catch (fetchErr: any) {
    console.error('Erro ao consultar endpoint calendarList da Google:', fetchErr);
    return {
      success: false,
      userEmail,
      totalCalendarsFound: 0,
      secondaryCalendars: [],
      error: fetchErr.message || 'Falha de rede ao consultar o Google Calendar.',
    };
  }
}

export function getCachedCalendarToken(): string | null {
  return inMemoryCalendarToken;
}

export function getLastAuthenticatedEmail(): string | null {
  return lastAuthenticatedEmail;
}
