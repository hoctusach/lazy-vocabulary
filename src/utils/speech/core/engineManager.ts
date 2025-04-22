
import { SpeechSynthesisVoice } from '@/types/speech';
import { getVoiceByRegion } from '../voiceUtils';
import { getSpeechRate, getSpeechPitch, getSpeechVolume } from './speechSettings';

interface SpeechConfig {
  voice: SpeechSynthesisVoice | null;
  langCode: string;
  rate: number;
  pitch: number;
  volume: number;
}

export const configureUtterance = (utterance: SpeechSynthesisUtterance, region: 'US' | 'UK'): void => {
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  const voice = getVoiceByRegion(region);
  
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

