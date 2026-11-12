import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import type { SheetData, VocabularyWord } from '@/types/vocabulary';
import { LAST_TODAY_WORD_KEY } from '@/utils/lastWordStorage';
import {
  DEFAULT_SET_ID,
  DEFAULT_SET_NAME,
  type LearnedWordEntry,
  type SetProgressState,
  type VocabularySetMeta,
} from './types';

const META_KEY = 'lv.vocabularySets.v1';
const ACTIVE_KEY = 'lv.vocabularySets.active';
const DATA_PREFIX = 'lv.vocabularySets.data.';
const PROGRESS_PREFIX = 'lv.vocabularySets.progress.';
const DISPLAYED_WORD_EVENT = 'lv:vocabulary-set-displayed';

const DAILY_NEW = 8;
const DAILY_CAP = 16;

interface MetaFile {
  sets: VocabularySetMeta[];
}

function storage(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

function readJson<T>(key: string): T | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): string | null {
  const store = storage();
  if (!store) return 'Storage is not available on this device.';
  try {
    store.setItem(key, JSON.stringify(value));
    return null;
  } catch {
    return 'This set is too large to store on this device. Try a smaller file.';
  }
}

function dataKey(id: string): string {
  return `${DATA_PREFIX}${id}`;
}

function progressKey(id: string): string {
  return `${PROGRESS_PREFIX}${id}`;
}

export function wordKey(word: string, category?: string): string {
  return `${(category ?? '').trim()}::${word.trim()}`;
}

/** Prefer the entry whose category matches the card on screen. */
export function findSetWord(
  words: VocabularyWord[],
  word: string,
  category?: string
): VocabularyWord | undefined {
  if (category !== undefined) {
    return words.find((item) => item.word === word && (item.category ?? '') === category);
  }
  return words.find((item) => item.word === word);
}

export function countSheetWords(sheets: SheetData): number {
  return Object.values(sheets).reduce((sum, words) => sum + (words?.length ?? 0), 0);
}

export function flattenSheets(sheets: SheetData): VocabularyWord[] {
  return Object.entries(sheets).flatMap(([category, words]) =>
    (words ?? []).map((word) => ({
      ...word,
      category: word.category || category,
    }))
  );
}

function defaultMeta(): VocabularySetMeta {
  return {
    id: DEFAULT_SET_ID,
    name: DEFAULT_SET_NAME,
    builtin: true,
    wordCount: countSheetWords(DEFAULT_VOCABULARY_DATA),
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
    fileName: 'defaultVocabulary.json',
  };
}

function readImportedMetas(): VocabularySetMeta[] {
  const file = readJson<MetaFile>(META_KEY);
  if (!file || !Array.isArray(file.sets)) return [];
  return file.sets.filter((set) => set && set.id && set.id !== DEFAULT_SET_ID && set.builtin !== true);
}

function writeImportedMetas(sets: VocabularySetMeta[]): string | null {
  return writeJson(META_KEY, { sets });
}

export function listVocabularySets(): VocabularySetMeta[] {
  return [defaultMeta(), ...readImportedMetas()];
}

export function getActiveSetId(): string {
  const store = storage();
  const stored = store?.getItem(ACTIVE_KEY);
  if (!stored || stored === DEFAULT_SET_ID) return DEFAULT_SET_ID;
  const known = readImportedMetas().some((set) => set.id === stored);
  return known ? stored : DEFAULT_SET_ID;
}

export function getSetSheets(id: string): SheetData {
  if (id === DEFAULT_SET_ID) return DEFAULT_VOCABULARY_DATA;
  const stored = readJson<SheetData>(dataKey(id));
  if (!stored || typeof stored !== 'object') return {};
  return stored;
}

export function emptyProgress(): SetProgressState {
  return { learned: {}, learning: {} };
}

export function getSetProgress(id: string): SetProgressState {
  if (id === DEFAULT_SET_ID) return emptyProgress();
  const stored = readJson<SetProgressState>(progressKey(id));
  if (!stored || typeof stored !== 'object' || !stored.learned) return emptyProgress();
  return { ...stored, learning: stored.learning ?? {} };
}

export function subscribeDisplayedWords(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(DISPLAYED_WORD_EVENT, listener);
  return () => window.removeEventListener(DISPLAYED_WORD_EVENT, listener);
}

/**
 * The card on screen counts as learning for the active imported set.
 * The study queue is left untouched so Next and auto-advance do not jump.
 * Returns true only the first time that word and category are seen.
 */
