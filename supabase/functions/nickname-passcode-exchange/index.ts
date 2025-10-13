import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
} as const;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function errorResponse(message: string, status = 400, code?: string) {
  return json(code ? { error: message, code } : { error: message }, status);
}

type VerifyRow = { user_unique_key?: string };
function getUserKey(data: unknown): string | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const r of data) {
      const k = (r as VerifyRow)?.user_unique_key;
      if (typeof k === "string" && k) return k;
    }
    return null;
  }
  const k = (data as VerifyRow)?.user_unique_key;
  return typeof k === "string" && k ? k : null;
}

const canon = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

function isValidTimezone(timezone: string): boolean {
  try {
    // Leverage Intl to confirm the client provided a valid IANA timezone name.
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  let body: any;
  try { body = await req.json(); } catch {
    return errorResponse("Invalid JSON payload", 400);
  }
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
  const passRaw =
    typeof body?.passcode === "number" || typeof body?.passcode === "string"
      ? String(body.passcode).trim()
      : "";

  if (!nickname) return errorResponse("Nickname is required", 400);
  if (!/^\d{4,10}$/.test(passRaw))
    return errorResponse("Passcode must be 4-10 digits", 400);
  const passcode = Number(passRaw);
  if (!Number.isFinite(passcode))
    return errorResponse("Passcode must be numeric", 400);

  const timezoneRaw =
    typeof body?.timezone === "string" ? body.timezone.trim() : "";
  if (timezoneRaw && !isValidTimezone(timezoneRaw))
    return errorResponse("Invalid timezone provided", 400, "INVALID_TIMEZONE");
  const timezone = timezoneRaw || null;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return errorResponse("Server misconfiguration", 500);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const canonicalKey = canon(nickname);

  // Verify (passcode + nickname)
  const { data, error } = await admin.rpc("verify_nickname_passcode", {
    nickname,
    passcode,
  });
  if (error) {
    console.error("verify_nickname_passcode:", error);
    return errorResponse("Authentication failed", 401, "AUTH_FAILED");
  }

  const userKey = getUserKey(data);
  if (!userKey) {
    // Distinguish "not found" vs "wrong passcode"
    const { data: existsRow } = await admin
      .from("nicknames")
      .select("user_unique_key")
      .eq("user_unique_key", canonicalKey)
      .maybeSingle();

    if (!existsRow) {
      return errorResponse(
        "Nickname not found. Create a profile to continue.",
        404,
        "NICKNAME_NOT_FOUND",
      );
    }
    return errorResponse("Incorrect passcode", 401, "INCORRECT_PASSCODE");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 60 * 60 * 24;
  const sessionToken = createSessionToken();
  const expiresAtUnix = now + expiresIn;
  const expiresAtIso = new Date(expiresAtUnix * 1000).toISOString();

  const { error: profileError } = await admin.rpc("upsert_or_verify_profile", {
    user_unique_key: userKey,
    nickname,
    passcode,
    // Ensure timezone changes are reflected for existing profiles without duplicating rows.
    p_timezone: timezone,
  });

  if (profileError) {
    console.error("upsert_or_verify_profile:", profileError);
    return errorResponse("Failed to update profile", 500);
  }

  const { error: upsertError } = await admin.from("user_sessions").upsert({
    session_token: sessionToken,
    user_unique_key: userKey,
    nickname,
    expires_at: expiresAtIso,
  });

  if (upsertError) {
    console.error("user_sessions upsert:", upsertError);
    return errorResponse("Failed to create session", 500);
  }

  return json(
    {
      session_token: sessionToken,
      token_type: "bearer",
      expires_in: expiresIn,
      expires_at: expiresAtUnix,
      user_unique_key: userKey,
      nickname,
    },
    200,
  );
});
