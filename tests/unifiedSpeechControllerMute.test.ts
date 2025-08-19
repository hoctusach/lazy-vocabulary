/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';
import { realSpeechService } from '../src/services/speech/realSpeechService';
import type { VocabularyWord } from '../src/types/vocabulary';

describe('unifiedSpeechController mute handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (window as any).speechSynthesis = {
      cancel: vi.fn(),
      pause: vi.fn(),
      speaking: false,
      pending: false,
    };
    unifiedSpeechController.setMuted(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('setMuted(true) cancels speech, increments epoch and clears timers', () => {
    const epoch = unifiedSpeechController.currentEpoch();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const timer = window.setTimeout(() => {}, 1000);
    unifiedSpeechController.registerTimer(timer);

    unifiedSpeechController.setMuted(true);

    expect((window as any).speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(unifiedSpeechController.currentEpoch()).toBe(epoch + 1);
    expect(unifiedSpeechController.canSpeak(epoch)).toBe(false);
    expect(clearSpy).toHaveBeenCalledWith(timer);
    clearSpy.mockRestore();
  });

  it('mute during speech prevents queued items from starting', async () => {
    const wordA: VocabularyWord = { word: 'a', meaning: '', example: '' };
    const wordB: VocabularyWord = { word: 'b', meaning: '', example: '' };

    const speakMock = vi.spyOn(realSpeechService, 'speak').mockImplementation(async (_text, opts: any) => {
      opts.onStart?.();
      setTimeout(() => {
        opts.onEnd?.();
      }, 100);
      return true;
    });

    unifiedSpeechController.setMuted(false);
    unifiedSpeechController.speak(wordA, 'voice');
    unifiedSpeechController.speak(wordB, 'voice');

    vi.advanceTimersByTime(10);
    unifiedSpeechController.setMuted(true);
    vi.runAllTimers();

    expect((window as any).speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);
    speakMock.mockRestore();
  });
});
