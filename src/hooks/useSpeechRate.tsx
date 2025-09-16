import { useEffect, useState } from 'react';
import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';
import { getSpeechRate as getStoredSpeechRate, setSpeechRate as setStoredSpeechRate } from '@/lib/localPreferences';

export const useSpeechRate = () => {
  const [speechRate, setSpeechRate] = useState<number>(DEFAULT_SPEECH_RATE);

  useEffect(() => {
    const storedRate = getStoredSpeechRate();
    if (typeof storedRate === 'number') {
      setSpeechRate(storedRate);
    }
  }, []);

  useEffect(() => {
    setStoredSpeechRate(speechRate);
  }, [speechRate]);

  return { speechRate, setSpeechRate };
};
