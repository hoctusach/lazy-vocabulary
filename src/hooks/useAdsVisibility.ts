import { useEffect, useState } from 'react';
import { isProEnabled } from '@/config/features';
import { isProActive, subscribeProEntitlement } from '@/services/billing/entitlement';

/** Non-React: ads are allowed unless the user owns Pro. */
export function adsAllowed(): boolean {
  return !(isProEnabled() && isProActive());
}

/** Subscribe to changes of adsAllowed(). Returns an unsubscribe function. */
export function onAdsAllowedChange(cb: (allowed: boolean) => void): () => void {
  if (!isProEnabled()) return () => {};
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
