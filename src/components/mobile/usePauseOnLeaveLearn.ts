import { useEffect, useRef } from 'react';
import type { AppTab } from './BottomTabBar';
import { saveLocalPreferences } from '@/lib/preferences/localPreferences';
import { stopPlaybackService } from '@/services/background/playbackService';

/** Leaving Learn via the tab bar (or back button) stops playback and leaves it paused for the return. */
export function usePauseOnLeaveLearn(tab: AppTab): void {
  const prevTab = useRef<AppTab>(tab);

  useEffect(() => {
    const left = prevTab.current === 'learn' && tab !== 'learn';
    prevTab.current = tab;
    if (!left) return;
    saveLocalPreferences({ is_playing: false }).catch(() => {});
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* speech already gone */
    }
    void stopPlaybackService();
  }, [tab]);
}
