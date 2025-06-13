
import { useRef, useCallback } from 'react';

/**
 * Enhanced timer management with debouncing and improved mobile support
 */
export const useTimerManagement = (isPaused: boolean, isMuted: boolean) => {
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const lastScheduleTimeRef = useRef(0);
  const isSchedulingRef = useRef(false);
  const MIN_SCHEDULE_INTERVAL = 100; // Prevent rapid scheduling

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current !== null) {
      console.log('[TIMER-MANAGER] Clearing auto-advance timer');
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    isSchedulingRef.current = false;
  }, []);

  const scheduleAutoAdvance = useCallback((delay: number, onAdvance?: () => void) => {
    const now = Date.now();
    
    // Debounce rapid scheduling calls
    if (now - lastScheduleTimeRef.current < MIN_SCHEDULE_INTERVAL) {
      console.log('[TIMER-MANAGER] Schedule call debounced');
      return;
    }

    // Prevent overlapping schedules
    if (isSchedulingRef.current) {
      console.log('[TIMER-MANAGER] Schedule already in progress');
      return;
    }

    lastScheduleTimeRef.current = now;
    isSchedulingRef.current = true;

    // Clear any existing timer first
    clearAutoAdvanceTimer();

    // Don't schedule if paused or muted
    if (isPaused || isMuted) {
      console.log('[TIMER-MANAGER] Not scheduling due to paused/muted state');
      isSchedulingRef.current = false;
      return;
    }

    console.log(`[TIMER-MANAGER] Scheduling auto-advance in ${delay}ms`);
    
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      console.log('[TIMER-MANAGER] Auto-advance triggered');
      
      // Double-check state before advancing
      if (!isPaused && !isMuted) {
        onAdvance?.();
      } else {
        console.log('[TIMER-MANAGER] Auto-advance skipped due to state change');
      }
      
      // Clean up
      autoAdvanceTimerRef.current = null;
      isSchedulingRef.current = false;
    }, delay);
  }, [isPaused, isMuted, clearAutoAdvanceTimer]);

  return {
    clearAutoAdvanceTimer,
    scheduleAutoAdvance
  };
};
