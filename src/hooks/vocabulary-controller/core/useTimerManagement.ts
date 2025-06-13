
import { useRef, useCallback } from 'react';

/**
 * Enhanced timer management with aggressive debouncing to prevent 1-second delays
 */
export const useTimerManagement = (isPaused: boolean, isMuted: boolean) => {
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const lastScheduleTimeRef = useRef(0);
  const isSchedulingRef = useRef(false);
  const MIN_SCHEDULE_INTERVAL = 250; // Increased to prevent rapid scheduling
  const lastClearTimeRef = useRef(0);

  const clearAutoAdvanceTimer = useCallback(() => {
    const now = Date.now();
    
    // Prevent rapid clear/schedule cycles
    if (now - lastClearTimeRef.current < 100) {
      console.log('[TIMER-MANAGER] Clear call debounced to prevent cycles');
      return;
    }
    lastClearTimeRef.current = now;

    if (autoAdvanceTimerRef.current !== null) {
      console.log('[TIMER-MANAGER] Clearing auto-advance timer');
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    isSchedulingRef.current = false;
  }, []);

  const scheduleAutoAdvance = useCallback((delay: number, onAdvance?: () => void) => {
    const now = Date.now();
    
    // More aggressive debouncing to prevent rapid scheduling
    if (now - lastScheduleTimeRef.current < MIN_SCHEDULE_INTERVAL) {
      console.log('[TIMER-MANAGER] Schedule call debounced - preventing rapid scheduling');
      return;
    }

    // Prevent overlapping schedules more strictly
    if (isSchedulingRef.current) {
      console.log('[TIMER-MANAGER] Schedule already in progress - rejecting new request');
      return;
    }

    lastScheduleTimeRef.current = now;

    // Clear any existing timer first
    clearAutoAdvanceTimer();

    // Don't schedule if paused or muted
    if (isPaused || isMuted) {
      console.log('[TIMER-MANAGER] Not scheduling due to paused/muted state');
      return;
    }

    // Prevent scheduling if too soon after last clear
    if (now - lastClearTimeRef.current < 100) {
      console.log('[TIMER-MANAGER] Not scheduling - too soon after clear');
      return;
    }

    isSchedulingRef.current = true;

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
