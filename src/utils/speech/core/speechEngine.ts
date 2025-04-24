import { SpeechSynthesisVoice } from '@/types/speech';

export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Stopping all speech');
    window.speechSynthesis.cancel();
    console.log('[ENGINE] All speech stopped');
  }
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
    // Uncomment for more verbose logging if needed
    // console.log('[ENGINE] Keeping speech alive (pause/resume)');
  }
};

export const waitForSpeechReadiness = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.error('[ENGINE] Speech synthesis not supported!');
      resolve(false);
      return;
    }
    console.log('[ENGINE] Waiting for speech readiness');
    setTimeout(() => {
      console.log('[ENGINE] Speech engine ready');
      resolve(true);
    }, 100);
  });
};

export const resetSpeechEngine = (): void => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Resetting speech engine');
    window.speechSynthesis.cancel();
  }
};

export const validateCurrentSpeech = (): boolean => {
  const isSpeaking = window.speechSynthesis ? window.speechSynthesis.speaking : false;
  console.log(`[ENGINE] Speech active: ${isSpeaking}`);
  return isSpeaking;
};

export const ensureSpeechEngineReady = async (): Promise<void> => {
  if (window.speechSynthesis) {
    console.log('[ENGINE] Preparing speech engine');
    window.speechSynthesis.cancel();
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('[ENGINE] Speech engine prepared');
  }
};

export const isSpeechSynthesisSupported = (): boolean => {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  console.log(`[ENGINE] Speech synthesis supported: ${isSupported}`);
  return isSupported;
};
