
import { VocabularyWord } from '@/types/vocabulary';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

interface ValidationResult {
  canPlay: boolean;
  reason?: string;
}

/**
 * Combined validation using the centralized speech guard.
 */
export const useUnifiedValidation = () => {
  const checkAll = (
    currentWord: VocabularyWord | null,
    muted: boolean,
    paused: boolean,
    isPlayInProgress: () => boolean,
    resetPlayInProgress: () => void,
    wordTransitionRef: React.MutableRefObject<boolean>
  ): ValidationResult => {
    const guardResult = unifiedSpeechController.canSpeak();
    if (!guardResult.canPlay) {
      return guardResult;
    }

    if (!currentWord) {
      return { canPlay: false, reason: 'no-word' };
    }

    if (isPlayInProgress()) {
      return { canPlay: false, reason: 'play-in-progress' };
    }

    if (wordTransitionRef.current) {
      return { canPlay: false, reason: 'word-transition' };
    }

    if (muted) {
      return { canPlay: false, reason: 'muted' };
    }

    if (paused) {
      return { canPlay: false, reason: 'paused' };
    }

    // Reset stray flag if controller not active but flag set
    if (!unifiedSpeechController.isCurrentlyActive() && isPlayInProgress()) {
      resetPlayInProgress();
    }

    return { canPlay: true };
  };

  return { checkAll };
};
