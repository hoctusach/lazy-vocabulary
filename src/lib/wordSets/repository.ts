import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import type { SheetData, VocabularyWord } from '@/types/vocabulary';
import {
  ACTIVE_SET_STORAGE_KEY,
  DEFAULT_SET_ID,
  DEFAULT_SET_NAME,
  SET_PROGRESS_STORAGE_KEY,
  STUDY_QUEUE_LIMIT,
  WORD_SETS_CHANGED_EVENT,
  WORD_SETS_STORAGE_KEY,
} from './constants';
import type { SetProgressMap, StoredWordSet, WordProgress, WordSetStats, WordSetSource } from './types';

const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30];

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function dispatchChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WORD_SETS_CHANGED_EVENT));
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function countWords(data: SheetData | undefined): number {
  if (!data) return 0;
  return Object.values(data).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
}

export function defaultWordCount(): number {
  return countWords(DEFAULT_VOCABULARY_DATA as SheetData);
}

export function flattenSheetData(data: SheetData | undefined): VocabularyWord[] {
  if (!data) return [];
  const words: VocabularyWord[] = [];
  for (const [sheet, list] of Object.entries(data)) {
    for (const word of list || []) {
      if (!word?.word) continue;
      words.push({ ...word, category: word.category || sheet });
    }
  }
  return words;
}

function readStoredSets(): StoredWordSet[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(WORD_SETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredWordSet[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((set) => set && set.id && set.id !== DEFAULT_SET_ID && set.data);
  } catch {
    return [];
  }
}

function writeStoredSets(sets: StoredWordSet[]): void {
  const store = storage();
  if (!store) {
    throw new Error('This browser cannot store word sets.');
  }
  try {
    store.setItem(WORD_SETS_STORAGE_KEY, JSON.stringify(sets));
  } catch {
    throw new Error('This set is too large to store on this device. Try a smaller file.');
  }
}

function builtinSet(): StoredWordSet {
  return {
    id: DEFAULT_SET_ID,
    name: DEFAULT_SET_NAME,
    source: 'builtin',
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
    wordCount: defaultWordCount(),
  };
}

export function hasChosenSet(): boolean {
  const store = storage();
  if (!store) return false;
  return store.getItem(ACTIVE_SET_STORAGE_KEY) != null;
}

export function getActiveSetId(): string {
  const store = storage();
  const stored = store?.getItem(ACTIVE_SET_STORAGE_KEY);
  if (stored && (stored === DEFAULT_SET_ID || readStoredSets().some((set) => set.id === stored))) {
    return stored;
  }
  return DEFAULT_SET_ID;
}

export function listStoredSets(): StoredWordSet[] {
  return [builtinSet(), ...readStoredSets()];
}

export function getStoredSet(id: string): StoredWordSet | undefined {
  if (id === DEFAULT_SET_ID) return builtinSet();
  return readStoredSets().find((set) => set.id === id);
}

export function getSetData(id: string): SheetData | null {
  if (id === DEFAULT_SET_ID) return null;
  return getStoredSet(id)?.data ?? null;
}

/**
 * Null when the learner has never picked a set, so the legacy deck stays in place.
 * `builtin` means they explicitly chose Default.
 */
export function readActiveSelection():
  | { kind: 'legacy' }
  | { kind: 'builtin' }
  | { kind: 'imported'; data: SheetData } {
  if (!hasChosenSet()) return { kind: 'legacy' };
  const id = getActiveSetId();
  if (id === DEFAULT_SET_ID) return { kind: 'builtin' };
  const data = getSetData(id);
  if (!data) return { kind: 'builtin' };
  return { kind: 'imported', data };
}

function readProgress(): SetProgressMap {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(SET_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SetProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeProgress(progress: SetProgressMap): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(SET_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn('[word-sets] Could not save progress', error);
  }
}

function progressKey(word: string): string {
  return word.trim().toLowerCase();
}

export function getSetProgress(setId: string): Record<string, WordProgress> {
  return readProgress()[setId] ?? {};
}

export function summarizeSet(setId: string, words: { word: string }[]): WordSetStats {
  const bucket = getSetProgress(setId);
  const now = Date.now();
  let learned = 0;
  let learning = 0;
  let due = 0;
  const known = new Set(words.map((word) => progressKey(word.word)).filter(Boolean));
  const entries = known.size
    ? Object.entries(bucket).filter(([key]) => known.has(key))
    : Object.entries(bucket);

  for (const [, entry] of entries) {
    if (entry.status === 'learned') {
      learned += 1;
      if (entry.nextReviewAt && Date.parse(entry.nextReviewAt) <= now) due += 1;
    } else {
      learning += 1;
    }
  }

  const total = words.length || entries.length;
  return {
    total,
    learned,
    learning,
    due,
    fresh: Math.max(0, total - learned - learning),
  };
}

export function wordsForSet(set: StoredWordSet): VocabularyWord[] {
  if (set.id === DEFAULT_SET_ID) {
    return flattenSheetData(DEFAULT_VOCABULARY_DATA as SheetData);
  }
  return flattenSheetData(set.data);
}

export function buildStudyList(setId: string, words: VocabularyWord[], limit = STUDY_QUEUE_LIMIT): VocabularyWord[] {
  const bucket = getSetProgress(setId);
  const now = Date.now();
  const due: VocabularyWord[] = [];
  const fresh: VocabularyWord[] = [];

  for (const word of words) {
    const entry = bucket[progressKey(word.word)];
    if (!entry) {
      fresh.push(word);
      continue;
    }
    if (entry.status === 'learned') {
      if (entry.nextReviewAt && Date.parse(entry.nextReviewAt) <= now) due.push(word);
      continue;
    }
    fresh.push(word);
  }

  return [...due, ...fresh].slice(0, limit);
}

export function recordWordEvent(
  setId: string,
  word: string,
  event: 'seen' | 'learned' | 'reset',
  options?: { silent?: boolean }
): void {
  const key = progressKey(word);
  if (!setId || !key) return;
  const all = readProgress();
  const bucket = { ...(all[setId] ?? {}) };
  const prev = bucket[key];
  const now = new Date().toISOString();

  if (event === 'reset') {
    delete bucket[key];
  } else if (event === 'seen') {
    bucket[key] = {
      status: prev?.status === 'learned' ? 'learned' : 'learning',
      reviewCount: prev?.reviewCount ?? 0,
      lastReviewedAt: now,
      learnedAt: prev?.learnedAt,
      nextReviewAt: prev?.nextReviewAt,
    };
  } else {
    const reviewCount = (prev?.reviewCount ?? 0) + 1;
    const days = REVIEW_INTERVAL_DAYS[Math.min(reviewCount - 1, REVIEW_INTERVAL_DAYS.length - 1)];
    const nextReview = new Date(Date.now() + days * 86_400_000).toISOString();
    bucket[key] = {
      status: 'learned',
      reviewCount,
      lastReviewedAt: now,
      learnedAt: prev?.learnedAt ?? now,
      nextReviewAt: nextReview,
    };
  }

  all[setId] = bucket;
  writeProgress(all);
  if (!options?.silent) dispatchChange();
}

export function listLearnedWords(setId: string, words: VocabularyWord[]): Array<VocabularyWord & { progress: WordProgress }> {
  const bucket = getSetProgress(setId);
  return words.flatMap((word) => {
    const progress = bucket[progressKey(word.word)];
    if (!progress || progress.status !== 'learned') return [];
    return [{ ...word, progress }];
  });
}

function validateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Give this set a name.');
  }
  if (trimmed.length > 60) {
    throw new Error('Set names can be at most 60 characters.');
  }
  return trimmed;
}

