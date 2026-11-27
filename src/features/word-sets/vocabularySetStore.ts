import { DAILY_TARGET, activeTarget } from '@/lib/progress/dailyTarget';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import type { SheetData, VocabularyWord } from '@/types/vocabulary';
import {
  MANUAL_DEFAULT_CATEGORY,
  MANUAL_SET_MAX_WORDS,
  manualKey,
  validateManualSetName,
  validateManualWord,
  type ManualFieldErrors,
  type ManualWordInput,
} from './manualSet';
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
/** Multi-set selection: array of source ids ('default:<group>' or an imported set id). */
export const SELECTED_SOURCES_KEY = 'lazyVoca.selectedSources.v1';
const DATA_PREFIX = 'lv.vocabularySets.data.';
const PROGRESS_PREFIX = 'lv.vocabularySets.progress.';
const DISPLAYED_WORD_EVENT = 'lv:vocabulary-set-displayed';

/** FB-35 (Option A): 20 words per day TOTAL for imported sets too: due/reviews first, fill with new words. */
export const DAILY_TOTAL = DAILY_TARGET;

interface MetaFile {
  sets: VocabularySetMeta[];
}

function storage(): Storage | null {
  // Merely touching localStorage can throw (blocked storage, privacy modes).
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function safeGet(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeRemove(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
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

/**
 * The set list is unreadable (corrupt JSON or wrong shape). Rebuild entries for
 * every imported data blob that still parses so the learner keeps their sets.
 */
function recoverMetasFromData(): VocabularySetMeta[] {
  const store = storage();
  if (!store) return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && key.startsWith(DATA_PREFIX)) ids.push(key.slice(DATA_PREFIX.length));
    }
  } catch {
    return [];
  }
  const recovered: VocabularySetMeta[] = [];
  for (const id of ids) {
    const sheets = readJson<SheetData>(dataKey(id));
    if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) continue;
    const wordCount = countSheetWords(sheets);
    if (wordCount === 0) continue;
    const now = new Date().toISOString();
    recovered.push({
      id,
      name: `Recovered set ${recovered.length + 1}`,
      builtin: false,
      wordCount,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (recovered.length > 0) writeImportedMetas(recovered);
  return recovered;
}

function readImportedMetas(): VocabularySetMeta[] {
  const file = readJson<MetaFile>(META_KEY);
  if (!file || !Array.isArray(file.sets)) {
    // Missing key is normal (nothing imported yet). Present but unusable is corruption.
    return safeGet(META_KEY) === null ? [] : recoverMetasFromData();
  }
  return file.sets.filter(
    (set) => set && typeof set.id === 'string' && set.id !== DEFAULT_SET_ID && set.builtin !== true
  );
}

function writeImportedMetas(sets: VocabularySetMeta[]): string | null {
  return writeJson(META_KEY, { sets });
}

export function listVocabularySets(): VocabularySetMeta[] {
  return [defaultMeta(), ...readImportedMetas()];
}

export function getActiveSetId(): string {
  const stored = safeGet(ACTIVE_KEY);
  if (!stored || stored === DEFAULT_SET_ID) return DEFAULT_SET_ID;
  const known = readImportedMetas().some((set) => set.id === stored);
  if (!known) return DEFAULT_SET_ID;
  // The list entry can outlive its words (data blob lost or unreadable). An active set with
  // no words would show "No words in ... category" forever, so use the built-in set instead.
  const data = readJson<SheetData>(dataKey(stored));
  const hasWords = !!data && typeof data === 'object' && Object.values(data).some((rows) => Array.isArray(rows) && rows.length > 0);
  return hasWords ? stored : DEFAULT_SET_ID;
}

/** The six built-in groups, in the order the Sets screen lists them. */
export const BUILTIN_GROUPS: readonly string[] = [
  'topic vocab',
  'phrasal verbs',
  'idioms',
  'grammar',
  'phrases, collocations',
  'word formation',
];

const BUILTIN_PREFIX = `${DEFAULT_SET_ID}:`;

export function builtinSourceId(group: string): string {
  return `${BUILTIN_PREFIX}${group}`;
}

/** 'default:idioms' -> 'idioms'; anything else -> null. */
export function builtinGroupOf(sourceId: string): string | null {
  if (!sourceId.startsWith(BUILTIN_PREFIX)) return null;
  const group = sourceId.slice(BUILTIN_PREFIX.length);
  return BUILTIN_GROUPS.includes(group) ? group : null;
}

export function allBuiltinSourceIds(): string[] {
  return BUILTIN_GROUPS.map(builtinSourceId);
}

/** Word count per built-in group (bundled data). */
export function builtinGroupCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of BUILTIN_GROUPS) out[group] = DEFAULT_VOCABULARY_DATA[group]?.length ?? 0;
  return out;
}

