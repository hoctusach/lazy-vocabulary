/** Pure helpers for the sign-in popup (kept out of the component so they can be unit tested). */

export function validatePasscode(passcode: string): string | null {
  const trimmed = passcode.trim();
  if (trimmed.length < 4) return 'Passcode must be at least 4 digits.';
  if (trimmed.length > 10) return 'Passcode must be at most 10 digits.';
  if (!/^\d+$/.test(trimmed)) return 'Passcode can only contain numbers.';
  return null;
}

export const OFFLINE_MESSAGE =
  "Can't reach the server. Check your internet connection and try again.";
export const SERVER_BUSY_MESSAGE =
  'The server is having trouble right now. Please try again in a moment.';

const NETWORK_ERROR_PATTERN =
  /failed to fetch|load failed|networkerror|network request failed|network error|fetch failed|err_internet|aborted/i;

/**
 * Turns a thrown sign-in error into something a learner can act on. Raw browser
 * messages such as "Failed to fetch" or "Load failed" never reach the screen.
 */
export function friendlyAuthMessage(error: unknown, fallback: string): string {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 500) return SERVER_BUSY_MESSAGE;

  const raw =
    typeof (error as { message?: unknown } | null)?.message === 'string'
      ? (error as { message: string }).message.trim()
      : '';

  if (
    NETWORK_ERROR_PATTERN.test(raw) ||
    (typeof navigator !== 'undefined' && navigator.onLine === false && !raw)
  ) {
    return OFFLINE_MESSAGE;
  }
  if (/^HTTP \d+$/.test(raw)) return SERVER_BUSY_MESSAGE;
  return raw.length ? raw : fallback;
}
