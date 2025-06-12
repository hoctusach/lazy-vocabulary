
import { useEffect, useRef } from 'react';
import { unlockAudio } from '@/utils/speech/core/modules/speechUnlock';

interface UserInteractionProps {
  userInteractionRef: React.MutableRefObject<boolean>;
  playCurrentWord: () => void;
  playbackCurrentWord: any;
  onUserInteraction?: () => void;
}

export const useUserInteractionHandler = ({
  userInteractionRef,
  playCurrentWord,
  playbackCurrentWord,
  onUserInteraction
}: UserInteractionProps) => {
  // Track if we've already initialized to prevent duplicate initialization
  const initializedRef = useRef(false);

  // Global click handler to enable audio (only needed once)
  useEffect(() => {
    console.log('[USER-INTERACTION] Handler mounted');

    const enableAudioPlayback = async () => {
      // Prevent duplicate initialization
      if (initializedRef.current) {
        console.log('Audio already initialized, skipping');
        return;
      }

      console.log('User interaction detected, enabling audio playback system-wide');

      // Mark that we've had user interaction
      userInteractionRef.current = true;
      initializedRef.current = true;
      localStorage.setItem('hadUserInteraction', 'true');

      // Unlock browser audio using shared utility
      await unlockAudio();

      onUserInteraction?.();
      

      // Remove event listeners after first successful initialization
      document.removeEventListener('click', enableAudioPlayback);
      document.removeEventListener('touchstart', enableAudioPlayback);
      document.removeEventListener('keydown', enableAudioPlayback);
    };
    
    // Check if we've had interaction before, but still attach listeners to
    // ensure audio is unlocked with a fresh user gesture
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('[USER-INTERACTION] Previous interaction detected from localStorage');
      userInteractionRef.current = true;
      initializedRef.current = true;
      onUserInteraction?.();
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
  }, [userInteractionRef, onUserInteraction]);
};
