
export interface SpeechTimersRefs {
  keepAliveInterval: number | null;
  maxDurationTimeout: number | null;
  syncCheckInterval: number | null;
}

export const clearAllSpeechTimers = (timers: SpeechTimersRefs): void => {
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

export const createSpeechTimers = (): SpeechTimersRefs => {
  return {
    keepAliveInterval: null,
    maxDurationTimeout: null,
    syncCheckInterval: null
  };
};
