import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import type { SheetData, VocabularyWord } from '@/types/vocabulary';
import { invalidateVocabularyIndex } from '@/services/search/vocabularyIndex';
import { setAllWordsOverride } from '@/utils/allWords';
import { DEFAULT_SET_ID, DEFAULT_SET_NAME, type VocabularySetMeta } from './types';
import { filterByBuiltinGroups, sumStats, tagWords } from './mixQueue';
import {
  BUILTIN_GROUPS,
  allBuiltinSourceIds,
  deleteVocabularySet,
  ensureTodayQueue,
  flattenSheets,
  getSelectedSources,
  getSetProgress,
  getSetSheets,
  importVocabularySet,
  listVocabularySets,
  markSetWordLearned,
  markSetWordNew,
  progressStatsFor,
  renameVocabularySet,
  selectedBuiltinGroups,
  selectedImportedIds,
  setActiveSet,
  setBuiltinGroupsSelected,
  subscribeDisplayedWords,
  toggleSource,
} from './vocabularySetStore';

export interface ImportedQueue {
  sourceId: string;
  name: string;
  words: VocabularyWord[];
}

export interface ImportedProgressEntry {
  sourceId: string;
  word: string;
  category: string;
  reviewCount: number;
  learnedAt: string;
  nextReviewAt: string;
}

interface VocabularySetContextValue {
  sets: VocabularySetMeta[];
  /** Back-compat label: the single selected set, or a synthetic "Mixed" entry. */
  activeSet: VocabularySetMeta;
  /** Selected source ids: 'default:<group>' and imported set ids. Never empty. */
  selectedSources: string[];
  selectedBuiltinGroups: string[];
  selectedImportedSets: VocabularySetMeta[];
  /** True when at least one built-in group is part of the mix. */
  hasBuiltin: boolean;
  /** True when no built-in group is selected (only imported sets). */
  isCustomSet: boolean;
  /** Words of the selected imported sets (each tagged with `sourceId`). */
  words: VocabularyWord[];
  /** Today's queue per selected imported set (local SRS), already tagged with `sourceId`. */
  importedQueues: ImportedQueue[];
  importedLearned: ImportedProgressEntry[];
  importedDue: ImportedProgressEntry[];
  /** Summed stats over the selected imported sets. */
  stats: ReturnType<typeof progressStatsFor>;
  refresh: () => void;
  toggleSource: (id: string) => string | null;
  setBuiltinAll: (on: boolean) => string | null;
  activate: (id: string) => string | null;
  importSet: (name: string, sheets: SheetData, fileName?: string) => string | null;
  rename: (id: string, name: string) => string | null;
  remove: (id: string) => string | null;
  markLearned: (word: VocabularyWord) => void;
  markNew: (word: string, category?: string, sourceId?: string) => void;
}

const VocabularySetContext = createContext<VocabularySetContextValue | null>(null);

/** Search and quiz draw from the union of the selected sources. */
function applySearchSource(selection: string[], importedWords: VocabularyWord[]) {
  const groups = selectedBuiltinGroups(selection);
  if (groups.length === BUILTIN_GROUPS.length && importedWords.length === 0) {
    setAllWordsOverride(null);
  } else {
    const builtin = groups.length
      ? filterByBuiltinGroups(flattenSheets(DEFAULT_VOCABULARY_DATA), groups).map((word) => ({
          ...word,
          sourceId: DEFAULT_SET_ID,
        }))
      : [];
    setAllWordsOverride([...builtin, ...importedWords]);
  }
  invalidateVocabularyIndex();
}

