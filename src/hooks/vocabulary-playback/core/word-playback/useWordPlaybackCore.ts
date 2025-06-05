
import { useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../../useVoiceSelection';
import { useVoiceLoader } from './useVoiceLoader';
import { usePermissionState } from './usePermissionState';
import { useWordTransition } from './useWordTransition';
import { 
  useUtteranceManager,
  usePlayEffect,
  useUserInteractionEffect,
  useWordPlaybackLogic
} from './hooks';

/**
 * Core hook for managing word playback functionality
 */
export const useWordPlaybackCore = (
  wordList: VocabularyWord[],
  currentIndex: number,
  setCurrentIndex: (index: number | ((prevIndex: number) => number)) => void,
  muted: boolean,
  paused: boolean,
  cancelSpeech: () => void,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  userInteractionRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean
) => {
  // Get utterance manager functionality
  const { utteranceRef, createUtterance } = useUtteranceManager();
  
  // Custom hooks for specific functionality
  const { voicesLoadedRef, ensureVoicesLoaded } = useVoiceLoader();
  const { permissionErrorShownRef, setHasSpeechPermission, hasSpeechPermission } = usePermissionState();
  const { wordTransitionRef, goToNextWord } = useWordTransition(
    wordList,
    cancelSpeech, 
    setCurrentIndex, 
    resetRetryAttempts
  );
  
  // Core playback logic
  const { currentWord, playCurrentWord, resetPlayInProgress } = useWordPlaybackLogic(
    wordList,
    currentIndex,
    muted,
    paused,
    cancelSpeech,
    findVoice,
    selectedVoice,
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    goToNextWord,
    voicesLoadedRef,
    ensureVoicesLoaded,
    permissionErrorShownRef,
    utteranceRef,
    createUtterance
  );
  
  // Setup auto-play effect
  usePlayEffect(currentWord, playCurrentWord);
  
  // Setup user interaction effect
  useUserInteractionEffect(
    userInteractionRef, 
    currentWord, 
    playCurrentWord, 
    ensureVoicesLoaded
  );
  
  return {
    utteranceRef,
    currentWord,
    playCurrentWord,
    goToNextWord,
    hasSpeechPermission,
    resetPlayInProgress
  };
};
