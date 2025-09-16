
import { useEffect } from 'react';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { saveLocalPreferences } from '@/lib/preferences/localPreferences';

export const useAudioMuteEffect = (mute: boolean) => {
  // Effect specifically for mute changes
  useEffect(() => {
    saveLocalPreferences({ is_muted: mute }).catch(() => {});
    unifiedSpeechController.setMuted(mute);
  }, [mute]);
};
