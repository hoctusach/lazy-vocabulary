/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { initTheme, getActiveTheme, getDefaultTheme } from '@/lib/themeManager';
import * as ent from '@/services/billing/entitlement';
import { getProUpgradeState, __resetProUpgradeForTests } from '@/services/billing/proUpgradeStore';

const NOTICE = 'Your theme is now Cozy Sloth — other themes are part of Pro.';
const bodyThemes = () => [...document.body.classList].filter((c) => c.startsWith('theme-'));

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PRO', 'true');
  localStorage.clear();
  document.body.className = '';
  document.documentElement.className = '';
  ent.__resetEntitlementForTests();
  __resetProUpgradeForTests();
  toast.mockReset();
  if (!window.matchMedia) window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

const mount = () => render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);

describe('Pro theme gating', () => {
  it('flag off: default stays Margin Notes, any theme selectable, no badges', () => {
    vi.stubEnv('VITE_ENABLE_PRO', 'false');
    expect(getDefaultTheme()).toBe('notes');
    localStorage.setItem('user-theme', 'riso');
    initTheme();
    expect(bodyThemes()).toEqual(['theme-riso']);
    mount();
    expect(screen.queryAllByTestId('pro-badge')).toHaveLength(0);
    expect(toast).not.toHaveBeenCalled();
  });

  it('flag on, fresh install: Cozy Sloth, no toast', () => {
    initTheme();
    mount();
    expect(bodyThemes()).toEqual(['theme-sloth']);
    expect(toast).not.toHaveBeenCalled();
  });

  it.each(['notes', 'blocks', 'pixel', 'riso', 'mint'])(
    'free user with stored "%s": moved to sloth, dark kept, one-time toast',
    (stored) => {
      localStorage.setItem('user-theme', stored);
      localStorage.setItem('lv-dark', 'true');
      initTheme();
      mount();
      expect(bodyThemes()).toEqual(['theme-sloth']);
      expect(localStorage.getItem('user-theme')).toBe('sloth');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('sloth-dark');
      expect(toast).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(NOTICE);
      // next launch: no second toast
      cleanup(); toast.mockReset();
      initTheme(); mount();
      expect(toast).not.toHaveBeenCalled();
    }
  );

  it('Pro user keeps any stored theme, no toast', () => {
    ent.setProEntitlement();
    localStorage.setItem('user-theme', 'pixel');
    initTheme();
    mount();
    expect(bodyThemes()).toEqual(['theme-pixel']);
    expect(getActiveTheme()).toBe('pixel');
    expect(toast).not.toHaveBeenCalled();
  });

  it('locked themes show a Pro badge and tapping opens the upgrade sheet without applying', () => {
    initTheme();
    mount();
    const riso = document.querySelector('[data-theme-option="riso"]') as HTMLButtonElement;
    expect(riso.getAttribute('data-locked')).toBe('true');
    expect(riso.querySelector('[aria-label="Pro feature"]')).toBeTruthy();
    expect(document.querySelector('[data-theme-option="sloth"] [aria-label="Pro feature"]')).toBeNull();
    fireEvent.click(riso);
    expect(getProUpgradeState()).toMatchObject({ open: true, feature: 'allThemes' });
    expect(bodyThemes()).toEqual(['theme-sloth']);
    expect(localStorage.getItem('user-theme')).toBe('sloth');
  });

  it('setTheme from anywhere is guarded for free users and works after purchase', () => {
    let api!: ReturnType<typeof useTheme>;
    const Grab = () => { api = useTheme(); return null; };
    initTheme();
    render(<ThemeProvider><Grab /></ThemeProvider>);
    act(() => api.setTheme('blocks'));
    expect(api.theme).toBe('sloth');
    expect(getProUpgradeState().open).toBe(true);
    act(() => ent.setProEntitlement());
    act(() => api.setTheme('blocks'));
    expect(api.theme).toBe('blocks');
    expect(bodyThemes()).toEqual(['theme-blocks']);
  });

  it('Pro lapse (refund) falls back to sloth, keeps dark, tells the user once', () => {
    ent.setProEntitlement();
    localStorage.setItem('user-theme', 'pixel');
    localStorage.setItem('lv-dark', 'true');
    initTheme();
    let api!: ReturnType<typeof useTheme>;
    const Grab = () => { api = useTheme(); return null; };
    render(<ThemeProvider><Grab /></ThemeProvider>);
    expect(api.theme).toBe('pixel');
    act(() => ent.clearProEntitlement());
    expect(api.theme).toBe('sloth');
    expect(bodyThemes()).toEqual(['theme-sloth']);
    expect(api.isDark).toBe(true);
    expect(toast).toHaveBeenCalledWith(NOTICE);
  });
});
