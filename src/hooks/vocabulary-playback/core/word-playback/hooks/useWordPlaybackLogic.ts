
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { usePlaybackFlow } from './usePlaybackFlow';

/**
 * Core logic for playing words with centralized speech controller and content filtering
 * Refactored into smaller, focused hooks for better maintainability
 */
export const useWordPlaybackLogic = (
  wordList: VocabularyWord[],
  currentIndex: number,
  muted: boolean,
  paused: boolean,
  cancelSpeech: () => void,
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  userInteractionRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: () => void,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>,
  permissionErrorShownRef: React.MutableRefObject<boolean>,
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  createUtterance: (
    word: VocabularyWord, 
    selectedVoice: VoiceSelection,
    findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
    onStart: () => void,
    onEnd: () => void,
    onError: (e: SpeechSynthesisErrorEvent) => void
  ) => SpeechSynthesisUtterance
) => {
  // Use the orchestrated playback flow hook
  const { currentWord, playCurrentWord, hasSpeechPermission, resetPlayInProgress } = usePlaybackFlow(
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
    voicesLoadedRef,
    ensureVoicesLoaded,
    permissionErrorShownRef
  );
  
  return {
    currentWord,
    playCurrentWord,
    hasSpeechPermission,
    resetPlayInProgress
  };
};
