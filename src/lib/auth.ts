import type { Session as SupabaseAuthSession } from '@supabase/supabase-js';

import { canonNickname } from '@/core/nickname';
import { getSupabaseClient, requireSupabaseClient } from './supabaseClient';

const SESSION_STORAGE_KEY = 'lazyVoca.session';
export const PASSCODE_STORAGE_KEY = 'lazyVoca.passcode';
const USER_KEY_STORAGE_KEY = 'lazyVoca.userKey';

const STORAGE_VERSION = 3 as const;
const TOKEN_REFRESH_BUFFER_SECONDS = 30;

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

type TokenBundle = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type?: string;
};

type ExchangeResponse = TokenBundle & {
  user_unique_key: string;
  nickname?: string;
};

type StoredSupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
};

type StoredAuthPayload = {
  version: number;
  session: Session;
  supabase: StoredSupabaseSession | null;
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

function normalizeStoredSupabaseSession(value: unknown): StoredSupabaseSession | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const accessToken = typeof record.access_token === 'string' ? record.access_token : null;
  const refreshToken = typeof record.refresh_token === 'string' ? record.refresh_token : null;
  const expiresAt = Number(record.expires_at);
  const expiresIn = Number(record.expires_in);
  const tokenType = typeof record.token_type === 'string' && record.token_type ? record.token_type : 'bearer';

  if (!accessToken || !refreshToken || !Number.isFinite(expiresAt) || !Number.isFinite(expiresIn)) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.trunc(expiresAt),
    expires_in: Math.trunc(expiresIn),
    token_type: tokenType,
  };
}

function persistAuthState(session: Session | null, supabase: StoredSupabaseSession | null): void {
  if (!session) {
    removeFromStorage(SESSION_STORAGE_KEY);
    return;
  }

  const payload: StoredAuthPayload = {
    version: STORAGE_VERSION,
    session,
    supabase,
  };

  writeToStorage(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function loadStoredAuthPayload(): StoredAuthPayload | null {
  const raw = readFromStorage(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthPayload> & { version?: number };
    if (!parsed || !parsed.session) return null;

    if (parsed.version === STORAGE_VERSION) {
      const supabase = normalizeStoredSupabaseSession(parsed.supabase ?? null);
      return { version: STORAGE_VERSION, session: parsed.session, supabase };
    }

    if (!parsed.version || parsed.version < STORAGE_VERSION) {
      return { version: STORAGE_VERSION, session: parsed.session, supabase: null };
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
  persistAuthState(null, null);
  if (!options.keepPasscode) {
    rememberPasscode(null);
  }
  clearCachedUserKey();
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      void supabase.auth.signOut().catch(() => undefined);
    }
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

function toStoredSupabaseSession(
  session: SupabaseAuthSession | null,
  fallback: TokenBundle,
): StoredSupabaseSession {
  const accessToken = session?.access_token ?? fallback.access_token;
  const refreshToken = session?.refresh_token ?? fallback.refresh_token;
  const expiresIn = session?.expires_in ?? fallback.expires_in;
  const expiresAt = session?.expires_at ?? fallback.expires_at;
  const tokenType = session?.token_type ?? fallback.token_type ?? 'bearer';

  if (!accessToken || !refreshToken || !Number.isFinite(expiresIn) || !Number.isFinite(expiresAt)) {
    throw new Error('Invalid Supabase session tokens.');
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Math.trunc(expiresIn),
    expires_at: Math.trunc(expiresAt),
    token_type: tokenType,
  };
}

function storedToTokenBundle(tokens: StoredSupabaseSession): TokenBundle {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    expires_at: tokens.expires_at,
    token_type: tokens.token_type,
  };
}

async function invokePasscodeExchange(nickname: string, passcode: number): Promise<ExchangeResponse> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.functions.invoke<ExchangeResponse>(
    'nickname-passcode-exchange',
    {
      body: { nickname, passcode },
    },
  );

  if (error) {
    throw new Error(error.message ?? 'Failed to authenticate nickname.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Authentication exchange returned an invalid response.');
  }

  const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
  const refreshToken = typeof data.refresh_token === 'string' ? data.refresh_token : '';
  const expiresIn = Number(data.expires_in);
  const expiresAt = Number(data.expires_at);
  const tokenType = typeof data.token_type === 'string' && data.token_type ? data.token_type : 'bearer';
  const userKey = typeof data.user_unique_key === 'string' ? data.user_unique_key : '';
  const returnedNickname = typeof data.nickname === 'string' ? data.nickname : undefined;

  if (!accessToken || !refreshToken || !userKey || !Number.isFinite(expiresIn) || !Number.isFinite(expiresAt)) {
    throw new Error('Authentication exchange failed.');
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Math.trunc(expiresIn),
    expires_at: Math.trunc(expiresAt),
    token_type: tokenType,
    user_unique_key: userKey,
    nickname: returnedNickname,
  };
}

async function establishSupabaseSession(exchange: ExchangeResponse): Promise<StoredSupabaseSession> {
  const supabase = requireSupabaseClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: exchange.access_token,
    refresh_token: exchange.refresh_token,
  });

  if (error) {
    throw error;
  }

  return toStoredSupabaseSession(data.session ?? null, exchange);
}

