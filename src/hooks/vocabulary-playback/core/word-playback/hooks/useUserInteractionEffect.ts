
import { useEffect, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { speechController } from '@/utils/speech/core/speechController';

/**
 * Hook to initialize voice and handle user interaction
 * Now coordinated with the centralized speech controller
 */
export const useUserInteractionEffect = (
  userInteractionRef: React.MutableRefObject<boolean>,
  currentWord: VocabularyWord | null,
  playCurrentWord: () => void,
  ensureVoicesLoaded: () => Promise<boolean>
) => {
  const initializationDoneRef = useRef(false);

  // Setup global user interaction detection
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!userInteractionRef.current && !initializationDoneRef.current) {
        console.log('[USER-INTERACTION] First user interaction detected');
        userInteractionRef.current = true;
        initializationDoneRef.current = true;
        
        // Save interaction state
        localStorage.setItem('hadUserInteraction', 'true');
        
        // Initialize audio context
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
              audioContext.resume();
            }
          }
        } catch (e) {
          console.warn('[USER-INTERACTION] Audio context initialization failed:', e);
        }
        
        // Initialize speech synthesis with a silent utterance
        try {
          const initUtterance = new SpeechSynthesisUtterance(' ');
          initUtterance.volume = 0.01;
          
          initUtterance.onend = () => {
            console.log('[USER-INTERACTION] Speech initialization complete');
            // Load voices and then attempt to speak current word if available
            ensureVoicesLoaded().then(() => {
              if (currentWord && !speechController.isActive()) {
                setTimeout(() => {
                  playCurrentWord();
                }, 500);
              }
            });
          };
          
          initUtterance.onerror = (e) => {
            console.warn('[USER-INTERACTION] Speech initialization error:', e);
            // Still try to play current word after a delay
            if (currentWord && !speechController.isActive()) {
              setTimeout(() => {
                playCurrentWord();
              }, 1000);
            }
          };
          
          // Stop any existing speech before initialization
          speechController.stop();
          setTimeout(() => {
            window.speechSynthesis.speak(initUtterance);
          }, 100);
          
        } catch (e) {
          console.error('[USER-INTERACTION] Error initializing speech:', e);
        }
        
        // Remove event listeners after first interaction
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      }
    };
    
    // Check for previous interactions
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('[USER-INTERACTION] Previous interaction detected from localStorage');
      userInteractionRef.current = true;
      initializationDoneRef.current = true;
      return;
    }
    
    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [userInteractionRef, currentWord, playCurrentWord, ensureVoicesLoaded]);
};
