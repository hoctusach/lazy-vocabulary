import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getAuthHeader } from './auth';
import { resolveSupabaseConfig } from './db/supabase';

export const SESSION_TOKEN_HEADER = 'X-Session-Token';

/**
 * The nickname+passcode session token is NOT a Supabase JWT. PostgREST needs
 * the anon JWT in Authorization (set by supabase-js, left untouched here), so
 * the session travels in its own header, which the SQL helpers look up in
 * user_sessions.
 */
function getSessionToken(): string | null {
  const auth = getAuthHeader();
  const raw = (auth.Authorization ?? auth.authorization)?.trim();
  if (!raw) return null;
  const token = raw.split(/\s+/).slice(-1)[0] ?? '';
  return token || null;
}

export const authorizedFetch: typeof fetch = (input, init = {}) => {
  const token = getSessionToken();
  if (!token) {
    return fetch(input, init);
  }

  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : {}));
  headers.set(SESSION_TOKEN_HEADER, token);

  return fetch(input, { ...init, headers });
};

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const { url, anon } = resolveSupabaseConfig();

  if (!url || !anon) {
    console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    throw new Error('Supabase env vars missing');
  }

  if (!anon.startsWith('eyJ')) {
    console.error(
      '[Supabase] VITE_SUPABASE_ANON_KEY does not look like a JWT (should start with eyJ…)'
    );
    throw new Error('Invalid anon key');
  }

  client = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: authorizedFetch,
    },
  });

  return client;
}

