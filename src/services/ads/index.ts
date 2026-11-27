import { Capacitor } from '@capacitor/core';
import { isAdsSupported } from './adsPolicy';

/** True only inside the native Android app. Safe to call on web (no ad code loaded). */
export function adsEnabled(): boolean {
  try {
    return isAdsSupported({ isNative: Capacitor.isNativePlatform(), platform: Capacitor.getPlatform() });
  } catch {
    return false;
  }
}

/** Loads the Android-only ad service on demand (separate chunk). */
export function loadAdsService() {
  return import('./adsService');
}
