import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';
import { getSpeechRate as getStoredSpeechRate, setSpeechRate as setStoredSpeechRate } from '@/lib/localPreferences';

let cachedRate = getStoredSpeechRate() ?? DEFAULT_SPEECH_RATE;

export const getSpeechRate = (): number => cachedRate;

export const setSpeechRate = (rate: number): void => {
  cachedRate = rate;
  setStoredSpeechRate(rate);
};

export const getSpeechPitch = (): number => 1.0;
export const getSpeechVolume = (): number => 1.0;
