/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAutoPlay } from '../src/hooks/vocabulary-playback/core/playback-states/useAutoPlay';
import { VocabularyWord } from '../src/types/vocabulary';
import { speechController } from '../src/utils/speech/core/speechController';

vi.mock('../src/utils/speech/core/speechController', () => ({
  speechController: { isActive: vi.fn(() => false) }
}));

const word: VocabularyWord = { word: 'hello', meaning: '', example: '', category: 'c' };

describe('useAutoPlay resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('replays current word when unmuted', () => {
    const play = vi.fn();
    const { rerender } = renderHook(({currentWord, muted, paused}) =>
      useAutoPlay(currentWord, muted, paused, play),
      { initialProps: { currentWord: word, muted: true, paused: false } }
    );

    vi.advanceTimersByTime(500);
    expect(play).not.toHaveBeenCalled();

    act(() => {
      rerender({ currentWord: word, muted: false, paused: false });
    });

    vi.advanceTimersByTime(500);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
