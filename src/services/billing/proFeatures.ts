import { useEffect, useState } from 'react';
import { isProEnabled } from '@/config/features';
import { isProActive, subscribeProEntitlement } from './entitlement';

/** Everything the one-time Pro unlock gates. */
export type ProFeature = 'noAds' | 'importSets' | 'unlimitedQuiz' | 'allThemes' | 'maleVoice' | 'editTranslation' | 'unlimitedScans';

export const PRO_FEATURES: readonly ProFeature[] = ['noAds', 'importSets', 'unlimitedQuiz', 'allThemes', 'maleVoice', 'editTranslation', 'unlimitedScans'];

/**
 * Single source of truth for gating. With VITE_ENABLE_PRO off nothing is gated (today's behaviour);
 * with it on, every Pro feature needs the cached/active entitlement.
 */
export function hasFeature(_feature: ProFeature): boolean {
  if (!isProEnabled()) return true;
  return isProActive();
}

/** Subscribe to lock/unlock changes (purchase, restore, refund). Returns an unsubscribe function. */
export function subscribeProFeatures(cb: () => void): () => void {
  return subscribeProEntitlement(() => cb());
}

/** React: true when the feature is available; re-renders on entitlement changes. */
export function useProFeature(feature: ProFeature): boolean {
  const [has, setHas] = useState<boolean>(() => hasFeature(feature));
  useEffect(() => {
    setHas(hasFeature(feature));
    return subscribeProFeatures(() => setHas(hasFeature(feature)));
  }, [feature]);
  return has;
}
