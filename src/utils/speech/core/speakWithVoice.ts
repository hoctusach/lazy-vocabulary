
import { getSpeechRate, getSpeechPitch, getSpeechVolume } from './speechSettings';
import { getVoiceByRegion } from '../voiceUtils';
import { stopSpeaking, keepSpeechAlive, resetSpeechEngine } from './speechEngine';
import { forceResyncIfNeeded } from './speechText';
import { calculateSpeechDuration } from '../durationUtils';

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

  let keepAliveInterval: number | null = null;
  let maxDurationTimeout: number | null = null;
  let syncCheckInterval: number | null = null;

  const clearAllTimers = () => {
    if (keepAliveInterval !== null) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (maxDurationTimeout !== null) {
      clearTimeout(maxDurationTimeout);
      maxDurationTimeout = null;
    }
    if (syncCheckInterval !== null) {
      clearInterval(syncCheckInterval);
      syncCheckInterval = null;
    }
  };

  utterance.onend = () => {
    clearAllTimers();
    onComplete();
  };

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    clearAllTimers();
    resetSpeechEngine();
    if (event.error === 'canceled' || event.error === 'interrupted') {
      onComplete();
    } else {
      onError(new Error(`Speech error: ${event.error}`));
    }
  };

  keepAliveInterval = window.setInterval(() => {
    if (window.speechSynthesis.speaking) {
      keepSpeechAlive();
    } else if (keepAliveInterval !== null) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  }, 10);

  syncCheckInterval = window.setInterval(() => {
    try {
      const currentWord = localStorage.getItem('currentDisplayedWord');
      if (currentWord) {
        forceResyncIfNeeded(currentWord, processedText, () => {
          clearAllTimers();
          onComplete();
        });
      }
    } catch (error) {
      // Just log and continue
      console.error('Error in sync check:', error);
    }
  }, 100);

  // Attempt speech
  const attemptSpeech = async (attempts = 0): Promise<void> => {
    if (attempts >= 5) {
      clearAllTimers();
      onError(new Error('Failed to start speech'));
      return;
    }
    try {
      if (attempts > 0) {
        window.speechSynthesis.cancel();
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      window.speechSynthesis.speak(utterance);
      await new Promise<void>((resolveStart, rejectStart) => {
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            resolveStart();
          } else {
            rejectStart(new Error('Speech not started'));
          }
        }, 900);
      });
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 800));
      await attemptSpeech(attempts + 1);
    }
  };

  await attemptSpeech();

  const estimatedDuration = calculateSpeechDuration(text, getSpeechRate());
  const maxDuration = Math.min(Math.max(estimatedDuration * 2.5, 60000), 300000);

  maxDurationTimeout = window.setTimeout(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      clearAllTimers();
      onComplete();
    }
  }, maxDuration);
}
