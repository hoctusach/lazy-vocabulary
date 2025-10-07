import { canonNickname } from '@/core/nickname';
import { exchangeNicknamePasscode, setNicknamePasscode } from '@/lib/edgeApi';
import { dispatchUserKeyChange } from '@/lib/userKeyEvents';
import {
  getSession as getEdgeSession,
  saveSession as saveEdgeSession,
  signOut as signOutEdge,
  type Session as EdgeSession,
} from '@/lib/customAuth';
import { NICKNAME_LS_KEY } from '@/lib/nickname';

export { exchangeNicknamePasscode } from '@/lib/edgeApi';
export { saveEdgeSession as saveSession, getEdgeSession as getSession };

const SESSION_STORAGE_KEY = 'lazyVoca.authState';
export const PASSCODE_STORAGE_KEY = 'lazyVoca.passcode';
const USER_KEY_STORAGE_KEY = 'lazyVoca.userKey';
const LEGACY_SESSION_KEY = 'lazyVoca.session';

const STORAGE_VERSION = 4 as const;

export type Session = {
  user_unique_key: string;
  nickname: string;
  authenticated_at: string;
  user: {
    id: string;
    nickname: string;
    email: string | null;
  };
};

type StoredAuthPayload = {
  version: number;
  session: Session;
};

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function readFromStorage(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: string): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function removeFromStorage(key: string): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function persistAuthState(session: Session | null): void {
  if (!session) {
    removeFromStorage(SESSION_STORAGE_KEY);
    removeFromStorage(LEGACY_SESSION_KEY);
    return;
  }

  const payload: StoredAuthPayload = {
    version: STORAGE_VERSION,
    session,
  };

  writeToStorage(SESSION_STORAGE_KEY, JSON.stringify(payload));
  removeFromStorage(LEGACY_SESSION_KEY);
}

function loadStoredAuthPayload(): StoredAuthPayload | null {
  const raw = readFromStorage(SESSION_STORAGE_KEY) ?? readFromStorage(LEGACY_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthPayload> & { version?: number };
    if (!parsed || !parsed.session) return null;

    if (parsed.version === STORAGE_VERSION) {
      if (!readFromStorage(SESSION_STORAGE_KEY)) {
        writeToStorage(SESSION_STORAGE_KEY, raw);
      }
      return { version: STORAGE_VERSION, session: parsed.session };
    }

    if (!parsed.version || parsed.version < STORAGE_VERSION) {
      const migrated: StoredAuthPayload = { version: STORAGE_VERSION, session: parsed.session };
      writeToStorage(SESSION_STORAGE_KEY, JSON.stringify(migrated));
      removeFromStorage(LEGACY_SESSION_KEY);
      return migrated;
    }
  } catch {
    return null;
  }

  return null;
}

function loadStoredSession(): Session | null {
  const payload = loadStoredAuthPayload();
  return payload?.session ?? null;
}

function rememberPasscode(passcode: string | null): void {
  if (!passcode) {
    removeFromStorage(PASSCODE_STORAGE_KEY);
    return;
  }
  writeToStorage(PASSCODE_STORAGE_KEY, passcode);
}

export function getStoredPasscode(): string | null {
  return readFromStorage(PASSCODE_STORAGE_KEY);
}

export function clearCachedUserKey(): void {
  removeFromStorage(USER_KEY_STORAGE_KEY);
  dispatchUserKeyChange(null);
}

export function clearStoredAuth(options: { keepPasscode?: boolean } = {}): void {
  persistAuthState(null);
  if (!options.keepPasscode) {
    rememberPasscode(null);
  }
  clearCachedUserKey();
  try {
    signOutEdge();
  } catch {
    /* ignore */
  }
}

function nicknameMatchesSession(nickname: string, session: Session | null): boolean {
  if (!session) return false;
  return canonNickname(session.nickname) === canonNickname(nickname);
}

function normalizePasscode(passcode: string): { trimmed: string; numeric: number } {
  const trimmed = passcode.trim();
  const numeric = Number(trimmed);
  if (!trimmed || !Number.isFinite(numeric)) {
    throw new Error('Passcode must be numeric.');
  }
  return { trimmed, numeric };
}

function isEdgeSessionExpired(session: EdgeSession | null, skewSec = 30): boolean {
  if (!session) return true;
  const now = Math.floor(Date.now() / 1000);
  return now + skewSec >= session.expires_at;
}

function createSessionFromEdge(edge: EdgeSession, nicknameHint?: string): Session {
  const hinted = nicknameHint?.trim().length ? nicknameHint.trim() : '';
  const rawNickname = edge.nickname?.trim().length ? edge.nickname.trim() : hinted;
  const nickname = rawNickname || hinted || '';
  const rawUserKey = edge.user_unique_key?.trim().length ? edge.user_unique_key.trim() : '';
  const normalizedSource = rawUserKey || (nickname ? canonNickname(nickname) : '');
  const userKey = normalizedSource ? canonNickname(normalizedSource) : '';
  const safeKey = userKey || rawUserKey || (nickname ? canonNickname(nickname) : '');

  const displayNickname = nickname || hinted || '';

  return {
    user_unique_key: safeKey,
    nickname: displayNickname,
    authenticated_at: new Date().toISOString(),
    user: {
      id: safeKey,
      nickname: displayNickname,
      email: null,
    },
  };
}

