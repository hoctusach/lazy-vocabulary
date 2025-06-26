
import { getVoiceByRegion } from '../voiceUtils';
import { getSpeechPitch, getSpeechVolume } from './speechSettings';
import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';

export const configureUtterance = (utterance: SpeechSynthesisUtterance, region: 'US' | 'UK' | 'AU'): void => {
  const langCode = region === 'US' ? 'en-US' : region === 'UK' ? 'en-GB' : 'en-AU';
  const voice = getVoiceByRegion(region);
  
  if (voice) {
    console.log(`Found voice: ${voice.name} (${voice.lang})`);
    utterance.voice = voice;
    utterance.lang = langCode;
  } else {
    console.warn('No suitable voice found, using default');
    utterance.lang = langCode;
  }
  
  utterance.rate = DEFAULT_SPEECH_RATE;
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
