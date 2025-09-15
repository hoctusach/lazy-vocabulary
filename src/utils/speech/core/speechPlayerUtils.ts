
// Preferences handled server-side
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';

// Store the current text being spoken for sync checking
export function setCurrentTextBeingSpoken(processedText: string) {
  try {
    // no-op persistence removed
  } catch (error) {
    console.error('Error saving current text to localStorage:', error);
  }
}

export function isMutedFromLocalStorage(): boolean {
  // Prefer server-side preferences
  return false;
}

export function loadVoices(): SpeechSynthesisVoice[] {
  const voices = window.speechSynthesis.getVoices();
  logAvailableVoices(voices);
  return voices;
}

export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve, reject) => {
    const voices = loadVoices();
    if (voices.length > 0) return resolve(voices);

    const timeout = setTimeout(() => {
      reject(new Error('Could not load voices'));
    }, 5000);

    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      const loaded = loadVoices();
      window.speechSynthesis.onvoiceschanged = null;
      if (loaded.length > 0) {
        resolve(loaded);
      } else {
        reject(new Error('Could not load voices'));
      }
    };
  });
}
