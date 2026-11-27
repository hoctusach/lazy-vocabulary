export const NICKNAME_LS_KEY = 'lazyVoca.nickname';

export function getNicknameLocal(): string | null {
  try { return localStorage.getItem(NICKNAME_LS_KEY); } catch { return null; }
}

export { canonNickname as toCanonical } from '@/core/nickname';

/** Characters that are never allowed in a nickname. Validation rejects them (the name is never silently changed). */
export const BLOCKED_NICKNAME_CHARS = /[<>"'`$(){}[\]|;\\]|[\u0000-\u001F]/;

/** The same list as text, for the help line under the nickname field. */
export const BLOCKED_NICKNAME_CHARS_HELP = '< > " \' ` $ ( ) [ ] { } | ; \\';

export function validateDisplayName(s: string): string | null {
  const v = s.trim();
  if (v.length < 3) return 'Nickname must be at least 3 characters.';
  if (v.length > 40) return 'Nickname must be at most 40 characters.';
  if (BLOCKED_NICKNAME_CHARS.test(v)) return 'Nickname contains blocked characters.';
  // allow anything else (including spaces & emoji)
  return null;
}
