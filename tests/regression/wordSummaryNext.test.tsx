/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WordSummaryPanel from '@/components/WordSummaryPanel';

describe('Word Summary next review [FB-70]', () => {
  it('[FB-70] new words show a label, due words keep their date', () => {
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
    expect(screen.getByText('Review #0 · Next: after you learn it')).toBeTruthy();
    expect(screen.getByText('Review #2 · Next: 2026-12-01')).toBeTruthy();
    expect(screen.queryByText(/Next: —/)).toBeNull();
  });
});
