import type { Session } from '@supabase/supabase-js';
import { canonNickname } from '@/core/nickname';
import { getSupabaseClient, requireSupabaseClient } from './supabaseClient';

const SESSION_STORAGE_KEY = 'lazyVoca.session';
const PASSCODE_STORAGE_KEY = 'lazyVoca.passcode';
const AUTH_EMAIL_DOMAIN = 'app.local';
const EXPIRATION_MARGIN_MS = 60_000;

const STORAGE_VERSION = 1 as const;

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

function isSessionValid(session: Session | null): session is Session {
  if (!session) return false;
  if (!session.expires_at) return true;
  const expiresAtMs = session.expires_at * 1000;
  return expiresAtMs - EXPIRATION_MARGIN_MS > Date.now();
}

function buildAuthEmail(nickname: string): string {
  const canonical = canonNickname(nickname).replace(/[^a-z0-9._-]/gi, '');
  const sanitized = canonical.length ? canonical : nickname.trim().toLowerCase().replace(/\s+/g, '');
  if (!sanitized) {
    throw new Error('Nickname is required for authentication.');
  }
  return `${sanitized}@${AUTH_EMAIL_DOMAIN}`;
}

function nicknameMatchesSession(nickname: string, session: Session | null): boolean {
  if (!session?.user?.email) return false;
  const suffix = `@${AUTH_EMAIL_DOMAIN}`;
  const email = session.user.email.toLowerCase();
  if (!email.endsWith(suffix)) return false;
  const sessionNick = email.slice(0, -suffix.length);
  return canonNickname(sessionNick) === canonNickname(nickname);
}

async function applySessionToClient(session: Session): Promise<Session> {
  const supabase = getSupabaseClient();
  if (!supabase || !session.access_token || !session.refresh_token) {
    persistSession(session);
    return session;
  }
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) {
      console.warn('auth:setSession', error.message);
      persistSession(session);
      return session;
    }
    const applied = data.session ?? session;
    persistSession(applied);
    return applied;
  } catch (err) {
    console.warn('auth:setSession', (err as Error).message);
    persistSession(session);
    return session;
  }
}

async function refreshWithTokens(
  refreshToken: string,
  accessToken?: string
): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken, access_token: accessToken });
    if (error) {
      console.warn('auth:refreshSession', error.message);
      clearStoredAuth();
      return null;
    }
    const session = data.session ?? null;
    if (session) {
      return applySessionToClient(session);
    }
    return null;
  } catch (err) {
    console.warn('auth:refreshSession', (err as Error).message);
    clearStoredAuth();
    return null;
  }
}

async function fetchSupabaseSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('auth:getSession', error.message);
      return null;
    }
    return data?.session ?? null;
  } catch (err) {
    console.warn('auth:getSession', (err as Error).message);
    return null;
  }
}

export async function getActiveSession(): Promise<Session | null> {
  const supabaseSession = await fetchSupabaseSession();
  if (supabaseSession) {
    if (isSessionValid(supabaseSession)) {
      return applySessionToClient(supabaseSession);
    }
    if (supabaseSession.refresh_token) {
      const refreshed = await refreshWithTokens(supabaseSession.refresh_token, supabaseSession.access_token);
      if (refreshed) return refreshed;
    }
  }

  const stored = loadStoredSession();
  if (!stored) return null;

  if (isSessionValid(stored)) {
    return applySessionToClient(stored);
  }

  if (stored.refresh_token) {
    return refreshWithTokens(stored.refresh_token, stored.access_token);
  }

  clearStoredAuth();
  return null;
}

export async function refreshActiveSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('auth:getSession', error.message);
    }
    const base = data?.session ?? loadStoredSession();
    if (!base?.refresh_token) return null;
    return refreshWithTokens(base.refresh_token, base.access_token);
  } catch (err) {
    console.warn('auth:getSession', (err as Error).message);
    const stored = loadStoredSession();
    if (!stored?.refresh_token) return null;
    return refreshWithTokens(stored.refresh_token, stored.access_token);
  }
}

export async function ensureSessionForNickname(
  nickname: string,
  passcode?: string
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
  options: { rememberPasscode?: boolean } = {}
): Promise<Session | null> {
  const supabase = requireSupabaseClient();
  const email = buildAuthEmail(nickname);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: passcode });
  if (error) {
    throw error;
  }
  const session = data.session ?? null;
  if (session) {
    await applySessionToClient(session);
  }
  if (options.rememberPasscode) {
    rememberPasscode(passcode);
  }
  return session;
}

export async function registerNicknameWithPasscode(
  nickname: string,
  passcode: string,
  options: { rememberPasscode?: boolean } = {}
): Promise<Session | null> {
  const supabase = requireSupabaseClient();
  const email = buildAuthEmail(nickname);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: passcode,
    options: { data: { nickname } },
  });
  if (error) {
    if ('status' in error && error.status === 400) {
      // user may already exist; fall back to sign-in attempt
      const signedIn = await signInWithPasscode(nickname, passcode, options);
      if (signedIn) return signedIn;
    }
    throw error;
  }
  let session = data.session ?? null;
  if (!session) {
    // Some configurations require explicit sign-in after sign-up
    const signInResult = await supabase.auth.signInWithPassword({ email, password: passcode });
    if (signInResult.error) {
      throw signInResult.error;
    }
    session = signInResult.data.session ?? null;
  }
  if (session) {
    await applySessionToClient(session);
  }
  if (options.rememberPasscode) {
    rememberPasscode(passcode);
  }
  return session;
}

export function storePasscode(passcode: string): void {
  rememberPasscode(passcode);
}

export function getStoredSessionSnapshot(): Session | null {
  return loadStoredSession();
}
