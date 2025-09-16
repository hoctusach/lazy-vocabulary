const MUTE_KEY = 'lv_is_muted';

export function getIsMuted(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_KEY) === 'true';
  } catch (error) {
    console.error('Error reading mute state from localStorage:', error);
    return false;
  }
}

export function setIsMuted(muted: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving mute state to localStorage:', error);
  }
}
