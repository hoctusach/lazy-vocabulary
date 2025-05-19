
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Hook to initialize voice and handle user interaction
 */
export const useUserInteractionEffect = (
  userInteractionRef: React.MutableRefObject<boolean>,
  currentWord: VocabularyWord | null,
  playCurrentWord: () => void,
  ensureVoicesLoaded: () => Promise<boolean>
) => {
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
};
