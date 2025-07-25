
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { sanitizeForDisplay } from '@/utils/security/contentSecurity';
import { formatSpeechText } from '@/utils/speech';
import parseWordAnnotations from '@/utils/text/parseWordAnnotations';

/**
 * Hook for processing vocabulary word content into speechable text
 */
export const useContentProcessor = () => {
  // Create speech text from vocabulary word
  const createSpeechText = useCallback((word: VocabularyWord) => {
    const cleanedWord = parseWordAnnotations(word.word || '').main;
    const sanitizedWord = sanitizeForDisplay(cleanedWord);
    const sanitizedMeaning = sanitizeForDisplay(word.meaning || '');
    const sanitizedExample = sanitizeForDisplay(word.example || '');

    return formatSpeechText({ word: sanitizedWord, meaning: sanitizedMeaning, example: sanitizedExample });
  }, []);

  return {
    createSpeechText
  };
};
