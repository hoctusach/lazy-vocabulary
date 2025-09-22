import { canonNickname } from '@/core/nickname';
import { setNicknamePasscode as callSetNicknamePasscode } from '@/lib/edgeApi';

export function normalizeNickname(s: string) {
  return canonNickname(s);
}

const BLOCKED_NICKNAME_CHARS = /[<>"'`$(){}\u005B\u005D;]/g;

export function sanitizeNickname(s: string) {
  return s.replace(BLOCKED_NICKNAME_CHARS, '').trim();
}

export function setNicknamePasscode(nickname: string, passcode: string | number) {
  return callSetNicknamePasscode(nickname, passcode);
}
