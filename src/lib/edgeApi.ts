export const EDGE_BASE =
  "https://vijvcojvemkzgpzpowzh.supabase.co/functions/v1";
export const SET_PROFILE_URL = `${EDGE_BASE}/set_nickname_passcode`;
export const EXCHANGE_URL = `${EDGE_BASE}/nickname-passcode-exchange`;

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}
export const setNicknamePasscode = (n: string, p: string | number) =>
  postJson(SET_PROFILE_URL, { nickname: n, passcode: p });
export const exchangeNicknamePasscode = (n: string, p: string | number) =>
  postJson(EXCHANGE_URL, { nickname: n, passcode: p });
