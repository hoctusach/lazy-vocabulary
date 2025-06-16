
import { useEffect, useRef, useCallback, useState } from 'react';
import { audioUnlockService } from '@/services/audio/AudioUnlockService';

interface EnhancedUserInteractionProps {
  onUserInteraction?: () => void;
  currentWord?: any;
  playCurrentWord?: () => void;
}

/**
 * Enhanced user interaction handler with proper debouncing and audio unlock
 */
export const useEnhancedUserInteraction = ({ 
  onUserInteraction, 
  currentWord, 
  playCurrentWord 
}: EnhancedUserInteractionProps) => {
  const hasInitialized = useRef(false);
  const lastInteractionTime = useRef(0);
  const interactionCount = useRef(0);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const debounceDelay = 300; // Reduced debounce delay

  const handleUserInteraction = useCallback(async (interactionType: string) => {
    const now = Date.now();
    interactionCount.current++;
    
    // Debounce rapid interactions
    if (now - lastInteractionTime.current < debounceDelay) {
      console.log(`[USER-INTERACTION] Debounced ${interactionType} interaction #${interactionCount.current}`);
      return;
    }
    
    lastInteractionTime.current = now;
    console.log(`[USER-INTERACTION] Processing ${interactionType} interaction #${interactionCount.current}`);

    // Mark user gesture for audio unlock service
    audioUnlockService.markUserGesture();

    try {
      // Always attempt to unlock audio on user interaction
      const unlocked = await audioUnlockService.unlock();
      console.log('[USER-INTERACTION] Audio unlock result:', unlocked);
      setIsAudioUnlocked(unlocked);
      
      // Only initialize once
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        console.log('[USER-INTERACTION] ✓ First meaningful interaction - audio systems initialized');
        
        // Store interaction state
        localStorage.setItem('hadUserInteraction', 'true');
        
        // Notify parent component
        onUserInteraction?.();
        
        // Auto-play current word if available and conditions are met
        if (currentWord && playCurrentWord && unlocked) {
          console.log('[USER-INTERACTION] Auto-playing current word after unlock');
          setTimeout(() => {
            playCurrentWord();
          }, 500);
        }
      } else if (unlocked && currentWord && playCurrentWord) {
        // For subsequent interactions, try to play if audio is working
        console.log('[USER-INTERACTION] Subsequent interaction - attempting word playback');
        setTimeout(() => {
          playCurrentWord();
        }, 200);
      }
      
    } catch (error) {
      console.error('[USER-INTERACTION] Error during audio initialization:', error);
      setIsAudioUnlocked(false);
    }
  }, [onUserInteraction, currentWord, playCurrentWord]);

  useEffect(() => {
    // Check for previous interactions and current audio state
    const hadPreviousInteraction = localStorage.getItem('hadUserInteraction') === 'true';
    const audioAlreadyUnlocked = audioUnlockService.isAudioUnlocked();
    
    if (hadPreviousInteraction || audioAlreadyUnlocked) {
      console.log('[USER-INTERACTION] Previous interaction or audio already unlocked');
      hasInitialized.current = true;
      setIsAudioUnlocked(audioAlreadyUnlocked);
      audioUnlockService.markUserGesture();
      onUserInteraction?.();
      return;
    }

    // Event handlers with debouncing
    const handleClick = (e: MouseEvent) => {
      handleUserInteraction('click');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle meaningful key presses
      if ([' ', 'Enter', 'ArrowRight', 'ArrowLeft', 'Escape'].includes(e.key)) {
        handleUserInteraction('keydown');
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      handleUserInteraction('touchstart');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasInitialized.current) {
        console.log('[USER-INTERACTION] Page became visible - attempting audio resume');
        audioUnlockService.unlock().then(unlocked => {
          setIsAudioUnlocked(unlocked);
        }).catch(console.warn);
      }
    };

    // Add event listeners
    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('keydown', handleKeyDown, { passive: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleUserInteraction]);

  // Update audio unlock status periodically
  useEffect(() => {
    const checkAudioStatus = () => {
      const currentStatus = audioUnlockService.isAudioUnlocked();
      if (currentStatus !== isAudioUnlocked) {
        setIsAudioUnlocked(currentStatus);
      }
    };

    const interval = setInterval(checkAudioStatus, 1000);
    return () => clearInterval(interval);
  }, [isAudioUnlocked]);

  return {
    hasInitialized: hasInitialized.current,
    interactionCount: interactionCount.current,
    isAudioUnlocked
  };
};
