import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import type { AppTab } from './BottomTabBar';

export type BackAction = 'close-dialog' | 'go-learn' | 'minimize';

/**
 * What the Android hardware back button should do. Kept pure so it can be unit tested:
 * close an open dialog first, then return to Learn from any other tab, otherwise send
 * the app to the background (the usual Android behaviour from the home screen).
 */
export function decideBackAction(state: { hasOpenDialog: boolean; tab: AppTab }): BackAction {
  if (state.hasOpenDialog) return 'close-dialog';
  if (state.tab !== 'learn') return 'go-learn';
  return 'minimize';
}

const OPEN_DIALOG_SELECTOR =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

export function hasOpenDialog(doc: Document = document): boolean {
  return doc.querySelector(OPEN_DIALOG_SELECTOR) !== null;
}

/** Radix dialogs close on Escape, so this closes whichever one is on top without touching its state. */
export function closeTopDialog(doc: Document = document): void {
  const target = (doc.activeElement as HTMLElement | null) ?? doc.body;
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true })
  );
}

/** Wires the hardware back button (native only). */
export function useAndroidBackButton(tab: AppTab, setTab: (tab: AppTab) => void): void {
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const setTabRef = useRef(setTab);
  setTabRef.current = setTab;

  useEffect(() => {
    let isNative = false;
    try {
      isNative = Capacitor.isNativePlatform();
    } catch {
      isNative = false;
    }
    if (!isNative) return undefined;

    let removed = false;
    let handle: { remove: () => Promise<void> | void } | null = null;

    void import('@capacitor/app')
      .then(async ({ App }) => {
        const listener = await App.addListener('backButton', () => {
          const action = decideBackAction({ hasOpenDialog: hasOpenDialog(), tab: tabRef.current });
          if (action === 'close-dialog') closeTopDialog();
          else if (action === 'go-learn') setTabRef.current('learn');
          else void App.minimizeApp().catch(() => App.exitApp());
        });
        if (removed) void listener.remove();
        else handle = listener;
      })
      .catch((error) => console.warn('[native] back button', error));

    return () => {
      removed = true;
      void handle?.remove();
    };
  }, []);
}
