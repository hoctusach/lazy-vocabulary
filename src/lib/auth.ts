import { SET_NICKNAME_FN_URL } from '@/config';
import { canonNickname } from '@/core/nickname';
import {
  getSession as getCustomSession,
  isExpired as isCustomSessionExpired,
  signIn as customSignIn,
  signOut as customSignOut,
} from '@/lib/customAuth';

const SESSION_STORAGE_KEY = 'lazyVoca.authState';
export const PASSCODE_STORAGE_KEY = 'lazyVoca.passcode';
const USER_KEY_STORAGE_KEY = 'lazyVoca.userKey';

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
    // ignore storage write failures (private mode, quota, etc.)
  }
}

function removeFromStorage(key: string): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function persistAuthState(session: Session | null): void {
  if (!session) {
    removeFromStorage(SESSION_STORAGE_KEY);
    return;
  }

  const payload: StoredAuthPayload = {
    version: STORAGE_VERSION,
    session,
  };

  writeToStorage(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function loadStoredAuthPayload(): StoredAuthPayload | null {
  const raw = readFromStorage(SESSION_STORAGE_KEY) ?? readFromStorage('lazyVoca.session');
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
}

export function clearStoredAuth(options: { keepPasscode?: boolean } = {}): void {
  persistAuthState(null);
  if (!options.keepPasscode) {
    rememberPasscode(null);
  }
  clearCachedUserKey();
  try {
    customSignOut();
  } catch {
    // ignore sign-out errors
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

function createSessionFromCustom(nickname: string, userKey: string): Session {
  const trimmedNickname = nickname.trim();
  const storedNickname = trimmedNickname.length ? trimmedNickname : nickname;
  const normalizedKeySource = userKey?.trim().length ? userKey.trim() : canonNickname(storedNickname);
  const normalizedKey = canonNickname(normalizedKeySource);

  return {
    user_unique_key: normalizedKey,
    nickname: storedNickname,
    authenticated_at: new Date().toISOString(),
    user: {
      id: normalizedKey,
      nickname: storedNickname,
      email: null,
    },
  };
}

function getActiveCustomSession() {
  const session = getCustomSession();
  if (!session) return null;
  if (isCustomSessionExpired(0)) {
    return null;
  }
  return session;
}

let ensuringSupabaseSession: Promise<Session | null> | null = null;

async function ensureSupabaseAuthSessionInternal(): Promise<Session | null> {
  const active = getActiveCustomSession();
  if (active) {
    const session = createSessionFromCustom(active.nickname ?? '', active.userKey);
    persistAuthState(session);
    return session;
  }

  const stored = loadStoredAuthPayload();
  if (!stored) {
    return null;
  }

  const passcode = getStoredPasscode();
  if (!passcode) {
    return stored.session;
  }

  try {
    const refreshed = await signInWithPasscode(stored.session.nickname, passcode, { rememberPasscode: false });
    return refreshed ?? loadStoredSession();
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
  if (ensured && nicknameMatchesSession(ensured.nickname, ensured)) {
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
  await customSignIn(nickname, passcode);
  const active = getActiveCustomSession();
  if (!active) {
    throw new Error('Sign-in failed');
  }
  const session = createSessionFromCustom(active.nickname ?? nickname, active.userKey);

  persistAuthState(session);

  if (options.rememberPasscode) {
    rememberPasscode(trimmed);
  }

  return session;
}

export async function registerNicknameWithPasscode(
  nickname: string,
  passcode: string,
  options: { rememberPasscode?: boolean } = {},
): Promise<Session | null> {
  const { trimmed, numeric } = normalizePasscode(passcode);
  const res = await fetch(SET_NICKNAME_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, passcode: numeric }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: unknown };

  if (res.status === 409) {
    const err = new Error('Nickname already exists.') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const message = typeof json?.error === 'string' && json.error ? json.error : 'Could not create profile';
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const session = await signInWithPasscode(nickname, trimmed, { rememberPasscode: options.rememberPasscode });
  return session;
}

export function storePasscode(passcode: string): void {
  rememberPasscode(passcode.trim());
}

export function getStoredSessionSnapshot(): Session | null {
  return loadStoredSession();
}
