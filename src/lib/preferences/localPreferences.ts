import type { UserPreferences } from '@/core/models';

const PREF_KEY = 'lv_preferences';
const FAVORITE_VOICE_KEY = 'lv_favorite_voice';
const LEGACY_SPEECH_RATE_KEY = 'lv_speech_rate';

const defaultPrefs: UserPreferences = {
  favorite_voice: null,
  speech_rate: null,
  is_muted: false,
  is_playing: true,
  daily_option: null,
};

export const hasLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const parseStoredPreferences = (): Partial<UserPreferences> => {
  if (!hasLocalStorage()) return {};

  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    return raw ? (JSON.parse(raw) as Partial<UserPreferences>) : {};
  } catch (error) {
    console.error('Error parsing local preferences from localStorage', error);
    return {};
  }
};

const applyLegacyFallbacks = (prefs: UserPreferences): UserPreferences => {
  if (!hasLocalStorage()) {
    return prefs;
  }

  const merged = { ...prefs };

  try {
    if (merged.favorite_voice == null) {
      const legacyVoice = window.localStorage.getItem(FAVORITE_VOICE_KEY);
      if (legacyVoice != null) {
        merged.favorite_voice = legacyVoice;
      }
    }

    if (merged.speech_rate == null) {
      const legacyRate = window.localStorage.getItem(LEGACY_SPEECH_RATE_KEY);
      if (legacyRate != null) {
        const parsedRate = Number(legacyRate);
        if (Number.isFinite(parsedRate)) {
          merged.speech_rate = parsedRate;
        }
      }
    }
  } catch (error) {
    console.error('Error applying legacy preference fallbacks', error);
    return merged;
  }

  return merged;
};

export const readPreferencesFromStorage = (): UserPreferences => {
  const stored = parseStoredPreferences();
  const merged = { ...defaultPrefs, ...stored } as UserPreferences;
  return applyLegacyFallbacks(merged);
};

export const writePreferencesToStorage = (prefs: Partial<UserPreferences>): void => {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    const current = readPreferencesFromStorage();
    const merged = { ...current, ...prefs } as UserPreferences;
    window.localStorage.setItem(PREF_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Error writing local preferences to localStorage', error);
  }
};

export async function getLocalPreferences(): Promise<UserPreferences> {
  return readPreferencesFromStorage();
}

export async function saveLocalPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  writePreferencesToStorage(prefs);

  if (!hasLocalStorage()) {
    return;
  }

  try {
    if ('favorite_voice' in prefs) {
      window.localStorage.removeItem(FAVORITE_VOICE_KEY);
    }

    if ('speech_rate' in prefs) {
      window.localStorage.removeItem(LEGACY_SPEECH_RATE_KEY);
    }
  } catch (error) {
    console.error('Error clearing legacy preference keys from localStorage', error);
  }
}

export function getFavoriteVoice(): string | null {
  const prefs = readPreferencesFromStorage();
  return prefs.favorite_voice;
}

export function setFavoriteVoice(name: string | null): void {
  if (!hasLocalStorage()) {
    return;
  }

  writePreferencesToStorage({ favorite_voice: name });

  try {
    window.localStorage.removeItem(FAVORITE_VOICE_KEY);
  } catch (error) {
    console.error('Error clearing legacy favorite voice key from localStorage', error);
  }
}

