export const NICKNAME_LS_KEY = 'lazyVoca.nickname';

export function getNicknameLocal(): string | null {
  try { return localStorage.getItem(NICKNAME_LS_KEY); } catch { return null; }
}

export function setNicknameLocal(v: string) {
  try { localStorage.setItem(NICKNAME_LS_KEY, v); } catch {}
}

export function validateNickname(n: string): string | null {
  const v = n.trim();
  if (v.length < 3) return 'Nickname must be at least 3 characters.';
  if (v.length > 24) return 'Nickname must be at most 24 characters.';
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return 'Use letters, numbers, "_" or "-".';
  return null;
}
