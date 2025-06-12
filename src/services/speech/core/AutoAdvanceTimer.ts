
/**
 * Manages auto-advance timer functionality
 */
export class AutoAdvanceTimer {
  private autoAdvanceTimer: number | null = null;
  private onWordComplete: (() => void) | null = null;

  // Set word completion callback
  setWordCompleteCallback(callback: (() => void) | null): void {
    this.onWordComplete = callback;
  }

  // Clear any pending auto-advance
  clear(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
      console.log('[AUTO-ADVANCE] Timer cleared');
    }
  }

  // Schedule auto-advance with proper debouncing
  schedule(delay: number = 1500, isPaused: boolean = false, isMuted: boolean = false): void {
    // ALWAYS clear existing timer first to prevent multiple timers
    this.clear();
    
    if (isPaused || isMuted) {
      console.log('[AUTO-ADVANCE] Skipping - paused or muted');
      return;
    }

    console.log(`[AUTO-ADVANCE] Scheduling in ${delay}ms`);
    this.autoAdvanceTimer = window.setTimeout(() => {
      this.autoAdvanceTimer = null;
      if (this.onWordComplete && !isPaused && !isMuted) {
        console.log('[AUTO-ADVANCE] Auto-advancing to next word');
        this.onWordComplete();
      }
    }, delay);
  }

  // Destroy timer
  destroy(): void {
    this.clear();
    this.onWordComplete = null;
  }
}
