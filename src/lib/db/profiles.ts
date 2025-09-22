import { SET_NICKNAME_FN_URL } from '@/config';
import { canonNickname, isNicknameAllowed } from '@/core/nickname';

type NicknameProfile = {
  id: string;
  name: string;
  user_unique_key: string;
  passcode: number | null;
};

type EdgeResponse = {
  user_unique_key?: unknown;
  nickname?: unknown;
  error?: unknown;
  code?: unknown;
};

function toDigitPasscode(passcode: string): string {
  const trimmed = passcode.trim();
  if (!/^\d{4,10}$/.test(trimmed)) {
    throw new Error('Passcode must be 4-10 digits.');
  }
  return trimmed;
}

export async function ensureProfile(
  nickname: string,
  passcode: string,
): Promise<NicknameProfile | null> {
  if (!isNicknameAllowed(nickname)) throw new Error('Invalid nickname');
  const safePasscode = toDigitPasscode(passcode);

  const response = await fetch(SET_NICKNAME_FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, passcode: safePasscode }),
  });
  const payload = (await response.json().catch(() => ({}))) as EdgeResponse;

  if (response.status === 409 || payload?.code === 'NICKNAME_TAKEN') {
    const err = new Error('Nickname already exists.');
    (err as Error & { code?: string }).code = 'NICKNAME_TAKEN';
    throw err;
  }

  if (!response.ok || typeof payload?.user_unique_key !== 'string') {
    const message =
      typeof payload?.error === 'string' && payload.error
        ? payload.error
        : 'Failed to ensure profile';
    throw new Error(message);
  }

  const nicknameFromServer =
    typeof payload.nickname === 'string' && payload.nickname.trim().length
      ? payload.nickname
      : nickname;
  const userKey = canonNickname(payload.user_unique_key);

  return {
    id: userKey,
    name: nicknameFromServer,
    user_unique_key: userKey,
    passcode: null,
  };
}
