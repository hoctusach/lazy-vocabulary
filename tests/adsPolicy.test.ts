import { describe, expect, it } from 'vitest';
import {
  canProceedWithAds,
  isAdsSupported,
  isGoogleTestId,
  normalizeSlotHeight,
  shouldShowBannerForTab,
} from '../src/services/ads/adsPolicy';
import { ADS_CONFIG } from '../src/config/ads';
import { adsEnabled } from '../src/services/ads';

describe('shouldShowBannerForTab', () => {
  it('shows only on progress and sets', () => {
    expect(shouldShowBannerForTab('progress')).toBe(true);
    expect(shouldShowBannerForTab('sets')).toBe(true);
    expect(shouldShowBannerForTab('learn')).toBe(false);
    expect(shouldShowBannerForTab('more')).toBe(false);
    expect(shouldShowBannerForTab('something-else')).toBe(false);
    expect(shouldShowBannerForTab(null)).toBe(false);
    expect(shouldShowBannerForTab(undefined)).toBe(false);
  });
});

describe('isAdsSupported', () => {
  it('is true only for native android', () => {
    expect(isAdsSupported({ isNative: true, platform: 'android' })).toBe(true);
    expect(isAdsSupported({ isNative: true, platform: 'ios' })).toBe(false);
    expect(isAdsSupported({ isNative: false, platform: 'web' })).toBe(false);
    expect(isAdsSupported({ isNative: false, platform: 'android' })).toBe(false);
  });

  it('is a no-op on web (jsdom is not a native platform)', () => {
    expect(adsEnabled()).toBe(false);
  });
});

describe('test ID detection', () => {
  it('detects Google sample IDs', () => {
    expect(isGoogleTestId('ca-app-pub-3940256099942544/6300978111')).toBe(true);
    expect(isGoogleTestId('ca-app-pub-3940256099942544~3347511713')).toBe(true);
    expect(isGoogleTestId('ca-app-pub-1234567890123456/1234567890')).toBe(false);
    expect(isGoogleTestId(undefined)).toBe(false);
  });

  it('ships Google test IDs by default in config', () => {
    expect(isGoogleTestId(ADS_CONFIG.appId)).toBe(true);
    expect(isGoogleTestId(ADS_CONFIG.bannerId)).toBe(true);
    expect(ADS_CONFIG.appId).toMatch(/^ca-app-pub-\d{16}~\d{10}$/);
    expect(ADS_CONFIG.bannerId).toMatch(/^ca-app-pub-\d{16}\/\d{10}$/);
  });
});

describe('slot / consent helpers', () => {
  it('normalizes reported banner heights', () => {
    expect(normalizeSlotHeight(50.4)).toBe(50);
    expect(normalizeSlotHeight(0)).toBeNull();
    expect(normalizeSlotHeight(500)).toBeNull();
    expect(normalizeSlotHeight('abc')).toBeNull();
  });

  it('requires canRequestAds not to be false', () => {
    expect(canProceedWithAds({ canRequestAds: true })).toBe(true);
    expect(canProceedWithAds({ canRequestAds: false })).toBe(false);
    expect(canProceedWithAds(null)).toBe(false);
  });
});
