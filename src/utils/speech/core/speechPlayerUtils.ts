
import { getVoiceByRegion } from '../voiceUtils';

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
    const storedStates = localStorage.getItem('buttonStates');
    if (storedStates) {
      const parsedStates = JSON.parse(storedStates);
      return parsedStates.isMuted === true;
    }
  } catch (error) {}
  return false;
}

export function loadVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis.getVoices();
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
