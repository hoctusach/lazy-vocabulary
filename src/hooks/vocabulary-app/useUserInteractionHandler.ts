
import { useEffect } from 'react';
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
  // Global click handler to enable audio (only needed once)
  useEffect(() => {
    const enableAudioPlayback = () => {
      console.log('User interaction detected, enabling audio playback system-wide');
      // Mark that we've had user interaction
      userInteractionRef.current = true;
      
      try {
        // Store this fact in localStorage to persist across page reloads
        localStorage.setItem('hadUserInteraction', 'true');
        
        // Create and play a silent audio element to unlock audio on iOS
        const unlockAudio = document.createElement('audio');
        unlockAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        unlockAudio.loop = false;
        unlockAudio.autoplay = true;
        unlockAudio.muted = true;
        unlockAudio.volume = 0.01;
        document.body.appendChild(unlockAudio);
        
        // Try to play it
        const playPromise = unlockAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            // Audio playback started successfully
            setTimeout(() => {
              document.body.removeChild(unlockAudio);
            }, 1000);
          }).catch(err => {
            console.warn('Audio unlock failed:', err);
            document.body.removeChild(unlockAudio);
          });
        }
        
        // Also initialize speech synthesis
        try {
          const utterance = new SpeechSynthesisUtterance('');
          utterance.volume = 0.01;
          utterance.onend = () => {
            console.log('Speech system initialized successfully');
            // Try to play the current word if we have one
            if (playbackCurrentWord) {
              playCurrentWord();
            }
          };
          
          utterance.onerror = (err) => {
            console.error('Speech initialization error:', err);
            toast.error("Please allow audio playback for this site");
          };
          
          window.speechSynthesis.cancel(); // Clear any pending speech
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('Speech initialization error:', err);
        }
      } catch (e) {
        console.error('Error during audio unlocking:', e);
      }
      
      // Remove this event listener since we only need it once
      document.removeEventListener('click', enableAudioPlayback);
      document.removeEventListener('touchstart', enableAudioPlayback);
      document.removeEventListener('keydown', enableAudioPlayback);
    };
    
    // Add event listeners for various user interaction types
    document.addEventListener('click', enableAudioPlayback);
    document.addEventListener('touchstart', enableAudioPlayback);
    document.addEventListener('keydown', enableAudioPlayback);
    
    // Check if we've had interaction before
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('Previous interaction detected from localStorage');
      userInteractionRef.current = true;
      enableAudioPlayback();
    }
    
    // Clean up on unmount
    return () => {
      document.removeEventListener('click', enableAudioPlayback);
      document.removeEventListener('touchstart', enableAudioPlayback);
      document.removeEventListener('keydown', enableAudioPlayback);
    };
  }, [userInteractionRef, playCurrentWord, playbackCurrentWord]);
};
