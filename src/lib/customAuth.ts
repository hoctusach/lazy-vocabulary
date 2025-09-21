import { EXCHANGE_FN_URL } from '@/config';

export type CustomSession = {
  sessionToken: string;
  expiresAt: number; // unix seconds
  expiresIn: number; // seconds
  nickname: string;
  userKey: string; // user_unique_key
};

let _session: CustomSession | null = null;
const LS_KEY = 'lazyVoca.session';
const LEGACY_KEY = 'lazyVoca.auth';

export type ExchangeResponse = Record<string, unknown> & {
  session_token?: unknown;
  expires_at?: unknown;
  expires_in?: unknown;
  nickname?: unknown;
  user_unique_key?: unknown;
  error?: unknown;
  code?: unknown;
};

export function storeSessionFromExchange(response: ExchangeResponse): CustomSession {
  if (typeof response.session_token !== 'string' || typeof response.expires_at !== 'number') {
    throw new Error('Invalid authentication response');
  }

  const session: CustomSession = {
    sessionToken: response.session_token,
    expiresAt: response.expires_at,
    expiresIn: typeof response.expires_in === 'number' ? response.expires_in : 0,
    nickname: typeof response.nickname === 'string' ? response.nickname : '',
    userKey: typeof response.user_unique_key === 'string' ? response.user_unique_key : '',
  };

  _session = session;

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(session));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore storage errors */
  }

  return session;
}

export function saveSession(response: ExchangeResponse): CustomSession {
  return storeSessionFromExchange(response);
}

export function loadFromStorageOnBoot(): void {
  try {
    const stored = localStorage.getItem(LS_KEY);
    const legacyStored = stored ? null : localStorage.getItem(LEGACY_KEY);
    const raw = stored ?? legacyStored;
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<CustomSession> & {
      expires_at?: number;
      session_token?: string;
      user_unique_key?: string;
    };
    const expiresAt =
      typeof s.expiresAt === 'number'
        ? s.expiresAt
        : typeof s.expires_at === 'number'
          ? s.expires_at
          : null;
    const sessionToken =
      typeof s.sessionToken === 'string'
        ? s.sessionToken
        : typeof s.session_token === 'string'
          ? s.session_token
          : null;
    if (sessionToken && expiresAt) {
      const hydrated: CustomSession = {
        sessionToken,
        expiresAt,
        expiresIn:
          typeof s.expiresIn === 'number'
            ? s.expiresIn
            : typeof s.expires_in === 'number'
              ? s.expires_in
              : 0,
        nickname: typeof s.nickname === 'string' ? s.nickname : '',
        userKey:
          typeof s.userKey === 'string'
            ? s.userKey
            : typeof s.user_unique_key === 'string'
              ? s.user_unique_key
              : '',
      };
      _session = hydrated;
      if (legacyStored) {
        localStorage.removeItem(LEGACY_KEY);
        localStorage.setItem(LS_KEY, JSON.stringify(hydrated));
      }
    }
  } catch {
    /* ignore storage errors */
  }
}

export function isExpired(skewSec = 30): boolean {
  if (!_session) return true;
  const now = Math.floor(Date.now() / 1000);
  return now + skewSec >= _session.expiresAt;
}

export function getSession(): CustomSession | null {
  if (!_session) return null;
  if (isExpired()) return null;
  return _session;
}

export function getAuthHeader(): Record<string, string> {
  const session = getSession();
  if (!session?.sessionToken) return {};
  return { Authorization: `Bearer ${session.sessionToken}` };
}

export async function exchangeNicknamePasscode(
  nickname: string,
  passcode: string | number,
): Promise<ExchangeResponse> {
  const res = await fetch(EXCHANGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, passcode }),
  });
  const json = (await res.json().catch(() => ({}))) as ExchangeResponse;
  if (!res.ok) {
    const errorMessage = typeof json.error === 'string' && json.error ? json.error : 'Sign-in failed';
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json;
}

export async function signIn(nickname: string, passcode: string | number): Promise<void> {
  const exchange = await exchangeNicknamePasscode(nickname, passcode);
  saveSession(exchange);
}

export function signOut(): void {
  _session = null;
  try {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore storage errors */
  }
}
