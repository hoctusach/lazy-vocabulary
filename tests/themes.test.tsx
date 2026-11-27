/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import * as ent from '@/services/billing/entitlement';
import { applyTheme, getActiveTheme, initTheme, normalizeTheme, THEME_IDS, DEFAULT_THEME } from '@/lib/themeManager';

const bodyThemes = () => [...document.body.classList].filter((c) => c.startsWith('theme-'));

// Product config: Pro split on, so the default (and the only free theme) is Cozy Sloth. Theme tests run as a Pro user so every theme can be applied.
beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PRO', 'true');
  ent.__resetEntitlementForTests();
  ent.setProEntitlement();
  localStorage.clear();
  document.body.className = '';
  document.documentElement.className = '';
  if (!window.matchMedia) window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe('themeManager', () => {
  it('has the 5 real themes and defaults to sloth (Cozy Sloth)', () => {
    expect([...THEME_IDS]).toEqual(['notes', 'sloth', 'blocks', 'pixel', 'riso']);
    expect(DEFAULT_THEME).toBe('notes'); // flag-off default; the Pro split's default is the free theme
    expect(getActiveTheme()).toBe('sloth');
  });

  it('new user: initTheme applies theme-sloth', () => {
    initTheme();
    expect(bodyThemes()).toEqual(['theme-sloth']);
  });

  for (const legacy of ['mint', 'morning', 'ocean', 'sakura', 'cyber', 'default', 'dark', 'light', 'nonsense', '']) {
    it(`migrates legacy/unknown stored value "${legacy}" to sloth`, () => {
      localStorage.setItem('user-theme', legacy);
      expect(getActiveTheme()).toBe('sloth');
      initTheme();
      expect(bodyThemes()).toEqual(['theme-sloth']);
      expect(localStorage.getItem('user-theme')).toBe('sloth');
    });
  }

  for (const id of ['notes', 'sloth', 'blocks', 'pixel', 'riso']) {
    it(`persists and applies ${id}`, () => {
      applyTheme(id);
      expect(bodyThemes()).toEqual([`theme-${id}`]);
      expect(localStorage.getItem('user-theme')).toBe(id);
      document.body.className = '';
      initTheme();
      expect(bodyThemes()).toEqual([`theme-${id}`]);
    });
  }

  it('only one theme class at a time; normalizeTheme falls back', () => {
    applyTheme('pixel');
    applyTheme('riso');
    expect(bodyThemes()).toEqual(['theme-riso']);
    expect(normalizeTheme(undefined)).toBe('sloth');
    expect(normalizeTheme('mint')).toBe('sloth');
  });
});

describe('ThemeProvider + ThemeSwitcher', () => {
  const Probe = () => {
    const { theme, isDark } = useTheme();
    return <span data-testid="probe">{theme}|{String(isDark)}</span>;
  };

  it('defaults to sloth light and applies the body class', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('sloth|false');
    expect(bodyThemes()).toEqual(['theme-sloth']);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('keeps the stored dark preference and a legacy theme value becomes sloth', () => {
    localStorage.setItem('lv-dark', 'true');
    localStorage.setItem('user-theme', 'cyber');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('sloth|true');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('lv-dark')).toBe('true');
  });

  it('renders 5 themes with names and a dark toggle; clicking switches theme and persists', () => {
    render(<ThemeProvider><ThemeSwitcher /><Probe /></ThemeProvider>);
    for (const name of ['Margin Notes', 'Cozy Sloth', 'Bold Blocks', 'Pixel Quest', 'Riso Zine']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(document.querySelectorAll('[data-theme-option]').length).toBe(5);
    expect(document.querySelectorAll('.lv-swatch').length).toBe(5);
    expect(screen.getByRole('button', { name: 'Cozy Sloth' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Pixel Quest' }));
    expect(screen.getByTestId('probe').textContent).toBe('pixel|false');
    expect(bodyThemes()).toEqual(['theme-pixel']);
    expect(localStorage.getItem('user-theme')).toBe('pixel');
    expect(screen.getByRole('button', { name: 'Pixel Quest' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Cozy Sloth' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('dark toggle flips html.dark and persists, keeping the theme', () => {
    render(<ThemeProvider><ThemeSwitcher /><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Riso Zine' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('lv-dark')).toBe('true');
    expect(screen.getByTestId('probe').textContent).toBe('riso|true');
    expect(bodyThemes()).toEqual(['theme-riso']);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('lv-dark')).toBe('false');
  });
});
