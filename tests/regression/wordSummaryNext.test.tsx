/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WordSummaryPanel from '@/components/WordSummaryPanel';
import { REVIEW_INTERVALS_DAYS, firstReviewDateKey } from '@/lib/progress/reviewSchedule';

afterEach(() => vi.useRealTimers());

describe('Word Summary next review [FB-70]', () => {
  it('[FB-70] new words show today + first SRS interval, due words keep their date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-28T03:00:00Z'));
    render(
      <WordSummaryPanel
        open
        onOpenChange={() => {}}
        newList={[{ word: 'alpha', reviewCount: 0 }]}
        dueList={[{ word: 'beta', reviewCount: 2, nextReviewAt: '2026-12-01T00:00:00Z' }]}
        learnedList={[]}
        onView={() => {}}
      />
    );
    expect(screen.getByText('Review #0 · Next: 2026-11-29')).toBeTruthy();
    expect(screen.getByText('Review #2 · Next: 2026-12-01')).toBeTruthy();
    expect(screen.queryByText(/Next: —/)).toBeNull();
  });

  it('[FB-70] first review date reuses REVIEW_INTERVALS_DAYS[0] and crosses month/year ends', () => {
    expect(REVIEW_INTERVALS_DAYS[0]).toBe(1);
    expect(firstReviewDateKey(new Date('2026-11-30T10:00:00Z'))).toBe('2026-12-01');
    expect(firstReviewDateKey(new Date('2026-12-31T10:00:00Z'))).toBe('2027-01-01');
  });
});
