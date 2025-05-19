
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useCorePlayback, useVoiceManagement, usePlaybackControls, useWordPlayback } from './core';

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
  
  // Get playback controls (mute/pause)
  const { 
    muted, 
    paused, 
    toggleMute, 
    togglePause 
  } = usePlaybackControls(cancelSpeech, () => {});  // We'll fix this circular reference below
  
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
    checkSpeechSupport
  );
  
  // Make sure voices are loaded before attempting to speak
  useEffect(() => {
    if (!voicesLoadedRef.current && window.speechSynthesis) {
      console.log('Loading voices...');
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          console.log(`Initial voices loaded: ${availableVoices.length} voices available`);
          voicesLoadedRef.current = true;
          
          // If we have a current word and we're not muted/paused, try to speak it
          if (currentWord && !muted && !paused && userInteractionRef.current) {
            // Use a small delay to ensure everything is ready
            setTimeout(() => playCurrentWordInternal(), 100);
          }
        }
      };
      
      // Try to load voices immediately
      loadVoices();
      
      // Also set up event listener for when voices change
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      // Cleanup
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, [currentWord, muted, paused, playCurrentWordInternal, userInteractionRef]);
  
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
    if (!userInteractionRef.current) return;
    
    console.log(`Auto-playing word after state change: ${currentWord.word}`);
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      playCurrentWordInternal();
    }, 150);
    
    return () => clearTimeout(timer);
  }, [currentIndex, currentWord, muted, paused, playCurrentWordInternal, userInteractionRef]);
  
  return {
    currentWord,
    currentIndex,
    muted,
    paused,
    voices,
    selectedVoice,
    playCurrentWord: playCurrentWordInternal,
    goToNextWord,
    toggleMute,
    togglePause,
    cycleVoice,
    userInteractionRef,
    isSpeaking,
    allVoiceOptions
  };
};
