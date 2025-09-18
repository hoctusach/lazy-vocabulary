import { canonNickname } from '@/core/nickname';
import { requireSupabaseClient } from './supabaseClient';

const SESSION_STORAGE_KEY = 'lazyVoca.session';
export const PASSCODE_STORAGE_KEY = 'lazyVoca.passcode';

const STORAGE_VERSION = 2 as const;

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

type StoredSessionPayload = {
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

function persistSession(session: Session | null): void {
  if (!session) {
    removeFromStorage(SESSION_STORAGE_KEY);
    return;
  }
  const payload: StoredSessionPayload = { version: STORAGE_VERSION, session };
  writeToStorage(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function loadStoredSession(): Session | null {
  const raw = readFromStorage(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSessionPayload;
    if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.session) return null;
    return parsed.session;
  } catch {
    return null;
  }
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

export function clearStoredAuth(): void {
  persistSession(null);
  rememberPasscode(null);
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

function extractUserKey(result: unknown): string | null {
  if (!result) return null;
  if (Array.isArray(result)) {
    return extractUserKey(result[0] ?? null);
  }
  if (typeof result === 'object' && 'user_unique_key' in result) {
    const value = (result as { user_unique_key: unknown }).user_unique_key;
    return typeof value === 'string' ? value : null;
  }
  return null;
}

function createSession(nickname: string, userKey: string): Session {
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

export async function getActiveSession(): Promise<Session | null> {
  const stored = loadStoredSession();
  if (!stored) return null;
  if (!nicknameMatchesSession(stored.nickname, stored)) {
    return null;
  }
  return stored;
}

export async function refreshActiveSession(): Promise<Session | null> {
  const stored = loadStoredSession();
  if (!stored) return null;
  const passcode = getStoredPasscode();
  if (!passcode) return stored;
  try {
    const refreshed = await signInWithPasscode(stored.nickname, passcode, { rememberPasscode: false });
    return refreshed ?? stored;
  } catch (err) {
    console.warn('auth:refreshActiveSession', (err as Error).message);
    return stored;
  }
}

export async function ensureSessionForNickname(
  nickname: string,
  passcode?: string,
): Promise<Session | null> {
  const active = await getActiveSession();
  if (active && nicknameMatchesSession(nickname, active)) {
    return active;
  }

  if (!passcode) {
    return null;
  }

  const signedIn = await signInWithPasscode(nickname, passcode, { rememberPasscode: false });
  if (!signedIn) return null;
  if (!nicknameMatchesSession(nickname, signedIn)) {
    console.warn('auth:session mismatch after sign-in');
    return null;
  }
  return signedIn;
}

export async function signInWithPasscode(
  nickname: string,
  passcode: string,
  options: { rememberPasscode?: boolean } = {},
): Promise<Session | null> {
  const supabase = requireSupabaseClient();
  const { trimmed, numeric } = normalizePasscode(passcode);
  const { data, error } = await supabase.rpc('verify_nickname_passcode', {
    nickname,
    passcode: numeric,
  });
  if (error) {
    throw error;
  }
  const userKey = extractUserKey(data);
  if (!userKey) {
    throw new Error('incorrect passcode');
  }
  const session = createSession(nickname, userKey);
  persistSession(session);
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
  const supabase = requireSupabaseClient();
  const { trimmed, numeric } = normalizePasscode(passcode);
  const { data, error } = await supabase.rpc('set_nickname_passcode', {
    nickname,
    passcode: numeric,
  });
  if (error) {
    throw error;
  }
  const noNickname =
    data == null || (Array.isArray(data) && data.length === 0);
  if (noNickname) {
    throw new Error('Nickname not found.');
  }
  const userKey = extractUserKey(data);
  if (!userKey) {
    throw new Error('Failed to register nickname.');
  }
  const session = createSession(nickname, userKey);
  persistSession(session);
  if (options.rememberPasscode) {
    rememberPasscode(trimmed);
  }
  return session;
}

export function storePasscode(passcode: string): void {
  rememberPasscode(passcode.trim());
}

export function getStoredSessionSnapshot(): Session | null {
  return loadStoredSession();
}
