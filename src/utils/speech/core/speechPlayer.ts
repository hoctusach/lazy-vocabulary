
// Refactored: now this file just orchestrates the helpers
import { prepareTextForSpeech, addPausesToText } from './speechText';
import { getSpeechRate } from './speechSettings';
import { ensureSpeechEngineReady, stopSpeaking } from './speechEngine';
import { speakWithVoice } from './speakWithVoice';
import {
  setCurrentTextBeingSpoken,
  isMutedFromLocalStorage,
  waitForVoices,
  loadVoices
} from './speechPlayerUtils';

export const speak = (text: string, region: 'US' | 'UK' = 'US'): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    if (isMutedFromLocalStorage()) {
      resolve();
      return;
    }

    if (!window.speechSynthesis) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    await ensureSpeechEngineReady();
    stopSpeaking();

    const processedText = addPausesToText(prepareTextForSpeech(text));
    setCurrentTextBeingSpoken(processedText);

    await new Promise(resolve => setTimeout(resolve, 1200)); // Longer wait for speech readiness

    const utterance = new SpeechSynthesisUtterance(processedText);

    let voices = loadVoices();
    const handleSetVoiceAndSpeak = async () => {
      try {
        await speakWithVoice({
          utterance,
          region,
          text,
          processedText,
          onComplete: resolve,
          onError: reject
        });
      } catch (err) {
        reject(err);
      }
    };

    if (voices.length > 0) {
      handleSetVoiceAndSpeak();
    } else {
      try {
        voices = await waitForVoices();
        handleSetVoiceAndSpeak();
      } catch {
        reject(new Error('Could not load voices'));
      }
    }
  });
};
