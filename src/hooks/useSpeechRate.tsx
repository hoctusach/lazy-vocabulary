import { useEffect, useState } from 'react';
import { SPEECH_RATE_KEY } from '@/utils/storageKeys';
import { DEFAULT_SPEECH_RATE } from '@/services/speech/core/constants';

export const useSpeechRate = () => {
  const [speechRate, setSpeechRate] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(SPEECH_RATE_KEY);
      const parsed = stored ? parseFloat(stored) : NaN;
      return !isNaN(parsed) ? parsed : DEFAULT_SPEECH_RATE;
    } catch {
      return DEFAULT_SPEECH_RATE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SPEECH_RATE_KEY, speechRate.toString());
    } catch (e) {
      console.error('Error saving speech rate', e);
    }
  }, [speechRate]);

  return { speechRate, setSpeechRate };
};
