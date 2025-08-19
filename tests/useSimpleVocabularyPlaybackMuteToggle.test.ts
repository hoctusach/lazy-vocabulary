/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyWord } from '../src/types/vocabulary';

vi.mock('../src/hooks/vocabulary-playback/useVoiceSelection', () => ({
  useVoiceSelection: () => ({
    selectedVoice: { label: 'US', region: 'US', gender: 'female', index: 0 },
    cycleVoice: vi.fn(),
    voices: []
  })
}));

vi.mock('../src/services/speech/unifiedSpeechController', () => ({
  unifiedSpeechController: {
    setMuted: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn()
  }
}));

vi.mock('../src/hooks/vocabulary-playback/useSimpleWordPlayback', () => {
  const playWordMock = vi.fn();
  return {
    useSimpleWordPlayback: () => ({
      playWord: playWordMock,
      isSpeaking: false
    }),
    playWordMock
  };
});

import { useSimpleVocabularyPlayback } from '../src/hooks/vocabulary-playback/useSimpleVocabularyPlayback';
import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';
import { playWordMock } from '../src/hooks/vocabulary-playback/useSimpleWordPlayback';

describe('useSimpleVocabularyPlayback mute toggling', () => {
  const setMutedMock = vi.mocked(unifiedSpeechController.setMuted);

  beforeEach(() => {
    playWordMock.mockClear();
    setMutedMock.mockClear();
  });

  it('restarts current word on mute and resumes without extra audio on unmute', () => {
    const words: VocabularyWord[] = [
      { word: 'alpha', meaning: '', example: '', category: 'c' },
      { word: 'beta', meaning: '', example: '', category: 'c' }
    ];

    const { result } = renderHook(() => useSimpleVocabularyPlayback(words));

    expect(playWordMock).toHaveBeenCalledTimes(1);
    expect(playWordMock.mock.calls[0][0].word).toBe('alpha');

    act(() => {
      result.current.toggleMute();
    });
    expect(setMutedMock).toHaveBeenLastCalledWith(true);
    expect(playWordMock).toHaveBeenCalledTimes(2);
    expect(playWordMock.mock.calls[1][0].word).toBe('alpha');

    act(() => {
      result.current.goToNext();
    });
    expect(playWordMock).toHaveBeenCalledTimes(3);
    expect(playWordMock.mock.calls[2][0].word).toBe('beta');

    act(() => {
      result.current.toggleMute();
    });
    expect(setMutedMock).toHaveBeenLastCalledWith(false);
    expect(playWordMock).toHaveBeenCalledTimes(3);
  });
});
