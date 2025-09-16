const FAVORITE_VOICE_KEY = 'lv_favorite_voice';

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
