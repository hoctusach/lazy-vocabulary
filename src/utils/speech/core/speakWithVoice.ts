
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
  // Double-check that previous speech is stopped
  stopSpeaking();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  const voice = getVoiceByRegion(region);
  
  if (voice) {
    utterance.voice = voice;
    utterance.lang = langCode;
  } else {
    utterance.lang = langCode;
  }

  utterance.rate = getSpeechRate();
  utterance.pitch = getSpeechPitch();
  utterance.volume = getSpeechVolume();

  const timers: SpeechTimersRefs = createSpeechTimers();

  utterance.onend = () => {
    console.log('Speech completed successfully');
    clearAllSpeechTimers(timers);
    onComplete();
  };

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    console.error('Speech error:', event.error);
    clearAllSpeechTimers(timers);
    resetSpeechEngine();
    if (event.error === 'canceled' || event.error === 'interrupted') {
      onComplete();
    } else {
      onError(new Error(`Speech error: ${event.error}`));
    }
  };

  timers.keepAliveInterval = window.setInterval(() => {
    if (window.speechSynthesis.speaking) {
      keepSpeechAlive();
    } else if (timers.keepAliveInterval !== null) {
      clearInterval(timers.keepAliveInterval);
      timers.keepAliveInterval = null;
    }
  }, 5000); // Increased interval to reduce potential interference

  timers.syncCheckInterval = window.setInterval(() => {
    try {
      const currentWord = localStorage.getItem('currentDisplayedWord');
      if (currentWord) {
        forceResyncIfNeeded(currentWord, processedText, () => {
          clearAllSpeechTimers(timers);
          onComplete();
        });
      }
    } catch (error) {
      // Just log and continue
      console.error('Error in sync check:', error);
    }
  }, 500); // Increased to reduce unnecessary checks

  // Attempt speech
  const attemptSpeech = async (attempts = 0): Promise<void> => {
    if (attempts >= 3) { // Reduced max attempts
      clearAllSpeechTimers(timers);
      onError(new Error('Failed to start speech'));
      return;
    }
    try {
      if (attempts > 0) {
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      console.log('Starting speech synthesis...');
      window.speechSynthesis.speak(utterance);
      await new Promise<void>((resolveStart, rejectStart) => {
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('Speech started successfully');
            resolveStart();
          } else {
            console.warn('Speech failed to start, will retry');
            rejectStart(new Error('Speech not started'));
          }
        }, 900);
      });
    } catch (error) {
      console.error('Speech attempt error:', error);
      await new Promise(resolve => setTimeout(resolve, 800));
      await attemptSpeech(attempts + 1);
    }
  };

  await attemptSpeech();

  const estimatedDuration = calculateSpeechDuration(text, getSpeechRate());
  const maxDuration = Math.min(Math.max(estimatedDuration * 2.5, 60000), 300000);

  timers.maxDurationTimeout = window.setTimeout(() => {
    if (window.speechSynthesis.speaking) {
      console.log('Max speech duration reached, stopping');
      window.speechSynthesis.cancel();
      clearAllSpeechTimers(timers);
      onComplete();
    }
  }, maxDuration);
}
