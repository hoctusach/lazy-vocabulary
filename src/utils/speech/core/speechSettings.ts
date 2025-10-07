import {
  DEFAULT_SPEECH_RATE,
  MIN_SPEECH_RATE,
  MAX_SPEECH_RATE,
} from '@/services/speech/core/constants';
import {
  getSpeechRate as readSpeechRateFromPreferences,
  setSpeechRate as writeSpeechRateToPreferences,
} from '@/lib/localPreferences';

let cachedRate: number | undefined;

const clampRate = (rate: number): number => {
  if (!Number.isFinite(rate)) {
    return DEFAULT_SPEECH_RATE;
  }
  return Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, rate));
};

const resolveCachedRate = (): number => {
  if (typeof cachedRate === 'number') {
    return cachedRate;
  }

  const storedRate = readSpeechRateFromPreferences();
  cachedRate = clampRate(storedRate ?? DEFAULT_SPEECH_RATE);
  return cachedRate;
};

export const getSpeechRate = (): number => resolveCachedRate();

export const setSpeechRate = (rate: number): void => {
  const sanitizedRate = clampRate(rate);
  cachedRate = sanitizedRate;
  writeSpeechRateToPreferences(sanitizedRate);
};

export const getSpeechPitch = (): number => 1.0;
export const getSpeechVolume = (): number => 1.0;
