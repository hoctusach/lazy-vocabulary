import { canonNickname, isNicknameAllowed } from '@/core/nickname';
import { setNicknamePasscode } from '@/lib/edgeApi';

type NicknameProfile = {
  id: string;
  name: string;
  user_unique_key: string;
  passcode: number | null;
};

type EdgeResponse = {
  user_unique_key?: unknown;
  nickname?: unknown;
  name?: unknown;
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

  let payload: EdgeResponse;
  try {
    payload = (await setNicknamePasscode(nickname, safePasscode)) as EdgeResponse;
  } catch (error) {
    const rawMessage = typeof (error as { message?: string })?.message === 'string'
      ? (error as { message?: string }).message
      : '';
    const message = rawMessage.trim().length ? rawMessage.trim() : 'Failed to ensure profile';
    if (/409|taken|exists|NICKNAME_TAKEN/i.test(message)) {
      const err = new Error('Nickname already exists.');
      (err as Error & { code?: string }).code = 'NICKNAME_TAKEN';
      throw err;
    }
    throw new Error(message);
  }

  if (typeof payload?.user_unique_key !== 'string') {
    const message =
      typeof payload?.error === 'string' && payload.error
        ? payload.error
        : 'Failed to ensure profile';
    throw new Error(message);
  }

  const nicknameFromServer =
    (typeof payload.name === 'string' && payload.name.trim().length
      ? payload.name
      : undefined) ??
    (typeof payload.nickname === 'string' && payload.nickname.trim().length
      ? payload.nickname
      : undefined) ??
    nickname;
  const userKey = canonNickname(payload.user_unique_key);

  return {
    id: userKey,
    name: nicknameFromServer,
    user_unique_key: userKey,
    passcode: null,
  };
}
