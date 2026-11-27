// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let speakImpl: (t: string, o: any) => Promise<boolean>;
vi.mock('../realSpeechService', () => ({
  realSpeechService: {
    speak: (t: string, o: any) => speakImpl(t, o),
    stop: vi.fn(), pause: vi.fn(), resume: vi.fn(),
    isCurrentlyActive: () => false, getCurrentUtterance: () => null,
  },
}));

import { unifiedSpeechController, MIN_WORD_DWELL_MS } from '../unifiedSpeechController';

const word = { word: 'a', meaning: 'b', example: 'c' } as any;

describe('word dwell time', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window as any).speechSynthesis = { speak: vi.fn(), cancel: vi.fn(), speaking: false, pending: false, paused: false };
  });
  afterEach(() => { vi.useRealTimers(); unifiedSpeechController.stop(); });

  it('does not advance in a tight loop when the engine fails instantly', async () => {
    let calls = 0;
    speakImpl = async (_t, o) => { calls++; o.onError?.({ error: 'synthesis-unavailable' }); return false; };
    const done = vi.fn();
    unifiedSpeechController.setWordCompleteCallback(done);
    void unifiedSpeechController.speak(word, 'v');
    await vi.advanceTimersByTimeAsync(0);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(MIN_WORD_DWELL_MS - 10);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20);
    expect(done).toHaveBeenCalledTimes(1);
    expect(calls).toBe(1);
  });

  it('also holds the card when speech ends instantly', async () => {
    speakImpl = async (_t, o) => { o.onEnd?.(); return true; };
    const done = vi.fn();
    unifiedSpeechController.setWordCompleteCallback(done);
    void unifiedSpeechController.speak(word, 'v');
    await vi.advanceTimersByTimeAsync(100);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(MIN_WORD_DWELL_MS);
    expect(done).toHaveBeenCalledTimes(1);
  });
});
