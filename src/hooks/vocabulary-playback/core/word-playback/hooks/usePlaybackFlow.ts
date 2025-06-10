
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { usePlaybackOrchestrator } from './usePlaybackOrchestrator';

/**
 * Hook that orchestrates the complete playback flow with improved debugging
 * Now simplified to use the orchestrator hook
 */
export const usePlaybackFlow = (
  wordList: VocabularyWord[],
  currentIndex: number,
  muted: boolean,
  paused: boolean,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: (fromUser?: boolean) => void,
  scheduleAutoAdvance: (delay: number) => void,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>,
  permissionErrorShownRef: React.MutableRefObject<boolean>
) => {
  // Use the orchestrator hook that handles all the complex logic
  return usePlaybackOrchestrator(
    wordList,
    currentIndex,
    muted,
    paused,
    findVoice,
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    goToNextWord,
    scheduleAutoAdvance,
    lastManualActionTimeRef,
    autoAdvanceTimerRef,
    voicesLoadedRef,
    ensureVoicesLoaded,
    permissionErrorShownRef
  );
};
