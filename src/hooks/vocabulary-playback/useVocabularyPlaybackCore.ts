
import { useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { 
  useCorePlayback, 
  useVoiceManagement, 
  usePlaybackControls, 
  useWordPlayback 
} from './core';
import { 
  usePlaybackState, 
  useUserInteraction,
  useSpeechCancellation,
  useAutoPlay
} from './core/playback-states';
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
  
  // Basic state for current word index from our refactored state
  const { 
    currentIndex, 
    setCurrentIndex 
  } = usePlaybackState();
  
  // Reference to store if voices have been loaded
  const voicesLoadedRef = useRef(false);
  
  // Handle speech cancellation
  const { cancelSpeech } = useSpeechCancellation(speakingRef, setIsSpeaking);
  
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
    hasSpeechPermission
  } = useWordPlayback(
    wordList,
    currentIndex,
    setCurrentIndex,
    false, // Start unmuted for auto-play
    false, // Start unpaused for auto-play
    cancelSpeech,
    findVoice,
    selectedVoice,
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    resetRetryAttempts,
    incrementRetryAttempts,
    checkSpeechSupport
  );
  
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
