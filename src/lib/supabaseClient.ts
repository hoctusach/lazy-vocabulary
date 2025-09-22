import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { resolveSupabaseConfig } from './db/supabase';

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
  });

  return client;
}

export function requireSupabaseClient(): SupabaseClient {
  return getSupabaseClient();
}
