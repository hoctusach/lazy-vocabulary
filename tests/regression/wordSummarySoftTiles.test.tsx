/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import WordSummaryPanel from '@/components/WordSummaryPanel';

afterEach(cleanup);

const mount = () => {
  const onView = vi.fn();
  render(
    <WordSummaryPanel
      open
      onOpenChange={() => {}}
      newList={[{ word: 'alpha', reviewCount: 0 }]}
      dueList={[{ word: 'beta', reviewCount: 2, nextReviewAt: '2026-12-01T00:00:00Z' }]}
      learnedList={[{ word: 'gamma', learnedDate: '2026-11-27T01:00:00Z' }]}
      onView={onView}
    />
  );
  return onView;
};

describe('Word Summary soft-tile rows [FB-71]', () => {
  it('[FB-71] each row is a single button with aria-label, a chevron and no eye icon', () => {
    mount();
    const rows = document.querySelectorAll('button.lv-row');
    expect(rows.length).toBe(3);
    expect(screen.getByLabelText('View alpha')).toBe(rows[0]);
    expect(screen.getByLabelText('View Word')).toBe(rows[2]);
    rows.forEach((r) => {
      expect(r.getAttribute('type')).toBe('button');
      expect(r.querySelector('button')).toBeNull();
      expect(r.querySelector('.lv-row-chev')).toBeTruthy();
      expect(r.querySelector('.lucide-eye')).toBeNull();
    });
    expect(document.querySelector('[data-testid="word-summary-section"] .lucide-eye')).toBeNull();
  });

  it('[FB-71] tapping the title, subtitle, chevron or the row itself calls onView(word)', () => {
    const onView = mount();
    const row = screen.getByLabelText('View beta');
    fireEvent.click(row.querySelector('.lv-row-word')!);
    fireEvent.click(row.querySelector('.lv-row-meta')!);
    fireEvent.click(row.querySelector('.lv-row-chev')!);
    fireEvent.click(row);
    expect(onView).toHaveBeenCalledTimes(4);
    expect(onView.mock.calls.every((c) => c[0] === 'beta')).toBe(true);
  });

  it('[FB-71] it is a native button, so Enter/Space activate it (not a div)', () => {
    mount();
    const row = screen.getByLabelText('View alpha');
    expect(row.tagName).toBe('BUTTON');
    expect(row.hasAttribute('disabled')).toBe(false);
    expect(row.getAttribute('tabindex')).not.toBe('-1');
  });

  it('[FB-71] the FB-70 subtitle is kept', () => {
    mount();
    expect(screen.getByText('Review #0 · Next: after you learn it')).toBeTruthy();
    expect(screen.getByText('Review #2 · Next: 2026-12-01')).toBeTruthy();
  });

  it('[FB-71] CSS: soft ~6% tint, no border, no inset left bar, lane chevron, pressed state', () => {
    const css = readFileSync('src/styles/sections.css', 'utf8');
    const rule = css.match(/\.lv-row \{[^}]*\}/)![0];
    expect(rule).toMatch(/color-mix\(in srgb, var\(--lane\) 6%/);
    expect(rule).toMatch(/border: 0/);
    expect(rule).not.toMatch(/border-left/);
    expect(css).toMatch(/\.lv-row:active/);
    expect(css).toMatch(/\.lv-row-chev \{[^}]*var\(--lane\)/);
  });
});
