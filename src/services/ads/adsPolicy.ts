import { GOOGLE_TEST_ID_MARKER } from '@/config/ads';

/** Tabs of the mobile shell. Kept as strings so this module stays dependency-free. */
export type AdTabId = 'learn' | 'progress' | 'sets' | 'more' | (string & {});

/** Banner is shown only on these tabs (never on the word cards, More, or other routes). */
const AD_TABS: ReadonlySet<string> = new Set(['progress', 'sets']);

/** Default reserved banner height (dp) before the real size is reported. */
export const DEFAULT_AD_SLOT_PX = 56;
const MIN_SLOT_PX = 32;
const MAX_SLOT_PX = 160;
/** Fallback bottom tab bar height (dp) if it cannot be measured. */
export const FALLBACK_TAB_BAR_PX = 64;

export function shouldShowBannerForTab(tab: AdTabId | null | undefined): boolean {
  return !!tab && AD_TABS.has(tab);
}

export interface PlatformInfo {
  isNative: boolean;
  platform: string;
}

/** Ads exist only in the native Android app. Web/PWA/iOS are strict no-ops. */
export function isAdsSupported(info: PlatformInfo): boolean {
  return info.isNative === true && info.platform === 'android';
}

export function isGoogleTestId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.includes(GOOGLE_TEST_ID_MARKER);
}

/** Validates a size reported by bannerAdSizeChanged; returns null if unusable. */
export function normalizeSlotHeight(height: unknown): number | null {
  const n = Math.round(Number(height));
  if (!Number.isFinite(n) || n < MIN_SLOT_PX || n > MAX_SLOT_PX) return null;
  return n;
}

/** Whether the UMP result allows requesting ads. */
export function canProceedWithAds(info: { canRequestAds?: boolean } | null | undefined): boolean {
  return !!info && info.canRequestAds !== false;
}
