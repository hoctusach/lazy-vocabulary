export type Session = {
  session_token: string;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
  user_unique_key: string;
  nickname: string;
};

const LS_KEY = "lazyVoca.auth";
let _session: Session | null = null;

export function loadSessionOnBoot() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as Session;
    if (s?.expires_at && Math.floor(Date.now() / 1000) < s.expires_at) _session = s;
  } catch {
    /* ignore */
  }
}
export function getSession() { return _session; }
export function signOut() {
  _session = null;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
export function saveSession(s: Session) {
  _session = s;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
