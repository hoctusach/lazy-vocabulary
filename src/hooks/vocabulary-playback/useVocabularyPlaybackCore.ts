
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useCorePlayback, useVoiceManagement, usePlaybackControls, useWordPlayback } from './core';
import { toast } from 'sonner';

/**
 * Main hook that combines all the playback functionality
 */
export const useVocabularyPlaybackCore = (wordList: VocabularyWord[]) => {
  // Basic state for current word index
  const [currentIndex, setCurrentIndex] = useState(0);
  
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
  
  // Reference to store if voices have been loaded
  const voicesLoadedRef = useRef(false);
  
  // Function to cancel any current speech and reset state
  const cancelSpeech = useCallback(() => {
    if (window.speechSynthesis) {
      console.log('Cancelling any ongoing speech');
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setIsSpeaking(false);
    }
  }, [speakingRef, setIsSpeaking]);

  // Initialize playCurrentWord as an empty function that will be updated with the actual implementation
  const playCurrentWordRef = useRef<() => void>(() => {
    console.log('playCurrentWord not yet initialized');
  });
  
  // Get word playback functionality - start unmuted and unpaused
  const { 
    utteranceRef,
    currentWord, 
    playCurrentWord: playCurrentWordInternal, 
    goToNextWord 
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
  
  // Always try to pre-load voices as early as possible
  useEffect(() => {
    if (!voicesLoadedRef.current && window.speechSynthesis) {
      console.log('Pre-loading voices for later use...');
      
      const loadVoices = () => {
        // Force browser to load voices
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          console.log(`Voices loaded: ${availableVoices.length} voices available`);
          voicesLoadedRef.current = true;
          
          // Try a silent utterance to initialize speech engine
          try {
            const silentUtterance = new SpeechSynthesisUtterance(' ');  // Just a space
            silentUtterance.volume = 0.01;  // Nearly silent
            window.speechSynthesis.speak(silentUtterance);
          } catch (e) {
            console.warn('Silent utterance failed:', e);
          }
          
          return true;
        }
        return false;
      };
      
      // Try loading voices immediately
      if (!loadVoices()) {
        // Set up event listener for when voices change
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          console.log('Voices changed event fired');
          loadVoices();
        });
        
        // Also try again after a delay for browsers that don't fire the event
        const reloadTimers = [500, 1000, 2000, 3000];
        reloadTimers.forEach(delay => {
          setTimeout(() => {
            if (!voicesLoadedRef.current) {
              loadVoices();
            }
          }, delay);
        });
      }
    }
  }, []);
  
  // Always attempt to auto-play the current word when it changes
  useEffect(() => {
    if (currentWord && !muted && !paused) {
      console.log(`Auto-playing word after state change: ${currentWord.word}`);
      
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        playCurrentWordRef.current();
      }, 250);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentWord, muted, paused]);
  
  // Special iOS and Safari initialization
  useEffect(() => {
    // iOS needs user interaction to enable audio
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS || isSafari) {
      if (!userInteractionRef.current) {
        toast.error("Please tap anywhere to enable audio playback", { duration: 5000 });
      }
    }
    
    // Try to force browser to preload speech synthesis
    const preloadSpeech = () => {
      if ('speechSynthesis' in window) {
        try {
          // Create a minimal utterance - just a space
          const utterance = new SpeechSynthesisUtterance(' ');
          utterance.volume = 0.01;
          utterance.rate = 1;
          utterance.pitch = 1;
          
          // Try to speak it
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech preload failed:', e);
        }
      }
    };
    
    // Try preloading once on mount
    preloadSpeech();
    
    // Clean up
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [userInteractionRef]);
  
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
    allVoiceOptions
  };
};
