import {
  DEFAULT_SPEECH_RATE,
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
} from '@/services/speech/core/constants';
import {
  getSpeechRate as readSpeechRateFromPreferences,
  setSpeechRate as writeSpeechRateToPreferences,
} from '@/lib/localPreferences';

const clampSpeechRate = (rate: number | null | undefined): number => {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return DEFAULT_SPEECH_RATE;
  }

  const clamped = Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, rate));
  return Math.round(clamped * 100) / 100;
};

let cachedRate: number | undefined;

const resolveStoredSpeechRate = (): number => {
  const storedRate = readSpeechRateFromPreferences();
  if (typeof storedRate !== 'number' || !Number.isFinite(storedRate)) {
    writeSpeechRateToPreferences(DEFAULT_SPEECH_RATE);
    return DEFAULT_SPEECH_RATE;
  }

  const normalizedRate = clampSpeechRate(storedRate);
  if (normalizedRate !== storedRate) {
    writeSpeechRateToPreferences(normalizedRate);
  }

  return normalizedRate;
};

const resolveCachedRate = (): number => {
  if (typeof cachedRate === 'number') {
    return cachedRate;
  }

  const normalizedRate = resolveStoredSpeechRate();
  cachedRate = normalizedRate;
  return normalizedRate;
};

export const getSpeechRate = (): number => resolveCachedRate();

export const setSpeechRate = (rate: number): void => {
  const normalizedRate = clampSpeechRate(rate);
  cachedRate = normalizedRate;
  writeSpeechRateToPreferences(normalizedRate);
};

export const normalizeSpeechRate = clampSpeechRate;

export const getSpeechPitch = (): number => 1.0;
export const getSpeechVolume = (): number => 1.0;
