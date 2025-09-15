import { useEffect, useState } from 'react';
import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';
import { getPreferences, savePreferences } from '@/lib/db/preferences';

export const useSpeechRate = () => {
  const [speechRate, setSpeechRate] = useState<number>(DEFAULT_SPEECH_RATE);

  useEffect(() => {
    getPreferences()
      .then(p => {
        if (typeof p.speech_rate === 'number') {
          setSpeechRate(p.speech_rate);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    savePreferences({ speech_rate: speechRate }).catch(err => {
      console.error('Error saving speech rate', err);
    });
  }, [speechRate]);

  return { speechRate, setSpeechRate };
};
