import { useEffect } from 'react';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { setIsMuted } from '@/utils/localPreferences';

export const useAudioMuteEffect = (mute: boolean) => {
  // Effect specifically for mute changes
  useEffect(() => {
    setIsMuted(mute);
    unifiedSpeechController.setMuted(mute);
  }, [mute]);
};
