import { BLOCKED_NICKNAME_CHARS } from '@/lib/nickname';

const BLOCKED_GLOBAL = new RegExp(BLOCKED_NICKNAME_CHARS.source, 'g');

/** Trims and removes blocked characters. Names are validated first, so for a valid name this only trims. */
export function sanitizeNickname(s: string) {
  return s.replace(BLOCKED_GLOBAL, '').trim();
}
