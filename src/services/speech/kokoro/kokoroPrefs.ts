/** Small localStorage flags for the Kokoro natural voice (kept free of other imports so any hook can use them). */
const EXPLICIT_VOICE_KEY = 'lv_voice_explicit';
const USER_DELETED_KEY = 'lv_kokoro_user_deleted';
const METERED_ANSWER_KEY = 'lv_kokoro_metered_answer';

export type MeteredAnswer = 'now' | 'later';

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* ignore */ }
}

/** True once the user picked a voice themselves (never set by automatic selection). */
export const isVoiceExplicit = (): boolean => read(EXPLICIT_VOICE_KEY) === '1';
export const markVoiceExplicit = (): void => write(EXPLICIT_VOICE_KEY, '1');

/** True after the user deleted the model: no automatic re-download until they tap Download. */
export const isKokoroUserDeleted = (): boolean => read(USER_DELETED_KEY) === '1';
export const setKokoroUserDeleted = (v: boolean): void => write(USER_DELETED_KEY, v ? '1' : null);

export const getMeteredAnswer = (): MeteredAnswer | null => {
  const v = read(METERED_ANSWER_KEY);
  return v === 'now' || v === 'later' ? v : null;
};
export const setMeteredAnswer = (a: MeteredAnswer): void => write(METERED_ANSWER_KEY, a);
