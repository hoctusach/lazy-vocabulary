
export interface TimerRefs {
  keepAliveInterval: number | null;
  maxDurationTimeout: number | null;
  syncCheckInterval: number | null;
}

export const clearTimers = (timers: TimerRefs): void => {
  if (timers.keepAliveInterval !== null) {
    clearInterval(timers.keepAliveInterval);
    timers.keepAliveInterval = null;
  }
  if (timers.maxDurationTimeout !== null) {
    clearTimeout(timers.maxDurationTimeout);
    timers.maxDurationTimeout = null;
  }
  if (timers.syncCheckInterval !== null) {
    clearInterval(timers.syncCheckInterval);
    timers.syncCheckInterval = null;
  }
};

export const setupSpeechTimers = (
  text: string,
  timers: TimerRefs,
  onMaxDuration: () => void,
  onSyncCheck: () => void,
  speechRate: number
): void => {
  // Set reasonable maximum duration based on text length and speech rate
  const estimatedDuration = text.length * (100 / speechRate); // rough estimate
  const maxDuration = Math.min(Math.max(estimatedDuration * 2.5, 60000), 300000);
  
  console.log(`Estimated speech duration: ${estimatedDuration}ms, Max duration: ${maxDuration}ms`);
  
  timers.maxDurationTimeout = window.setTimeout(onMaxDuration, maxDuration);
  timers.syncCheckInterval = window.setInterval(onSyncCheck, 100);
};

