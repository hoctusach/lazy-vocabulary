/**
 * Optional passcode hint (FB-77). Pure helpers, no I/O.
 * The Edge Functions (supabase/functions/*) carry a copy of the same rules; tests/regression/passcodeHint.test.ts
 * checks both copies against the same cases.
 */

export const PASSCODE_HINT_MAX = 60;

export const HINT_WARNING = "Anyone with your nickname can see this hint. Don't write the passcode itself.";
export const HINT_CONTAINS_PASSCODE_MESSAGE = "Your hint can't contain your passcode. Write a reminder, not the passcode itself.";

/** Trim, drop control characters, collapse nothing else. Empty -> null. Does NOT cut to the max length. */
export function normalizeHint(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}

const squash = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s\-_.‐-―]+/g, '');

/** True when the hint (ignoring case, spaces and dashes) contains the passcode, or is just its digits. */
export function hintContainsPasscode(hint: string, passcode: string): boolean {
  const p = squash(String(passcode ?? ''));
  if (!p) return false;
  return squash(hint).includes(p);
}

export type HintCheck = { ok: boolean; hint: string | null; error?: string };

export function validatePasscodeHint(raw: unknown, passcode: string): HintCheck {
  const hint = normalizeHint(raw);
  if (hint === null) return { ok: true, hint: null };
  if ([...hint].length > PASSCODE_HINT_MAX) {
    return { ok: false, hint: null, error: `Hint must be at most ${PASSCODE_HINT_MAX} characters.` };
  }
  if (hintContainsPasscode(hint, passcode)) {
    return { ok: false, hint: null, error: HINT_CONTAINS_PASSCODE_MESSAGE };
  }
  return { ok: true, hint };
}
