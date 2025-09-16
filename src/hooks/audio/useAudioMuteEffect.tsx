import { useEffect } from 'react';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { useEffect } from 'react';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';
import { setIsMuted } from '@/utils/localPreferences';
export const useAudioMuteEffect = (mute: boolean) => {
  useEffect(() => {
    setIsMuted(mute);                 // store the preference
    unifiedSpeechController.setMuted(mute);  // apply to controller
  }, [mute]);
};

    unifiedSpeechController.setMuted(mute);
  }, [mute]);
};
