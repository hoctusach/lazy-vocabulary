const PASSCODE_ACCOUNTS_KEY = 'lazyVoca.passcodeAccounts';

export type PasscodeAuthErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'INVALID_PASSCODE'
  | 'NICKNAME_TAKEN'
  | 'STORAGE_UNAVAILABLE';

export class PasscodeAuthError extends Error {
  readonly code: PasscodeAuthErrorCode;

  constructor(message: string, code: PasscodeAuthErrorCode) {
    super(message);
    this.code = code;
  }
}

type PasscodeStore = Record<string, string>;

function readStore(): PasscodeStore {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    throw new PasscodeAuthError('Passcode storage is unavailable.', 'STORAGE_UNAVAILABLE');
  }
  try {
    const raw = window.localStorage.getItem(PASSCODE_ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as PasscodeStore;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStore(store: PasscodeStore) {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    throw new PasscodeAuthError('Passcode storage is unavailable.', 'STORAGE_UNAVAILABLE');
  }
  try {
    window.localStorage.setItem(PASSCODE_ACCOUNTS_KEY, JSON.stringify(store));
  } catch {
    throw new PasscodeAuthError('Failed to persist passcode locally.', 'STORAGE_UNAVAILABLE');
  }
}

function canonNickname(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export async function signInWithPasscode(
  nickname: string,
  passcode: string
): Promise<void> {
  const trimmedPasscode = passcode.trim();
  const key = canonNickname(nickname);
  const store = readStore();
  const stored = store[key];
  if (!stored) {
    throw new PasscodeAuthError('Account not found.', 'ACCOUNT_NOT_FOUND');
  }
  if (stored !== trimmedPasscode) {
    throw new PasscodeAuthError('Incorrect passcode.', 'INVALID_PASSCODE');
  }
}

