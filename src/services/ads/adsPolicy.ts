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

/** Ads exist only in the native apps (Android + iOS). Web/PWA is a strict no-op. */
export function isAdsSupported(info: PlatformInfo): boolean {
  return info.isNative === true && (info.platform === 'android' || info.platform === 'ios');
}

/** iOS must show the App Tracking Transparency prompt before the first ad request. */
export function needsTrackingPrompt(info: PlatformInfo): boolean {
  return info.isNative === true && info.platform === 'ios';
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

export interface BannerMarginInput {
  /** window.innerHeight (CSS px == dp in the WebView) */
  viewportHeight: number;
  /** getBoundingClientRect().top of the bottom tab bar (null = not measurable) */
  barTop: number | null;
  /** SRS principle line rect (null / zero height = not visible) */
  srs?: { top: number; bottom: number; height: number } | null;
  /** reserved banner height (--ad-slot) */
  slotPx: number;
}

/**
 * Margin (dp) for the native banner: the distance from the physical bottom of the screen to the top of the
 * content that must stay visible. That is the tab bar's TOP edge, not its height: floating-bar themes (Cozy
 * Sloth, Blocks) sit `bottom: 10-14px + safe-area` above the screen edge, so height alone puts the banner too low
 * and covers the nav. The SRS line (Learn) is normally laid out above the banner zone via --ad-slot; if it
 * overlaps the zone the banner would cover, the margin is raised to the SRS line's top edge instead.
 */
export function computeBannerMarginDp(input: BannerMarginInput): number {
  const { viewportHeight, barTop, srs, slotPx } = input;
  const barDist =
    barTop !== null && Number.isFinite(barTop) && Number.isFinite(viewportHeight) && viewportHeight - barTop > 0
      ? Math.round(viewportHeight - barTop)
      : FALLBACK_TAB_BAR_PX;
  let margin = barDist;
  if (srs && srs.height > 0 && Number.isFinite(srs.top) && Number.isFinite(srs.bottom)) {
    const srsBottomDist = viewportHeight - srs.bottom;
    const srsTopDist = Math.round(viewportHeight - srs.top);
    // The banner would span [barDist, barDist + slotPx]; cover-check against the SRS line.
    if (srsBottomDist < barDist + slotPx && srsTopDist > barDist) margin = srsTopDist;
  }
  return margin;
}
