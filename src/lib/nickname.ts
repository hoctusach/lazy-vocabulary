export const NICKNAME_LS_KEY = 'lazyVoca.nickname';

export function getNicknameLocal(): string | null {
  try { return localStorage.getItem(NICKNAME_LS_KEY); } catch { return null; }
}

export function toCanonical(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

const BAD_CHARS = /[<>"'`$\\{}|;]|[\u0000-\u001F]/;

export function validateDisplayName(s: string): string | null {
  const v = s.trim();
  if (v.length < 3) return 'Nickname must be at least 3 characters.';
  if (v.length > 40) return 'Nickname must be at most 40 characters.';
  if (BAD_CHARS.test(v)) return 'Nickname contains blocked characters.';
  // allow anything else (including spaces & emoji)
  return null;
}