function hydrateEdgeSession(edge: EdgeSession | null, nicknameHint?: string): Session | null {
  if (!edge) return null;
  const session = createSessionFromEdge(edge, nicknameHint);
  persistAuthState(session);
  return session;
}

function getActiveEdgeSession(): EdgeSession | null {
  const session = getEdgeSession();
  if (!session) return null;
  if (isEdgeSessionExpired(session)) return null;
  return session;
}

let ensuringSupabaseSession: Promise<Session | null> | null = null;

async function ensureSupabaseAuthSessionInternal(): Promise<Session | null> {
  const activeEdge = getActiveEdgeSession();
  if (activeEdge) {
    return hydrateEdgeSession(activeEdge);
  }

  const stored = loadStoredAuthPayload();
  if (!stored) {
    return null;
  }

  const passcode = getStoredPasscode();
  if (!passcode) {
    persistAuthState(stored.session);
    return stored.session;
  }

  try {
    const refreshed = await signInWithPasscode(stored.session.nickname, passcode, { rememberPasscode: false });
    return refreshed ?? stored.session;
  } catch (err) {
    console.warn('auth:ensureSupabaseAuthSession', (err as Error).message);
    clearStoredAuth({ keepPasscode: true });
    return null;
  }
}

export async function ensureSupabaseAuthSession(): Promise<Session | null> {
  if (!ensuringSupabaseSession) {
    ensuringSupabaseSession = ensureSupabaseAuthSessionInternal().finally(() => {
      ensuringSupabaseSession = null;
    });
  }
  return ensuringSupabaseSession;
}

export async function getActiveSession(): Promise<Session | null> {
  const ensured = await ensureSupabaseAuthSession();
  if (ensured) {
    return ensured;
  }
  const stored = loadStoredSession();
  if (!stored || !nicknameMatchesSession(stored.nickname, stored)) {
    return null;
  }
  return stored;
}

export async function refreshActiveSession(): Promise<Session | null> {
  const stored = loadStoredAuthPayload();
  if (!stored) return null;

  const passcode = getStoredPasscode();
  if (!passcode) {
    persistAuthState(stored.session);
    return stored.session;
  }

  try {
    const refreshed = await signInWithPasscode(stored.session.nickname, passcode, { rememberPasscode: false });
    return refreshed ?? stored.session;
  } catch (err) {
    console.warn('auth:refreshActiveSession', (err as Error).message);
    clearStoredAuth({ keepPasscode: true });
    return null;
  }
}

export async function ensureSessionForNickname(
  nickname: string,
  passcode?: string,
): Promise<Session | null> {
  const stored = loadStoredAuthPayload();
  if (stored && nicknameMatchesSession(nickname, stored.session)) {
    const ensured = await ensureSupabaseAuthSession();
    if (ensured) {
      return ensured;
    }
  }

  if (!passcode) {
    return null;
  }

  try {
    return await signInWithPasscode(nickname, passcode, { rememberPasscode: false });
  } catch {
    return null;
  }
}

export async function signInWithPasscode(
  nickname: string,
  passcode: string,
  options: { rememberPasscode?: boolean } = {},
): Promise<Session | null> {
  const { trimmed } = normalizePasscode(passcode);
  const edgeSession = (await exchangeNicknamePasscode(nickname, trimmed)) as EdgeSession;
  saveEdgeSession(edgeSession);

  const session = hydrateEdgeSession(edgeSession, nickname) ?? createSessionFromEdge(edgeSession, nickname);
  persistAuthState(session);

  if (options.rememberPasscode) {
    rememberPasscode(trimmed);
  }

  return session;
}

export type RegisterNicknameResponse = Record<string, unknown>;

export async function registerNicknameWithPasscode(
  nickname: string,
  passcode: string,
  options: { rememberPasscode?: boolean } = {},
): Promise<RegisterNicknameResponse> {
  const { trimmed, numeric } = normalizePasscode(passcode);
  const response = await setNicknamePasscode(nickname, numeric);

  if (options.rememberPasscode) {
    rememberPasscode(trimmed);
    const storedNickname = nickname.trim().length ? nickname.trim() : nickname;
    writeToStorage(NICKNAME_LS_KEY, storedNickname);
  }

  return response as RegisterNicknameResponse;
}

export function getAuthHeader(): Record<string, string> {
  const session = getActiveEdgeSession();
  if (!session) return {};
  const token = typeof session.session_token === 'string' ? session.session_token.trim() : '';
  if (!token) return {};
  const tokenType = typeof session.token_type === 'string' && session.token_type.trim().length
    ? session.token_type.trim()
    : 'bearer';
  return { Authorization: `${tokenType} ${token}` };
}

export function storePasscode(passcode: string): void {
  rememberPasscode(passcode.trim());
}

