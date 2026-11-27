/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readPreferencesFromStorage,
  writePreferencesToStorage,
  hasLocalStorage,
} from '@/lib/preferences/localPreferences';
import * as ent from '@/services/billing/entitlement';
import { applyTheme, getActiveTheme, initTheme } from '@/lib/themeManager';
import { getSession, loadSessionOnBoot } from '@/lib/customAuth';
import { clearLegacyCustomWordKeys } from '@/lib/cleanup/clearLegacyCustomWordKeys';
import { clearLegacyStreakKeys } from '@/lib/cleanup/clearLegacyStreakKeys';

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PRO', 'true'); // product config: Cozy Sloth is the default/free theme
  ent.__resetEntitlementForTests();
  localStorage.clear();
  document.body.className = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('PERSIST-08: corrupt lv_preferences', () => {
  it('uses defaults and overwrites the bad value on the next change', () => {
    localStorage.setItem('lv_preferences', '{bad');
    const prefs = readPreferencesFromStorage();
    expect(prefs).toMatchObject({ is_muted: false, is_playing: true, daily_option: null });
    writePreferencesToStorage({ is_muted: true });
    expect(JSON.parse(localStorage.getItem('lv_preferences')!)).toMatchObject({ is_muted: true, is_playing: true });
  });

  it('blocked localStorage (property getter throws) does not crash', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(hasLocalStorage()).toBe(false);
    expect(() => readPreferencesFromStorage()).not.toThrow();
    expect(() => writePreferencesToStorage({ is_muted: true })).not.toThrow();
    expect(readPreferencesFromStorage().is_playing).toBe(true);
  });
});

describe('PERSIST-10: corrupt auth JSON', () => {
  it('loadSessionOnBoot ignores a corrupt lazyVoca.auth', () => {
    localStorage.setItem('lazyVoca.auth', '{x');
    expect(() => loadSessionOnBoot()).not.toThrow();
    expect(getSession()).toBeNull();
  });

  it('corrupt lazyVoca.authState does not break the stored-auth readers', async () => {
    localStorage.setItem('lazyVoca.authState', '{x');
    localStorage.setItem('lazyVoca.auth', '{x');
    vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: () => ({}) }));
    const auth = await import('@/lib/auth');
    expect(() => auth.getStoredPasscode()).not.toThrow();
    expect(auth.getStoredPasscode()).toBeNull();
    await expect(auth.getActiveSession()).resolves.toBeNull();
  });
});

describe('THEME-11: unknown or unreadable stored theme', () => {
  it('falls back to the default (sloth) for an unknown value', () => {
    localStorage.setItem('user-theme', 'bogus');
    initTheme();
    expect(document.body.classList.contains('theme-sloth')).toBe(true);
    expect(getActiveTheme()).toBe('sloth');
    expect(localStorage.getItem('user-theme')).toBe('sloth');
  });

  it('keeps a valid theme (Pro user)', () => {
    ent.setProEntitlement();
    applyTheme('blocks');
    expect(document.body.classList.contains('theme-blocks')).toBe(true);
    expect(document.body.classList.contains('theme-sloth')).toBe(false);
  });

  it('blocked storage still applies the default (sloth) without crashing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => initTheme()).not.toThrow();
    expect(document.body.classList.contains('theme-sloth')).toBe(true);
    expect(getActiveTheme()).toBe('sloth');
  });
});

describe('START-06: boot cleanup', () => {
  it('removes legacy keys and leaves unrelated keys alone', () => {
    for (const k of ['category:foo', 'Category:Bar', 'customWords', 'streakDays', 'badges']) localStorage.setItem(k, '1');
    for (const k of ['lv_preferences', 'lv.vocabularySets.v1', 'lv.vocabularySets.data.x', 'user-theme']) localStorage.setItem(k, 'keep');
    clearLegacyCustomWordKeys();
    clearLegacyStreakKeys();
    for (const k of ['category:foo', 'Category:Bar', 'customWords', 'streakDays', 'badges']) expect(localStorage.getItem(k)).toBeNull();
    for (const k of ['lv_preferences', 'lv.vocabularySets.v1', 'lv.vocabularySets.data.x', 'user-theme']) expect(localStorage.getItem(k)).toBe('keep');
  });

  it('does not throw when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => clearLegacyCustomWordKeys()).not.toThrow();
    expect(() => clearLegacyStreakKeys()).not.toThrow();
  });
});
