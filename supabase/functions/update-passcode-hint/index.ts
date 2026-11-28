// POST { hint: string | null }  +  header  x-session-token: <user_sessions token>
// -> { ok: true, hint: string | null }
//
// A signed-in user sets, changes or clears their own passcode hint. The user is identified by the
// custom session token (public.user_sessions), the same one the app sends to PostgREST.
// Deploy with the same JWT setting as the sibling functions (the app sends no Authorization header).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const HINT_MAX = 60;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
const errorResponse = (message: string, status = 400, code?: string) =>
  json(code ? { error: message, code } : { error: message }, status);

// ---- same rules as src/lib/auth/passcodeHint.ts -------------------------------------------------
function normalizeHint(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}
const squash = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s\-_.‐-―]+/g, '');
function hintContainsPasscode(hint: string, passcode: string): boolean {
  const p = squash(passcode);
  return p.length > 0 && squash(hint).includes(p);
}
// -------------------------------------------------------------------------------------------------

function readToken(req: Request): string {
  const direct = req.headers.get('x-session-token')?.trim();
  if (direct) return direct;
  const auth = req.headers.get('authorization')?.trim() ?? '';
  const bearer = /^bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() ?? '';
  // A JWT (anon/service key) is not a user_sessions row.
  return bearer && bearer.split('.').length !== 3 ? bearer : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  let body: { hint?: unknown };
  try {
    body = (await req.json()) as { hint?: unknown };
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const token = readToken(req);
  if (!token) return errorResponse('Not signed in', 401, 'NO_SESSION');

  const hint = normalizeHint(body?.hint);
  if (hint !== null && [...hint].length > HINT_MAX) {
    return errorResponse(`Hint must be at most ${HINT_MAX} characters.`, 400, 'HINT_TOO_LONG');
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return errorResponse('Server misconfiguration', 500);
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: session, error: sessionError } = await admin
    .from('user_sessions')
    .select('user_unique_key, expires_at')
    .eq('session_token', token)
    .maybeSingle();
  const row = session as { user_unique_key?: unknown; expires_at?: unknown } | null;
  const userKey = typeof row?.user_unique_key === 'string' ? row.user_unique_key : '';
  const expiresAt = typeof row?.expires_at === 'string' ? Date.parse(row.expires_at) : NaN;
  if (sessionError || !userKey || !(expiresAt > Date.now())) {
    return errorResponse('Session expired. Sign in again.', 401, 'SESSION_INVALID');
  }

  if (hint !== null) {
    // The hint must not contain the user's own passcode. If it cannot be checked, do not save.
    const { data: prof, error: profError } = await admin
      .from('nicknames')
      .select('passcode')
      .eq('user_unique_key', userKey)
      .maybeSingle();
    const passcode = (prof as { passcode?: unknown } | null)?.passcode;
    if (profError || (passcode !== null && passcode !== undefined && typeof passcode !== 'string' && typeof passcode !== 'number')) {
      return errorResponse('Could not check the hint. Try again later.', 500);
    }
    if (passcode !== null && passcode !== undefined && hintContainsPasscode(hint, String(passcode))) {
      return errorResponse("Your hint can't contain your passcode.", 400, 'HINT_CONTAINS_PASSCODE');
    }
  }

  const { error } = await admin.rpc('set_passcode_hint', { p_user_unique_key: userKey, p_hint: hint });
  if (error) {
    console.error('set_passcode_hint', error.message);
    return errorResponse('Hints are not available yet. Try again later.', 503, 'HINT_UNAVAILABLE');
  }
  return json({ ok: true, hint });
});
