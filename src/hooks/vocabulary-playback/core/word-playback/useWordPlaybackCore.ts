
import * as React from 'react';
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
  findVoice: (region: 'US' | 'UK' | 'AU') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  userInteractionRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  lastManualActionTimeRef: React.MutableRefObject<number>,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  onUserInteraction?: () => void
) => {
  // Get utterance manager functionality
  const { utteranceRef, createUtterance } = useUtteranceManager();
  
  // Custom hooks for specific functionality
  const { voicesLoadedRef, ensureVoicesLoaded } = useVoiceLoader();
  const { permissionErrorShownRef, setHasSpeechPermission, hasSpeechPermission } = usePermissionState();
  const { wordTransitionRef, goToNextWord, scheduleAutoAdvance } = useWordTransition(
    wordList,
    cancelSpeech,
    setCurrentIndex,
    resetRetryAttempts,
    lastManualActionTimeRef,
    autoAdvanceTimerRef
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
    scheduleAutoAdvance,
    lastManualActionTimeRef,
    autoAdvanceTimerRef,
    voicesLoadedRef,
    ensureVoicesLoaded,
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
    ensureVoicesLoaded,
    onUserInteraction
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
