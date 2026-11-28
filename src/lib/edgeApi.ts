export const EDGE_BASE =
  "https://vijvcojvemkzgpzpowzh.supabase.co/functions/v1";

export const SET_PROFILE_URL = `${EDGE_BASE}/set_nickname_passcode`;
export const EXCHANGE_URL    = `${EDGE_BASE}/nickname-passcode-exchange`;
export const PASSCODE_HINT_URL = `${EDGE_BASE}/passcode-hint`;
export const UPDATE_PASSCODE_HINT_URL = `${EDGE_BASE}/update-passcode-hint`;

async function postJson(url: string, body: any, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) {
    const err: any = new Error(json?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = json?.code;
    throw err;
  }
  return json;
}

export const setNicknamePasscode = (
  nickname: string,
  passcode: string | number,
  hint?: string | null,
) => {
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = undefined;
  }

  // The hint is sent only when there is one, so the request is unchanged for everyone else.
  return postJson(SET_PROFILE_URL, hint ? { nickname, passcode, timezone, hint } : { nickname, passcode, timezone });
};

export const exchangeNicknamePasscode = (nickname: string, passcode: string|number) =>
  postJson(EXCHANGE_URL, { nickname, passcode });

/** Returns the hint for a nickname, or null (no hint and unknown nickname look the same). */
export async function fetchPasscodeHint(nickname: string): Promise<string | null> {
  const json = await postJson(PASSCODE_HINT_URL, { nickname });
  return typeof json?.hint === "string" && json.hint.length ? json.hint : null;
}

/** Logged-in user sets (string) or clears (null/empty) their own hint. */
export const updatePasscodeHint = (hint: string | null, sessionToken: string) =>
  postJson(UPDATE_PASSCODE_HINT_URL, { hint }, { "x-session-token": sessionToken });
