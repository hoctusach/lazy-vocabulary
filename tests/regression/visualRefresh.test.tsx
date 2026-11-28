// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }));
const proEnv = vi.hoisted(() => ({ pro: true }));
vi.mock('@/config/features', () => ({ isProEnabled: () => proEnv.pro }));

import WordSummaryPanel from '@/components/WordSummaryPanel';
import { LearningProgressPanel } from '@/components/LearningProgressPanel';
import { TooltipProvider } from '@/components/ui/tooltip';
import ProCard from '@/components/mobile/ProCard';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { VocabularySetProvider } from '@/features/word-sets/VocabularySetContext';
import VocabularySetsScreen from '@/features/word-sets/VocabularySetsScreen';
import ProUpgradeSheet from '@/components/pro/ProUpgradeSheet';
import { openProUpgrade, __resetProUpgradeForTests } from '@/services/billing/proUpgradeStore';
import * as ent from '@/services/billing/entitlement';

const VI_CHARS = /[ạảãàáâấầẩẫậăắằẳẵặẹẻẽèéêếềểễệỉĩịọỏõòóôốồổỗộơớờởỡợụủũùúưứừửữựỳỷỹỵđ]/i;
beforeEach(() => {
  localStorage.clear(); ent.__resetEntitlementForTests(); __resetProUpgradeForTests();
  if (!window.matchMedia) window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never;
});
afterEach(cleanup);

const words = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => ({ word: `${prefix}${i}`, reviewCount: i, nextReviewAt: '2026-12-01T00:00:00Z', learnedDate: '2026-11-27T01:00:00Z' }));

describe('[FB-58] Word Summary keeps its content with a new section look', () => {
  const mount = (over: Partial<React.ComponentProps<typeof WordSummaryPanel>> = {}) => {
    const onView = vi.fn();
    render(<WordSummaryPanel open onOpenChange={() => {}} newList={words(2, 'n')} dueList={words(8, 'd')} learnedList={words(1, 'l')} onView={onView} {...over} />);
    return onView;
  };
  it('exposes the same data: headings with counts, every word, view buttons, a day meter; no "Today: n/20" line', () => {
    const onView = mount();
    expect(screen.getByText('NEW TODAY (2)')).toBeTruthy();
    expect(screen.getByText('DUE TODAY (8)')).toBeTruthy();
    expect(screen.getByText('LEARNED (1) today')).toBeTruthy();
    expect(screen.getByText('d7')).toBeTruthy();
    expect(screen.getByTestId('summary-day-meter')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Today:\s*\d+\/\d+/);
    fireEvent.click(screen.getByLabelText('View n1'));
    expect(onView).toHaveBeenCalledWith('n1');
    // each lane is themed by its own lane token, not hard-coded palette classes
    expect(document.querySelector('[data-lane="due"]')!.innerHTML).not.toMatch(/bg-red-|text-red-|bg-green-|text-green-/);
  });
  it('empty lanes and the empty day say so in plain English', () => {
    mount({ newList: [], dueList: [], learnedList: [] });
    expect(screen.getByText('No new words assigned today')).toBeTruthy();
    expect(screen.getByText('No due reviews today')).toBeTruthy();
    expect(screen.getByText('No learned words today')).toBeTruthy();
    expect(screen.getByText('No daily selection available yet.')).toBeTruthy();
  });
  it('title is "Word Summary" and uses the shared section title class', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Word Summary' }).className).toContain('lv-section-title');
  });
});

