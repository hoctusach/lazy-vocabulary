import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  getLocalPreferences,
  saveLocalPreferences,
  setFavoriteVoice,
} from '@/lib/preferences/localPreferences';
import { getSpeechRate, setSpeechRate } from '@/lib/localPreferences';

const FAVORITE_VOICE_KEY = 'lv_favorite_voice';
const SPEECH_RATE_KEY = 'lv_speech_rate';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

let mockStorage: MemoryStorage;
let originalWindow: (Window & typeof globalThis) | undefined;

beforeAll(() => {
  originalWindow = (globalThis as { window?: Window & typeof globalThis }).window;
  mockStorage = new MemoryStorage();
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockStorage },
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  } else {
    delete (globalThis as { window?: Window & typeof globalThis }).window;
  }
});

describe('local preferences storage', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('saves and reloads favorite voice and speech rate from consolidated preferences', async () => {
    await saveLocalPreferences({ favorite_voice: 'Test Voice', speech_rate: 1.25 });

    const prefs = await getLocalPreferences();
    expect(prefs.favorite_voice).toBe('Test Voice');
    expect(prefs.speech_rate).toBe(1.25);
    expect(getSpeechRate()).toBe(1.25);
  });

  it('falls back to legacy keys when consolidated preferences lack values', async () => {
    window.localStorage.setItem(FAVORITE_VOICE_KEY, 'Legacy Voice');
    window.localStorage.setItem(SPEECH_RATE_KEY, '1.75');

    const prefs = await getLocalPreferences();
    expect(prefs.favorite_voice).toBe('Legacy Voice');
    expect(prefs.speech_rate).toBe(1.75);
    expect(getSpeechRate()).toBe(1.75);

    setFavoriteVoice('Modern Voice');
    setSpeechRate(1.1);

    expect(window.localStorage.getItem(FAVORITE_VOICE_KEY)).toBeNull();
    expect(window.localStorage.getItem(SPEECH_RATE_KEY)).toBeNull();

    const updatedPrefs = await getLocalPreferences();
    expect(updatedPrefs.favorite_voice).toBe('Modern Voice');
    expect(updatedPrefs.speech_rate).toBe(1.1);
  });
});
