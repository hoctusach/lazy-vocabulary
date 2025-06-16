
import { useEffect, useRef, useCallback } from 'react';
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
  const debounceDelay = 500; // Prevent rapid interaction detection

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

    // Only initialize once
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      console.log('[USER-INTERACTION] ✓ First meaningful interaction - initializing audio systems');
      
      try {
        // Attempt comprehensive audio unlock
        const unlocked = await audioUnlockService.unlock();
        console.log('[USER-INTERACTION] Audio unlock result:', unlocked);
        
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
        
      } catch (error) {
        console.error('[USER-INTERACTION] Error during audio initialization:', error);
      }
    } else {
      // For subsequent interactions, just resume audio context
      try {
        await audioUnlockService.unlock();
      } catch (error) {
        console.warn('[USER-INTERACTION] Error resuming audio:', error);
      }
    }
  }, [onUserInteraction, currentWord, playCurrentWord]);

  useEffect(() => {
    // Check for previous interactions
    if (localStorage.getItem('hadUserInteraction') === 'true') {
      console.log('[USER-INTERACTION] Previous interaction detected from localStorage');
      hasInitialized.current = true;
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
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        handleUserInteraction('keydown');
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      handleUserInteraction('touchstart');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasInitialized.current) {
        console.log('[USER-INTERACTION] Page became visible - resuming audio');
        audioUnlockService.unlock().catch(console.warn);
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

  return {
    hasInitialized: hasInitialized.current,
    interactionCount: interactionCount.current,
    isAudioUnlocked: audioUnlockService.isAudioUnlocked()
  };
};