/**
 * Distinct built-in words in the given groups. Progress (and the Learn banner via getDefaultVocabularyTotal)
 * keys one row per word text, so duplicates inside or across groups count once.
 */
export function builtinDistinctWordCount(groups: readonly string[]): number {
  const keys = new Set<string>();
  for (const group of groups) {
    for (const w of DEFAULT_VOCABULARY_DATA[group] ?? []) {
      if (w && typeof w.word === 'string' && w.word.trim()) keys.add(w.word);
    }
  }
  return keys.size;
}

/**
 * Words in the given built-in groups, counted exactly like the Word Set card (`countSheetWords` over the
 * bundled data: one per row). [FB-38] This is the single source of the selected built-in total, shared by
 * the Word Set screen and Learning Progress so the two numbers cannot drift.
 */
export function builtinSelectedWordCount(groups: readonly string[]): number {
  let sum = 0;
  for (const group of groups) sum += DEFAULT_VOCABULARY_DATA[group]?.length ?? 0;
  return sum;
}

export function setHasWords(id: string): boolean {
  const data = readJson<SheetData>(dataKey(id));
  return !!data && typeof data === 'object' && Object.values(data).some((rows) => Array.isArray(rows) && rows.length > 0);
}

/** Canonical order: built-in groups first, then imported sets in list order. Unknown ids are dropped. */
function normalizeSelection(ids: readonly string[]): string[] {
  const wanted = new Set(ids);
  const out: string[] = [];
  for (const group of BUILTIN_GROUPS) {
    if (wanted.has(builtinSourceId(group))) out.push(builtinSourceId(group));
  }
  for (const set of readImportedMetas()) {
    if (wanted.has(set.id) && setHasWords(set.id)) out.push(set.id);
  }
  return out;
}

/** The set id to keep in ACTIVE_KEY for older code: first selected set ('default' if any built-in group). */
function activeIdForSelection(selection: readonly string[]): string {
  const first = selection[0];
  if (!first) return DEFAULT_SET_ID;
  return builtinGroupOf(first) !== null ? DEFAULT_SET_ID : first;
}

function writeSelection(selection: string[]): boolean {
  const ok = safeSet(SELECTED_SOURCES_KEY, JSON.stringify(selection));
  safeSet(ACTIVE_KEY, activeIdForSelection(selection));
  return ok;
}

/**
 * Sources the learner is mixing. Never empty. When the key is absent it is derived from the old
 * single active set (default -> all six groups, imported id -> [id]) and persisted.
 */
export function getSelectedSources(): string[] {
  const raw = safeGet(SELECTED_SOURCES_KEY);
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const kept = normalizeSelection(parsed.filter((item): item is string => typeof item === 'string'));
        if (kept.length > 0) return kept;
      }
    } catch {
      /* fall through to the default */
    }
    return allBuiltinSourceIds();
  }
  const legacy = getActiveSetId();
  const migrated = legacy === DEFAULT_SET_ID ? allBuiltinSourceIds() : [legacy];
  writeSelection(migrated);
  return migrated;
}

export function selectedBuiltinGroups(selection: readonly string[] = getSelectedSources()): string[] {
  return selection.map(builtinGroupOf).filter((group): group is string => group !== null);
}

export function selectedImportedIds(selection: readonly string[] = getSelectedSources()): string[] {
  return selection.filter((id) => builtinGroupOf(id) === null);
}

export const KEEP_ONE_SOURCE_MESSAGE = 'Keep at least one set selected. Tick another set before unticking this one.';

export function setSelectedSources(ids: readonly string[]): { ok: true } | { ok: false; error: string } {
  const next = normalizeSelection(ids);
  if (next.length === 0) return { ok: false, error: KEEP_ONE_SOURCE_MESSAGE };
  const before = getSelectedSources();
  if (before.length === next.length && before.every((id, index) => id === next[index])) return { ok: true };
  if (!writeSelection(next)) {
    return { ok: false, error: 'Could not save your selection because storage is not available on this device.' };
  }
  // [FB-63] No resume-cursor reset: today's words (and your place in them) stay as they are until tomorrow.
  return { ok: true };
}

export function toggleSource(id: string): { ok: true; selected: boolean } | { ok: false; error: string } {
  const current = getSelectedSources();
  const isOn = current.includes(id);
  const result = setSelectedSources(isOn ? current.filter((item) => item !== id) : [...current, id]);
  if (result.ok === false) return { ok: false, error: result.error };
  return { ok: true, selected: !isOn };
}

