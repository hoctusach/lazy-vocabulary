import { useState, useCallback, useEffect } from 'react';
import {
  getSpeechRate as getStoredSpeechRate,
  setSpeechRate as setStoredSpeechRate,
} from '@/utils/speech/core/speechSettings';

/**
 * Hook for managing the speech synthesis rate.
 *
 * The current rate is persisted to local storage via the speech settings
 * helper so it can be restored across sessions.
 */
export const useSpeechRate = () => {
  // initialise from stored preference or fall back to default value from settings
  const [speechRate, setSpeechRateState] = useState(() => getStoredSpeechRate());

  // ensure state stays in sync with any external changes
  useEffect(() => {
    setSpeechRateState(getStoredSpeechRate());
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    setSpeechRateState(rate);
    setStoredSpeechRate(rate);
  }, []);

  return { speechRate, setSpeechRate };
};

