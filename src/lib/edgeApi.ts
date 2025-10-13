export const EDGE_BASE =
  "https://vijvcojvemkzgpzpowzh.supabase.co/functions/v1";

export const SET_PROFILE_URL = `${EDGE_BASE}/set_nickname_passcode`;
export const EXCHANGE_URL    = `${EDGE_BASE}/nickname-passcode-exchange`;

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
) => {
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timezone = undefined;
  }

  return postJson(SET_PROFILE_URL, { nickname, passcode, timezone });
};

export const exchangeNicknamePasscode = (nickname: string, passcode: string|number) =>
  postJson(EXCHANGE_URL, { nickname, passcode });