/** Select or clear every built-in group at once. Clearing is refused if nothing else would stay selected. */
export function setBuiltinGroupsSelected(on: boolean): { ok: true } | { ok: false; error: string } {
  const rest = getSelectedSources().filter((id) => builtinGroupOf(id) === null);
  return setSelectedSources(on ? [...allBuiltinSourceIds(), ...rest] : rest);
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
 * The card on screen counts as learning for the imported set it came from (`sourceId`).
 * The study queue is left untouched so Next and auto-advance do not jump.
 * Returns true only the first time that word and category are seen.
 */
export function recordDisplayedWord(word: string, category?: string, sourceId?: string): boolean {
  const id = sourceId ?? (selectedImportedIds().length === 1 ? selectedImportedIds()[0] : getActiveSetId());
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
  // [FB-51] Words marked learned today leave the queue but still count toward today's 20.
  const learnedToday = Object.values(progress.learned).filter((entry) => {
    const stamp = Date.parse(entry.lastReviewAt || entry.learnedAt);
    return Number.isFinite(stamp) && localDateKey(new Date(stamp)) === today;
  }).length;
  const wanted = activeTarget(learnedToday);

  let restored: VocabularyWord[] = [];
  if (progress.todayDate === today && progress.todayKeys && progress.todayKeys.length > 0) {
    restored = progress.todayKeys
      .map((key) => byKey.get(key))
      .filter((word): word is VocabularyWord => Boolean(word));
    if (restored.length >= wanted && restored.length > 0) return restored;
  }
  const have = new Set(restored.map((word) => wordKey(word.word, word.category)));

  const due: VocabularyWord[] = [];
  const fresh: VocabularyWord[] = [];
  const deadline = endOfLocalDay(today);
  for (const word of words) {
    const key = wordKey(word.word, word.category);
    if (have.has(key)) continue;
    const learned = progress.learned[key];
    if (!learned) {
      fresh.push(word);
      continue;
    }
    const next = Date.parse(learned.nextReviewAt);
    if (!Number.isFinite(next) || next <= deadline) due.push(word);
  }
  const chosen = [...restored, ...due, ...fresh].slice(0, Math.max(wanted, restored.length));
  if (chosen.length === 0 && words.length > 0) return words.slice(0, DAILY_TOTAL);
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
    safeRemove(LAST_TODAY_WORD_KEY);
  } catch {
    /* resume cursor is optional */
  }
}

export function setActiveSet(id: string): { ok: true } | { ok: false; error: string } {
  const known = listVocabularySets().some((set) => set.id === id);
  if (!known) return { ok: false, error: 'That word set is no longer on this device.' };
  // Back-compat: choosing one set means "only this set" (default -> all six built-in groups).
  const selection = normalizeSelection(id === DEFAULT_SET_ID ? allBuiltinSourceIds() : [id]);
  if (selection.length === 0) return { ok: false, error: 'That word set has no words on this device.' };
  if (!writeSelection(selection)) {
    return { ok: false, error: 'Could not switch sets because storage is not available on this device.' };
  }
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
    safeRemove(dataKey(id));
    return { ok: false, error: progressError };
  }
  const sets = readImportedMetas();
  const metaError = writeImportedMetas([...sets, meta]);
  if (metaError) {
    safeRemove(dataKey(id));
    safeRemove(progressKey(id));
    return { ok: false, error: metaError };
  }
  // Add to the mix; other selected sources stay selected.
  const selection = normalizeSelection([...getSelectedSources(), id]);
  writeSelection(selection);
  clearResumeCursor();
  return { ok: true, set: meta };
}

function flattenManual(sheets: SheetData): VocabularyWord[] {
  return flattenSheets(sheets);
}

function sheetsFromWords(words: VocabularyWord[]): SheetData {
  const out: SheetData = {};
  for (const w of words) {
    const cat = w.category || MANUAL_DEFAULT_CATEGORY;
    (out[cat] ??= []).push({ ...w, category: cat });
  }
  return out;
}

export type ManualResult = { ok: true; set?: VocabularySetMeta } | { ok: false; errors: ManualFieldErrors };

/** [FB-45] Create a hand-made set. The first word is required (an empty set cannot be learned or selected). */
export function createManualSet(name: string, first: ManualWordInput): ManualResult {
  const errors: ManualFieldErrors = {};
  const nameError = validateManualSetName(name);
  if (nameError) errors.form = nameError;
  const checked = validateManualWord(first, []);
  if (checked.ok === false) Object.assign(errors, checked.errors);
  if (Object.keys(errors).length > 0 || checked.ok === false) return { ok: false, errors };
  const result = importVocabularySet(name, sheetsFromWords([checked.word]));
  if (result.ok === false) return { ok: false, errors: { form: result.error } };
  const sets = readImportedMetas().map((set) => (set.id === result.set.id ? { ...set, manual: true } : set));
  writeImportedMetas(sets);
  return { ok: true, set: { ...result.set, manual: true } };
}

