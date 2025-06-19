import { forceResyncIfNeeded } from './speechText';
import { keepSpeechAlive } from './speechEngine';

export interface SpeechMonitorOptions {
  processedText: string;
  onComplete: () => void;
  estimatedDuration: number;
}

export interface SpeechMonitorRefs {
  keepAliveInterval: number | null;
  syncCheckInterval: number | null;
  maxDurationTimeout: number | null;
}

/**
 * Creates and returns various timers to keep speech alive and monitor sync
 */
export function createSpeechMonitor(
  options: SpeechMonitorOptions
): SpeechMonitorRefs {
  const { processedText, onComplete, estimatedDuration } = options;
  const refs: SpeechMonitorRefs = {
    keepAliveInterval: null,
    syncCheckInterval: null,
    maxDurationTimeout: null
  };
  
  // Keep speech alive to prevent Chrome from cutting it off
  refs.keepAliveInterval = window.setInterval(() => {
    if (window.speechSynthesis.speaking) {
      console.log('[MONITOR] Keeping speech alive');
      keepSpeechAlive();
    } else if (refs.keepAliveInterval !== null) {
      console.log('[MONITOR] Speech not active, clearing keep-alive');
      clearInterval(refs.keepAliveInterval);
      refs.keepAliveInterval = null;
    }
  }, 5000);
  
  // Reduced frequency of sync checks to improve performance
  refs.syncCheckInterval = window.setInterval(() => {
    try {
      const currentWord = localStorage.getItem('currentDisplayedWord');
      if (currentWord) {
        forceResyncIfNeeded(currentWord, processedText, () => {
          console.log('[MONITOR] Forced resync triggered');
          clearSpeechMonitor(refs);
          onComplete();
        });
      }
    } catch (error) {
      console.error('[MONITOR] Error in sync check:', error);
    }
  }, 1000);
  
  // Set a timeout for the entire speech operation
  const maxDuration = Math.min(Math.max(estimatedDuration * 2.5, 60000), 300000);
  
  refs.maxDurationTimeout = window.setTimeout(() => {
    if (window.speechSynthesis.speaking) {
      console.log('[MONITOR] Max speech duration reached, stopping');
      window.speechSynthesis.cancel();
      clearSpeechMonitor(refs);
      onComplete();
    }
  }, maxDuration);
  
  return refs;
}

/**
 * Clears all speech monitoring timers
 */
export function clearSpeechMonitor(refs: SpeechMonitorRefs): void {
  if (refs.keepAliveInterval !== null) {
    clearInterval(refs.keepAliveInterval);
    refs.keepAliveInterval = null;
  }
  
  if (refs.syncCheckInterval !== null) {
    clearInterval(refs.syncCheckInterval);
    refs.syncCheckInterval = null;
  }
  
  if (refs.maxDurationTimeout !== null) {
    clearTimeout(refs.maxDurationTimeout);
    refs.maxDurationTimeout = null;
  }
}
