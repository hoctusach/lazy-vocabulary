import { describe, it, expect } from 'vitest';
import { useContentValidation } from '../src/hooks/vocabulary-playback/core/word-playback/hooks/useContentValidation';
import { VocabularyWord } from '../src/types/vocabulary';

describe('useContentValidation', () => {
  const { validateAndPrepareContent } = useContentValidation();

  it('returns unfiltered speechable text', () => {
    const word: VocabularyWord = {
      word: 'quick',
      meaning: '(adj) [kwiːk]',
      example: '',
      count: 1,
    };

    const { speechableText } = validateAndPrepareContent(word);
    expect(speechableText).toBe('quick<break time="300ms"/>(adj) [kwiːk]');
  });

  it('returns full text even if it contains IPA', () => {
    const word: VocabularyWord = {
      word: '[kwiːk]',
      meaning: '',
      example: '',
      count: 1,
    };

    const { speechableText } = validateAndPrepareContent(word);
    expect(speechableText).toBe('[kwiːk]');
  });
});
