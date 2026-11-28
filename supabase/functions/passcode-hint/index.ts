// POST { nickname } -> { hint: string | null }
//
// Used by the "Forgot passcode?" screen. Returns ONLY the optional hint, and the exact same shape
// ({ hint: null }) for "no hint" and "unknown nickname", so it cannot be used to find out who exists.
// If the SQL (2026-11-28-passcode-hint.sql) is not applied yet, the answer is { hint: null }, never an error.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { nickname?: unknown };
  try {
    body = (await req.json()) as { nickname?: unknown };
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400);
  }

  const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
  if (!nickname || nickname.length > 80) return json({ error: 'Nickname is required' }, 400);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ hint: null });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data, error } = await admin.rpc('get_passcode_hint', { p_nickname: nickname });
    if (error) {
      console.error('get_passcode_hint', error.message);
      return json({ hint: null });
    }
    const hint = typeof data === 'string' && data.trim().length ? data : null;
    return json({ hint });
  } catch (e) {
    console.error('get_passcode_hint', e instanceof Error ? e.message : 'failed');
    return json({ hint: null });
  }
});
