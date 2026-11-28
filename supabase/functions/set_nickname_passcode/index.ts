import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  nickname?: unknown;
  passcode?: unknown;
  timezone?: unknown;
  hint?: unknown;
};

type RpcResponse = {
  user_unique_key?: unknown;
  nickname?: unknown;
};

function canonNickname(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    // Spaces and invisible format characters (zero-width space, BOM...) must not make a look-alike account.
    .replace(/[\s\p{Cf}]+/gu, '');
}

function isValidTimezone(timezone: string): boolean {
  try {
    // This throws a RangeError when the provided timezone is not a valid IANA entry.
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

// ---- same rules as src/lib/auth/passcodeHint.ts -------------------------------------------------
const HINT_MAX = 60;
function normalizeHint(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}
const squash = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s\-_.\u2010-\u2015]+/g, '');
function hintContainsPasscode(hint: string, passcode: string): boolean {
  const p = squash(passcode);
  return p.length > 0 && squash(hint).includes(p);
}
// -------------------------------------------------------------------------------------------------

function errorResponse(message: string, status = 400, code?: string) {
  const body = code ? { error: message, code } : { error: message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractNickname(payload: RpcResponse, fallback: string): string {
  const name = payload?.nickname;
  return typeof name === 'string' && name.trim().length ? name : fallback;
}

function extractKey(payload: RpcResponse, fallback: string): string {
  const key = payload?.user_unique_key;
  return typeof key === 'string' && key.trim().length ? key : fallback;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim() : '';
  if (!nickname) {
    return errorResponse('Nickname is required', 400);
  }

  const passcodeRaw =
    typeof payload.passcode === 'string' || typeof payload.passcode === 'number'
      ? String(payload.passcode).trim()
      : '';

  if (!/^\d{4,10}$/.test(passcodeRaw)) {
    return errorResponse('Passcode must be 4-10 digits.', 400);
  }

  const timezoneRaw =
    typeof payload.timezone === 'string' ? payload.timezone.trim() : '';
  if (timezoneRaw && !isValidTimezone(timezoneRaw)) {
    return errorResponse('Invalid timezone provided.', 400, 'INVALID_TIMEZONE');
  }

  const timezone = timezoneRaw || null;

  const hint = normalizeHint(payload.hint);
  if (hint !== null) {
    if ([...hint].length > HINT_MAX) {
      return errorResponse(`Hint must be at most ${HINT_MAX} characters.`, 400, 'HINT_TOO_LONG');
    }
    if (hintContainsPasscode(hint, passcodeRaw)) {
      return errorResponse("Your hint can't contain your passcode.", 400, 'HINT_CONTAINS_PASSCODE');
    }
  }

  const userKey = canonNickname(nickname);
  if (!userKey) {
    return errorResponse('Failed to derive user key', 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server misconfiguration', 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // A hint is only stored when this call CREATES the profile (an existing account's hint is changed
  // from Settings, by a signed-in user, via update-passcode-hint).
  let isNewProfile = false;
  if (hint !== null) {
    try {
      const { data: existing } = await adminClient
        .from('nicknames')
        .select('user_unique_key')
        .eq('user_unique_key', userKey)
        .maybeSingle();
      isNewProfile = !existing;
    } catch {
      isNewProfile = false;
    }
  }

  const { data, error } = await adminClient.rpc('upsert_or_verify_profile', {
    // Argument names must match the SQL function: upsert_or_verify_profile(p_user_unique_key, p_nickname, p_passcode, p_timezone).
    p_user_unique_key: userKey,
    p_nickname: nickname,
    // Sent and stored as text, exactly as typed (leading zeros are kept).
    p_passcode: passcodeRaw,
    // Forward the validated timezone so the database can persist it with the nickname.
    p_timezone: timezone,
  });

  if (error) {
    console.error('upsert_or_verify_profile error', error.message);
    if (error.message?.includes('nickname_already_exists')) {
      return errorResponse('Nickname already exists', 409, 'NICKNAME_TAKEN');
    }
    return errorResponse('Failed to save profile', 500);
  }

  const responsePayload: Record<string, unknown> = {
    user_unique_key: extractKey((data as RpcResponse | null) ?? {}, userKey),
    nickname: extractNickname((data as RpcResponse | null) ?? {}, nickname),
  };

  if (hint !== null && isNewProfile) {
    // Best effort: sign-up must never fail because the hint SQL is not applied yet.
    try {
      const { error: hintError } = await adminClient.rpc('set_passcode_hint', {
        p_user_unique_key: responsePayload.user_unique_key,
        p_hint: hint,
      });
      if (hintError) console.error('set_passcode_hint', hintError.message);
      responsePayload.hint_saved = !hintError;
    } catch (e) {
      console.error('set_passcode_hint', e instanceof Error ? e.message : 'failed');
      responsePayload.hint_saved = false;
    }
  }

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
