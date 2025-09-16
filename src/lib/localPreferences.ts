const SPEECH_RATE_KEY = 'lv_speech_rate';

const hasLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getSpeechRate = (): number | null => {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(SPEECH_RATE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const setSpeechRate = (rate: number): void => {
  if (!hasLocalStorage()) return;
  if (!Number.isFinite(rate)) return;
  try {
    window.localStorage.setItem(SPEECH_RATE_KEY, String(rate));
  } catch {
    // ignore write errors
  }
};
