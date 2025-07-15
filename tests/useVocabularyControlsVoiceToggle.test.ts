/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useVocabularyControls } from '../src/hooks/vocabulary-controller/core/useVocabularyControls';
import { VocabularyWord } from '../src/types/vocabulary';

vi.mock('../src/services/speech/unifiedSpeechController', () => ({
  unifiedSpeechController: { stop: vi.fn(), speak: vi.fn() }
}));

import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';

describe('useVocabularyControls toggleVoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates voice and stops speech without speaking immediately', () => {
    const voices = [
      { name: 'Voice 1', lang: 'en-US' } as SpeechSynthesisVoice,
      { name: 'Voice 2', lang: 'en-US' } as SpeechSynthesisVoice
    ];
    const word: VocabularyWord = { word: 'test', meaning: '', example: '', category: 'c' };
    let voiceName = voices[0].name;
    const { result } = renderHook(() =>
      useVocabularyControls(
        false,
        () => {},
        false,
        () => {},
        voices,
        voiceName,
        n => (voiceName = n),
        { phase: 'idle', isActive: false, isPaused: false, isMuted: false, currentWord: word, currentUtterance: null },
        word
      )
    );

    act(() => {
      result.current.toggleVoice();
    });

    expect(voiceName).toBe(voices[1].name);
    expect(unifiedSpeechController.stop).toHaveBeenCalled();
    expect(unifiedSpeechController.speak).not.toHaveBeenCalled();
  });
});
