import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { resolveSupabaseConfig } from './db/supabase';
import { getAuthHeader } from './auth';

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

  const authorizedFetch: typeof fetch = async (input, init = {}) => {
    const auth = getAuthHeader();
    const headers = new Headers(
      init.headers ?? (input instanceof Request ? input.headers : undefined) ?? {},
    );

    let applied = false;
    for (const [key, value] of Object.entries(auth)) {
      if (value?.length) {
        headers.set(key, value);
        applied = true;
      }
    }

    if (!applied) {
      return fetch(input, init);
    }

    const nextInit: RequestInit = { ...init, headers };
    return fetch(input, nextInit);
  };

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
