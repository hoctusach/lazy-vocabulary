
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/simpleSpeechController';

/**
 * Hook for controlling speech synthesis execution
 */
export const useSpeechController = (
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  scheduleAutoAdvance: (delay: number) => void
) => {
  const executeSpeechSynthesis = useCallback(async (
    sessionId: string,
    currentWord: VocabularyWord,
    speechableText: string,
    onStart: () => void,
    onEnd: () => void,
    onError: (event: SpeechSynthesisErrorEvent) => void,
    setPlayInProgress: (inProgress: boolean) => void,
    paused: boolean,
    muted: boolean
  ): Promise<boolean> => {
    try {
      // Find and validate voice
      const voice = findVoice(selectedVoice.region);
      console.log(`[SPEECH-CONTROLLER-${sessionId}] Voice selection:`, {
        requested: selectedVoice.region,
        found: voice?.name || 'system default',
        lang: voice?.lang || 'unknown'
      });

      console.log(`[SPEECH-CONTROLLER-${sessionId}] Initiating speech with enhanced monitoring`);

      // Execute speech with the correct signature
      const success = await simpleSpeechController.speak(currentWord, selectedVoice.region);

      console.log(`[SPEECH-CONTROLLER-${sessionId}] Speech initiation result: ${success}`);

      if (success) {
        onStart();
        // Schedule end callback after estimated duration
        setTimeout(() => {
          onEnd();
        }, 2000);
      } else {
        console.warn(`[SPEECH-CONTROLLER-${sessionId}] ✗ Speech failed to start`);
        setPlayInProgress(false);
        if (!paused && !muted) {
          scheduleAutoAdvance(3000);
        }
      }

      return success;

    } catch (error) {
      console.error(`[SPEECH-CONTROLLER-${sessionId}] ✗ Exception in speech controller:`, error);
      setPlayInProgress(false);
      if (!paused && !muted) {
        scheduleAutoAdvance(2000);
      }
      return false;
    }
  }, [findVoice, selectedVoice, scheduleAutoAdvance]);

  return {
    executeSpeechSynthesis
  };
};
