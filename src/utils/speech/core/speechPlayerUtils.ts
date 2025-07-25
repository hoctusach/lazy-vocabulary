
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';

// Store the current text being spoken for sync checking
export function setCurrentTextBeingSpoken(processedText: string) {
  try {
    localStorage.setItem('currentTextBeingSpoken', processedText);
  } catch (error) {
    console.error('Error saving current text to localStorage:', error);
  }
}

export function isMutedFromLocalStorage(): boolean {
  try {
    const storedStates = localStorage.getItem(BUTTON_STATES_KEY);
    if (storedStates) {
      const parsedStates = JSON.parse(storedStates);
      return parsedStates.isMuted === true;
    }
  } catch (error) {
    console.error('Error reading mute state from localStorage:', error);
  }
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
