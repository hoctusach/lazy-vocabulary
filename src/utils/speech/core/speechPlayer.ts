import * as React from 'react';
import { prepareTextForSpeech } from './speechText';
import { ensureSpeechEngineReady, stopSpeaking } from './speechEngine';
import { speakWithVoice } from './speakWithVoice';
import {
  setCurrentTextBeingSpoken,
  isMutedFromLocalStorage,
  waitForVoices,
  loadVoices
} from './speechPlayerUtils';

interface SpeakOptions {
  muted?: boolean;
}

export const speak = (
  text: string,
  voice: SpeechSynthesisVoice | null,
  pauseRequestedRef?: React.MutableRefObject<boolean>,
  options?: SpeakOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const run = async () => {
      if (!window.speechSynthesis) {
        console.error('Speech synthesis not supported');
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      try {
        const muted = options?.muted ?? isMutedFromLocalStorage();
        // Ensure we're not trying to speak multiple things at once
        await ensureSpeechEngineReady();
        stopSpeaking();

      // Wait for DOM to update before continuing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process the text without adding XML break tags
      const processedText = prepareTextForSpeech(text);
      setCurrentTextBeingSpoken(processedText);
      console.log('Speaking text:', text.substring(0, 30) + '...');

      // Longer wait for speech readiness and DOM updates
      await new Promise(resolve => setTimeout(resolve, 300)); 

      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.volume = muted ? 0 : 1;

      let voices = loadVoices();
      const handleSetVoiceAndSpeak = async () => {
        try {
          await speakWithVoice({
            utterance,
            voice,
            text,
            processedText,
            pauseRequestedRef,
            muted,
            onComplete: () => {
              console.log('Speech completed, resolving promise');
              resolve('completed');
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
        console.log('Voices already loaded, speaking after short delay');
        // Add a small delay to ensure DOM rendering completes
        setTimeout(() => handleSetVoiceAndSpeak(), 150);
      } else {
        console.log('Waiting for voices to load');
        try {
          voices = await waitForVoices();
          console.log('Voices loaded, now speaking after short delay');
          // Add a small delay to ensure DOM rendering completes
          setTimeout(() => handleSetVoiceAndSpeak(), 150);
        } catch (err) {
          console.error('Could not load voices:', err);
          reject(new Error('Could not load voices'));
        }
      }
      } catch (err) {
        console.error('Unexpected error in speak function:', err);
        reject(err);
      }
    };

    void run();
  });
};
