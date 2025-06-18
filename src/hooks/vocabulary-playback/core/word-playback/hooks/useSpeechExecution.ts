
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Silent speech execution hook that preserves UI timing
 */
export const useSpeechExecution = (
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: any,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  paused: boolean,
  muted: boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void
) => {
  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ): Promise<boolean> => {
    // Delegate to unified controller silently
    const success = await unifiedSpeechController.speak(currentWord, selectedVoice.region || 'US');
    
    if (!success) {
      setPlayInProgress(false);
    }
    
    return success;
  }, [selectedVoice]);

  return {
    executeSpeech
  };
};
