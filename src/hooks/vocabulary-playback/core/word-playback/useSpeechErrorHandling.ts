
import * as React from 'react';
import { useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useSpeechErrorHandling = (
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  setIsSpeaking: (isSpeaking: boolean) => void,
  goToNextWord: (fromUser?: boolean) => void,
  wordTransitionRef: React.MutableRefObject<boolean>
) => {
  const [errorCount, setErrorCount] = useState(0);
  const maxRetries = 3;

  const handleSpeechError = useCallback((error: any) => {
    console.error('Speech error:', error);
    setIsSpeaking(false);
    
    if (incrementRetryAttempts()) {
      console.log('Retrying speech...');
      setTimeout(() => {
        // Retry logic would go here
      }, 500);
    } else {
      console.log('Max retries reached, moving to next word');
      goToNextWord();
    }
  }, [incrementRetryAttempts, setIsSpeaking, goToNextWord]);

  return { handleSpeechError, errorCount };
};
