import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';
import {
  getSpeechRate as readSpeechRateFromPreferences,
  setSpeechRate as writeSpeechRateToPreferences,
} from '@/lib/localPreferences';

let cachedRate: number | undefined;

const resolveCachedRate = (): number => {
  if (typeof cachedRate === 'number') {
    return cachedRate;
  }

  const storedRate = readSpeechRateFromPreferences();
  cachedRate = storedRate ?? DEFAULT_SPEECH_RATE;
  return cachedRate;
};

export const getSpeechRate = (): number => resolveCachedRate();

export const setSpeechRate = (rate: number): void => {
  cachedRate = rate;
  writeSpeechRateToPreferences(rate);
};

export const getSpeechPitch = (): number => 1.0;
export const getSpeechVolume = (): number => 1.0;
