/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useContentProcessor } from '../src/hooks/vocabulary-playback/speech-playback/core/useContentProcessor';
import { VocabularyWord } from '../src/types/vocabulary';

describe('useContentProcessor', () => {
  it('strips annotations from word when creating speech text', () => {
    const { result } = renderHook(() => useContentProcessor());
    const word: VocabularyWord = {
      word: 'word (noun) /wɜːd/',
      meaning: 'a single distinct meaningful element of speech',
      example: '',
      count: 1
    };
    const speech = result.current.createSpeechText(word);
    expect(speech).toBe(
      'word<break time="300ms"/>a single distinct meaningful element of speech'
    );
  });
});
