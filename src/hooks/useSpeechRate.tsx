import { useState, useCallback, useEffect } from 'react';
import {
  getSpeechRate,
  normalizeSpeechRate,
  setSpeechRate as persistSpeechRate,
} from '@/utils/speech/core/speechSettings';

/**
 * Hook for managing the speech synthesis rate.
 *
 * The current rate is persisted to local storage via the speech settings
 * helper so it can be restored across sessions.
 */
export const useSpeechRate = () => {
  // initialise from stored preference or fall back to default value from settings
  const [speechRate, setSpeechRateState] = useState(() => getSpeechRate());

  // ensure state stays in sync with any external changes
  useEffect(() => {
    setSpeechRateState(getSpeechRate());
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    const normalized = normalizeSpeechRate(rate);
    setSpeechRateState(normalized);
    persistSpeechRate(normalized);
  }, []);

  return { speechRate, setSpeechRate };
};

