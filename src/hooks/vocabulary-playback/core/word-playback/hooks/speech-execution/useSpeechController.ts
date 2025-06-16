
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { simpleSpeechController } from '@/utils/speech/controller/simpleSpeechController';

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
      console.log(`[SPEECH-CONTROLLER-${sessionId}] Initiating speech with enhanced audio unlock`);

      if (muted || paused) {
        console.log(`[SPEECH-CONTROLLER-${sessionId}] Skipping - muted: ${muted}, paused: ${paused}`);
        setPlayInProgress(false);
        if (!paused && !muted) {
          scheduleAutoAdvance(1000);
        }
        return false;
      }

      // Use the simple speech controller
      const success = await simpleSpeechController.speak(currentWord, selectedVoice.region);

      console.log(`[SPEECH-CONTROLLER-${sessionId}] Speech initiation result: ${success}`);

      if (success) {
        onStart();
        // Schedule end callback after estimated duration
        setTimeout(() => {
          onEnd();
        }, Math.max(2000, speechableText.length * 50)); // Dynamic duration based on text length
      } else {
        console.warn(`[SPEECH-CONTROLLER-${sessionId}] ✗ Speech failed to start`);
        setPlayInProgress(false);
        if (!paused && !muted) {
          scheduleAutoAdvance(2000);
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
  }, [selectedVoice, scheduleAutoAdvance]);

  return {
    executeSpeechSynthesis
  };
};
