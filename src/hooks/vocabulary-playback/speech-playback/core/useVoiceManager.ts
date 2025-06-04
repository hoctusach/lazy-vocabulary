
import { useCallback } from 'react';
import { VoiceSelection } from '../../useVoiceSelection';

/**
 * Hook for managing voice selection and finding voices
 */
export const useVoiceManager = (selectedVoice: VoiceSelection) => {
  // Find voice by region
  const findVoice = useCallback((region: 'US' | 'UK') => {
    const voices = window.speechSynthesis?.getVoices() || [];
    const lang = region === 'US' ? 'en-US' : 'en-GB';
    return voices.find(voice => voice.lang.startsWith(lang)) || null;
  }, []);

  return {
    findVoice
  };
};
