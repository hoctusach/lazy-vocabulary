import { getSupabaseClient } from '@/lib/supabaseClient';
import { clearStoredAuth } from '@/lib/auth';
import { NICKNAME_LS_KEY } from '@/lib/nickname';
import { resetPlayerData } from '@/lib/cleanup/resetPlayerData';
import { clearAllVocabularySets } from '@/features/word-sets/vocabularySetStore';

export type DeleteAccountErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_CREDENTIALS'
  | 'NOT_DEPLOYED'
  | 'NETWORK'
  | 'UNKNOWN';

export class DeleteAccountError extends Error {
  code: DeleteAccountErrorCode;
  constructor(code: DeleteAccountErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

interface RpcErrorLike {
  code?: string;
  message?: string;
}

/** Maps a PostgREST/Postgres error to a user-facing error. Exported for tests. */
export function mapDeleteAccountError(error: RpcErrorLike | null | undefined): DeleteAccountError {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();
  if (code === '28000' || message.includes('invalid nickname or passcode')) {
    return new DeleteAccountError('INVALID_CREDENTIALS', 'Nickname or passcode is incorrect.');
  }
  if (
    code === 'PGRST202' ||
    code === '42883' ||
    message.includes('could not find the function') ||
    message.includes('does not exist')
  ) {
    return new DeleteAccountError(
      'NOT_DEPLOYED',
      'Account deletion is not available yet. Please email hoctusach@gmail.com and we will delete your data.',
    );
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return new DeleteAccountError('NETWORK', 'Could not reach the server. Check your connection and try again.');
  }
  return new DeleteAccountError('UNKNOWN', 'Something went wrong. Please try again, or email hoctusach@gmail.com.');
}

/**
 * Deletes the account and all server-side progress via the `delete_my_account`
 * RPC (supabase/sql/2026-11-delete-my-account.sql), then signs out locally.
 * Imported word sets are device-only; they are removed only if `clearLocalData`.
 */
export async function deleteAccount(opts: {
  nickname: string;
  passcode: string;
  clearLocalData: boolean;
}): Promise<void> {
  const nickname = opts.nickname.trim();
  const passcodeText = opts.passcode.trim();
  const passcode = Number(passcodeText);
  if (!nickname || !/^\d{4,10}$/.test(passcodeText) || !Number.isFinite(passcode)) {
    throw new DeleteAccountError('INVALID_INPUT', 'Enter your nickname and your 4–10 digit passcode.');
  }

  let result: { error: RpcErrorLike | null };
  try {
    result = await getSupabaseClient().rpc('delete_my_account', {
      p_nickname: nickname,
      p_passcode: passcode,
    });
  } catch (error) {
    throw mapDeleteAccountError({ message: error instanceof Error ? error.message : String(error) });
  }
  if (result.error) throw mapDeleteAccountError(result.error);

  clearLocalAccountData(opts.clearLocalData);
}

/** Signs out and wipes account/session/progress caches on this device. */
export function clearLocalAccountData(includeVocabularySets: boolean): void {
  clearStoredAuth(); // session, passcode, nickname, user key, progress caches
  try {
    localStorage.removeItem(NICKNAME_LS_KEY);
  } catch {
    /* ignore */
  }
  if (includeVocabularySets) {
    resetPlayerData();
    clearAllVocabularySets();
  }
}
