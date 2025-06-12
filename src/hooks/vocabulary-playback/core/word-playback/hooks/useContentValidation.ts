
import { VocabularyWord } from '@/types/vocabulary';
import { extractSpeechableContent } from '@/utils/text/contentFilters';

/**
 * Hook for handling content validation and filtering for speech
 */
export const useContentValidation = () => {
  const validateAndPrepareContent = (currentWord: VocabularyWord) => {
    // Construct text to speak with content filtering
    let rawTextToSpeak = currentWord.word;
    if (currentWord.meaning) {
      rawTextToSpeak += `. ${currentWord.meaning}`;
    }
    if (currentWord.example) {
      rawTextToSpeak += `. ${currentWord.example}`;
    }

    // Apply content filtering to extract speechable content
    const speechableText = extractSpeechableContent(rawTextToSpeak);
    
    console.log('[CONTENT-VALIDATION] Original text length:', rawTextToSpeak.length);
    console.log('[CONTENT-VALIDATION] Speechable text length:', speechableText.length);
    console.log('[CONTENT-VALIDATION] Text to speak:', speechableText.substring(0, 100) + '...');

    return { speechableText };
  };

  return {
    validateAndPrepareContent
  };
};
