
import { SpeechSynthesisVoice } from '@/types/vocabulary';

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }
};

export const waitForSpeechReadiness = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve(false);
      return;
    }
    setTimeout(() => resolve(true), 100);
  });
};

export const resetSpeechEngine = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const validateCurrentSpeech = (): boolean => {
  return window.speechSynthesis ? window.speechSynthesis.speaking : false;
};

export const ensureSpeechEngineReady = async (): Promise<void> => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