function describeSelection(sets: VocabularySetMeta[], selection: string[]): VocabularySetMeta {
  const groups = selectedBuiltinGroups(selection);
  const importedIds = selectedImportedIds(selection);
  const builtin = sets.find((set) => set.id === DEFAULT_SET_ID) ?? sets[0];
  if (importedIds.length === 0 && groups.length === BUILTIN_GROUPS.length) return builtin;
  if (importedIds.length === 1 && groups.length === 0) {
    return sets.find((set) => set.id === importedIds[0]) ?? builtin;
  }
  // A single built-in group has no better name than the collection; several sources read "Mixed: N sets".
  const label = selection.length === 1 ? `${builtin.name} (${groups[0]})` : `Mixed: ${selection.length} sets`;
  return { ...builtin, id: 'mix', name: label, builtin: false };
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
  const selectedSources = useMemo(() => {
    void version;
    return getSelectedSources();
  }, [version]);
  const selectedKey = selectedSources.join('|');
  const selectedBuiltin = useMemo(() => selectedBuiltinGroups(selectedSources), [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedImported = useMemo(() => {
    const ids = new Set(selectedImportedIds(selectedSources));
    return sets.filter((set) => ids.has(set.id));
  }, [sets, selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeSet = useMemo(() => describeSelection(sets, selectedSources), [sets, selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const importedData = useMemo(() => {
    void version;
    return selectedImported.map((set) => ({
      set,
      words: tagWords(flattenSheets(getSetSheets(set.id)), set.id),
    }));
  }, [selectedImported, version]);
  const words = useMemo(() => importedData.flatMap((entry) => entry.words), [importedData]);

  const importedQueues = useMemo<ImportedQueue[]>(() => {
    void version;
    return importedData.map(({ set, words: setWords }) => ({
      sourceId: set.id,
      name: set.name,
      words: tagWords(ensureTodayQueue(set.id, setWords), set.id),
    }));
  }, [importedData, version]);

  const { stats, importedLearned, importedDue } = useMemo(() => {
    void version;
    void seenTick;
    const deadline = new Date();
    deadline.setHours(23, 59, 59, 999);
    const parts: ReturnType<typeof progressStatsFor>[] = [];
    const learned: ImportedProgressEntry[] = [];
    const due: ImportedProgressEntry[] = [];
    for (const { set, words: setWords } of importedData) {
      const progress = getSetProgress(set.id);
      parts.push(progressStatsFor(setWords, progress));
      for (const entry of Object.values(progress.learned)) {
        const item = { ...entry, sourceId: set.id };
        learned.push(item);
        const next = Date.parse(entry.nextReviewAt);
        if (!Number.isFinite(next) || next <= deadline.getTime()) due.push(item);
      }
    }
    return { stats: sumStats(parts), importedLearned: learned, importedDue: due };
  }, [importedData, version, seenTick]);

  React.useEffect(() => {
    applySearchSource(selectedSources, words);
  }, [selectedKey, words]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(
    (id: string) => {
      const result = toggleSource(id);
      if (!result.ok) return result.error;
      refresh();
      return null;
    },
    [refresh]
  );

  const setBuiltinAll = useCallback(
    (on: boolean) => {
      const result = setBuiltinGroupsSelected(on);
      if (!result.ok) return result.error;
      refresh();
      return null;
    },
    [refresh]
  );

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
      const sourceId = word.sourceId ?? selectedImportedIds()[0];
      if (!sourceId) return;
      markSetWordLearned(sourceId, word);
      refresh();
    },
    [refresh]
  );

  const markNew = useCallback(
    (word: string, category?: string, sourceId?: string) => {
      const id = sourceId ?? selectedImportedIds()[0];
      if (!id) return;
      markSetWordNew(id, word, category);
      refresh();
    },
    [refresh]
  );

  const value = useMemo<VocabularySetContextValue>(
    () => ({
      sets,
      activeSet,
      selectedSources,
      selectedBuiltinGroups: selectedBuiltin,
      selectedImportedSets: selectedImported,
      hasBuiltin: selectedBuiltin.length > 0,
      isCustomSet: selectedBuiltin.length === 0,
      words,
      importedQueues,
      importedLearned,
      importedDue,
      stats,
      refresh,
      toggleSource: toggle,
      setBuiltinAll,
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
      selectedSources,
      selectedBuiltin,
      selectedImported,
      words,
      importedQueues,
      importedLearned,
      importedDue,
      stats,
      refresh,
      toggle,
      setBuiltinAll,
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
  name: DEFAULT_SET_NAME,
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
    selectedSources: allBuiltinSourceIds(),
    selectedBuiltinGroups: [...BUILTIN_GROUPS],
    selectedImportedSets: [],
    hasBuiltin: true,
    isCustomSet: false,
    words: [],
    importedQueues: [],
    importedLearned: [],
    importedDue: [],
    stats: { total: 0, learned: 0, learning: 0, new: 0, due: 0 },
    refresh: () => undefined,
    toggleSource: () => null,
    setBuiltinAll: () => null,
    activate: () => null,
    importSet: () => 'Word sets are unavailable.',
    rename: () => 'Word sets are unavailable.',
    remove: () => 'Word sets are unavailable.',
    markLearned: () => undefined,
    markNew: () => undefined,
  };
}
