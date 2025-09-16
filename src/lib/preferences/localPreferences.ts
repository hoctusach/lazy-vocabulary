import type { UserPreferences } from '@/core/models';

const PREF_KEY = 'lv_preferences';
const FAVORITE_VOICE_KEY = 'lv_favorite_voice';

const defaultPrefs: UserPreferences = {
  favorite_voice: null,
  speech_rate: null,
  is_muted: false,
  is_playing: true,
  daily_option: null,
};

export async function getLocalPreferences(): Promise<UserPreferences> {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return { ...defaultPrefs };
  }

  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    return { ...defaultPrefs, ...stored } as UserPreferences;
  } catch (error) {
    console.error('Error reading local preferences from localStorage', error);
    return { ...defaultPrefs };
  }
}

export async function saveLocalPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    const current = await getLocalPreferences();
    const merged = { ...current, ...prefs };
    window.localStorage.setItem(PREF_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Error saving local preferences to localStorage', error);
  }
}

export function getFavoriteVoice(): string | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(FAVORITE_VOICE_KEY);
  } catch (error) {
    console.error('Error reading favorite voice from localStorage', error);
    return null;
  }
}

export function setFavoriteVoice(name: string | null): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    if (name) {
      window.localStorage.setItem(FAVORITE_VOICE_KEY, name);
    } else {
      window.localStorage.removeItem(FAVORITE_VOICE_KEY);
    }
  } catch (error) {
    console.error('Error saving favorite voice to localStorage', error);
  }
}

