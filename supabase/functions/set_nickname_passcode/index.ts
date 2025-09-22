import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  nickname?: unknown;
  passcode?: unknown;
};

type RpcResponse = {
  user_unique_key?: unknown;
  nickname?: unknown;
};

function canonNickname(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

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

  const passcodeNumeric = Number(passcodeRaw);
  if (!Number.isFinite(passcodeNumeric)) {
    return errorResponse('Passcode must be numeric.', 400);
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

  const { data, error } = await adminClient.rpc('upsert_or_verify_profile', {
    user_unique_key: userKey,
    nickname,
    passcode: passcodeNumeric,
  });

  if (error) {
    console.error('upsert_or_verify_profile error', error.message);
    if (error.message?.includes('nickname_already_exists')) {
      return errorResponse('Nickname already exists', 409, 'NICKNAME_TAKEN');
    }
    return errorResponse('Failed to save profile', 500);
  }

  const responsePayload = {
    user_unique_key: extractKey((data as RpcResponse | null) ?? {}, userKey),
    nickname: extractNickname((data as RpcResponse | null) ?? {}, nickname),
  };

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
