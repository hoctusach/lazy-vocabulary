
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface UserInteractionProps {
  userInteractionRef: React.MutableRefObject<boolean>;
  playCurrentWord: () => void;
  playbackCurrentWord: any;
}

export const useUserInteractionHandler = ({
  userInteractionRef,
  playCurrentWord,
  playbackCurrentWord
}: UserInteractionProps) => {
  // Track if we've already initialized to prevent duplicate initialization
  const initializedRef = useRef(false);
  
  // Global click handler to enable audio (only needed once)
  useEffect(() => {
    const enableAudioPlayback = () => {
      // Prevent duplicate initialization
      if (initializedRef.current) {
        console.log('Audio already initialized, skipping');
        return;
      }
      
      console.log('User interaction detected, enabling audio playback system-wide');
      
      // Mark that we've had user interaction
      userInteractionRef.current = true;
      initializedRef.current = true;
      
      try {
        // Store this fact in localStorage to persist across page reloads
        localStorage.setItem('hadUserInteraction', 'true');
        
        // Simple speech synthesis initialization without competing audio elements
        try {
          // Just initialize speech synthesis with a minimal approach
          const utterance = new SpeechSynthesisUtterance('');
          utterance.volume = 0; // Completely silent
          utterance.rate = 1;
          
          utterance.onend = () => {
            console.log('Speech system initialized successfully');
            // Playback will be triggered by the auto-play hook when appropriate
          };
          
          utterance.onerror = (err) => {
            console.log('Speech initialization completed with error (this is normal):', err.error);
            // Don't show error toast for initialization - this is expected
            initializedRef.current = true;
          };
          
          // Clear any pending speech first
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            
            // Wait for cancellation before initializing
            setTimeout(() => {
              window.speechSynthesis.speak(utterance);
            }, 200);
          } else {
            window.speechSynthesis.speak(utterance);
          }
        } catch (err) {
          console.error('Speech initialization error:', err);
          initializedRef.current = true; // Mark as initialized anyway
        }
      } catch (e) {
        console.error('Error during audio unlocking:', e);
        initializedRef.current = true; // Mark as initialized anyway
      }
      
      // Remove event listeners after first successful initialization
      document.removeEventListener('click', enableAudioPlayback);
      document.removeEventListener('touchstart', enableAudioPlayback);
      document.removeEventListener('keydown', enableAudioPlayback);
    };
    
    // Check if we've had interaction before, but still attach listeners to
    // ensure audio is unlocked with a fresh user gesture
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('Previous interaction detected from localStorage');
    }
    
    // Add event listeners for various user interaction types
    document.addEventListener('click', enableAudioPlayback);
    document.addEventListener('touchstart', enableAudioPlayback);
    document.addEventListener('keydown', enableAudioPlayback);
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('click', enableAudioPlayback);
      document.removeEventListener('touchstart', enableAudioPlayback);
      document.removeEventListener('keydown', enableAudioPlayback);
    };
  }, [userInteractionRef, playCurrentWord, playbackCurrentWord]);
};
