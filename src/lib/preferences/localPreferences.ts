import type { UserPreferences } from '@/core/models';

const LOCAL_PREFERENCES_KEY = 'lazyVoca.audioPreferences';

const DEFAULT_LOCAL_PREFERENCES: UserPreferences = {
  favorite_voice: null,
  speech_rate: null,
  is_muted: false,
  is_playing: false,
  daily_option: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readFromStorage = (): Partial<UserPreferences> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_PREFERENCES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    return parsed as Partial<UserPreferences>;
  } catch (error) {
    console.warn('[preferences] Failed to parse local preferences', error);
    return {};
  }
};

const writeToStorage = (prefs: UserPreferences) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LOCAL_PREFERENCES_KEY,
      JSON.stringify(prefs)
    );
  } catch (error) {
    console.warn('[preferences] Failed to persist local preferences', error);
  }
};

export const getLocalPreferences = async (): Promise<UserPreferences> => ({
  ...DEFAULT_LOCAL_PREFERENCES,
  ...readFromStorage(),
});

export const saveLocalPreferences = async (
  update: Partial<UserPreferences>,
): Promise<void> => {
  const merged: UserPreferences = {
    ...DEFAULT_LOCAL_PREFERENCES,
    ...readFromStorage(),
    ...update,
  };

  writeToStorage(merged);
};

export const clearLocalPreferences = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOCAL_PREFERENCES_KEY);
  } catch (error) {
    console.warn('[preferences] Failed to clear local preferences', error);
  }
};

export const LOCAL_AUDIO_PREFERENCES_KEY = LOCAL_PREFERENCES_KEY;
