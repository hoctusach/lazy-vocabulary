
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
  
  // Get word playback functionality
  const { 
    utteranceRef,
    currentWord, 
    playCurrentWord: playCurrentWordInternal, 
    goToNextWord 
  } = useWordPlayback(
    wordList,
    currentIndex,
    setCurrentIndex,
    false, // We'll get the actual muted state from usePlaybackControls
    false, // We'll get the actual paused state from usePlaybackControls
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
  
  // Get playback controls (mute/pause) with the updated playCurrentWord function
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
  
  // Trigger playback when user interacts with the page for the first time
  useEffect(() => {
    if (userInteractionRef.current && currentWord && !muted && !paused) {
      console.log('User interaction detected, trying to play word');
      
      // Small delay to ensure everything is ready
      const timerId = setTimeout(() => {
        playCurrentWordRef.current();
      }, 500);
      
      return () => clearTimeout(timerId);
    }
  }, [userInteractionRef, currentWord, muted, paused]);
  
  // Make sure voices are loaded before attempting to speak
  useEffect(() => {
    if (!voicesLoadedRef.current && window.speechSynthesis) {
      console.log('Loading voices...');
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded: found ${availableVoices.length} voices`);
        
        if (availableVoices.length > 0) {
          voicesLoadedRef.current = true;
          
          // If we have a current word and we're not muted/paused, try to speak it
          if (currentWord && !muted && !paused && userInteractionRef.current) {
            // Use a small delay to ensure everything is ready
            setTimeout(() => {
              console.log('Playing word after voices loaded');
              playCurrentWordRef.current();
            }, 300);
          }
        } else {
          console.log('No voices available yet, will retry');
          // Try again after a delay
          setTimeout(loadVoices, 500);
        }
      };
      
      // Try to load voices immediately
      loadVoices();
      
      // Also set up event listener for when voices change
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        console.log('Voices changed event fired');
        loadVoices();
      });
      
      // Display a toast when voices are loaded
      const checkVoicesLoadedInterval = setInterval(() => {
        if (voicesLoadedRef.current) {
          toast.success("Voice system ready");
          clearInterval(checkVoicesLoadedInterval);
        }
      }, 1000);
      
      // Cleanup
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        clearInterval(checkVoicesLoadedInterval);
      };
    }
  }, [currentWord, muted, paused, userInteractionRef]);
  
  // Ensure speech synthesis is canceled when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Effect to handle auto-play with improved state handling
  useEffect(() => {
    // Don't attempt to play if we don't have a word or voices aren't loaded
    if (!currentWord || !voicesLoadedRef.current) return;
    
    // Don't play if muted or paused
    if (muted || paused) return;
    
    // Don't auto-play until we've had user interaction
    if (!userInteractionRef.current) {
      toast.info("Click anywhere on the page to start audio playback");
      return;
    }
    
    console.log(`Auto-playing word after state change: ${currentWord.word}`);
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      playCurrentWordRef.current();
    }, 250);
    
    return () => clearTimeout(timer);
  }, [currentIndex, currentWord, muted, paused, userInteractionRef]);
  
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
