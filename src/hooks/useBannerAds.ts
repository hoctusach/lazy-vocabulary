import { useEffect } from 'react';
import { useAdsAllowed } from '@/hooks/useAdsVisibility';
import { adsEnabled, loadAdsService } from '@/services/ads';
import { shouldShowBannerForTab, type AdTabId } from '@/services/ads/adsPolicy';

/**
 * Shows the bottom banner only while `tab` is an ad tab (Progress/Sets).
 * Strict no-op on web/PWA/iOS: nothing is imported and no CSS var is set.
 */
export function useBannerAds(tab: AdTabId): void {
  const allowed = useAdsAllowed();
  const show = allowed && shouldShowBannerForTab(tab);
  useEffect(() => {
    if (!adsEnabled()) return;
    let cancelled = false;
    void loadAdsService()
      .then((svc) => { if (!cancelled) svc.setBannerWanted(show); })
      .catch((e) => console.warn('[ads] load', e));
    return () => { cancelled = true; };
  }, [show]);

  // Leaving the mobile shell (route change / unmount): hide and release the slot.
  useEffect(() => {
    if (!adsEnabled()) return;
    return () => {
      void loadAdsService().then((svc) => svc.setBannerWanted(false)).catch(() => undefined);
    };
  }, []);
}
