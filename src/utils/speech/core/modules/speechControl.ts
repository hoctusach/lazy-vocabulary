
import { canPerformOperation } from './speechThrottling';

export const stopSpeaking = (): void => {
  if (!canPerformOperation()) {
    console.log('[ENGINE] Operation throttled to prevent speech loops');
    return;
  }
  
  console.log('[ENGINE] Stopping speech - current state:', {
    speaking: window.speechSynthesis?.speaking,
    paused: window.speechSynthesis?.paused,
    pending: window.speechSynthesis?.pending
  });
  
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    console.log('[ENGINE] Speech stopped');
  }
};

export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }
};

