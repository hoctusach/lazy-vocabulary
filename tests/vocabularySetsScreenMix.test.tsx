/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import { VocabularySetProvider } from '@/features/word-sets/VocabularySetContext';
import VocabularySetsScreen from '@/features/word-sets/VocabularySetsScreen';
import {
  BUILTIN_GROUPS,
  KEEP_ONE_SOURCE_MESSAGE,
  getSelectedSources,
  importVocabularySet,
  setSelectedSources,
  builtinGroupCounts,
} from '@/features/word-sets/vocabularySetStore';

const renderScreen = () =>
  render(
    <VocabularySetProvider>
      <VocabularySetsScreen />
    </VocabularySetProvider>
  );

const box = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

describe('[FB-18] Sets screen: multi-source checkboxes', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('[FB-24] renders the six groups with word counts, all checked by default, plus a summary', () => {
    renderScreen();
    const counts = builtinGroupCounts();
    for (const group of BUILTIN_GROUPS) {
      expect(box(`Include ${group}`).checked).toBe(true);
      expect(screen.getAllByText(`${counts[group].toLocaleString()} words`).length).toBeGreaterThan(0);
    }
    expect(box('Select all groups of Word Set: C1, C2').checked).toBe(true);
    const total = Object.values(counts).reduce((a, b) => a + b, 0); // [FB-38] row count, same as the cards + Progress Total
    expect(screen.getByTestId('selection-summary').textContent).toBe(
      `Selected: 6 sets · ${total.toLocaleString()} words`
    );
  });

  it('toggling a group updates the selection, the parent tri-state and the summary', () => {
    renderScreen();
    fireEvent.click(box('Include grammar'));
    expect(getSelectedSources()).not.toContain('default:grammar');
    expect(box('Include grammar').checked).toBe(false);
    const parent = box('Select all groups of Word Set: C1, C2');
    expect(parent.checked).toBe(false);
    expect(parent.indeterminate).toBe(true);
    expect(screen.getByTestId('selection-summary').textContent).toMatch(/^Selected: 5 sets · /);
    fireEvent.click(parent);
    expect(getSelectedSources()).toHaveLength(6);
    expect(parent.indeterminate).toBe(false);
  });

  it('imported sets get their own checkbox and can be mixed with a group', () => {
    const r = importVocabularySet('Travel', {
      c: [
        { word: 'a', meaning: 'm', example: 'e', count: 0, category: 'c' },
        { word: 'b', meaning: 'm', example: 'e', count: 0, category: 'c' },
      ],
    });
    if (r.ok === false) throw new Error(r.error);
    setSelectedSources(['default:idioms']);
    renderScreen();
    expect(box('Include Travel').checked).toBe(false);
    fireEvent.click(box('Include Travel'));
    expect(getSelectedSources()).toEqual(['default:idioms', r.set.id]);
    const idioms = builtinGroupCounts().idioms;
    expect(screen.getByTestId('selection-summary').textContent).toBe(
      `Selected: 2 sets · ${(idioms + 2).toLocaleString()} words`
    );
  });

  it('refuses to uncheck the last selected source and says why', () => {
    setSelectedSources(['default:idioms']);
    renderScreen();
    fireEvent.click(box('Include idioms'));
    expect(getSelectedSources()).toEqual(['default:idioms']);
    expect(box('Include idioms').checked).toBe(true);
    expect(screen.getByTestId('selection-note').textContent).toBe(KEEP_ONE_SOURCE_MESSAGE);
    act(() => {
      fireEvent.click(box('Include grammar'));
    });
    expect(screen.queryByTestId('selection-note')).toBeNull();
  });

  it('keeps Rename and Delete on imported sets only', () => {
    importVocabularySet('Travel', { c: [{ word: 'a', meaning: 'm', example: 'e', count: 0, category: 'c' }] });
    renderScreen();
    expect(screen.getAllByRole('button', { name: /Rename/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Delete/ })).toHaveLength(1);
  });
});
