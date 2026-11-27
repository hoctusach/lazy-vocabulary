import { describe, it, expect } from 'vitest';
import { useContentValidation } from '../src/hooks/vocabulary-playback/core/word-playback/hooks/useContentValidation';
import { VocabularyWord } from '../src/types/vocabulary';

describe('useContentValidation', () => {
  const { validateAndPrepareContent } = useContentValidation();

  it('strips IPA and part-of-speech notes from the speechable text', () => {
    const word: VocabularyWord = {
      word: 'quick',
      meaning: '(adj) [kwiːk]',
      example: '',
      count: 1,
    };

    const { speechableText } = validateAndPrepareContent(word);
    expect(speechableText).toBe('quick.');
  });

  it('returns empty text (skips speech) when the content is only IPA', () => {
    const word: VocabularyWord = {
      word: '[kwiːk]',
      meaning: '',
      example: '',
      count: 1,
    };

    const { speechableText, hasValidContent } = validateAndPrepareContent(word);
    expect(speechableText).toBe('');
    expect(hasValidContent).toBe(false);
  });
});
