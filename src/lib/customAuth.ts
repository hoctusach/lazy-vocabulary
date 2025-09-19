import { EXCHANGE_FN_URL } from '@/config';

export type CustomSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  nickname: string;
  userKey: string; // user_unique_key
};

let _session: CustomSession | null = null;
const LS_KEY = 'lazyVoca.auth';

export function loadFromStorageOnBoot(): void {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as CustomSession;
    if (typeof s?.accessToken === 'string' && typeof s?.expiresAt === 'number') {
      _session = s;
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

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function getAuthHeader(): Record<string, string> {
  const t = getAccessToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function signIn(nickname: string, passcode: string | number): Promise<void> {
  const res = await fetch(EXCHANGE_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, passcode }),
  });
  const json = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(json?.error || 'Sign-in failed');
  }
  const session: CustomSession = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_at,
    nickname: json.nickname,
    userKey: json.user_unique_key,
  };
  _session = session;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(session));
  } catch {
    /* ignore storage errors */
  }
}

export function signOut(): void {
  _session = null;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore storage errors */
  }
}
