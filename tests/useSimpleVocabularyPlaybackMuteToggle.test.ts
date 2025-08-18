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

  it('continues through words while muted and does not replay on unmute', () => {
    const words: VocabularyWord[] = [
      { word: 'alpha', meaning: '', example: '', category: 'c' },
      { word: 'beta', meaning: '', example: '', category: 'c' }
    ];

    const { result } = renderHook(() => useSimpleVocabularyPlayback(words));

    expect(playWordMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggleMute();
    });
    expect(setMutedMock).toHaveBeenLastCalledWith(true);
    expect(playWordMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.goToNext();
    });
    expect(playWordMock).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.toggleMute();
    });
    expect(setMutedMock).toHaveBeenLastCalledWith(false);
    expect(playWordMock).toHaveBeenCalledTimes(2);
  });
});
