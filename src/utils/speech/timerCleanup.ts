
/**
 * Timer cleanup utility to prevent multiple auto-advance timers
 * Part of the unified speech system cleanup
 */
class TimerCleanup {
  private static timers: Set<number> = new Set();
  
  static registerTimer(timerId: number): void {
    this.timers.add(timerId);
  }
  
  static clearTimer(timerId: number): void {
    if (this.timers.has(timerId)) {
      clearTimeout(timerId);
      this.timers.delete(timerId);
    }
  }
  
  static clearAllTimers(): void {
    console.log(`[TIMER-CLEANUP] Clearing ${this.timers.size} timers`);
    this.timers.forEach(timerId => clearTimeout(timerId));
    this.timers.clear();
  }
  
  static getActiveTimerCount(): number {
    return this.timers.size;
  }
}

export { TimerCleanup };