export function recordDisplayedWord(word: string, category?: string): boolean {
  const id = getActiveSetId();
  if (id === DEFAULT_SET_ID) return false;
  const trimmed = word.trim();
  if (!trimmed) return false;
  const key = wordKey(trimmed, category);
  const progress = getSetProgress(id);
  if (progress.learned[key] || progress.learning?.[key]) return false;
  const learning = {
    ...(progress.learning ?? {}),
    [key]: {
      word: trimmed,
      category: category ?? '',
      seenAt: new Date().toISOString(),
    },
  };
  saveProgress(id, { ...progress, learning });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DISPLAYED_WORD_EVENT));
  }
  return true;
}

function saveProgress(id: string, progress: SetProgressState): void {
  if (id === DEFAULT_SET_ID) return;
  writeJson(progressKey(id), progress);
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function endOfLocalDay(day: string): number {
  return new Date(`${day}T23:59:59`).getTime();
}

function intervalDays(reviewCount: number): number {
  if (reviewCount <= 1) return 1;
  if (reviewCount === 2) return 3;
  if (reviewCount === 3) return 7;
  if (reviewCount === 4) return 14;
  return 30;
}

export function buildTodayQueue(
  words: VocabularyWord[],
  progress: SetProgressState,
  today = localDateKey()
): VocabularyWord[] {
  const byKey = new Map(words.map((word) => [wordKey(word.word, word.category), word]));
  if (progress.todayDate === today && progress.todayKeys && progress.todayKeys.length > 0) {
    const restored = progress.todayKeys
      .map((key) => byKey.get(key))
      .filter((word): word is VocabularyWord => Boolean(word));
    if (restored.length > 0) return restored;
  }

  const due: VocabularyWord[] = [];
  const fresh: VocabularyWord[] = [];
  const deadline = endOfLocalDay(today);
  for (const word of words) {
    const learned = progress.learned[wordKey(word.word, word.category)];
    if (!learned) {
      fresh.push(word);
      continue;
    }
    const next = Date.parse(learned.nextReviewAt);
    if (!Number.isFinite(next) || next <= deadline) due.push(word);
  }
  const chosen = [...due, ...fresh.slice(0, DAILY_NEW)].slice(0, DAILY_CAP);
  if (chosen.length === 0 && words.length > 0) return words.slice(0, DAILY_NEW);
  return chosen;
}

export function ensureTodayQueue(id: string, words: VocabularyWord[], today = localDateKey()): VocabularyWord[] {
  if (id === DEFAULT_SET_ID) return [];
  const progress = getSetProgress(id);
  const queue = buildTodayQueue(words, progress, today);
  const keys = queue.map((word) => wordKey(word.word, word.category));
  const same =
    progress.todayDate === today &&
    Array.isArray(progress.todayKeys) &&
    progress.todayKeys.length === keys.length &&
    progress.todayKeys.every((key, index) => key === keys[index]);
  if (!same) {
    saveProgress(id, { ...progress, todayDate: today, todayKeys: keys });
  }
  return queue;
}

function clearResumeCursor(): void {
  try {
    storage()?.removeItem(LAST_TODAY_WORD_KEY);
  } catch {
    /* resume cursor is optional */
  }
}

export function setActiveSet(id: string): { ok: true } | { ok: false; error: string } {
  const known = listVocabularySets().some((set) => set.id === id);
  if (!known) return { ok: false, error: 'That word set is no longer on this device.' };
  const store = storage();
  if (!store) return { ok: false, error: 'Storage is not available on this device.' };
  store.setItem(ACTIVE_KEY, id);
  clearResumeCursor();
  return { ok: true };
}

export function importVocabularySet(
  name: string,
  sheets: SheetData,
  fileName?: string
): { ok: true; set: VocabularySetMeta } | { ok: false; error: string } {
  const wordCount = countSheetWords(sheets);
  if (wordCount === 0) return { ok: false, error: 'The file did not contain any words.' };
  const trimmed = name.trim().slice(0, 60) || 'Imported set';
  const id = `set_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const meta: VocabularySetMeta = {
    id,
    name: trimmed,
    builtin: false,
    wordCount,
    createdAt: now,
    updatedAt: now,
    fileName,
  };
  const dataError = writeJson(dataKey(id), sheets);
  if (dataError) return { ok: false, error: dataError };
  const progressError = writeJson(progressKey(id), emptyProgress());
  if (progressError) {
    storage()?.removeItem(dataKey(id));
    return { ok: false, error: progressError };
  }
  const sets = readImportedMetas();
  const metaError = writeImportedMetas([...sets, meta]);
  if (metaError) {
    storage()?.removeItem(dataKey(id));
    storage()?.removeItem(progressKey(id));
    return { ok: false, error: metaError };
  }
  setActiveSet(id);
  return { ok: true, set: meta };
}

export function renameVocabularySet(
  id: string,
  name: string
): { ok: true } | { ok: false; error: string } {
  if (id === DEFAULT_SET_ID) {
    return { ok: false, error: 'The Default set cannot be renamed.' };
  }
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Enter a name for this set.' };
  if (trimmed.length > 60) return { ok: false, error: 'Set names can be at most 60 characters.' };
  const sets = readImportedMetas();
  const index = sets.findIndex((set) => set.id === id);
  if (index < 0) return { ok: false, error: 'That word set is no longer on this device.' };
  sets[index] = { ...sets[index], name: trimmed, updatedAt: new Date().toISOString() };
  const error = writeImportedMetas(sets);
  if (error) return { ok: false, error };
  return { ok: true };
}

export function deleteVocabularySet(id: string): { ok: true } | { ok: false; error: string } {
  if (id === DEFAULT_SET_ID) {
    return { ok: false, error: 'The Default set cannot be deleted.' };
  }
  const sets = readImportedMetas();
  if (!sets.some((set) => set.id === id)) {
    return { ok: false, error: 'That word set is no longer on this device.' };
  }
  const wasActive = storage()?.getItem(ACTIVE_KEY) === id;
  const error = writeImportedMetas(sets.filter((set) => set.id !== id));
  if (error) return { ok: false, error };
  storage()?.removeItem(dataKey(id));
  storage()?.removeItem(progressKey(id));
  if (wasActive) {
    storage()?.setItem(ACTIVE_KEY, DEFAULT_SET_ID);
    clearResumeCursor();
  }
  return { ok: true };
}

export function markSetWordLearned(
  id: string,
  word: Pick<VocabularyWord, 'word' | 'category'>
): SetProgressState | null {
  if (id === DEFAULT_SET_ID) return null;
  const progress = getSetProgress(id);
  const key = wordKey(word.word, word.category);
  const now = new Date();
  const previous = progress.learned[key];
  const reviewCount = (previous?.reviewCount ?? 0) + 1;
  const next = new Date(now);
  next.setDate(next.getDate() + intervalDays(reviewCount));
  const entry: LearnedWordEntry = {
    word: word.word,
    category: word.category ?? '',
    reviewCount,
    learnedAt: previous?.learnedAt ?? now.toISOString(),
    lastReviewAt: now.toISOString(),
    nextReviewAt: next.toISOString(),
  };
  const todayKeys = (progress.todayKeys ?? []).filter((item) => item !== key);
  const learning = { ...(progress.learning ?? {}) };
  delete learning[key];
  const nextState: SetProgressState = {
    ...progress,
    learned: { ...progress.learned, [key]: entry },
    learning,
    todayKeys,
  };
  saveProgress(id, nextState);
  return nextState;
}

export function markSetWordNew(id: string, word: string, category?: string): SetProgressState | null {
  if (id === DEFAULT_SET_ID) return null;
  const progress = getSetProgress(id);
  const key = wordKey(word, category);
  if (!progress.learned[key]) return progress;
  const learned = { ...progress.learned };
  delete learned[key];
  const learning = { ...(progress.learning ?? {}) };
  delete learning[key];
  const nextState: SetProgressState = {
    ...progress,
    learned,
    learning,
    todayKeys: undefined,
    todayDate: undefined,
  };
  saveProgress(id, nextState);
  return nextState;
}

export function progressStatsFor(words: VocabularyWord[], progress: SetProgressState, today = localDateKey()) {
  const deadline = endOfLocalDay(today);
  const learnedEntries = Object.values(progress.learned);
  const due = learnedEntries.filter((entry) => {
    const next = Date.parse(entry.nextReviewAt);
    return !Number.isFinite(next) || next <= deadline;
  });
  const learned = learnedEntries.length;
  const learnedKeys = new Set(Object.keys(progress.learned));
  const learning = Object.keys(progress.learning ?? {}).filter((key) => !learnedKeys.has(key)).length;
  return {
    total: words.length,
    learned,
    learning,
    new: Math.max(words.length - learned - learning, 0),
    due: due.length,
  };
}
