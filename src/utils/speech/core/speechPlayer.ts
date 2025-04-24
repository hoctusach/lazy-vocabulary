
// Refactored: now this file just orchestrates the helpers
import { prepareTextForSpeech, addPausesToText } from './speechText';
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
      console.log('Speech is muted, resolving immediately');
      resolve();
      return;
    }

    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    try {
      await ensureSpeechEngineReady();
      stopSpeaking();

      const processedText = addPausesToText(prepareTextForSpeech(text));
      setCurrentTextBeingSpoken(processedText);
      console.log('Speaking text:', text.substring(0, 30) + '...');

      // Longer wait for speech readiness
      await new Promise(resolve => setTimeout(resolve, 300)); 

      const utterance = new SpeechSynthesisUtterance(processedText);
      
      let voices = loadVoices();
      const handleSetVoiceAndSpeak = async () => {
        try {
          await speakWithVoice({
            utterance,
            region,
            text,
            processedText,
            onComplete: () => {
              console.log('Speech completed, resolving promise');
              resolve();
            },
            onError: (err) => {
              console.error('Speech error in speak:', err);
              reject(err);
            }
          });
        } catch (err) {
          console.error('Error in handleSetVoiceAndSpeak:', err);
          reject(err);
        }
      };

      if (voices.length > 0) {
        console.log('Voices already loaded, speaking immediately');
        handleSetVoiceAndSpeak();
      } else {
        console.log('Waiting for voices to load');
        try {
          voices = await waitForVoices();
          console.log('Voices loaded, now speaking');
          handleSetVoiceAndSpeak();
        } catch (err) {
          console.error('Could not load voices:', err);
          reject(new Error('Could not load voices'));
        }
      }
    } catch (err) {
      console.error('Unexpected error in speak function:', err);
      reject(err);
    }
  });
};
