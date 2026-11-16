import { useEffect, useState } from 'react';
import { isProActive, subscribeProEntitlement } from '@/services/billing/entitlement';

/** Non-React: ads are allowed unless the user owns Pro. */
export function adsAllowed(): boolean {
  return !isProActive();
}

/** Subscribe to changes of adsAllowed(). Returns an unsubscribe function. */
export function onAdsAllowedChange(cb: (allowed: boolean) => void): () => void {
  return subscribeProEntitlement((active) => cb(!active));
}

export function useAdsAllowed(): boolean {
  const [allowed, setAllowed] = useState<boolean>(() => adsAllowed());
  useEffect(() => {
    setAllowed(adsAllowed());
    return onAdsAllowedChange(setAllowed);
  }, []);
  return allowed;
}
