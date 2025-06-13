
import { VocabularyWord } from '@/types/vocabulary';
import { prepareTextForSpeech } from '@/utils/speech';
import { hasValidSpeechableContent, getPreserveSpecialFromStorage } from '@/utils/text/contentFilters';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook for handling content validation and filtering for speech
 */
export const useContentValidation = () => {
  const validateAndPrepareContent = (currentWord: VocabularyWord) => {
    // Get preserve special setting
    const preserveSpecial = getPreserveSpecialFromStorage();
    
    // Construct text to speak
    let rawTextToSpeak = currentWord.word;
    if (currentWord.meaning) {
      rawTextToSpeak += `. ${currentWord.meaning}`;
    }
    if (currentWord.example) {
      rawTextToSpeak += `. ${currentWord.example}`;
    }

    // Prepare text for speech (whitespace cleanup only)
    const speechableText = prepareTextForSpeech(rawTextToSpeak);

    
    console.log('[CONTENT-VALIDATION] Original text length:', rawTextToSpeak.length);
    console.log('[CONTENT-VALIDATION] Speechable text length:', speechableText.length);
    console.log('[CONTENT-VALIDATION] Text to speak:', speechableText.substring(0, 100) + '...');

    // Check if we have any content to speak after filtering
    const hasValidContent = hasValidSpeechableContent(rawTextToSpeak, preserveSpecial);
    
    if (!hasValidContent) {
      console.log('[CONTENT-VALIDATION] No speechable content after filtering');
      toast({
        title: "Content Notice",
        description: "This word contains only IPA notation or Vietnamese text - skipping speech"
      });
      return { speechableText: '', hasValidContent: false };
    }

    return { speechableText, hasValidContent: true };
  };

  return {
    validateAndPrepareContent
  };
};
