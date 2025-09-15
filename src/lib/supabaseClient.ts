import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let client: SupabaseClient | null = null;
function env(k:string){ // supports Next/Vite/CRA
  // @ts-ignore
  return (typeof process !== 'undefined' && process.env?.[k]) || (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) || '';
}
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = env('NEXT_PUBLIC_SUPABASE_URL') || env('VITE_SUPABASE_URL') || env('REACT_APP_SUPABASE_URL');
  const anon = env('NEXT_PUBLIC_SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY') || env('REACT_APP_SUPABASE_ANON_KEY');
  if (!url || !anon) throw new Error('Missing Supabase envs');
  client = createClient(url, anon);
  return client;
}
