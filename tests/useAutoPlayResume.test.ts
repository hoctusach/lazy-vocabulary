/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { markUserInteraction, resetUserInteraction } from '../src/utils/userInteraction';
import { useAutoPlay } from '../src/hooks/vocabulary-playback/core/playback-states/useAutoPlay';
import { VocabularyWord } from '../src/types/vocabulary';
import { speechController } from '../src/utils/speech/core/speechController';
import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';

vi.mock('../src/utils/speech/core/speechController', () => ({
  speechController: { isActive: vi.fn(() => false) }
}));

const word: VocabularyWord = { word: 'hello', meaning: '', example: '', category: 'c' };

describe('useAutoPlay resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    markUserInteraction();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetUserInteraction();
  });

  it('replays current word when unpaused', () => {
    const play = vi.fn();
    const { rerender } = renderHook(({currentWord, muted, paused}) =>
      useAutoPlay(currentWord, muted, paused, play),
      { initialProps: { currentWord: word, muted: false, paused: true } }
    );

    vi.advanceTimersByTime(500);
    expect(play).not.toHaveBeenCalled();

    act(() => {
      rerender({ currentWord: word, muted: false, paused: false });
    });

    vi.advanceTimersByTime(500);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('continues auto-play when muted', () => {
    const play = vi.fn();
    renderHook(({currentWord, muted, paused}) =>
      useAutoPlay(currentWord, muted, paused, play),
      { initialProps: { currentWord: word, muted: true, paused: false } }
    );

    vi.advanceTimersByTime(500);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('schedules auto-play while controller mute state is enabled', () => {
    (window as any).speechSynthesis = {
      cancel: vi.fn(),
      pause: vi.fn(),
      speaking: false,
      pending: false
    };
    unifiedSpeechController.setMuted(true);

    const play = vi.fn();
    renderHook(({currentWord, muted, paused}) =>
      useAutoPlay(currentWord, muted, paused, play),
      { initialProps: { currentWord: word, muted: true, paused: false } }
    );

    vi.advanceTimersByTime(500);
    expect(play).toHaveBeenCalledTimes(1);

    unifiedSpeechController.setMuted(false);
    delete (window as any).speechSynthesis;
  });
});
