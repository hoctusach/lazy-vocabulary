import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getAuthHeader } from './auth';
import { resolveSupabaseConfig } from './db/supabase';

function isValidJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function getSessionAuthorization(): string | null {
  const auth = getAuthHeader();
  const raw = auth.Authorization ?? auth.authorization;
  const normalized = raw?.trim();
  if (!normalized) return null;

  const token = normalized.split(/\s+/).slice(-1)[0] ?? '';
  if (!isValidJwt(token)) return null;

  return normalized;
}

const authorizedFetch: typeof fetch = (input, init = {}) => {
  const authHeader = getSessionAuthorization();
  if (!authHeader) {
    return fetch(input, init);
  }

  const headers = new Headers(init.headers ?? {});
  if (!headers.has('authorization')) {
    headers.set('Authorization', authHeader);
  }

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

export function requireSupabaseClient(): SupabaseClient {
  return getSupabaseClient();
}
