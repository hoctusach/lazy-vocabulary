import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SPEECH_RATE,
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
} from '@/services/speech/core/constants';

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

describe('speech settings', () => {
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

  beforeEach(() => {
    mockStorage.clear();
    vi.resetModules();
  });

  it('normalizes arbitrary input values into the supported range', async () => {
    const { normalizeSpeechRate } = await import('@/utils/speech/core/speechSettings');

    expect(normalizeSpeechRate(null)).toBe(DEFAULT_SPEECH_RATE);
    expect(normalizeSpeechRate(undefined)).toBe(DEFAULT_SPEECH_RATE);
    expect(normalizeSpeechRate(NaN)).toBe(DEFAULT_SPEECH_RATE);
    expect(normalizeSpeechRate(MIN_SPEECH_RATE - 0.5)).toBe(MIN_SPEECH_RATE);
    expect(normalizeSpeechRate(MAX_SPEECH_RATE + 1)).toBe(MAX_SPEECH_RATE);
    expect(normalizeSpeechRate(1.234)).toBe(1.23);
  });

  it('clamps stored rates above the supported maximum and persists the normalized value', async () => {
    const localPreferences = await import('@/lib/localPreferences');
    localPreferences.setSpeechRate(5);

    const speechSettings = await import('@/utils/speech/core/speechSettings');
    expect(speechSettings.getSpeechRate()).toBe(MAX_SPEECH_RATE);
    expect(localPreferences.getSpeechRate()).toBe(MAX_SPEECH_RATE);
  });

  it('clamps stored rates below the supported minimum and persists the normalized value', async () => {
    const localPreferences = await import('@/lib/localPreferences');
    localPreferences.setSpeechRate(-4);

    const speechSettings = await import('@/utils/speech/core/speechSettings');
    expect(speechSettings.getSpeechRate()).toBe(MIN_SPEECH_RATE);
    expect(localPreferences.getSpeechRate()).toBe(MIN_SPEECH_RATE);
  });

  it('falls back to the default rate when storage is empty or invalid', async () => {
    const speechSettings = await import('@/utils/speech/core/speechSettings');

    expect(speechSettings.getSpeechRate()).toBe(DEFAULT_SPEECH_RATE);

    const localPreferences = await import('@/lib/localPreferences');
    mockStorage.setItem('lv_preferences', '{"speech_rate":"invalid"}');

    // reset cache before checking invalid scenario
    vi.resetModules();
    const reloadedSettings = await import('@/utils/speech/core/speechSettings');
    expect(reloadedSettings.getSpeechRate()).toBe(DEFAULT_SPEECH_RATE);
    expect(localPreferences.getSpeechRate()).toBe(DEFAULT_SPEECH_RATE);
  });
});
