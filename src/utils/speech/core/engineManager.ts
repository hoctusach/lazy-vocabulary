
import { getSpeechPitch, getSpeechVolume, getSpeechRate } from './speechSettings';

export const configureUtterance = (utterance: SpeechSynthesisUtterance, voice: SpeechSynthesisVoice | null): void => {
  const langCode = voice?.lang || 'en-US';
  
  if (voice) {
    console.log(`Found voice: ${voice.name} (${voice.lang})`);
    utterance.voice = voice;
    utterance.lang = langCode;
  } else {
    console.warn('No suitable voice found, using default');
    utterance.lang = langCode;
  }
  
  utterance.rate = getSpeechRate();
  utterance.pitch = getSpeechPitch();
  utterance.volume = getSpeechVolume();
  
  console.log(`Speech settings: rate=${utterance.rate}, pitch=${utterance.pitch}, volume=${utterance.volume}`);
};

export const validateSpeechSupport = (): boolean => {
  if (!window.speechSynthesis) {
    console.error('Speech synthesis not supported');
    return false;
  }
  return true;
};
