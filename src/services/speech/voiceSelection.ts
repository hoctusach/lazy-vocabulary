import { isVoiceLocked } from './voiceAccess';
import { markVoiceExplicit } from './kokoro/kokoroPrefs';
import { stopSpeechForUserIntent } from './stopSpeechForUserIntent';
import { setFavoriteVoice } from '@/lib/preferences/localPreferences';
import { openProUpgrade } from '@/services/billing/proUpgradeStore';

/** Fired on `window` with `{ name }` after a voice was chosen; every voice-state hook listens. */
export const VOICE_SELECTED_EVENT = 'lv:voice-selected';

/**
 * [FB-48] Direct voice choice (dropdown). Heart and every system voice are free; Michael opens the upgrade sheet
 * for free users. Returns what happened.
 */
export function selectVoiceByName(name: string): 'applied' | 'locked' {
  if (isVoiceLocked(name)) {
    openProUpgrade('maleVoice');
    return 'locked';
  }
  markVoiceExplicit();
  setFavoriteVoice(name);
  stopSpeechForUserIntent('user-voice-change');
  try {
    window.dispatchEvent(new CustomEvent(VOICE_SELECTED_EVENT, { detail: { name } }));
  } catch {
    /* non-browser */
  }
  return 'applied';
}