describe('[FB-58] Learning Progress keeps its counts in distinct tiles', () => {
  it('Learned / Due Review / Learning / New / Total tiles with the same numbers + the percentage', () => {
    render(<TooltipProvider><LearningProgressPanel progressStats={{ total: 10, learning: 5, new: 3, due: 2, learned: 4 }} learnerId="t" progressError={null} /></TooltipProvider>);
    const num = (label: string) => screen.getByText(label).previousElementSibling?.textContent ?? screen.getByText(label).parentElement!.querySelector('.lv-tile-num')!.textContent;
    expect(num('Learned')).toBe('4');
    expect(num('Due Review')).toBe('2');
    expect(num('Learning')).toBe('5');
    expect(num('New')).toBe('3');
    expect(num('Total')).toBe('10');
    expect(document.querySelectorAll('.lv-tile').length).toBe(5);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('90');
    expect(screen.getAllByRole('heading', { name: 'Learning Progress' })[0].className).toContain('lv-section-title');
  });
});

describe('[FB-58] one title style for every section / tab', () => {
  it('Library and More cards use .lv-section-title; screens use .lv-page-title', async () => {
    render(<VocabularySetProvider><VocabularySetsScreen /></VocabularySetProvider>);
    expect(screen.getByRole('heading', { level: 2, name: 'Library' }).className).toContain('lv-page-title');
    for (const t of ['Create your own set', 'Import a set']) expect(screen.getByRole('heading', { name: t }).className).toContain('lv-section-title');
    cleanup();
    render(<ProCard />);
    expect(screen.getByRole('heading', { name: 'Lazy Vocabulary Pro' }).className).toContain('lv-section-title');
    cleanup();
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
    expect(screen.getByRole('heading', { name: 'Appearance' }).className).toContain('lv-section-title');
  });
  it('the title style is defined once (font, size, weight, letter-spacing, colour) and no theme re-styles it', () => {
    const dir = path.join(process.cwd(), 'src/styles');
    const sections = fs.readFileSync(path.join(dir, 'sections.css'), 'utf8');
    expect(sections).toMatch(/\.lv-section-title\s*\{[^}]*font-family:\s*var\(--lv-font-display\)[^}]*font-weight:\s*700[^}]*letter-spacing/s);
    expect(sections).toMatch(/\.lv-section-title\s*\{\s*font-size:\s*1\.0625rem/);
    const others = fs.readdirSync(dir).filter((f) => f.endsWith('.css') && f !== 'sections.css').map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    expect(others).not.toMatch(/lv-section-title/);
    expect(fs.readFileSync(path.join(process.cwd(), 'src/main.tsx'), 'utf8')).toMatch(/sections\.css/);
    // theme-aware: only tokens, no hard-coded colours in the new file
    expect(sections.replace(/rgba?\([^)]*\)/g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe('[FB-58] English only, simple UI', () => {
  it('Restore purchases is visible with its one-line help (answers "what is restore / new phone")', async () => {
    render(<ProUpgradeSheet />);
    await act(async () => { openProUpgrade(null); });
    expect(await screen.findByRole('button', { name: 'Restore purchases' })).toBeTruthy();
    expect(screen.getByTestId('pro-restore-help').textContent).toBe('Use this if you already bought Pro, or after you get a new phone or reinstall the app.');
    expect(document.body.textContent).not.toMatch(VI_CHARS);
  });
  it('no source file ships Vietnamese UI text or a VI string table (data files and sample data excepted)', () => {
    const allowed = new Set(['src/utils/translate.ts', 'src/utils/text/contentFilters.ts', 'src/features/word-sets/sampleTemplate.ts',
      // [FB-74] explicit request: the one-time Apple voice hint ships EN + VI copy (the only VI UI string table)
      'src/services/speech/appleVoiceHint.ts']);
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name === '__tests__' || e.name === 'data') continue; walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        const rel = path.relative(process.cwd(), p);
        if (allowed.has(rel)) continue;
        const text = fs.readFileSync(p, 'utf8');
        if (VI_CHARS.test(text)) hits.push(rel);
        if (/SRS_LINE_VI|\bvi: ['"`]/.test(text)) hits.push(`${rel} (VI table)`);
      }
    };
    walk(path.join(process.cwd(), 'src'));
    expect(hits).toEqual([]);
  });
});
