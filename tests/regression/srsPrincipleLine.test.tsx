// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';

const vi_ = vi.hoisted(() => ({ isVi: false }));
vi.mock('@/utils/deviceLanguage', () => ({ useIsVietnameseDevice: () => vi_.isVi, isVietnameseDevice: () => vi_.isVi }));

const EN = 'Review right before you forget — remember it for good';
const VI = 'Nghe lại đúng lúc sắp quên — nhớ lâu hơn';

describe('[FB-34] always-visible SRS principle line', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(cleanup);
  const mount = async (fixed = true) => {
    const { default: L } = await import('@/features/srs-principle/SrsPrincipleLine');
    return render(<><nav data-bottom-tab-bar /><L fixed={fixed} /></>);
  };

  it('shows the English line, with no numeric claims', async () => {
    vi_.isVi = false; await mount();
    const el = screen.getByTestId('srs-principle');
    expect(el.textContent).toBe(EN);
    expect(el.textContent).not.toMatch(/\d|never forget|month/i);
  });
  it('shows the Vietnamese line', async () => {
    vi_.isVi = true; await mount();
    expect(screen.getByTestId('srs-principle').textContent).toBe(VI);
  });
  it('is always visible: no dismiss button, no collapse, no "Why?" and nothing stored', async () => {
    vi_.isVi = false; await mount();
    expect(screen.queryByLabelText('Dismiss')).toBeNull();
    expect(screen.queryByText('Why?')).toBeNull();
    expect(screen.queryByTestId('srs-tip')).toBeNull();
    expect(localStorage.length).toBe(0);
  });
  it('old collapsible tip (SrsTipCard, 20-words-a-day claims) is removed from source', async () => {
    const { existsSync, readFileSync } = await import('node:fs');
    expect(existsSync('src/features/srs-tip')).toBe(false);
    const app = readFileSync('src/components/VocabularyAppWithLearning.tsx', 'utf8');
    expect(app).not.toMatch(/SrsTipCard|srs-tip/);
    expect(app).toContain('SrsPrincipleLine');
  });
  it('tap opens a brief explanation with the real review intervals (EN and VI)', async () => {
    vi_.isVi = false; await mount();
    expect(screen.queryByTestId('srs-principle-dialog')).toBeNull();
    fireEvent.click(screen.getByTestId('srs-principle'));
    expect(screen.getByTestId('srs-principle-dialog')).toBeTruthy();
    expect(screen.getByTestId('srs-principle-intervals').textContent).toBe('Next reviews for a word: after 1, 2, 3, 5, 7, 10, 14, 21, 28, 35 days, then every 60 days.');
    cleanup();
    vi_.isVi = true; await mount();
    fireEvent.click(screen.getByTestId('srs-principle'));
    expect(screen.getByTestId('srs-principle-intervals').textContent).toContain('sau 1, 2, 3, 5, 7');
  });
  it('is themed: only CSS variables (all 5 themes) and the shared themed popup', async () => {
    vi_.isVi = false; await mount();
    const style = (screen.getByTestId('srs-principle') as HTMLElement).getAttribute('style') ?? '';
    expect(style).toMatch(/var\(--lv-card-bg\)/);
    expect(style).toMatch(/var\(--lv-accent\)/);
    expect(style).not.toMatch(/#[0-9a-f]{3,8}|rgb\(/i);
    fireEvent.click(screen.getByTestId('srs-principle'));
    expect(document.querySelector('[role="dialog"]')?.className).toContain('lv-popup');
  });
  it('sits above the dock: fixed above the tab bar + ad slot, and Learn reserves space for it', async () => {
    vi_.isVi = false;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ height: 60 } as DOMRect));
    await mount();
    const wrap = screen.getByTestId('srs-principle-wrap') as HTMLElement;
    expect(wrap.className).toContain('fixed');
    expect(wrap.style.bottom).toBe('calc(60px + var(--ad-slot, 0px))');
    vi.restoreAllMocks();
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/pages/Index.tsx', 'utf8')).toMatch(/tab === 'learn' \? '7\.25rem'/);
  });
});
