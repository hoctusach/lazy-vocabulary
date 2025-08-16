
import { SpeechPhase } from './SpeechState';

/**
 * Enhanced Auto Advance Timer with improved scheduling logic
 */
export class AutoAdvanceTimer {
  private timer: number | null = null;
  private wordCompleteCallback: (() => void) | null = null;
  private lastClearTime = 0;
  private lastScheduleTime = 0;
  private readonly MIN_SCHEDULE_INTERVAL = 200; // Reduced from 500ms
  private isScheduling = false;

  setWordCompleteCallback(callback: (() => void) | null): void {
    this.wordCompleteCallback = callback;
  }

  schedule(delay: number, isPaused: boolean, _isMuted: boolean): void {
    const now = Date.now();
    
    // Prevent rapid rescheduling
    if (this.isScheduling) {
      console.log('[AUTO-ADVANCE] Already scheduling, skipping');
      return;
    }

    // Reduced minimum interval check
    if (now - this.lastClearTime < this.MIN_SCHEDULE_INTERVAL) {
      console.log('[AUTO-ADVANCE] Scheduling too soon after clear, allowing with delay');
      // Allow scheduling but with a small additional delay
      setTimeout(() => this.schedule(delay, isPaused, _isMuted), 100);
      return;
    }

    if (now - this.lastScheduleTime < 100) { // Very short interval to prevent rapid calls
      console.log('[AUTO-ADVANCE] Rapid schedule calls, debouncing');
      return;
    }

    this.lastScheduleTime = now;

    if (isPaused) {
      console.log('[AUTO-ADVANCE] Not scheduling - paused');
      return;
    }

    if (!this.wordCompleteCallback) {
      console.log('[AUTO-ADVANCE] Not scheduling - no callback');
      return;
    }

    this.isScheduling = true;

    // Clear any existing timer
    this.clear();

    console.log(`[AUTO-ADVANCE] Scheduling in ${delay}ms`);
    
    this.timer = window.setTimeout(() => {
      console.log('[AUTO-ADVANCE] Auto-advancing to next word');

      if (this.wordCompleteCallback && !isPaused) {
        try {
          this.wordCompleteCallback();
        } catch (error) {
          console.error('[AUTO-ADVANCE] Error in word complete callback:', error);
        }
      }
      
      this.timer = null;
      this.isScheduling = false;
    }, delay);
  }

  clear(): void {
    if (this.timer !== null) {
      console.log('[AUTO-ADVANCE] Clearing timer');
      window.clearTimeout(this.timer);
      this.timer = null;
      this.lastClearTime = Date.now();
    }
    this.isScheduling = false;
  }

  isActive(): boolean {
    return this.timer !== null;
  }

  destroy(): void {
    this.clear();
    this.wordCompleteCallback = null;
  }
}
