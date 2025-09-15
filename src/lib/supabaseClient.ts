import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient as getDbSupabaseClient } from './db/supabase';

export function getSupabaseClient(): SupabaseClient {
  const client = getDbSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase credentials are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.'
    );
  }
  return client;
}
