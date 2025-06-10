
import { useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { 
  useCorePlayback, 
  useVoiceManagement, 
  usePlaybackControls, 
  useWordPlayback 
} from './core';
import { 
  useUserInteraction,
  useSpeechCancellation,
  useAutoPlay
} from './core/playback-states';
import { usePlaybackState } from './core/word-playback/hooks/usePlaybackState';
import { useSafariSupport } from './core/ios-support';

/**
 * Main hook that combines all the playback functionality
 */
export const useVocabularyPlaybackCore = (wordList: VocabularyWord[]) => {
  // Get core playback functionality
  const { 
    isSpeaking, 
    setIsSpeaking, 
    speakingRef,
    retryAttemptsRef, 
    userInteractionRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport
  } = useCorePlayback();
  
  // Get voice management functionality
  const { 
    voices, 
    selectedVoice, 
    findVoice, 
    cycleVoice,
    allVoiceOptions
  } = useVoiceManagement();
  
  // Use the consolidated playback state from word-playback hooks
  const {
    currentIndex,
    setCurrentIndex
  } = usePlaybackState();

  // Reference to store if voices have been loaded
  const voicesLoadedRef = useRef(false);

  // Mutable reference for the cancelSpeech function provided to other hooks
  const cancelSpeechRef = useRef<() => void>(() => {});

  // Track when the user last manually advanced
  const lastManualActionTimeRef = useRef<number>(Date.now());

  // Track any scheduled auto-advance timers
  const autoAdvanceTimerRef = useRef<number | null>(null);
  
  // Initialize playCurrentWord as an empty function that will be updated with the actual implementation
  const playCurrentWordRef = useRef<() => void>(() => {
    console.log('playCurrentWord not yet initialized');
  });
  
  // Get word playback functionality - start unmuted and unpaused
  const {
    utteranceRef,
    currentWord,
    playCurrentWord: playCurrentWordInternal,
    goToNextWord,
    hasSpeechPermission,
    resetPlayInProgress
  } = useWordPlayback(
    wordList,
    currentIndex,
    setCurrentIndex,
    false, // Start unmuted for auto-play
    false, // Start unpaused for auto-play
    () => cancelSpeechRef.current(),
    findVoice,
    selectedVoice,
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport,
    lastManualActionTimeRef,
    autoAdvanceTimerRef
  );

  // Obtain the cancelSpeech function now that resetPlayInProgress is available
  const { cancelSpeech } = useSpeechCancellation(
    speakingRef,
    setIsSpeaking,
    resetPlayInProgress
  );
  // Update the ref so other hooks use the latest implementation
  cancelSpeechRef.current = cancelSpeech;
  
  // Update the playCurrentWordRef with the actual implementation
  playCurrentWordRef.current = playCurrentWordInternal;
  
  // Get playback controls with the updated playCurrentWord function
  const { 
    muted, 
    paused, 
    toggleMute, 
    togglePause 
  } = usePlaybackControls(
    cancelSpeech, 
    () => {
      console.log('Calling playCurrentWord from controls');
      playCurrentWordRef.current();
    }
  );
  
  // Handle iOS and Safari-specific initialization
  useSafariSupport(userInteractionRef);
  
  // Auto-play the current word when it changes
  useAutoPlay(
    currentWord, 
    muted, 
    paused, 
    () => playCurrentWordRef.current()
  );
  
  return {
    currentWord,
    currentIndex,
    muted,
    paused,
    voices,
    selectedVoice,
    playCurrentWord: () => playCurrentWordRef.current(),
    goToNextWord,
    toggleMute,
    togglePause,
    cycleVoice,
    userInteractionRef,
    isSpeaking,
    hasSpeechPermission,
    allVoiceOptions
  };
};
