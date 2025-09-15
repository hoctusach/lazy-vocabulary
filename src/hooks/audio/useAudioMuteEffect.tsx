
import { useEffect } from 'react';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { savePreferences } from '@/lib/db/preferences';

export const useAudioMuteEffect = (mute: boolean) => {
  // Effect specifically for mute changes
  useEffect(() => {
    savePreferences({ is_muted: mute }).catch(() => {});
    unifiedSpeechController.setMuted(mute);
  }, [mute]);
};
