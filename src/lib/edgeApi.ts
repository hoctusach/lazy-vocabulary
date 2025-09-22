export const SET_PROFILE_URL = "https://vijvcojvemkzgpzpowzh.supabase.co/functions/v1/set_nickname_passcode";
export const EXCHANGE_URL    = "https://vijvcojvemkzgpzpowzh.supabase.co/functions/v1/nickname-passcode-exchange";

async function postJson(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Important: do NOT send cookies
    // credentials: "omit"
    // mode: "cors"
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

export function setNicknamePasscode(nickname: string, passcode: string | number) {
  return postJson(SET_PROFILE_URL, { nickname, passcode });
}

export function exchangeNicknamePasscode(nickname: string, passcode: string | number) {
  return postJson(EXCHANGE_URL, { nickname, passcode });
}
