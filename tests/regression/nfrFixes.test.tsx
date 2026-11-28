// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { loadXlsx, getLoadedXlsx } from '@/lib/xlsxLoader';

const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

afterEach(() => vi.useRealTimers());

describe('NFR fixes', () => {
  it('[FB-80] tablet Learn stack fills (and never exceeds) the viewport at 768-815px', () => {
    const css = read('src/styles/tablet.css');
    const rule = css.match(/@media \(min-width: 768px\) \{[\s\S]*?\.lv-learn-stack \{([^}]*)\}/)![1];
    expect(rule).toMatch(/width:\s*100%/);
    expect(rule).toMatch(/min-width:\s*0/);
  });

  it('[FB-81] Bold Blocks empty translation placeholder keeps >= 4.5:1 on the accent', () => {
    const css = read('src/styles/themes.css');
    const m = css.match(/theme-blocks \.lv-translation em\[data-empty\] \{([^}]*)\}/)!;
    expect(m[1]).toMatch(/opacity:\s*1/);
    const color = m[1].match(/color:\s*(#[0-9a-f]{6})/i)![1];
    expect(ratio(color, '#FF5A36')).toBeGreaterThanOrEqual(4.5);
  });

  it('[FB-82] week strip and Library rows can wrap at 200% font', () => {
    expect(read('src/components/vocabulary-app/StreakPanel.tsx')).toMatch(/flex flex-wrap items-center justify-between/);
    const lib = read('src/features/word-sets/VocabularySetsScreen.tsx');
    expect(lib).toMatch(/min-w-0 flex-1 break-words capitalize/);
    expect(lib).toMatch(/whitespace-normal/);
  });

  it('[FB-83] loading timeout fires after the limit and resets', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ p }) => useLoadingTimeout(p, 8000), { initialProps: { p: true } });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(7999); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(2); });
    expect(result.current).toBe(true);
    rerender({ p: false });
    expect(result.current).toBe(false);
  });

  it('[FB-83] Learn falls back to bundled words after DAILY_SELECTION_TIMEOUT_MS (8-10 s)', () => {
    const src = read('src/components/VocabularyAppWithLearning.tsx');
    const ms = Number(src.match(/DAILY_SELECTION_TIMEOUT_MS = (\d+)/)![1]);
    expect(ms).toBeGreaterThanOrEqual(8000);
    expect(ms).toBeLessThanOrEqual(10000);
    expect(src).toMatch(/useLoadingTimeout\(dailySelectionPending/);
  });

  it('[FB-84] xlsx is loaded on demand and not imported statically anywhere in src', async () => {
    expect(() => getLoadedXlsx).not.toThrow();
    const x = await loadXlsx();
    expect(typeof x.read).toBe('function');
    const offenders: string[] = [];
    const walk = (d: string) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).forEach((e) => {
      const rel = path.join(d, e.name);
      if (e.isDirectory()) return walk(rel);
      if (/\.(ts|tsx)$/.test(e.name) && /^\s*import\s+(?!type\b)[^;]*from\s+['"]xlsx['"]/m.test(read(rel))) offenders.push(rel);
    });
    walk('src');
    expect(offenders).toEqual([]);
  });

  it('[FB-84] vocabulary JSON is split into its own chunk', () => {
    expect(read('vite.config.ts')).toMatch(/defaultVocabulary\.json'\)\) return 'vocab-data'/);
  });
});
