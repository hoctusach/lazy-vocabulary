/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';

vi.mock('../src/services/speech/realSpeechService', () => ({
  realSpeechService: {
    speak: vi.fn().mockImplementation((_text: string, options: any) => {
      options.onStart?.();
      // never call onEnd or onError to simulate missing events
      return Promise.resolve(true);
    }),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isCurrentlyActive: vi.fn(() => false),
    getCurrentUtterance: vi.fn(() => null)
  }
}));

const word = { word: 'hello', meaning: '', example: '', count: 0 };

describe('unifiedSpeechController fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto advances when speech end event is missing', async () => {
    const cb = vi.fn();
    unifiedSpeechController.setWordCompleteCallback(cb);
    await unifiedSpeechController.speak(word);
    vi.advanceTimersByTime(9000); // fallback (min 7s) + 2s auto advance
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
