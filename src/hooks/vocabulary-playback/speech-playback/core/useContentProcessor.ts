
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { sanitizeForDisplay } from '@/utils/security/contentSecurity';
import { formatSpeechText } from '@/utils/speech';

/**
 * Hook for processing vocabulary word content into speechable text
 */
export const useContentProcessor = () => {
  // Create speech text from vocabulary word
  const createSpeechText = useCallback((word: VocabularyWord) => {
    const sanitizedWord = sanitizeForDisplay(word.word || '');
    const sanitizedMeaning = sanitizeForDisplay(word.meaning || '');
    const sanitizedExample = sanitizeForDisplay(word.example || '');

    return formatSpeechText({ word: sanitizedWord, meaning: sanitizedMeaning, example: sanitizedExample });
  }, []);

  return {
    createSpeechText
  };
};
