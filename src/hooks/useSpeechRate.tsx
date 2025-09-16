import { useState, useEffect, useCallback } from 'react';
import {
  getSpeechVoicePreference,
  setSpeechVoicePreference,
} from '@/utils/localPreferences';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

export const useSpeechVoiceEffect = (
  handleVoiceChange: (voice: string) => void
) => {
  // Load stored preference
  const [voice, setVoice] = useState(() => getSpeechVoicePreference());

  // Apply saved voice on initial mount
  useEffect(() => {
    const stored = getSpeechVoicePreference();
    if (stored) unifiedSpeechController.setVoice(stored);
  }, []);

  // Persist voice choice and update controller whenever it changes
  useEffect(() => {
    setSpeechVoicePreference(voice);
    unifiedSpeechController.setVoice(voice);
  }, [voice]);

  const handleChange = useCallback(
    (newVoice: string) => {
      setVoice(newVoice);
      handleVoiceChange(newVoice);
    },
    [handleVoiceChange],
  );

  return { voice, handleChange };
};
