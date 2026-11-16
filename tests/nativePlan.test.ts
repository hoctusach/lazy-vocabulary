/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = { value: true };
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value },
}));

const splashHide = vi.fn().mockResolvedValue(undefined);
const statusBar = {
  setOverlaysWebView: vi.fn().mockResolvedValue(undefined),
  setStyle: vi.fn().mockResolvedValue(undefined),
  setBackgroundColor: vi.fn().mockResolvedValue(undefined),
};
const addListener = vi.fn().mockResolvedValue({ remove: vi.fn() });

vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: () => splashHide() } }));
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: statusBar,
  Style: { Light: 'LIGHT' },
}));
vi.mock('@capacitor/app', () => ({
  App: { addListener: (...args: unknown[]) => addListener(...args) },
}));

import { initNativeShell, pathFromAppUrl } from '@/lib/platform/nativeShell';

describe('native shell', () => {
  beforeEach(() => {
    native.value = true;
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('START-05: splash still hides when the status bar plugin rejects, with a warning and no throw', async () => {
    statusBar.setOverlaysWebView.mockRejectedValueOnce(new Error('status bar unavailable'));
    await expect(initNativeShell()).resolves.toBeUndefined();
    expect(splashHide).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('[native] status bar', expect.any(Error));
  });

  it('START-05b: does nothing when not running natively', async () => {
    native.value = false;
    await initNativeShell();
    expect(splashHide).not.toHaveBeenCalled();
    expect(statusBar.setStyle).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalled();
  });

  it('START-05c: a failing splash plugin does not throw either', async () => {
    splashHide.mockRejectedValueOnce(new Error('no splash'));
    await expect(initNativeShell()).resolves.toBeUndefined();
    expect(addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
  });

  it('NATIVE-13: parses deep links', () => {
    expect(pathFromAppUrl('https://lazyvocabulary.local/vocabulary/apple?x=1#top')).toBe('/vocabulary/apple?x=1#top');
    expect(pathFromAppUrl('lazyvocabulary://vocabulary/apple')).toBe('/vocabulary/apple');
    expect(pathFromAppUrl('lazyvocabulary://dev')).toBe('/dev');
    expect(pathFromAppUrl('lazyvocabulary://')).toBeNull();
    expect(pathFromAppUrl('https://lazyvocabulary.local')).toBe('/');
    expect(pathFromAppUrl('not a url')).toBeNull();
    expect(pathFromAppUrl('')).toBeNull();
  });
});
