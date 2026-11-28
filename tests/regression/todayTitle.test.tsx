/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import WordSummaryPanel from '@/components/WordSummaryPanel';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';

afterEach(cleanup);

describe('[FB-85] summary card is titled TODAY', () => {
  it('heading is TODAY and "Word Summary" is not shown', () => {
    const { container } = render(
      <WordSummaryPanel open onOpenChange={() => {}} error={null} newList={[]} dueList={[]} learnedList={[]} onView={() => {}} />,
    );
    expect(screen.getByRole('heading', { name: 'TODAY' })).toBeTruthy();
    expect(container.textContent).not.toContain('Word Summary');
    expect(container.innerHTML).not.toContain('Word Summary');
  });

  it('the notification card code is untouched by the rename', () => {
    const src = readFileSync(join(__dirname, '../../src/components/WordSummaryPanel.tsx'), 'utf8');
    expect(src).not.toMatch(/>\s*Word Summary\s*</);
  });
});

describe('[FB-86] vocabulary key "asthma"', () => {
  const all = Object.entries(DEFAULT_VOCABULARY_DATA).flatMap(([g, rows]) => rows.map((r) => ({ ...r, group: g })));
  it('has exactly one asthma entry and no AsomethingMA corruption', () => {
    expect(all.filter((r) => r.word.toLowerCase() === 'asthma').map((r) => r.word)).toEqual(['asthma']);
    expect(all.some((r) => /[a-z]something|something[a-z]|AsomethingMA/i.test(r.word))).toBe(false);
  });
  it('asthma keeps its meaning and translation', () => {
    const a = all.find((r) => r.word === 'asthma')!;
    expect(a.meaning).toMatch(/difficulty in breathing/);
    expect(a.translation).toBe('hen suyễn');
  });
});
