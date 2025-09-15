import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function viteEnv(k: string) {
  try {
    return (import.meta as any).env?.[k];
  } catch {
    return undefined;
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url =
    viteEnv('VITE_SUPABASE_URL') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    '';
  const anon =
    viteEnv('VITE_SUPABASE_ANON_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    '';
  if (!url || !anon) throw new Error(`Missing Supabase envs`);
  client = createClient(url, anon);
  return client;
}
