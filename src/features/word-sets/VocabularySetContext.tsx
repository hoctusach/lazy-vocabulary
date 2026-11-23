import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SheetData, VocabularyWord } from '@/types/vocabulary';
import { invalidateVocabularyIndex } from '@/services/search/vocabularyIndex';
import { setAllWordsOverride } from '@/utils/allWords';
import {
  DEFAULT_SET_ID,
  type SetProgressState,
  type VocabularySetMeta,
} from './types';
import {
  deleteVocabularySet,
  ensureTodayQueue,
  flattenSheets,
  getActiveSetId,
  getSetProgress,
  getSetSheets,
  importVocabularySet,
  listVocabularySets,
  markSetWordLearned,
  markSetWordNew,
  progressStatsFor,
  renameVocabularySet,
  setActiveSet,
  subscribeDisplayedWords,
} from './vocabularySetStore';

interface VocabularySetContextValue {
  sets: VocabularySetMeta[];
  activeSet: VocabularySetMeta;
  isCustomSet: boolean;
  sheets: SheetData;
  words: VocabularyWord[];
  progress: SetProgressState;
  todayWords: VocabularyWord[];
  stats: ReturnType<typeof progressStatsFor>;
  refresh: () => void;
  activate: (id: string) => string | null;
  importSet: (name: string, sheets: SheetData, fileName?: string) => string | null;
  rename: (id: string, name: string) => string | null;
  remove: (id: string) => string | null;
  markLearned: (word: VocabularyWord) => void;
  markNew: (word: string, category?: string) => void;
}

const VocabularySetContext = createContext<VocabularySetContextValue | null>(null);

function applySearchSource(activeId: string, words: VocabularyWord[]) {
  if (activeId === DEFAULT_SET_ID) setAllWordsOverride(null);
  else setAllWordsOverride(words);
  invalidateVocabularyIndex();
}

export const VocabularySetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [version, setVersion] = useState(0);
  const [seenTick, setSeenTick] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  React.useEffect(() => subscribeDisplayedWords(() => setSeenTick((value) => value + 1)), []);

  const sets = useMemo(() => {
    void version;
    return listVocabularySets();
  }, [version]);
  const activeId = useMemo(() => {
    void version;
    return getActiveSetId();
  }, [version]);
  const activeSet = sets.find((set) => set.id === activeId) ?? sets[0];
  const sheets = useMemo(() => {
    void version;
    return getSetSheets(activeSet.id);
  }, [activeSet.id, version]);
  const words = useMemo(() => flattenSheets(sheets), [sheets]);
  const progress = useMemo(() => {
    void version;
    void seenTick;
    return getSetProgress(activeSet.id);
  }, [activeSet.id, version, seenTick]);
  const todayWords = useMemo(() => {
    void version;
    return activeSet.id === DEFAULT_SET_ID ? [] : ensureTodayQueue(activeSet.id, words);
  }, [activeSet.id, words, version]);
  const stats = useMemo(() => progressStatsFor(words, progress), [words, progress]);

  React.useEffect(() => {
    applySearchSource(activeSet.id, words);
  }, [activeSet.id, words]);

  const activate = useCallback(
    (id: string) => {
      const result = setActiveSet(id);
      if (!result.ok) return result.error;
      refresh();
      return null;
    },
    [refresh]
  );

  const importSet = useCallback(
    (name: string, nextSheets: SheetData, fileName?: string) => {
      const result = importVocabularySet(name, nextSheets, fileName);
      if (!result.ok) return result.error;
      refresh();
      return null;
    },
    [refresh]
  );

  const rename = useCallback(
    (id: string, name: string) => {
      const result = renameVocabularySet(id, name);
      if (!result.ok) return result.error;
      refresh();
      return null;
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      const result = deleteVocabularySet(id);
      if (!result.ok) return result.error;
      refresh();
      return null;
    },
    [refresh]
  );

  const markLearned = useCallback(
    (word: VocabularyWord) => {
      markSetWordLearned(activeSet.id, word);
      refresh();
    },
    [activeSet.id, refresh]
  );

  const markNew = useCallback(
    (word: string, category?: string) => {
      markSetWordNew(activeSet.id, word, category);
      refresh();
    },
    [activeSet.id, refresh]
  );

  const value = useMemo<VocabularySetContextValue>(
    () => ({
      sets,
      activeSet,
      isCustomSet: activeSet.id !== DEFAULT_SET_ID,
      sheets,
      words,
      progress,
      todayWords,
      stats,
      refresh,
      activate,
      importSet,
      rename,
      remove,
      markLearned,
      markNew,
    }),
    [
      sets,
      activeSet,
      sheets,
      words,
      progress,
      todayWords,
      stats,
      refresh,
      activate,
      importSet,
      rename,
      remove,
      markLearned,
      markNew,
    ]
  );

  return <VocabularySetContext.Provider value={value}>{children}</VocabularySetContext.Provider>;
};

const FALLBACK_SET: VocabularySetMeta = {
  id: DEFAULT_SET_ID,
  name: 'Default',
  builtin: true,
  wordCount: 0,
  createdAt: '',
  updatedAt: '',
};

export function useVocabularySets(): VocabularySetContextValue {
  const context = useContext(VocabularySetContext);
  if (context) return context;
  return {
    sets: [FALLBACK_SET],
    activeSet: FALLBACK_SET,
    isCustomSet: false,
    sheets: {},
    words: [],
    progress: { learned: {} },
    todayWords: [],
    stats: { total: 0, learned: 0, learning: 0, new: 0, due: 0 },
    refresh: () => undefined,
    activate: () => null,
    importSet: () => 'Word sets are unavailable.',
    rename: () => 'Word sets are unavailable.',
    remove: () => 'Word sets are unavailable.',
    markLearned: () => undefined,
    markNew: () => undefined,
  };
}
