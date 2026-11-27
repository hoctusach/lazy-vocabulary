/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { estimateReadingTimeMs } from '@/services/speech/readingTime';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import type { VocabularyWord } from '@/types/vocabulary';

const word = (w: string, meaning = 'a short meaning', example = 'An example sentence.'): VocabularyWord => ({
  word: w, meaning, example, category: 'c',
});

describe('estimateReadingTimeMs', () => {
  it('has a floor and a ceiling and grows with length', () => {
    expect(estimateReadingTimeMs('')).toBe(4000);
    expect(estimateReadingTimeMs('hi')).toBe(4000);
    const medium = estimateReadingTimeMs(new Array(20).fill('word').join(' '));
    expect(medium).toBeGreaterThan(4000);
    expect(medium).toBeLessThan(30000);
    expect(estimateReadingTimeMs(new Array(500).fill('word').join(' '))).toBe(30000);
  });
});

describe('PLAY-NOSPEECH: auto-advance without a speech engine', () => {
  const callback = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    callback.mockClear();
    unifiedSpeechController.setMuted(false);
    unifiedSpeechController.setWordCompleteCallback(callback);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    unifiedSpeechController.setWordCompleteCallback(null);
    unifiedSpeechController.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('advances after the reading time instead of stalling', async () => {
    const result = unifiedSpeechController.speak(word('apple'), 'v');
    vi.advanceTimersByTime(3000);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30000);
    await expect(result).resolves.toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not advance after stop(), and releases the waiting caller', async () => {
    const result = unifiedSpeechController.speak(word('apple'), 'v');
    unifiedSpeechController.stop();
    vi.advanceTimersByTime(60000);
    await expect(result).resolves.toBe(false);
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not advance after muting (epoch changes)', async () => {
    const result = unifiedSpeechController.speak(word('apple'), 'v');
    unifiedSpeechController.setMuted(true);
    vi.advanceTimersByTime(60000);
    await expect(result).resolves.toBe(false);
    expect(callback).not.toHaveBeenCalled();
  });

  it('queued cards each get their own reading time', async () => {
    const first = unifiedSpeechController.speak(word('a'), 'v');
    const second = unifiedSpeechController.speak(word('b'), 'v');
    await vi.advanceTimersByTimeAsync(31000);
    await expect(first).resolves.toBe(true);
    await vi.advanceTimersByTimeAsync(31000);
    await expect(second).resolves.toBe(true);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('EDGE-11: speech engine throws', () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).speechSynthesis = { cancel: vi.fn(), pause: vi.fn(), speak: vi.fn(), speaking: false, pending: false };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('a rejecting speak() is caught, resolves false, and the next card still plays', async () => {
    const { realSpeechService } = await import('@/services/speech/realSpeechService');
    const spy = vi
      .spyOn(realSpeechService, 'speak')
      .mockRejectedValueOnce(new Error('engine exploded'))
      .mockImplementation(async (_t, opts) => { opts.onEnd?.(); return true; });
    const first = unifiedSpeechController.speak(word('a'), 'v');
    await expect(first).resolves.toBe(false);
    const second = unifiedSpeechController.speak(word('b'), 'v');
    await expect(second).resolves.toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
