import { getSpeechRate, getSpeechPitch, getSpeechVolume } from './speechSettings';
import { getVoiceByRegion } from '../voiceUtils';
import { stopSpeaking, keepSpeechAlive, resetSpeechEngine } from './speechEngine';
import { forceResyncIfNeeded } from './speechText';
import { calculateSpeechDuration } from '../durationUtils';
import { createSpeechTimers, clearAllSpeechTimers, SpeechTimersRefs } from './speechTimers';

interface SpeakWithVoiceParams {
  utterance: SpeechSynthesisUtterance;
  region: 'US' | 'UK';
  text: string;
  processedText: string;
  onComplete: () => void;
  onError: (e: Error) => void;
}

export async function speakWithVoice({
  utterance,
  region,
  text,
  processedText,
  onComplete,
  onError
}: SpeakWithVoiceParams) {
  console.log('[VOICE] Starting speakWithVoice for:', text.substring(0, 30));
  
  // First, ensure previous speech is completely stopped
  stopSpeaking();
  console.log('[VOICE] Previous speech stopped');
  
  // Give the DOM time to update and speech engine to reset, but keep it short
  const domUpdateDelay = 100; // Reduced from 200ms to 100ms
  console.log(`[VOICE] Waiting ${domUpdateDelay}ms for DOM updates`);
  await new Promise(resolve => setTimeout(resolve, domUpdateDelay));
  
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  const voice = getVoiceByRegion(region);
  
  if (voice) {
    utterance.voice = voice;
    utterance.lang = langCode;
    console.log(`[VOICE] Set voice to: ${voice.name}`);
  } else {
    utterance.lang = langCode;
    console.log(`[VOICE] No voice found, using system default with lang: ${langCode}`);
  }

  utterance.rate = getSpeechRate();
  utterance.pitch = getSpeechPitch();
  utterance.volume = getSpeechVolume();
  console.log(`[VOICE] Speech params - rate: ${utterance.rate}, pitch: ${utterance.pitch}, volume: ${utterance.volume}`);

  const timers: SpeechTimersRefs = createSpeechTimers();

  utterance.onstart = () => {
    console.log('[VOICE] Speech started event fired');
  };

  utterance.onend = () => {
    console.log('[VOICE] Speech completed successfully');
    clearAllSpeechTimers(timers);
    onComplete();
  };

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    console.error('[VOICE] Speech error:', event.error);
    clearAllSpeechTimers(timers);
    resetSpeechEngine();
    if (event.error === 'canceled' || event.error === 'interrupted') {
      console.log('[VOICE] Speech was canceled or interrupted, treating as complete');
      onComplete();
    } else {
      onError(new Error(`Speech error: ${event.error}`));
    }
  };

  // Keep speech alive to prevent Chrome from cutting it off
  timers.keepAliveInterval = window.setInterval(() => {
    if (window.speechSynthesis.speaking) {
      console.log('[VOICE] Keeping speech alive');
      keepSpeechAlive();
    } else if (timers.keepAliveInterval !== null) {
      console.log('[VOICE] Speech not active, clearing keep-alive');
      clearInterval(timers.keepAliveInterval);
      timers.keepAliveInterval = null;
    }
  }, 5000);

  // Reduced frequency of sync checks to improve performance
  timers.syncCheckInterval = window.setInterval(() => {
    try {
      const currentWord = localStorage.getItem('currentDisplayedWord');
      if (currentWord) {
        forceResyncIfNeeded(currentWord, processedText, () => {
          console.log('[VOICE] Forced resync triggered');
          clearAllSpeechTimers(timers);
          onComplete();
        });
      }
    } catch (error) {
      console.error('[VOICE] Error in sync check:', error);
    }
  }, 1000); // Increased from 800ms to 1000ms to reduce overhead

  // Attempt speech with better synchronization
  const attemptSpeech = async (attempts = 0): Promise<void> => {
    if (attempts >= 2) {
      console.error('[VOICE] Failed to start speech after multiple attempts');
      clearAllSpeechTimers(timers);
      onError(new Error('Failed to start speech'));
      return;
    }
    
    try {
      if (attempts > 0) {
        console.log('[VOICE] Retrying speech, attempt #' + (attempts + 1));
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 300)); // Reduced from 500ms
      }
      
      // CRITICAL FIX: Reduced delay before speaking to improve responsiveness
      const speakDelay = 100; // Reduced from 250ms to 100ms
      console.log(`[VOICE] Will attempt speech in ${speakDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, speakDelay));
      
      console.log('[VOICE] ⚡ SPEAK NOW ⚡ About to call speechSynthesis.speak()');
      window.speechSynthesis.speak(utterance);
      console.log('[VOICE] ✅ speechSynthesis.speak() was called');
      
      // Verify speech started after a shorter delay
      await new Promise<void>((resolveStart, rejectStart) => {
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('[VOICE] ✅ Speech confirmed to be active');
            resolveStart();
          } else {
            console.warn('[VOICE] ❌ Speech failed to start, will retry');
            rejectStart(new Error('Speech not started'));
          }
        }, 500); // Reduced from 800ms to 500ms
      });
    } catch (error) {
      console.error('[VOICE] Speech attempt error:', error);
      await new Promise(resolve => setTimeout(resolve, 400)); // Reduced from 800ms
      await attemptSpeech(attempts + 1);
    }
  };

  await attemptSpeech();

  const estimatedDuration = calculateSpeechDuration(text, getSpeechRate());
  const maxDuration = Math.min(Math.max(estimatedDuration * 2.5, 60000), 300000);
  console.log(`[VOICE] Estimated speech duration: ${estimatedDuration}ms, max: ${maxDuration}ms`);

  timers.maxDurationTimeout = window.setTimeout(() => {
    if (window.speechSynthesis.speaking) {
      console.log('[VOICE] Max speech duration reached, stopping');
      window.speechSynthesis.cancel();
      clearAllSpeechTimers(timers);
      onComplete();
    }
  }, maxDuration);
}
