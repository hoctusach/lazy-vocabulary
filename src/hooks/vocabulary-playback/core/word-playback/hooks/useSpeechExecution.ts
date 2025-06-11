
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * @deprecated This hook is deprecated in favor of the unified speech controller
 * Hook for executing speech synthesis with proper error handling and auto-advance
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
  console.warn('[DEPRECATED] useSpeechExecution is deprecated. Use unifiedSpeechController directly.');

  const executeSpeech = useCallback(async (
    currentWord: VocabularyWord,
    speechText: string,
    setPlayInProgress: (inProgress: boolean) => void
  ): Promise<boolean> => {
    console.log('[DEPRECATED-SPEECH-EXECUTION] Delegating to unified controller');
    
    // Delegate to unified controller
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
