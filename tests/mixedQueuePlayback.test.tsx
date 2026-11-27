/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VocabularyWord } from '@/types/vocabulary';

type MixedWord = VocabularyWord & { sourceId?: string };
const containerProps: {
  initialWords?: MixedWord[];
  onMarkWordLearned?: (word: string, category?: string, sourceId?: string) => void;
} = {};

vi.mock('@/components/vocabulary-app/VocabularyAppContainerNew', () => ({
  default: (props: typeof containerProps) => {
    containerProps.initialWords = props.initialWords;
    containerProps.onMarkWordLearned = props.onMarkWordLearned;
    return <div data-testid="container" />;
  },
}));
vi.mock('@/hooks/useDailyUsageTracker', () => ({ useDailyUsageTracker: () => undefined }));

const learning = {
  dailySelection: null,
  progressStats: { total: 0, learning: 0, new: 0, due: 0, learned: 0 },
  generateDailyWords: vi.fn(),
  markWordAsPlayed: vi.fn(),
  markWordLearned: vi.fn(),
  markWordAsNew: vi.fn(),
  todayWords: [] as unknown[],
  learnedWords: [],
  newTodayLearnedWords: [],
  dueTodayLearnedWords: [],
  isDailySelectionLoading: false,
  progressError: null,
};
const useLearningProgress = vi.fn((_options?: unknown) => learning);
vi.mock('@/hooks/useLearningProgress', () => ({ useLearningProgress: (o: unknown) => useLearningProgress(o) }));

import VocabularyAppWithLearning from '@/components/VocabularyAppWithLearning';
import { VocabularySetProvider, useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import {
  getSetProgress,
  importVocabularySet,
  setSelectedSources,
  wordKey,
} from '@/features/word-sets/vocabularySetStore';

const mount = () =>
  render(
    <VocabularySetProvider>
      <VocabularyAppWithLearning view="learn" />
    </VocabularySetProvider>
  );

const setSheets = {
  mine: [
    { word: 'alpha', meaning: 'm', example: 'e', count: 0, category: 'mine' },
    { word: 'beta', meaning: 'm', example: 'e', count: 0, category: 'mine' },
  ],
};

describe('[FB-18] mixed learning queue', () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    learning.todayWords = [];
    useLearningProgress.mockClear();
    containerProps.initialWords = undefined;
  });

  it('contains only the selected sources, each item tagged, and the hook gets the selected groups', () => {
    const imported = importVocabularySet('Mine', setSheets);
    if (imported.ok === false) throw new Error(imported.error);
    setSelectedSources(['default:idioms', imported.set.id]);
    mount();

    const words = containerProps.initialWords ?? [];
    expect(words.length).toBeGreaterThan(2);
    const builtin = words.filter((w) => w.sourceId === 'default');
    const mine = words.filter((w) => w.sourceId === imported.set.id);
    expect(builtin.length + mine.length).toBe(words.length);
    expect(builtin.every((w) => w.category === 'idioms')).toBe(true);
    expect(mine.map((w) => w.word).sort()).toEqual(['alpha', 'beta']);
    // round-robin: the first imported word shows up right after the first built-in one
    expect(words[0].sourceId).toBe('default');
    expect(words[1].sourceId).toBe(imported.set.id);
    expect(useLearningProgress).toHaveBeenLastCalledWith({ builtinGroups: ['idioms'] });
  });

  it('server daily words are narrowed to the selected groups', () => {
    learning.todayWords = [
      { word_id: 'i::idioms', word: 'i', meaning: 'm', example: 'e', count: 0, category: 'idioms' },
      { word_id: 'g::grammar', word: 'g', meaning: 'm', example: 'e', count: 0, category: 'grammar' },
    ];
    setSelectedSources(['default:idioms', 'default:word formation']);
    mount();
    expect(containerProps.initialWords?.map((w) => w.word)).toEqual(['i']);
  });

  it('no built-in group: only imported words, no built-in queue', () => {
    const imported = importVocabularySet('Mine', setSheets);
    if (imported.ok === false) throw new Error(imported.error);
    setSelectedSources([imported.set.id]);
    learning.todayWords = [
      { word_id: 'i::idioms', word: 'i', meaning: 'm', example: 'e', count: 0, category: 'idioms' },
    ];
    mount();
    expect(containerProps.initialWords?.every((w) => w.sourceId === imported.set.id)).toBe(true);
    expect(useLearningProgress).toHaveBeenLastCalledWith({ builtinGroups: [] });
  });

  it('routes mark-learned per source', () => {
    const a = importVocabularySet('A', setSheets);
    const b = importVocabularySet('B', setSheets);
    if (a.ok === false || b.ok === false) throw new Error('import failed');
    setSelectedSources(['default:idioms', a.set.id, b.set.id]);
    mount();

    // imported: only that set's progress changes, even though B has the same word + category
    act(() => containerProps.onMarkWordLearned?.('alpha', 'mine', b.set.id));
    expect(getSetProgress(b.set.id).learned[wordKey('alpha', 'mine')]).toBeTruthy();
    expect(getSetProgress(a.set.id).learned[wordKey('alpha', 'mine')]).toBeUndefined();
    expect(learning.markWordLearned).not.toHaveBeenCalled();

    // built-in: existing account path
    act(() => containerProps.onMarkWordLearned?.('some idiom', 'idioms', 'default'));
    expect(learning.markWordLearned).toHaveBeenCalledWith('some idiom');

    // no source given: resolved from the queue
    act(() => containerProps.onMarkWordLearned?.('beta', 'mine'));
    expect(
      Object.keys(getSetProgress(a.set.id).learned).concat(Object.keys(getSetProgress(b.set.id).learned))
    ).toContain(wordKey('beta', 'mine'));
  });

  it('default selection (signed out / offline): local words from all six groups, all built-in', () => {
    mount();
    const words = containerProps.initialWords ?? [];
    expect(words.length).toBeGreaterThan(100);
    expect(words.every((w) => w.sourceId === 'default')).toBe(true);
    expect(new Set(words.map((w) => w.category)).size).toBe(6);
    expect(useLearningProgress).toHaveBeenLastCalledWith({
      builtinGroups: expect.arrayContaining(['idioms', 'grammar', 'topic vocab']),
    });
  });

  it('signed out with two groups: local fallback holds only those two groups', () => {
    setSelectedSources(['default:idioms', 'default:grammar']);
    mount();
    const cats = new Set((containerProps.initialWords ?? []).map((w) => w.category));
    expect([...cats].sort()).toEqual(['grammar', 'idioms']);
  });
});

describe('header label for a mix', () => {
  afterEach(cleanup);
  beforeEach(() => localStorage.clear());

  const Label = () => <span data-testid="label">{useVocabularySets().activeSet.name}</span>;
  const label = () => {
    const view = render(
      <VocabularySetProvider>
        <Label />
      </VocabularySetProvider>
    );
    const text = view.getByTestId('label').textContent;
    view.unmount();
    return text;
  };

  it('[FB-24] built-in collection name by default, "Mixed: N sets" for several', () => {
    expect(label()).toBe('Word Set: C1, C2');
    setSelectedSources(['default:idioms', 'default:grammar']);
    expect(label()).toBe('Mixed: 2 sets');
    const imported = importVocabularySet('Mine', setSheets);
    if (imported.ok === false) throw new Error(imported.error);
    expect(label()).toBe('Mixed: 3 sets');
    setSelectedSources([imported.set.id]);
    expect(label()).toBe('Mine');
  });
});