function persistManual(id: string, words: VocabularyWord[]): string | null {
  const sheets = sheetsFromWords(words);
  const dataError = writeJson(dataKey(id), sheets);
  if (dataError) return dataError;
  const sets = readImportedMetas().map((set) =>
    set.id === id ? { ...set, wordCount: words.length, updatedAt: new Date().toISOString() } : set
  );
  return writeImportedMetas(sets);
}

function manualWords(id: string): VocabularyWord[] | null {
  if (!readImportedMetas().some((set) => set.id === id)) return null;
  return flattenManual(getSetSheets(id));
}

export function addManualWord(id: string, input: ManualWordInput): ManualResult {
  const words = manualWords(id);
  if (!words) return { ok: false, errors: { form: 'That word set is no longer on this device.' } };
  if (words.length >= MANUAL_SET_MAX_WORDS) {
    return { ok: false, errors: { form: `A set can hold up to ${MANUAL_SET_MAX_WORDS} words. Import a file (Pro) for bigger sets.` } };
  }
  const checked = validateManualWord(input, words);
  if (!checked.ok) return checked;
  const error = persistManual(id, [...words, checked.word]);
  if (error) return { ok: false, errors: { form: error } };
  return { ok: true };
}

/** Edit meaning / example / translation / category of an existing word (found by its key). */
export function updateManualWord(id: string, key: string, input: ManualWordInput): ManualResult {
  const words = manualWords(id);
  if (!words) return { ok: false, errors: { form: 'That word set is no longer on this device.' } };
  const index = words.findIndex((w) => manualKey(w.word, w.category) === key);
  if (index < 0) return { ok: false, errors: { form: 'That word is no longer in this set.' } };
  const checked = validateManualWord(input, words, key);
  if (!checked.ok) return checked;
  const next = [...words];
  next[index] = checked.word;
  const error = persistManual(id, next);
  if (error) return { ok: false, errors: { form: error } };
  const newKey = manualKey(checked.word.word, checked.word.category);
  if (newKey !== key) dropWordProgress(id, words[index]);
  return { ok: true };
}

function dropWordProgress(id: string, word: Pick<VocabularyWord, 'word' | 'category'>): void {
  const progress = getSetProgress(id);
  const key = wordKey(word.word, word.category);
  const learned = { ...progress.learned };
  const learning = { ...(progress.learning ?? {}) };
  delete learned[key];
  delete learning[key];
  saveProgress(id, {
    ...progress,
    learned,
    learning,
    todayKeys: (progress.todayKeys ?? []).filter((k) => k !== key),
  });
}

export function removeManualWord(id: string, key: string): ManualResult {
  const words = manualWords(id);
  if (!words) return { ok: false, errors: { form: 'That word set is no longer on this device.' } };
  const target = words.find((w) => manualKey(w.word, w.category) === key);
  if (!target) return { ok: false, errors: { form: 'That word is no longer in this set.' } };
  if (words.length <= 1) {
    return { ok: false, errors: { form: 'A set needs at least one word. Delete the set instead.' } };
  }
  const error = persistManual(id, words.filter((w) => w !== target));
  if (error) return { ok: false, errors: { form: error } };
  dropWordProgress(id, target);
  return { ok: true };
}

export function renameVocabularySet(
  id: string,
  name: string
): { ok: true } | { ok: false; error: string } {
  if (id === DEFAULT_SET_ID) {
    return { ok: false, error: 'The "Word Set: C1, C2" set cannot be renamed.' };
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
    return { ok: false, error: 'The "Word Set: C1, C2" set cannot be deleted.' };
  }
  const sets = readImportedMetas();
  if (!sets.some((set) => set.id === id)) {
    return { ok: false, error: 'That word set is no longer on this device.' };
  }
  const wasSelected = getSelectedSources().includes(id);
  const error = writeImportedMetas(sets.filter((set) => set.id !== id));
  if (error) return { ok: false, error };
  safeRemove(dataKey(id));
  safeRemove(progressKey(id));
  if (wasSelected) {
    // Drop it from the mix; if nothing is left, fall back to every built-in group.
    const remaining = normalizeSelection(getSelectedSources().filter((item) => item !== id));
    writeSelection(remaining.length > 0 ? remaining : allBuiltinSourceIds());
    clearResumeCursor();
  }
  return { ok: true };
}

/** Removes every imported set and all per-set progress stored on this device. */
export function clearAllVocabularySets(): void {
  const store = storage();
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key && key.startsWith('lv.vocabularySets.')) keys.push(key);
    }
    keys.forEach((key) => store.removeItem(key));
    store.removeItem(SELECTED_SOURCES_KEY);
  } catch {
    /* ignore */
  }
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
