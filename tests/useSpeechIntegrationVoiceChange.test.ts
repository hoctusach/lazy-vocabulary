/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSpeechIntegration } from '../src/hooks/vocabulary-controller/core/useSpeechIntegration';
import { VocabularyWord } from '../src/types/vocabulary';

vi.mock('../src/services/speech/unifiedSpeechController', () => ({
  unifiedSpeechController: { speak: vi.fn(), stop: vi.fn() }
}));

import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';

describe('useSpeechIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replays current word when voice changes', async () => {
    const word: VocabularyWord = { word: 'water', meaning: '', example: '', category: 'c' };
    const isTrans = { current: false };
    let voice = 'Voice 1';
    const { rerender } = renderHook(({ voiceName }) =>
      useSpeechIntegration(word, voiceName, false, false, isTrans),
      { initialProps: { voiceName: voice } }
    );

    await Promise.resolve();
    expect(unifiedSpeechController.speak).toHaveBeenCalledTimes(1);

    act(() => {
      voice = 'Voice 2';
      rerender({ voiceName: voice });
    });

    await Promise.resolve();
    expect(unifiedSpeechController.speak).toHaveBeenCalledTimes(2);
  });
});
