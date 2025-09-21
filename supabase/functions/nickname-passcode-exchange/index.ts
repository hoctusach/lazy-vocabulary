import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VerifyResponse = { user_unique_key: string } | { user_unique_key?: string }[] | null;

type ExchangePayload = {
  nickname?: unknown;
  passcode?: unknown;
};

function extractUserKey(result: VerifyResponse): string | null {
  if (!result) return null;
  if (Array.isArray(result)) {
    for (const entry of result) {
      const key = extractUserKey(entry as VerifyResponse);
      if (key) return key;
    }
    return null;
  }
  if (typeof result === 'object' && 'user_unique_key' in result) {
    const value = (result as { user_unique_key: unknown }).user_unique_key;
    return typeof value === 'string' ? value : null;
  }
  return null;
}

function errorResponse(message: string, status = 400, code?: string) {
  const body = code ? { error: message, code } : { error: message };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function createSessionToken(): string {
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...entropy))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  let payload: ExchangePayload;
  try {
    payload = (await req.json()) as ExchangePayload;
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const nickname = typeof payload.nickname === 'string' ? payload.nickname.trim() : '';
  const passcodeRaw =
    typeof payload.passcode === 'number' || typeof payload.passcode === 'string'
      ? String(payload.passcode).trim()
      : '';

  if (!nickname) {
    return errorResponse('Nickname is required', 400);
  }

  if (!passcodeRaw) {
    return errorResponse('Passcode is required', 400);
  }

  const passcodeNumeric = Number(passcodeRaw);
  if (!Number.isFinite(passcodeNumeric)) {
    return errorResponse('Passcode must be numeric', 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return errorResponse('Server misconfiguration', 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await adminClient.rpc('verify_nickname_passcode', {
    nickname,
    passcode: passcodeNumeric,
  });

  if (error) {
    console.error('verify_nickname_passcode error', error.message);
    return errorResponse('Authentication failed', 401);
  }

  const userKey = extractUserKey(data as VerifyResponse);
  if (!userKey) {
    const { data: nicknameLookup, error: lookupError } = await adminClient.rpc(
      'find_nickname_by_normalized',
      {
        nickname,
      },
    );

    if (lookupError) {
      console.error('find_nickname_by_normalized error', lookupError.message);
      return errorResponse('Authentication failed', 500);
    }

    const nicknameExists = !!extractUserKey(nicknameLookup as VerifyResponse);

    if (!nicknameExists) {
      return errorResponse('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    return errorResponse('Incorrect passcode', 401);
  }

  const expiresInSeconds = 60 * 60 * 24; // 24 hours
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const sessionToken = createSessionToken();

  const { error: insertError } = await adminClient.from('user_sessions').insert({
    session_token: sessionToken,
    user_unique_key: userKey,
    nickname,
    expires_at: new Date(expiresAt * 1000).toISOString(),
  });

  if (insertError) {
    console.error('user_sessions insert error', insertError.message);
    return errorResponse('Authentication failed', 500);
  }

  return new Response(
    JSON.stringify({
      expires_in: expiresInSeconds,
      expires_at: expiresAt,
      user_unique_key: userKey,
      nickname,
      session_token: sessionToken,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
