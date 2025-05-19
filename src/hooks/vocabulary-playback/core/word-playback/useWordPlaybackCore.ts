
import { useCallback, useRef, useState, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../../useVoiceSelection';
import { useVoiceLoader } from './useVoiceLoader';
import { usePermissionState } from './usePermissionState';
import { useUtteranceSetup } from './useUtteranceSetup';
import { useWordTransition } from './useWordTransition';
import { useSpeechErrorHandling } from './useSpeechErrorHandling';

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
  // Reference to the current utterance
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Get the current word based on the index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Custom hooks for specific functionality
  const { voicesLoadedRef, ensureVoicesLoaded } = useVoiceLoader();
  const { permissionErrorShownRef, setHasSpeechPermission, hasSpeechPermission } = usePermissionState();
  const { wordTransitionRef, goToNextWord } = useWordTransition(
    wordList,
    cancelSpeech, 
    setCurrentIndex, 
    resetRetryAttempts
  );
  
  // Core function to play the current word
  const playCurrentWord = useCallback(async () => {
    // Don't try to play during word transitions
    if (wordTransitionRef.current) {
      console.log('Word transition in progress, delaying playback');
      return;
    }
    
    // Basic checks
    if (!currentWord) {
      console.log('No current word to play');
      return;
    }
    
    if (muted) {
      console.log('Speech is muted, but continuing to show words');
      // We don't return here as we want to auto-advance even when muted
      setTimeout(() => goToNextWord(), 3000);
      return;
    }
    
    if (paused) {
      console.log('Playback is paused');
      return;
    }
    
    // CRITICAL: Ensure voices are loaded before attempting speech
    if (!voicesLoadedRef.current) {
      console.log('Ensuring voices are loaded before speaking');
      await ensureVoicesLoaded();
    }
    
    console.log(`Attempting to play word with voice: ${selectedVoice.label}`);
    
    // CRITICAL: Cancel any ongoing speech to prevent queuing
    cancelSpeech();
    
    // Ensure speech synthesis is available
    if (!checkSpeechSupport()) {
      if (!permissionErrorShownRef.current) {
        toast.error("Your browser doesn't support speech synthesis");
        permissionErrorShownRef.current = true;
      }
      // Auto-advance even if speech isn't supported
      setTimeout(() => goToNextWord(), 3000);
      return;
    }
    
    // Set up and play the utterance
    useUtteranceSetup({
      currentWord,
      selectedVoice,
      findVoice,
      cancelSpeech, 
      utteranceRef,
      wordTransitionRef,
      speakingRef,
      setIsSpeaking,
      setHasSpeechPermission,
      permissionErrorShownRef,
      goToNextWord,
      muted,
      paused,
      incrementRetryAttempts
    });
    
  }, [
    currentWord, 
    muted, 
    paused, 
    cancelSpeech, 
    findVoice, 
    goToNextWord, 
    selectedVoice,
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    ensureVoicesLoaded
  ]);
  
  // Auto-play on word change - no longer relying on user interaction flag
  useEffect(() => {
    if (currentWord) {
      console.log(`Auto-playing word after change: ${currentWord.word}`);
      const timerId = setTimeout(() => {
        playCurrentWord();
      }, 200);
      return () => clearTimeout(timerId);
    }
  }, [currentWord, playCurrentWord]);
  
  // Setup global user interaction detection
  useEffect(() => {
    // Handle user interaction - implemented in useUserInteractionDetection
    const handleUserInteraction = () => {
      if (!userInteractionRef.current) {
        console.log('First user interaction detected - enabling speech');
        userInteractionRef.current = true;
        
        // Try to play a silent sound to initialize audio context
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          oscillator.frequency.value = 0; // Silent
          oscillator.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.001);
        } catch (e) {
          console.warn('Could not initialize audio context:', e);
        }
        
        // Initialize speech synthesis with a silent utterance
        try {
          const initUtterance = new SpeechSynthesisUtterance(' '); // Just a space
          initUtterance.volume = 0.01; // Nearly silent
          initUtterance.onend = () => {
            console.log('Speech initialization successful');
            // Load voices and then attempt to speak the current word
            ensureVoicesLoaded().then(() => {
              if (currentWord) {
                playCurrentWord();
              }
            });
          };
          
          initUtterance.onerror = (e) => {
            console.error('Speech initialization error:', e);
            // Try to play current word anyway after a moment
            setTimeout(() => {
              if (currentWord) {
                playCurrentWord();
              }
            }, 500);
          };
          
          // Speak the silent utterance to initialize the speech system
          window.speechSynthesis.cancel(); // Clear any pending speech
          window.speechSynthesis.speak(initUtterance);
        } catch (e) {
          console.error('Error initializing speech:', e);
        }
        
        // Remove event listeners after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };
    
    // Add event listeners for various user interaction types
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Check for previous interactions
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('Previous user interaction detected from localStorage');
      userInteractionRef.current = true;
      handleUserInteraction();
    }
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [userInteractionRef, currentWord, playCurrentWord, ensureVoicesLoaded]);
  
  // When user interacts, save that fact to localStorage
  useEffect(() => {
    if (userInteractionRef.current) {
      localStorage.setItem('hadUserInteraction', 'true');
    }
  }, [userInteractionRef.current]);
  
  return {
    utteranceRef,
    currentWord,
    playCurrentWord,
    goToNextWord,
    hasSpeechPermission
  };
};
