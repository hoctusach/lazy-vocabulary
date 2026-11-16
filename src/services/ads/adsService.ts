/**
 * Android-only AdMob banner controller. This module is ONLY ever loaded through a
 * dynamic import from `useBannerAds` after `isAdsSupported()` is true, so the
 * admob plugin never runs (or is eagerly loaded) on web/PWA.
 *
 * Flow: UMP consent (requestConsentInfo → showConsentForm if required) →
 * initialize → showBanner at BOTTOM above the tab bar. Banner is hidden (not
 * removed) while the current tab has no ads; its height is reserved in the
 * `--ad-slot` CSS var so content never jumps or sits under the banner.
 */
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  type AdmobConsentInfo,
} from '@capacitor-community/admob';
import { adsAllowed, onAdsAllowedChange } from '@/hooks/useAdsVisibility';
import { ADS_CONFIG } from '@/config/ads';
import {
  DEFAULT_AD_SLOT_PX,
  FALLBACK_TAB_BAR_PX,
  canProceedWithAds,
  isGoogleTestId,
  normalizeSlotHeight,
} from './adsPolicy';

const AD_SLOT_VAR = '--ad-slot';
const MAX_SHOW_ATTEMPTS = 3;

let wanted = false;
let ready = false; // consent resolved + SDK initialized
let initializing: Promise<boolean> | null = null;
let bannerShown = false; // showBanner() succeeded at least once
let bannerHidden = true;
let slotPx = DEFAULT_AD_SLOT_PX;
let attempts = 0;
let listenersAttached = false;
let queue: Promise<void> = Promise.resolve();
let proSubscribed = false;

function resetSlot(): void {
  document.documentElement.style.setProperty(AD_SLOT_VAR, '0px');
}

/** Hide AND remove the banner view (Pro granted). Serialized with other calls. */
function removeBannerNow(): void {
  wanted = false;
  resetSlot();
  queue = queue
    .then(async () => {
      if (!bannerShown && bannerHidden) return;
      try { await AdMob.removeBanner(); } catch { /* ignore */ }
      bannerShown = false;
      bannerHidden = true;
    })
    .catch((e) => console.warn('[ads]', e));
}

function subscribeOnce(): void {
  if (proSubscribed) return;
  proSubscribed = true;
  onAdsAllowedChange((allowed) => {
    if (!allowed) removeBannerNow();
  });
}
subscribeOnce();

function setSlot(px: number): void {
  document.documentElement.style.setProperty(AD_SLOT_VAR, `${px}px`);
}

function measureTabBarDp(): number {
  const nav = document.querySelector('[data-bottom-tab-bar]');
  const h = nav ? Math.round(nav.getBoundingClientRect().height) : 0;
  return h > 0 ? h : FALLBACK_TAB_BAR_PX;
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  const swallow = (p: Promise<unknown>) => p.catch(() => undefined);
  swallow(
    AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
      const h = normalizeSlotHeight(size?.height);
      if (h !== null) {
        slotPx = h;
        if (wanted) setSlot(h);
      }
    }),
  );
  swallow(AdMob.addListener(BannerAdPluginEvents.Loaded, () => { attempts = 0; }));
  swallow(
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
      // Keep the reserved slot; a later tab switch will retry (bounded).
      bannerShown = false;
      bannerHidden = true;
    }),
  );
}

/** UMP consent, then SDK init. Resolves true only if ads may be requested. */
async function ensureReady(): Promise<boolean> {
  if (!adsAllowed()) return false;
  if (ready) return true;
  if (!initializing) {
    initializing = (async () => {
      try {
        let info: AdmobConsentInfo = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
          info = await AdMob.showConsentForm();
        }
        if (!canProceedWithAds(info)) return false;
        await AdMob.initialize();
        attachListeners();
        ready = true;
        return true;
      } catch (error) {
        console.warn('[ads] init failed', error);
        return false;
      } finally {
        initializing = null;
      }
    })();
  }
  return initializing;
}

async function apply(): Promise<void> {
  if (!adsAllowed()) {
    wanted = false;
    resetSlot();
    return;
  }
  if (!wanted) {
    if (bannerShown && !bannerHidden) {
      try { await AdMob.hideBanner(); } catch { /* ignore */ }
      bannerHidden = true;
    }
    return;
  }
  if (!(await ensureReady()) || !wanted) {
    if (!wanted) document.documentElement.style.setProperty(AD_SLOT_VAR, '0px');
    return;
  }
  setSlot(slotPx);
  try {
    if (!bannerShown) {
      if (attempts >= MAX_SHOW_ATTEMPTS) return;
      attempts += 1;
      await AdMob.showBanner({
        adId: ADS_CONFIG.bannerId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        // margin is dp and sits above the bottom tab bar (which already includes safe-area padding).
        margin: measureTabBarDp(),
        isTesting: isGoogleTestId(ADS_CONFIG.bannerId),
      });
      bannerShown = true;
      bannerHidden = false;
    } else if (bannerHidden) {
      await AdMob.resumeBanner();
      bannerHidden = false;
    }
  } catch (error) {
    console.warn('[ads] banner failed', error);
    bannerShown = false;
    bannerHidden = true;
  }
  // The tab may have changed while awaiting; reconcile.
  if (!wanted && !bannerHidden) {
    try { await AdMob.hideBanner(); } catch { /* ignore */ }
    bannerHidden = true;
  }
}

/** Show (true) or hide (false) the bottom banner. Calls are serialized. */
export function setBannerWanted(value: boolean): void {
  if (value && !adsAllowed()) value = false;
  wanted = value;
  if (!value) document.documentElement.style.setProperty(AD_SLOT_VAR, '0px');
  else setSlot(slotPx);
  queue = queue.then(apply).catch((e) => console.warn('[ads]', e));
}

/** Re-open Google's privacy options (UMP) form, e.g. from the More tab. */
export type PrivacyOptionsResult = 'shown' | 'not-required' | 'unavailable';

export async function openPrivacyOptions(): Promise<PrivacyOptionsResult> {
  try {
    const info = await AdMob.requestConsentInfo();
    if (String(info.privacyOptionsRequirementStatus) !== 'REQUIRED') {
      return 'not-required';
    }
    await AdMob.showPrivacyOptionsForm();
    return 'shown';
  } catch (error) {
    console.warn('[ads] privacy options', error);
    return 'unavailable';
  }
}
