// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import { VocabularySetProvider } from '@/features/word-sets/VocabularySetContext';
import VocabularySetsScreen from '@/features/word-sets/VocabularySetsScreen';
import BottomTabBar from '@/components/mobile/BottomTabBar';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('[FB-59] the Sets tab is called Library', () => {
  it('tab label and screen title say Library; nothing says "Sets" as a tab', () => {
    const { container } = render(<BottomTabBar tab="sets" onChange={() => {}} />);
    const labels = [...container.querySelectorAll('.lv-tab-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Learn', 'Progress', 'Library', 'More']);
    cleanup();
    render(<VocabularySetProvider><VocabularySetsScreen /></VocabularySetProvider>);
    expect(screen.getByRole('heading', { level: 2, name: 'Library' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /^Word sets$/i })).toBeNull();
  });
});

describe('[FB-60] import card: CSV and Excel only, one row, short help', () => {
  it('shows exactly Download CSV and Download Excel side by side; no JSON, no "Template"', () => {
    render(<VocabularySetProvider><VocabularySetsScreen /></VocabularySetProvider>);
    const row = screen.getByTestId('example-files-row');
    expect([...row.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Download CSV', 'Download Excel']);
    expect(row.className).toContain('grid-cols-2');
    const card = row.parentElement!;
    expect(card.textContent).not.toMatch(/json/i);
    expect(card.textContent).not.toMatch(/template/i);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).not.toMatch(/json/i);
    expect(input.accept).toMatch(/csv/);
    expect(input.accept).toMatch(/xlsx/);
  });
  it('help is four separate lines', () => {
    render(<VocabularySetProvider><VocabularySetsScreen /></VocabularySetProvider>);
    const lines = [...screen.getByTestId('template-category-help').querySelectorAll('li')].map((l) => l.textContent);
    expect(lines).toEqual([
      'Required columns: word, meaning',
      'Optional: example, translation, category',
      'Categories: topic vocab, phrasal verbs, idioms, grammar, phrases, collocations, word formation',
      'Other category names make their own group. Blank means imported.',
    ]);
  });
});
