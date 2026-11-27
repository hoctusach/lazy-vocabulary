import { Capacitor } from '@capacitor/core';

export type NativePlatform = 'android' | 'ios';

/** 'android' | 'ios' when running inside the native shell, otherwise null (web/PWA/tests). Never throws. */
export function nativePlatform(): NativePlatform | null {
  try {
    if (!Capacitor.isNativePlatform()) return null;
    const p = Capacitor.getPlatform();
    return p === 'android' || p === 'ios' ? p : null;
  } catch {
    return null;
  }
}

export const isNativeIOS = (): boolean => nativePlatform() === 'ios';
export const isNativeAndroid = (): boolean => nativePlatform() === 'android';
