import {
  DEFAULT_SPEECH_RATE,
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
} from '@/services/speech/core/constants';
import {
  getSpeechRate as getStoredSpeechRate,
  setSpeechRate as setStoredSpeechRate,
} from '@/lib/localPreferences';

const clampSpeechRate = (rate: number | null | undefined): number => {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return DEFAULT_SPEECH_RATE;
  }

  const clamped = Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, rate));
  return Math.round(clamped * 100) / 100;
};

let cachedRate = clampSpeechRate(getStoredSpeechRate());

export const getSpeechRate = (): number => cachedRate;

export const setSpeechRate = (rate: number): void => {
  const normalizedRate = clampSpeechRate(rate);
  cachedRate = normalizedRate;
  setStoredSpeechRate(normalizedRate);
};

export const normalizeSpeechRate = clampSpeechRate;

export const getSpeechPitch = (): number => 1.0;
export const getSpeechVolume = (): number => 1.0;
