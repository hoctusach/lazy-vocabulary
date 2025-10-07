import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resolvePlaybackPreferences } from '@/lib/preferences/playbackPreferences';
import { saveLocalPreferences } from '@/lib/preferences/localPreferences';

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
let originalLocalStorage: Storage | undefined;

beforeAll(() => {
  mockStorage = new MemoryStorage();
  originalWindow = (globalThis as { window?: Window & typeof globalThis }).window;
  originalLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;

  if (originalWindow) {
    Object.defineProperty(originalWindow, 'localStorage', {
      value: mockStorage,
      configurable: true,
      writable: true,
    });
  } else {
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: mockStorage } as Window & typeof globalThis,
      configurable: true,
      writable: true,
    });
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
});

afterAll(() => {
  if (originalWindow) {
    Object.defineProperty(originalWindow, 'localStorage', {
      value: originalLocalStorage ?? originalWindow.localStorage,
      configurable: true,
      writable: true,
    });
  } else {
    delete (globalThis as { window?: Window & typeof globalThis }).window;
  }

  if (originalLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  } else {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  }
});

describe('resolvePlaybackPreferences', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('returns stored mute, pause, voice, and speech rate when available', async () => {
    await saveLocalPreferences({
      is_muted: true,
      is_playing: false,
      favorite_voice: 'Test Voice',
      speech_rate: 1.15,
    });

    const voices = [
      { name: 'Test Voice', lang: 'en-US' },
      { name: 'Other Voice', lang: 'en-GB' },
    ] as SpeechSynthesisVoice[];

    const prefs = resolvePlaybackPreferences(voices);

    expect(prefs.isMuted).toBe(true);
    expect(prefs.isPaused).toBe(true);
    expect(prefs.requestedVoice).toBe('Test Voice');
    expect(prefs.resolvedVoice).toBe('Test Voice');
    expect(prefs.speechRate).toBe(1.15);
  });

  it('exposes requested voice even when it is not yet available', async () => {
    await saveLocalPreferences({
      is_muted: false,
      is_playing: true,
      favorite_voice: 'Missing Voice',
    });

    const voices = [
      { name: 'Different Voice', lang: 'en-AU' },
    ] as SpeechSynthesisVoice[];

    const prefs = resolvePlaybackPreferences(voices);

    expect(prefs.isMuted).toBe(false);
    expect(prefs.isPaused).toBe(false);
    expect(prefs.requestedVoice).toBe('Missing Voice');
    expect(prefs.resolvedVoice).toBeNull();
    expect(prefs.speechRate).toBeNull();
  });
});
