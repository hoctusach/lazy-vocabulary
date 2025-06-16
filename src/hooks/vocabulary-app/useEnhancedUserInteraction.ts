
import { useState, useEffect, useRef, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { audioUnlockService } from '@/services/audio/AudioUnlockService';

interface UseEnhancedUserInteractionProps {
  onUserInteraction?: () => void;
  currentWord?: VocabularyWord | null;
  playCurrentWord?: () => void;
}

/**
 * Enhanced user interaction hook with improved audio unlock detection
 */
export const useEnhancedUserInteraction = ({
  onUserInteraction,
  currentWord,
  playCurrentWord
}: UseEnhancedUserInteractionProps) => {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const unlockAttemptRef = useRef(false);

  // Check audio unlock status
  const checkAudioStatus = useCallback(async () => {
    const unlocked = audioUnlockService.isUnlocked();
    const hasGesture = audioUnlockService.hasValidUserGesture();
    
    console.log('[USER-INTERACTION] Audio status check:', {
      unlocked,
      hasGesture,
      hasInitialized
    });
    
    setIsAudioUnlocked(unlocked);
    return unlocked;
  }, [hasInitialized]);

  // Handle user interaction with immediate audio unlock attempt
  const handleUserInteraction = useCallback(async () => {
    console.log('[USER-INTERACTION] ✓ User interaction detected');
    
    const newCount = interactionCount + 1;
    setInteractionCount(newCount);
    setHasInitialized(true);
    
    // Trigger callback
    onUserInteraction?.();
    
    // Attempt to unlock audio immediately
    if (!unlockAttemptRef.current) {
      unlockAttemptRef.current = true;
      
      console.log('[USER-INTERACTION] Attempting audio unlock...');
      try {
        const unlocked = await audioUnlockService.unlock();
        console.log(`[USER-INTERACTION] Audio unlock result: ${unlocked}`);
        setIsAudioUnlocked(unlocked);
        
        // If we have a word and audio is unlocked, try to play it
        if (unlocked && currentWord && playCurrentWord) {
          console.log('[USER-INTERACTION] ✓ Triggering speech after unlock');
          setTimeout(() => {
            playCurrentWord();
          }, 200);
        }
      } catch (error) {
        console.error('[USER-INTERACTION] ✗ Audio unlock error:', error);
      } finally {
        unlockAttemptRef.current = false;
      }
    }
  }, [interactionCount, onUserInteraction, currentWord, playCurrentWord]);

  // Set up interaction listeners
  useEffect(() => {
    // Check if we already had interaction
    const hadPreviousInteraction = audioUnlockService.hasValidUserGesture();
    if (hadPreviousInteraction) {
      console.log('[USER-INTERACTION] Previous interaction or audio already unlocked');
      setHasInitialized(true);
      onUserInteraction?.();
      checkAudioStatus();
    }

    // Add event listeners for various interaction types
    const events = ['click', 'touchstart', 'keydown', 'pointerdown', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [handleUserInteraction, onUserInteraction, checkAudioStatus]);

  // Periodic audio status check
  useEffect(() => {
    const interval = setInterval(() => {
      checkAudioStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [checkAudioStatus]);

  // Initial audio status check
  useEffect(() => {
    checkAudioStatus();
  }, [checkAudioStatus]);

  return {
    hasInitialized,
    interactionCount,
    isAudioUnlocked,
    forceAudioUnlock: handleUserInteraction
  };
};