export function saveImportedSet(input: {
  name: string;
  source: Exclude<WordSetSource, 'builtin'>;
  fileName?: string;
  data: SheetData;
  wordCount: number;
  activate?: boolean;
}): StoredWordSet {
  const set: StoredWordSet = {
    id: createId(),
    name: validateName(input.name),
    source: input.source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wordCount: input.wordCount,
    fileName: input.fileName,
    data: input.data,
  };
  const sets = readStoredSets();
  sets.unshift(set);
  writeStoredSets(sets);
  if (input.activate !== false) {
    storage()?.setItem(ACTIVE_SET_STORAGE_KEY, set.id);
  }
  dispatchChange();
  return set;
}

export function renameWordSet(id: string, name: string): void {
  if (id === DEFAULT_SET_ID) {
    throw new Error('The Default set keeps its name so you can always find the built-in list.');
  }
  const nextName = validateName(name);
  const sets = readStoredSets();
  const target = sets.find((set) => set.id === id);
  if (!target) throw new Error('That set is no longer on this device.');
  target.name = nextName;
  target.updatedAt = new Date().toISOString();
  writeStoredSets(sets);
  dispatchChange();
}

export function deleteWordSet(id: string): void {
  if (id === DEFAULT_SET_ID) {
    throw new Error('The Default set cannot be deleted.');
  }
  const sets = readStoredSets().filter((set) => set.id !== id);
  writeStoredSets(sets);
  const progress = readProgress();
  if (progress[id]) {
    delete progress[id];
    writeProgress(progress);
  }
  if (getActiveSetId() === id || storage()?.getItem(ACTIVE_SET_STORAGE_KEY) === id) {
    storage()?.setItem(ACTIVE_SET_STORAGE_KEY, DEFAULT_SET_ID);
  }
  dispatchChange();
}

export function setActiveSetId(id: string): void {
  if (id !== DEFAULT_SET_ID && !readStoredSets().some((set) => set.id === id)) {
    throw new Error('That set is no longer on this device.');
  }
  const store = storage();
  if (!store) throw new Error('This browser cannot store word sets.');
  store.setItem(ACTIVE_SET_STORAGE_KEY, id);
  dispatchChange();
}

export function searchImportedSet(setId: string, query: string, limit = 20) {
  const data = getSetData(setId);
  if (!data) return [];
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return flattenSheetData(data)
    .filter((word) => {
      const haystack = `${word.word} ${word.meaning} ${word.example} ${word.translation ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    })
    .slice(0, limit);
}
