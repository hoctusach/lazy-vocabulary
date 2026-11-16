/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mergeSearchResults, localWordToResult, type SearchResultRow } from '@/services/search/mergeSearchResults';
import { setAllWordsOverride } from '@/utils/allWords';
import { invalidateVocabularyIndex } from '@/services/search/vocabularyIndex';

const rpc = vi.fn();
vi.mock('@/lib/supabaseClient', () => ({ getSupabaseClient: () => ({ rpc }) }));
vi.mock('@/services/analyticsService', () => ({ trackUiInteraction: vi.fn(), trackWordSearch: vi.fn() }));
vi.mock('@/components/vocabulary-app/VocabularyCard', () => ({
  default: ({ word }: { word: string }) => <div data-testid="card">{word}</div>,
}));

import WordSearchModal from '@/components/vocabulary-app/WordSearchModal';

const serverRow = (word: string, category = 'idioms'): SearchResultRow => ({
  word_id: `srv-${word}`, word, category, meaning: 'm', example: 'e', translation: null, match_rank: 10,
});

describe('search result merging', () => {
  it('SEARCH-03: local words first, duplicates by word+category removed', () => {
    const local = [localWordToResult({ word: 'Alpha', meaning: 'm', example: '', category: 'imported' })];
    const server = [serverRow('alpha', 'imported'), serverRow('alpha', 'other')];
    const merged = mergeSearchResults(local, server);
    expect(merged.map((r) => r.word_id)).toEqual([local[0].word_id, 'srv-alpha']);
    expect(merged).toHaveLength(2);
  });
});

describe('Quick search modal', () => {
  beforeEach(async () => {
    (globalThis as unknown as { expect: typeof expect }).expect = expect;
    await import('@testing-library/jest-dom');
    rpc.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    setAllWordsOverride([
      { word: 'zebra crossing', meaning: 'a place to cross', example: '', category: 'imported', count: 0 },
    ]);
    invalidateVocabularyIndex();
  });
  afterEach(() => {
    cleanup();
    setAllWordsOverride(null);
    invalidateVocabularyIndex();
    vi.restoreAllMocks();
  });

  // The matching part of a word is wrapped in <mark>, so match on the row's full text.
  const row = (text: string) =>
    screen.findByText((_, el) => el?.tagName === 'SPAN' && el.textContent === text);

  async function search(text: string) {
    render(<WordSearchModal isOpen onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('Search word...'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  }

  it('SEARCH-03: finds a word from the active imported set even though the server never saw it', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await search('zebra');
    expect(await row('zebra crossing')).toBeInTheDocument();
    expect(screen.queryByText('No results found.')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('SEARCH-04: when the server call fails, local matches still show with an offline hint', async () => {
    rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await search('zebra');
    expect(await row('zebra crossing')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/only searched the word set on this device/);
    expect(screen.queryByText('No results found.')).toBeNull();
  });

  it('SEARCH-05: server error with no local match shows the offline hint plus "No results found."', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    await search('qqqqqq');
    expect(await screen.findByText('No results found.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Check your connection/);
  });

  it('SEARCH-06: server results are merged after local ones when online', async () => {
    rpc.mockResolvedValue({ data: [serverRow('zebra stripes')], error: null });
    await search('zebra');
    await row('zebra stripes');
    expect(await row('zebra crossing')).toBeInTheDocument();
  });
});
