import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';
import { SignJWT } from 'https://esm.sh/jose@4.15.5';

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

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function createAccessToken(
  supabaseUrl: string,
  jwtSecret: string,
  userKey: string,
  nickname: string,
  passcode: number,
  expiresInSeconds: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(60, expiresInSeconds);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  return new SignJWT({
    role: 'authenticated',
    user_unique_key: userKey,
    passcode,
    nickname,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setAudience('authenticated')
    .setIssuer(supabaseUrl)
    .setSubject(userKey)
    .sign(key);
}

function createRefreshToken(): string {
  const entropy = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...entropy));
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
  const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET') ?? Deno.env.get('JWT_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
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
    return errorResponse('Incorrect passcode', 401);
  }

  const expiresInSeconds = 60 * 60; // 1 hour
  const accessToken = await createAccessToken(
    supabaseUrl,
    jwtSecret,
    userKey,
    nickname,
    passcodeNumeric,
    expiresInSeconds,
  );
  const refreshToken = createRefreshToken();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return new Response(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: expiresInSeconds,
      expires_at: expiresAt,
      user_unique_key: userKey,
      nickname,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
