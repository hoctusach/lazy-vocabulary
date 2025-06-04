
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { sanitizeForDisplay } from '@/utils/security/contentSecurity';

/**
 * Hook for processing vocabulary word content into speechable text
 */
export const useContentProcessor = () => {
  // Create speech text from vocabulary word
  const createSpeechText = useCallback((word: VocabularyWord) => {
    const sanitizedWord = sanitizeForDisplay(word.word || '');
    const sanitizedMeaning = sanitizeForDisplay(word.meaning || '');
    const sanitizedExample = sanitizeForDisplay(word.example || '');
    
    let textToSpeak = sanitizedWord;
    
    if (sanitizedMeaning && sanitizedMeaning.trim().length > 0) {
      textToSpeak += `. ${sanitizedMeaning}`;
    }
    
    if (sanitizedExample && sanitizedExample.trim().length > 0) {
      textToSpeak += `. ${sanitizedExample}`;
    }
    
    return textToSpeak;
  }, []);

  return {
    createSpeechText
  };
};