async function applyStoredSupabaseSession(payload: StoredAuthPayload): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !payload.supabase) {
    return false;
  }

  try {
    const { data: current } = await supabase.auth.getSession();
    const active = current.session;
    if (active?.access_token && active.user?.id === payload.session.user.id) {
      return true;
    }
  } catch {
    // Ignore getSession errors and attempt to restore below
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: payload.supabase.access_token,
    refresh_token: payload.supabase.refresh_token,
  });

  if (error) {
    console.warn('auth:applyStoredSupabaseSession', error.message);
    return false;
  }

  if (data.session) {
    const normalized = toStoredSupabaseSession(data.session, storedToTokenBundle(payload.supabase));
    persistAuthState(payload.session, normalized);
  }

  return true;
}

function shouldRefresh(tokens: StoredSupabaseSession): boolean {
  const expiresAt = tokens.expires_at;
  if (!Number.isFinite(expiresAt)) return true;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= TOKEN_REFRESH_BUFFER_SECONDS;
}

let ensuringSupabaseSession: Promise<Session | null> | null = null;

async function ensureSupabaseAuthSessionInternal(): Promise<Session | null> {
  const payload = loadStoredAuthPayload();
  if (!payload) return null;

  if (!nicknameMatchesSession(payload.session.nickname, payload.session)) {
    return null;
  }

  const tokens = payload.supabase;
  if (!tokens) {
    return payload.session;
  }

  const needsRefresh = shouldRefresh(tokens);
  const applied = await applyStoredSupabaseSession(payload);
  if (applied && !needsRefresh) {
    return payload.session;
  }

  const passcode = getStoredPasscode();
  if (!passcode) {
    return applied ? payload.session : null;
  }

  try {
    const refreshed = await signInWithPasscode(payload.session.nickname, passcode, { rememberPasscode: false });
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
  const { trimmed, numeric } = normalizePasscode(passcode);
  const exchange = await invokePasscodeExchange(nickname, numeric);
  const supabaseTokens = await establishSupabaseSession(exchange);
  const session = createSession(nickname, exchange.user_unique_key);

  persistAuthState(session, supabaseTokens);

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

  const noNickname = data == null || (Array.isArray(data) && data.length === 0);
  if (noNickname) {
    throw new Error('Nickname not found.');
  }

  const userKeyFromRpc = extractUserKey(data);
  if (!userKeyFromRpc) {
    throw new Error('Failed to register nickname.');
  }

  const exchange = await invokePasscodeExchange(nickname, numeric);
  const supabaseTokens = await establishSupabaseSession(exchange);
  const session = createSession(nickname, exchange.user_unique_key);

  persistAuthState(session, supabaseTokens);

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
