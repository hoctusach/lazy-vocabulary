import {
  hasLocalStorage,
  readPreferencesFromStorage,
  writePreferencesToStorage,
} from '@/lib/preferences/localPreferences';

const LEGACY_SPEECH_RATE_KEY = 'lv_speech_rate';

export const getSpeechRate = (): number | null => {
  const prefs = readPreferencesFromStorage();
  if (prefs.speech_rate != null && Number.isFinite(prefs.speech_rate)) {
    return prefs.speech_rate;
  }

  if (!hasLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(LEGACY_SPEECH_RATE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const setSpeechRate = (rate: number): void => {
  if (!Number.isFinite(rate)) return;

  writePreferencesToStorage({ speech_rate: rate });

  if (!hasLocalStorage()) return;

  try {
    window.localStorage.removeItem(LEGACY_SPEECH_RATE_KEY);
  } catch {
    // ignore write errors when clearing legacy key
  }
};
