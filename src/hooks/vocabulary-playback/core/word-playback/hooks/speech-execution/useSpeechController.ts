
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

/**
 * Silent speech controller hook
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
      if (muted || paused) {
        setPlayInProgress(false);
        if (!paused && !muted) {
          scheduleAutoAdvance(1000);
        }
        return false;
      }

      // Use the unified speech controller
      const success = await unifiedSpeechController.speak(
        currentWord,
        selectedVoice.region
      );

      if (success) {
        onStart();
        // Schedule end callback after estimated duration
        setTimeout(() => {
          onEnd();
        }, Math.max(2000, speechableText.length * 50));
      } else {
        setPlayInProgress(false);
        if (!paused && !muted) {
          scheduleAutoAdvance(2000);
        }
      }

      return success;

    } catch (error) {
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
