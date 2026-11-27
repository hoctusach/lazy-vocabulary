import { useEffect, useState } from 'react';
import { isVietnameseDevice, useIsVietnameseDevice } from '@/utils/deviceLanguage';

/**
 * [FB-64] On an English (non-Vietnamese) device the built-in set's Vietnamese translation is hidden until the user
 * turns on "Show Vietnamese translation" (default OFF). A Vietnamese device always shows it. The user's own edited
 * translation (FB-42 override) is separate and always wins/shows.
 */
const KEY = 'lv_show_vi_translation';
export const SHOW_VI_EVENT = 'lv:show-vi-translation';

export function getShowDefaultVi(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setShowDefaultVi(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* storage blocked: the toggle still works for this session through the event */
  }
  try {
    window.dispatchEvent(new CustomEvent(SHOW_VI_EVENT, { detail: { on } }));
  } catch {
    /* non-browser */
  }
}

/** True when the default Vietnamese translation should be shown (Vietnamese device, or the English-device toggle is on). */
export function shouldShowDefaultVi(): boolean {
  return isVietnameseDevice() || getShowDefaultVi();
}

/** The toggle's own state (English devices). */
export function useShowDefaultViPref(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => getShowDefaultVi());
  useEffect(() => {
    const refresh = (e: Event) => {
      const d = (e as CustomEvent<{ on?: boolean }>).detail;
      setOn(typeof d?.on === 'boolean' ? d.on : getShowDefaultVi());
    };
    window.addEventListener(SHOW_VI_EVENT, refresh);
    return () => window.removeEventListener(SHOW_VI_EVENT, refresh);
  }, []);
  return [on, setShowDefaultVi];
}

/** Hook form of {@link shouldShowDefaultVi}. */
export function useShouldShowDefaultVi(): boolean {
  const isVi = useIsVietnameseDevice();
  const [on] = useShowDefaultViPref();
  return isVi || on;
}
