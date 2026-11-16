/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

const native = { value: true };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

let backHandler: (() => void) | null = null;
const remove = vi.fn();
const minimizeApp = vi.fn().mockResolvedValue(undefined);
const exitApp = vi.fn().mockResolvedValue(undefined);
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_name: string, fn: () => void) => {
      backHandler = fn;
      return { remove };
    }),
    minimizeApp: () => minimizeApp(),
    exitApp: () => exitApp(),
  },
}));

import {
  closeTopDialog,
  decideBackAction,
  hasOpenDialog,
  useAndroidBackButton,
} from '@/components/mobile/useAndroidBackButton';
import type { AppTab } from '@/components/mobile/BottomTabBar';

describe('NATIVE-01..04: decideBackAction (pure)', () => {
  it('closes an open dialog first, whatever the tab', () => {
    for (const tab of ['learn', 'progress', 'sets', 'more'] as AppTab[]) {
      expect(decideBackAction({ hasOpenDialog: true, tab })).toBe('close-dialog');
    }
  });
  it('goes back to Learn from any other tab', () => {
    for (const tab of ['progress', 'sets', 'more'] as AppTab[]) {
      expect(decideBackAction({ hasOpenDialog: false, tab })).toBe('go-learn');
    }
  });
  it('minimizes from the Learn tab with nothing open', () => {
    expect(decideBackAction({ hasOpenDialog: false, tab: 'learn' })).toBe('minimize');
  });
});

describe('NATIVE-01..04: useAndroidBackButton', () => {
  beforeEach(() => {
    native.value = true;
    backHandler = null;
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });
  afterEach(() => cleanup());

  const Harness: React.FC<{ tab: AppTab; setTab: (t: AppTab) => void }> = ({ tab, setTab }) => {
    useAndroidBackButton(tab, setTab);
    return null;
  };

  it('Learn tab, nothing open: minimizes the app', async () => {
    render(<Harness tab="learn" setTab={vi.fn()} />);
    await waitFor(() => expect(backHandler).not.toBeNull());
    backHandler!();
    await waitFor(() => expect(minimizeApp).toHaveBeenCalledTimes(1));
  });

  it('other tab: switches to Learn and does not minimize', async () => {
    const setTab = vi.fn();
    render(<Harness tab="sets" setTab={setTab} />);
    await waitFor(() => expect(backHandler).not.toBeNull());
    backHandler!();
    expect(setTab).toHaveBeenCalledWith('learn');
    expect(minimizeApp).not.toHaveBeenCalled();
  });

  it('open dialog: sends Escape to close it and does not change tab or minimize', async () => {
    const setTab = vi.fn();
    document.body.insertAdjacentHTML('beforeend', '<div role="dialog" data-state="open"><button id="b">x</button></div>');
    const escapes = vi.fn();
    document.addEventListener('keydown', (e) => e.key === 'Escape' && escapes());
    render(<Harness tab="progress" setTab={setTab} />);
    await waitFor(() => expect(backHandler).not.toBeNull());
    expect(hasOpenDialog()).toBe(true);
    backHandler!();
    expect(escapes).toHaveBeenCalledTimes(1);
    expect(setTab).not.toHaveBeenCalled();
    expect(minimizeApp).not.toHaveBeenCalled();
  });

  it('uses the latest tab without re-registering the listener', async () => {
    const setTab = vi.fn();
    const { rerender } = render(<Harness tab="learn" setTab={setTab} />);
    await waitFor(() => expect(backHandler).not.toBeNull());
    rerender(<Harness tab="more" setTab={setTab} />);
    backHandler!();
    expect(setTab).toHaveBeenCalledWith('learn');
  });

  it('falls back to exitApp if minimize is unavailable', async () => {
    minimizeApp.mockRejectedValueOnce(new Error('nope'));
    render(<Harness tab="learn" setTab={vi.fn()} />);
    await waitFor(() => expect(backHandler).not.toBeNull());
    backHandler!();
    await waitFor(() => expect(exitApp).toHaveBeenCalled());
  });

  it('removes the listener on unmount', async () => {
    const { unmount } = render(<Harness tab="learn" setTab={vi.fn()} />);
    await waitFor(() => expect(backHandler).not.toBeNull());
    unmount();
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });

  it('registers nothing in a plain browser', async () => {
    native.value = false;
    render(<Harness tab="learn" setTab={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(backHandler).toBeNull();
  });

  it('closeTopDialog is safe with no dialog', () => {
    expect(() => closeTopDialog()).not.toThrow();
  });
});
