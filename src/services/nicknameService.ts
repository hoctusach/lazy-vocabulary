const BLOCKED_NICKNAME_CHARS = /[<>"'`$(){}\u005B\u005D;]/g;

export function sanitizeNickname(s: string) {
  return s.replace(BLOCKED_NICKNAME_CHARS, '').trim();
}
