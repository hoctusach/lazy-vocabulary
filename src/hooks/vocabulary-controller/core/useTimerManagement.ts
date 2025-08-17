
import { useCallback, useRef } from 'react';

/**
 * Enhanced timer management with improved debouncing and coordination
 */
export const useTimerManagement = (isPaused: boolean, isMuted: boolean) => {
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const lastClearTime = useRef(0);
  const isScheduling = useRef(false);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      console.log('[TIMER-MANAGER] Clearing auto-advance timer');
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
      lastClearTime.current = Date.now();
    }
    isScheduling.current = false;
  }, []);

  const scheduleAutoAdvance = useCallback((delay: number, callback: () => void) => {
    const now = Date.now();
    
    // Prevent scheduling if already in progress
    if (isScheduling.current) {
      console.log('[TIMER-MANAGER] Already scheduling, skipping');
      return;
    }

    // Enhanced minimum interval check - allow scheduling but with extra delay if too soon
    if (now - lastClearTime.current < 100) {
      console.log('[TIMER-MANAGER] Scheduling too soon after clear, adding delay');
      setTimeout(() => scheduleAutoAdvance(delay, callback), 200);
      return;
    }

    if (isPaused) {
      console.log('[TIMER-MANAGER] Not scheduling - paused');
      return;
    }

    isScheduling.current = true;
    clearAutoAdvanceTimer();

    console.log(`[TIMER-MANAGER] Scheduling auto-advance in ${delay}ms`);
    
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      console.log('[TIMER-MANAGER] Executing auto-advance');
      autoAdvanceTimerRef.current = null;
      isScheduling.current = false;
      
      // Double-check conditions before executing
      if (!isPaused) {
        try {
          callback();
        } catch (error) {
          console.error('[TIMER-MANAGER] Error in auto-advance callback:', error);
        }
      } else {
        console.log('[TIMER-MANAGER] Skipping auto-advance - conditions changed');
      }
    }, delay);
  }, [isPaused, clearAutoAdvanceTimer]);

  return {
    clearAutoAdvanceTimer,
    scheduleAutoAdvance
  };
};
