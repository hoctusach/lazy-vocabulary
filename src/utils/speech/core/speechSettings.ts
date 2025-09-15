import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';
import { getPreferences, savePreferences } from '@/lib/db/preferences';

let cachedRate = DEFAULT_SPEECH_RATE;

// Load initial rate
getPreferences()
  .then(p => {
    if (typeof p.speech_rate === 'number') {
      cachedRate = p.speech_rate;
    }
  })
  .catch(() => {});

export const getSpeechRate = (): number => cachedRate;

export const setSpeechRate = (rate: number): void => {
  cachedRate = rate;
  void savePreferences({ speech_rate: rate });
};

export const getSpeechPitch = (): number => 1.0;
export const getSpeechVolume = (): number => 1.0;
