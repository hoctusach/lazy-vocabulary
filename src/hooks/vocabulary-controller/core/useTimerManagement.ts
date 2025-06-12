
import { useRef, useCallback } from 'react';

/**
 * Timer management for auto-advance functionality
 */
export const useTimerManagement = (isPaused: boolean, isMuted: boolean) => {
  const autoAdvanceTimerRef = useRef<number | null>(null);

  // Clear any existing auto-advance timer
  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
      console.log('[TIMER-MANAGER] Auto-advance timer cleared');
    }
  }, []);

  // Schedule auto-advance with proper cleanup
  const scheduleAutoAdvance = useCallback((delay: number = 1500, onAdvance?: () => void) => {
    // Always clear existing timer first
    clearAutoAdvanceTimer();
    
    if (isPaused || isMuted) {
      console.log('[TIMER-MANAGER] Skipping auto-advance - paused or muted');
      return;
    }

    console.log(`[TIMER-MANAGER] Scheduling auto-advance in ${delay}ms`);
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      if (!isPaused && !isMuted && onAdvance) {
        console.log('[TIMER-MANAGER] Auto-advance triggered');
        onAdvance();
      }
    }, delay);
  }, [isPaused, isMuted, clearAutoAdvanceTimer]);

  return {
    autoAdvanceTimerRef,
    clearAutoAdvanceTimer,
    scheduleAutoAdvance
  };
};
