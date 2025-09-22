import { SET_NICKNAME_FN_URL } from '@/config';
import { canonNickname } from '@/core/nickname';

export type SetNicknamePasscodePayload = {
  user_unique_key?: string;
  nickname?: string;
  error?: string;
  code?: string;
};

export type SetNicknamePasscodeResult = {
  response: Response;
  payload: SetNicknamePasscodePayload;
};

// Lowercase + remove spaces for the unique key
export function normalizeNickname(s: string) {
  return canonNickname(s);
}

const BLOCKED_NICKNAME_CHARS = /[<>"'`$(){}\u005B\u005D;]/g;

// Optional: block risky nickname chars (doesn't affect key)
export function sanitizeNickname(s: string) {
  return s.replace(BLOCKED_NICKNAME_CHARS, '').trim();
}

export async function setNicknamePasscode(
  nickname: string,
  passcode: string,
): Promise<SetNicknamePasscodeResult> {
  const response = await fetch(SET_NICKNAME_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, passcode }),
  });
  const payload = (await response.json().catch(() => ({}))) as SetNicknamePasscodePayload;
  return { response, payload };
}
