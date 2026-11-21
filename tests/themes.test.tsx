/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { applyTheme, getActiveTheme, initTheme, normalizeTheme, THEME_IDS, DEFAULT_THEME } from '@/lib/themeManager';

const bodyThemes = () => [...document.body.classList].filter((c) => c.startsWith('theme-'));

beforeEach(() => {
  localStorage.clear();
  document.body.className = '';
  document.documentElement.className = '';
  if (!window.matchMedia) window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
});
afterEach(() => cleanup());

describe('themeManager', () => {
  it('has the 5 real themes and defaults to notes', () => {
    expect([...THEME_IDS]).toEqual(['notes', 'sloth', 'blocks', 'pixel', 'riso']);
    expect(DEFAULT_THEME).toBe('notes');
    expect(getActiveTheme()).toBe('notes');
  });

  it('new user: initTheme applies theme-notes', () => {
    initTheme();
    expect(bodyThemes()).toEqual(['theme-notes']);
  });

  for (const legacy of ['mint', 'morning', 'ocean', 'sakura', 'cyber', 'default', 'dark', 'light', 'nonsense', '']) {
    it(`migrates legacy/unknown stored value "${legacy}" to notes`, () => {
      localStorage.setItem('user-theme', legacy);
      expect(getActiveTheme()).toBe('notes');
      initTheme();
      expect(bodyThemes()).toEqual(['theme-notes']);
      expect(localStorage.getItem('user-theme')).toBe('notes');
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
    expect(normalizeTheme(undefined)).toBe('notes');
    expect(normalizeTheme('mint')).toBe('notes');
  });
});

describe('ThemeProvider + ThemeSwitcher', () => {
  const Probe = () => {
    const { theme, isDark } = useTheme();
    return <span data-testid="probe">{theme}|{String(isDark)}</span>;
  };

  it('defaults to notes light and applies the body class', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('notes|false');
    expect(bodyThemes()).toEqual(['theme-notes']);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('keeps the stored dark preference and a legacy theme value becomes notes', () => {
    localStorage.setItem('lv-dark', 'true');
    localStorage.setItem('user-theme', 'cyber');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('notes|true');
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
    expect(screen.getByRole('button', { name: 'Margin Notes' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Pixel Quest' }));
    expect(screen.getByTestId('probe').textContent).toBe('pixel|false');
    expect(bodyThemes()).toEqual(['theme-pixel']);
    expect(localStorage.getItem('user-theme')).toBe('pixel');
    expect(screen.getByRole('button', { name: 'Pixel Quest' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Margin Notes' }).getAttribute('aria-pressed')).toBe('false');
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
