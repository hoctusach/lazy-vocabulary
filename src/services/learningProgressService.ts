import type { DailyMode, DailySelection, LearningProgress, SeverityLevel } from '@/types/learning';
import type { TodayWord, TodayWordSrs } from '@/types/vocabulary';
import { resetLearned } from '@/lib/db/learned';
import { getDailySelectionV2, type DailySelectionV2Row } from '@/lib/db/supabase';
import type { LearnedWordUpsert } from '@/lib/db/learned';
import {
  getProgressSummary,
  refreshProgressSummary,
  type ProgressSummaryFields,
} from '@/lib/progress/progressSummary';
import { ensureUserKey, markLearnedServerByKey, TOTAL_WORDS } from '@/lib/progress/srsSyncByUserKey';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { buildTodaysWords } from '@/utils/todayWords';
import {
  computeLearnedWordStats,
  type DerivedProgressSummary,
  type LearnedWordRow,
  type LearnedWordSummary,
} from '@/lib/progress/learnedWordStats';

export type GenerateParams = {
  userKey: string;
  mode: DailyMode;
  count: number;
  category?: string | null;
};

export type TodaySelectionState = {
  date: string;
  mode: DailyMode;
  count: number;
  category: string | null;
  words: TodayWord[];
  selection: DailySelection;
};

type DailySelectionRow = DailySelectionV2Row;

type VocabularyRow = {
  word_id: string;
  word?: string | null;
  meaning?: string | null;
  example?: string | null;
  translation?: string | null;
  category?: string | null;
  count?: number | string | null;
};

type SelectionNormalizationMeta = {
  mode: DailyMode;
  count: number;
  category: string | null;
};

const TODAY_WORDS_PREFIX = 'todayWords:';
const ACTIVE_USER_KEY = 'todayWords.activeUser';

const DEFAULT_SEVERITY_CONFIG: Record<SeverityLevel, { min: number; max: number }> = {
  light: { min: 15, max: 25 },
  moderate: { min: 30, max: 50 },
  intense: { min: 50, max: 100 },
};

const REVIEW_INTERVALS_DAYS = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35];
const MASTER_INTERVAL_DAYS = 60;
const EXPOSURE_DELAYS_MINUTES = [0, 5, 7, 10, 15, 30, 60, 90, 120];
const MASTER_EXPOSURE_DELAY_MINUTES = 180;

const MODE_TO_SEVERITY: Record<DailyMode, SeverityLevel> = {
  Light: 'light',
  Medium: 'moderate',
  Hard: 'intense',
};

const SEVERITY_TO_MODE: Record<SeverityLevel, DailyMode> = {
  light: 'Light',
  moderate: 'Medium',
  intense: 'Hard',
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

export const todayKeyFor = (userKey: string, d = new Date()) => `${TODAY_WORDS_PREFIX}${userKey}:${toDateKey(d)}`;

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getStorage(): Storage | null {
  try {
    const globalRef = globalThis as unknown as { localStorage?: Storage };
    return globalRef?.localStorage ?? null;
  } catch (error) {
    console.warn('[LearningProgress] localStorage unavailable', error);
    return null;
  }
}

function listStorageKeys(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

function toIsoDate(dateKey: string | null | undefined): string | null {
  if (!dateKey) return null;
  const trimmed = dateKey.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  const candidate = `${trimmed}T00:00:00.000Z`;
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function computeIntervalDays(learnedAt?: string | null, nextReviewAt?: string | null): number | null {
  if (!learnedAt || !nextReviewAt) return null;
  const start = Date.parse(learnedAt);
  const end = Date.parse(nextReviewAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const diff = Math.max(0, end - start);
  return Math.round(diff / 86_400_000);
}

function isDue(srs?: TodayWordSrs | null): boolean {
  if (!srs) return false;
  const candidate = srs.next_review_at ?? srs.next_display_at;
  if (!candidate) return false;
  const parsed = Date.parse(candidate);
  if (Number.isNaN(parsed)) return false;
  return parsed <= Date.now();
}

function isLearnedState(srs?: TodayWordSrs | null): boolean {
  if (!srs) return false;
  if (srs.in_review_queue === false) return true;
  if ((srs.review_count ?? 0) >= REVIEW_INTERVALS_DAYS.length + 1) return true;
  const state = (srs.srs_state ?? '').toLowerCase();
  return state === 'learned';
}

function isReviewCandidate(srs?: TodayWordSrs | null): boolean {
  if (!srs) return false;
  if (srs.in_review_queue === false) return false;
  return (srs.review_count ?? 0) > 0 || isDue(srs);
}

function determineStatus(reviewCount: number, nextReviewIso: string, isLearned: boolean): LearningProgress['status'] {
  if (!isLearned || reviewCount === 0) return 'new';
  if (!nextReviewIso) return 'learned';
  return isDue({ next_review_at: nextReviewIso })
    ? 'due'
    : reviewCount >= REVIEW_INTERVALS_DAYS.length + 1
      ? 'learned'
      : 'not_due';
}

function toSrsState(status: LearningProgress['status']): string {
  switch (status) {
    case 'due':
      return 'review';
    case 'learned':
      return 'learned';
    case 'not_due':
      return 'learning';
    default:
      return 'new';
  }
}

function shouldRemainInQueue(status: LearningProgress['status']): boolean {
  if (status === 'learned') return false;
  if (status === 'new') return false;
  return true;
}

function coerceCategory(category?: string | null): string {
  const trimmed = (category ?? '').trim();
  return trimmed || 'general';
}

function deriveWordFromId(wordId: string): string {
  const segments = wordId.split('::');
  const candidate = segments[segments.length - 1]?.trim();
  return candidate || wordId;
}

function getDailyCount(severity: SeverityLevel): number {
  const config = DEFAULT_SEVERITY_CONFIG[severity] ?? DEFAULT_SEVERITY_CONFIG.light;
  return config.max;
}

function buildSrsFromSelection(selectionRow: DailySelectionRow | null | undefined): TodayWordSrs | undefined {
  if (!selectionRow) return undefined;

  const srs: TodayWordSrs = {
    in_review_queue: selectionRow.in_review_queue ?? undefined,
    review_count: selectionRow.review_count ?? undefined,
    learned_at: selectionRow.learned_at ?? undefined,
    last_review_at: selectionRow.last_review_at ?? undefined,
    next_review_at: selectionRow.next_review_at ?? undefined,
    next_display_at: selectionRow.next_display_at ?? undefined,
    last_seen_at: selectionRow.last_seen_at ?? undefined,
    srs_interval_days: selectionRow.srs_interval_days ?? undefined,
    srs_ease: selectionRow.srs_ease ?? undefined,
    srs_state: selectionRow.srs_state ?? undefined,
  };

  const hasSrsData = Object.values(srs).some((value) => value !== undefined && value !== null);
  return hasSrsData ? srs : undefined;
}

function buildTodayWord(
  selectionRow: DailySelectionRow | null | undefined,
  vocab: VocabularyRow | undefined
): TodayWord | null {
  if (!selectionRow?.word_id) return null;

  const srs = buildSrsFromSelection(selectionRow);

  const word = selectionRow.word ?? vocab?.word ?? deriveWordFromId(selectionRow.word_id);
  const meaning = selectionRow.meaning ?? vocab?.meaning ?? '';
  const example = selectionRow.example ?? vocab?.example ?? '';
  const translation = selectionRow.translation ?? vocab?.translation ?? null;
  const count = vocab?.count ?? 0;
  const category = selectionRow.category ?? vocab?.category ?? null;
  const isDueFromFlags =
    (selectionRow.is_today_selection ?? true) && Boolean(selectionRow.due_selected_today);
  const isDue = isDueFromFlags || isReviewCandidate(srs);

  return {
    word_id: selectionRow.word_id,
    word,
    meaning,
    example,
    translation: translation ?? undefined,
    count,
    category: coerceCategory(category ?? undefined),
    is_due: isDue,
    nextAllowedTime: srs?.next_display_at ?? undefined,
    srs,
  };
}

function toLearningProgress(word: TodayWord): LearningProgress {
  const srs = word.srs ?? undefined;
  const reviewCount = srs?.review_count ?? 0;
  const learnedAt = srs?.learned_at ?? null;
  const nextReviewIso = srs?.next_review_at ?? null;
  const nextReviewDate = nextReviewIso ? toDateKey(new Date(nextReviewIso)) : '';
  const status = determineStatus(reviewCount, nextReviewIso ?? '', isLearnedState(srs));

  return {
    word: word.word,
    type: undefined,
    category: word.category,
    isLearned: isLearnedState(srs),
    reviewCount,
    lastPlayedDate: srs?.last_review_at ?? '',
    status,
    nextReviewDate,
    createdDate: learnedAt ? toDateKey(new Date(learnedAt)) : toDateKey(new Date()),
    learnedDate: learnedAt ?? undefined,
    nextAllowedTime: srs?.next_display_at ?? undefined,
  };
}

function buildSelection(words: TodayWord[], severity: SeverityLevel, meta: SelectionNormalizationMeta): DailySelection {
  const reviewWords: LearningProgress[] = [];
  const newWords: LearningProgress[] = [];
  let dueCount = 0;

  for (const word of words) {
    const progress = toLearningProgress(word);
    progress.isDue = word.is_due;
    const target = word.is_due ? reviewWords : newWords;
    target.push(progress);
    if (word.is_due) dueCount += 1;
  }

  return {
    reviewWords,
    newWords,
    totalCount: reviewWords.length + newWords.length,
    dueCount,
    severity,
    date: meta ? toDateKey(new Date()) : undefined,
    mode: meta.mode,
    count: meta.count,
    category: meta.category ?? null,
  };
}

function calculateNextReviewDate(reviewCount: number, from: Date): string {
  const index = Math.max(0, Math.min(reviewCount - 1, REVIEW_INTERVALS_DAYS.length - 1));
  const intervalDays =
    reviewCount > REVIEW_INTERVALS_DAYS.length ? MASTER_INTERVAL_DAYS : REVIEW_INTERVALS_DAYS[index];
  const next = new Date(from);
  next.setDate(next.getDate() + intervalDays);
  return toDateKey(next);
}

function calculateNextAllowedTime(reviewCount: number, from: Date): string {
  const index = Math.max(0, reviewCount - 1);
  const delayMinutes =
    index < EXPOSURE_DELAYS_MINUTES.length
      ? EXPOSURE_DELAYS_MINUTES[index]
      : MASTER_EXPOSURE_DELAY_MINUTES;
  const next = new Date(from.getTime() + delayMinutes * 60_000);
  return next.toISOString();
}

function buildPayloadFromWord(
  word: TodayWord,
  reviewCount: number,
  status: LearningProgress['status'],
  nextReviewIso: string | null,
  nextAllowedIso: string,
  nowIso: string
): LearnedWordUpsert {
  const learnedAtIso = word.srs?.learned_at ?? nowIso;

  const payload: LearnedWordUpsert = {
    in_review_queue: shouldRemainInQueue(status),
    review_count: reviewCount,
    learned_at: learnedAtIso,
    last_review_at: nowIso,
    next_review_at: nextReviewIso,
    next_display_at: nextAllowedIso,
    last_seen_at: nowIso,
    srs_interval_days: computeIntervalDays(learnedAtIso, nextReviewIso ?? undefined),
    srs_ease: word.srs?.srs_ease ?? 2.5,
    srs_state: toSrsState(status),
  };

  return payload;
}

function applyReviewToWord(word: TodayWord): {
  updated: TodayWord;
  payload: LearnedWordUpsert;
  progress: LearningProgress;
} {
  const now = new Date();
  const reviewCount = (word.srs?.review_count ?? 0) + 1;
  const nextReviewDateKey = calculateNextReviewDate(reviewCount, now);
  const nextReviewIso = toIsoDate(nextReviewDateKey);
  const nextAllowedTime = calculateNextAllowedTime(reviewCount, now);
  const nowIso = now.toISOString();

  const status = determineStatus(reviewCount, nextReviewIso ?? '', true);
  const payload = buildPayloadFromWord(word, reviewCount, status, nextReviewIso, nextAllowedTime, nowIso);

  const updated: TodayWord = {
    ...word,
    is_due: false,
    nextAllowedTime,
    srs: {
      in_review_queue: payload.in_review_queue,
      review_count: reviewCount,
      learned_at: payload.learned_at,
      last_review_at: payload.last_review_at,
      next_review_at: payload.next_review_at,
      next_display_at: payload.next_display_at,
      last_seen_at: payload.last_seen_at,
      srs_interval_days: payload.srs_interval_days,
      srs_ease: payload.srs_ease,
      srs_state: payload.srs_state,
    },
  };

  return { updated, payload, progress: toLearningProgress(updated) };
}

function normalizeToDailySelection(
  details: VocabularyRow[] | null | undefined,
  selection: DailySelectionRow[] | null | undefined,
  meta: SelectionNormalizationMeta
): TodaySelectionState {
  const dateKey = toDateKey(new Date());
  const selectionRows = Array.isArray(selection) ? selection : [];
  const vocabRows = Array.isArray(details) ? details : [];
  const vocabMap = new Map<string, VocabularyRow>();

  for (const row of vocabRows) {
    if (!row?.word_id) continue;
    vocabMap.set(row.word_id, row);
  }

  const mapped: TodayWord[] = [];

  for (const row of selectionRows) {
    if (!row?.word_id) continue;
    if (row.is_today_selection === false) continue;
    const vocab = vocabMap.get(row.word_id);
    const todayWord = buildTodayWord(row, vocab);
    if (todayWord) mapped.push(todayWord);
  }

  const ordered = buildTodaysWords(mapped, 'ALL');
  const severity = MODE_TO_SEVERITY[meta.mode] ?? 'light';
  const selectionPayload = buildSelection(ordered, severity, meta);
  selectionPayload.date = dateKey;

  return {
    date: dateKey,
    mode: meta.mode,
    count: meta.count,
    category: meta.category ?? null,
    words: ordered,
    selection: selectionPayload,
  };
}

function getTodayCache(userKey: string): TodaySelectionState | null {
  const storage = getStorage();
  if (!storage) return null;
  const key = todayKeyFor(userKey);
  const cached = safeParseJSON<TodaySelectionState>(storage.getItem(key));
  if (!cached) return null;
  if (!Array.isArray(cached.words)) return null;
  if (!cached.selection) return null;
  return {
    ...cached,
    category: cached.category ?? null,
    selection: {
      ...cached.selection,
      mode: cached.selection.mode ?? cached.mode,
      count: cached.selection.count ?? cached.count,
      category: cached.selection.category ?? cached.category ?? null,
      date: cached.selection.date ?? cached.date,
    },
  };
}

export function loadTodayWordsFromLocal(userKey: string): TodaySelectionState | null {
  return getTodayCache(userKey);
}

export function saveTodayWordsToLocal(userKey: string, payload: TodaySelectionState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const key = todayKeyFor(userKey);
    storage.setItem(key, JSON.stringify(payload));
    storage.setItem(ACTIVE_USER_KEY, userKey);
  } catch (error) {
    console.warn('[LearningProgress] Failed to persist today words', error);
  }
}

export function clearTodayWordsInLocal(userKey: string): void {
  const storage = getStorage();
  if (!storage) return;
  const prefix = `${TODAY_WORDS_PREFIX}${userKey}:`;
  const keysToRemove = listStorageKeys().filter((key) => key.startsWith(prefix));
  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}

function clearStaleCaches(currentUserKey: string, date = new Date()): void {
  const storage = getStorage();
  if (!storage) return;
  const todayIso = toDateKey(date);
  const keys = listStorageKeys();
  for (const key of keys) {
    if (!key.startsWith(TODAY_WORDS_PREFIX)) continue;
    const [, userKey, cachedDate] = key.split(':');
    if (!cachedDate || cachedDate === todayIso) continue;
    storage.removeItem(key);
    if (userKey && userKey !== currentUserKey) {
      const legacyPrefix = `${TODAY_WORDS_PREFIX}${userKey}:`;
      if (key.startsWith(legacyPrefix)) {
        storage.removeItem(key);
      }
    }
  }

  const activeUser = storage.getItem(ACTIVE_USER_KEY);
  if (activeUser && activeUser !== currentUserKey) {
    clearTodayWordsInLocal(activeUser);
  }
  storage.setItem(ACTIVE_USER_KEY, currentUserKey);
}

export function isToday(date: string | null | undefined): boolean {
  if (!date) return false;
  return date.slice(0, 10) === toDateKey(new Date());
}

export function matchesCurrentOptions(
  cached: TodaySelectionState,
  options: { mode: DailyMode; count: number; category?: string | null }
): boolean {
  const cachedCategory = cached.category ?? null;
  const optionCategory = options.category ?? null;
  return (
    cached.mode === options.mode &&
    cached.count === options.count &&
    cachedCategory === optionCategory
  );
}

async function generateDailySelectionV2(
  userKey: string,
  mode: DailyMode,
  count: number,
  category?: string | null
): Promise<DailySelectionRow[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client unavailable');

  const rows = await getDailySelectionV2(client, {
    userKey,
    count,
    category: category ?? null,
  });

  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] getDailySelectionV2 raw payload', rows);
  }
  return rows;
}

async function fetchVocabularyByIds(wordIds: string[]): Promise<Record<string, VocabularyRow>> {
  if (wordIds.length === 0) return {};
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client unavailable');

  const { data, error } = await client.rpc('fetch_vocabulary_by_ids', { p_ids: wordIds });

  if (error) {
    throw new Error(error.message);
  }

  const rows: VocabularyRow[] = Array.isArray(data) ? (data as VocabularyRow[]) : [];
  const map: Record<string, VocabularyRow> = {};
  for (const row of rows) {
    if (!row) continue;
    const rawId = typeof row.word_id === 'string' && row.word_id.length > 0 ? row.word_id : null;
    const rawWord = typeof row.word === 'string' && row.word.length > 0 ? row.word : null;
    const key = rawId ?? rawWord;
    if (!key) continue;
    const normalized: VocabularyRow = {
      ...row,
      word_id: rawId ?? key,
      word: rawWord ?? key,
    };
    map[normalized.word_id] = normalized;
    if (normalized.word !== normalized.word_id) {
      map[normalized.word] = normalized;
    }
  }
  return map;
}

export async function fetchAndCommitTodaySelection(params: GenerateParams): Promise<TodaySelectionState> {
  const { userKey, mode, count, category = null } = params;
  const selectionRows = await generateDailySelectionV2(userKey, mode, count, category);
  if (!Array.isArray(selectionRows) || selectionRows.length === 0) {
    throw new Error('No daily selection rows returned');
  }

  const selectionById = new Map(
    selectionRows
      .filter(
        (row) =>
          typeof row?.word_id === 'string' &&
          row.word_id.length > 0 &&
          row.is_today_selection !== false
      )
      .map((row) => [row.word_id, row])
  );
  const ids = Array.from(selectionById.keys());

  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] fetchAndCommitTodaySelection rpc result', {
      generatedCount: selectionRows.length,
    });
  }

  const vocabMap = await fetchVocabularyByIds(ids);
  const vocabRows = ids
    .map((id) => {
      const selection = selectionById.get(id);
      const vocab = vocabMap[id];

      if (!selection && !vocab) return null;

      const merged: VocabularyRow = {
        ...(vocab ?? {}),
        word_id: id,
        word: selection?.word ?? vocab?.word ?? deriveWordFromId(id),
        meaning: selection?.meaning ?? vocab?.meaning ?? '',
        example: selection?.example ?? vocab?.example ?? '',
        translation: selection?.translation ?? vocab?.translation ?? null,
        category: selection?.category ?? vocab?.category ?? null,
        count: vocab?.count ?? 0,
      };

      return merged;
    })
    .filter((row): row is VocabularyRow => Boolean(row));

  if (vocabRows.length === 0) {
    throw new Error('No vocabulary details available for selection');
  }

  const today = normalizeToDailySelection(
    vocabRows,
    selectionRows,
    { mode, count, category: category ?? null }
  );

  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[Normalized TodayWords]', today.words);
    console.log('[LearningProgress] fetchAndCommitTodaySelection vocab details', {
      words: today.words.map((word) => ({
        word_id: word.word_id,
        category: word.category,
        word: word.word,
      })),
    });
  }

  saveTodayWordsToLocal(userKey, today);

  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] fetchAndCommitTodaySelection final selection', {
      selectionSize: today.words.length,
    });
  }

  return today;
}

export async function getOrCreateTodayWords(
  userKey: string,
  mode: DailyMode,
  count: number,
  category?: string | null
): Promise<TodaySelectionState> {
  const cached = loadTodayWordsFromLocal(userKey);
  const hasValidCache = Boolean(
    cached && isToday(cached.date) && matchesCurrentOptions(cached, { mode, count, category: category ?? null })
  );
  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] getOrCreateTodayWords cache status', {
      cache: cached
        ? {
            day: cached.date,
            idsLength: cached.words.length,
          }
        : null,
      todayISO: new Date().toISOString(),
      category,
      planSize: count,
    });
  }
  if (hasValidCache && cached && process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] getOrCreateTodayWords serving cached selection while refreshing', {
      day: cached.date,
      idsLength: cached.words.length,
    });
  }
  const fetchPromise = (async () => {
    if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
      console.log('[LearningProgress] getOrCreateTodayWords fetching new selection', {
        category,
        planSize: count,
      });
    }
    return fetchAndCommitTodaySelection({ userKey, mode, count, category: category ?? null });
  })();

  try {
    const result = await fetchPromise;
    return result;
  } catch (error) {
    console.warn('[LearningProgress] Failed to refresh today\'s words from server', {
      error,
      hasValidCache,
    });
    if (hasValidCache && cached) {
      return cached;
    }
    throw error;
  }
}

export async function prepareUserSession(): Promise<string | null> {
  const userKey = await ensureUserKey();
  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] prepareUserSession resolved', { userKey });
  }
  if (!userKey) return null;
  clearStaleCaches(userKey);
  return userKey;
}

export async function markWordReviewed(
  userKey: string,
  wordId: string,
  severity: SeverityLevel
): Promise<{
  words: TodayWord[];
  selection: DailySelection;
  payload: LearnedWordUpsert;
  progress: LearningProgress;
  summary: DerivedProgressSummary | null;
  learnedWords: LearnedWordSummary[] | null;
}> {
  const cached = loadTodayWordsFromLocal(userKey);
  if (!cached) {
    throw new Error('No cached selection for today');
  }

  const index = cached.words.findIndex((entry) => entry.word_id === wordId);
  if (index === -1) {
    throw new Error('Word not found in today cache');
  }

  const { updated, payload, progress } = applyReviewToWord(cached.words[index]);
  const words = [...cached.words];
  words[index] = updated;

  const mode = SEVERITY_TO_MODE[severity] ?? cached.mode;
  const count = getDailyCount(severity);
  const selection = buildSelection(words, severity, {
    mode,
    count,
    category: cached.category,
  });
  selection.date = cached.date;

  const nextCache: TodaySelectionState = {
    ...cached,
    words,
    selection,
  };

  saveTodayWordsToLocal(userKey, nextCache);

  const rows = await markLearnedServerByKey(wordId, payload);

  let summary: DerivedProgressSummary | null = null;
  let learnedSummaries: LearnedWordSummary[] | null = null;

  if (rows) {
    const { learnedWords: derivedWords, summary: derivedSummary } = computeLearnedWordStats(rows, {
      totalWords: TOTAL_WORDS,
    });
    summary = derivedSummary;
    learnedSummaries = derivedWords;
  }

  return {
    words,
    selection,
    payload,
    progress,
    summary,
    learnedWords: learnedSummaries,
  };
}

export async function markWordAsNew(userKey: string, wordId: string): Promise<TodayWord[]> {
  const cached = loadTodayWordsFromLocal(userKey);
  if (!cached) return [];

  const index = cached.words.findIndex((entry) => entry.word_id === wordId);
  if (index === -1) return cached.words;

  const base = cached.words[index];
  const resetWord: TodayWord = {
    ...base,
    is_due: false,
    nextAllowedTime: undefined,
    srs: {
      in_review_queue: false,
      review_count: 0,
      learned_at: null,
      last_review_at: null,
      next_review_at: null,
      next_display_at: null,
      last_seen_at: null,
      srs_interval_days: null,
      srs_ease: base.srs?.srs_ease ?? 2.5,
      srs_state: 'new',
    },
  };

  const words = [...cached.words];
  words[index] = resetWord;

  const severity = MODE_TO_SEVERITY[cached.mode] ?? 'light';
  const selection = buildSelection(words, severity, {
    mode: cached.mode,
    count: cached.count,
    category: cached.category,
  });
  selection.date = cached.date;

  saveTodayWordsToLocal(userKey, {
    ...cached,
    words,
    selection,
  });

  await resetLearned(wordId);
  return words;
}

export async function fetchProgressSummary(userKey: string): Promise<ProgressSummaryFields | null> {
  const refreshed = await refreshProgressSummary(userKey);
  if (refreshed) return refreshed;
  return getProgressSummary(userKey);
}

export async function fetchLearnedWordSummaries(
  userKey: string
): Promise<{
  word: string;
  category?: string;
  learnedDate?: string;
}[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('learned_words')
    .select(
      [
        'word_id',
        'in_review_queue',
        'next_review_at',
        'review_count',
        'srs_state',
        'srs_ease',
        'learned_at',
        'last_review_at',
        'next_display_at',
        'last_seen_at',
      ].join(',')
    )
    .eq('user_unique_key', userKey)
    .order('learned_at', { ascending: false });

  if (error) {
    console.warn('[LearningProgress] Failed to fetch learned words', error.message);
    return [];
  }

  const rawRows = Array.isArray(data) ? (data as LearnedWordRow[]) : [];
  const { learnedWords: summaries } = computeLearnedWordStats(rawRows, {
    totalWords: TOTAL_WORDS,
  });

  if (process.env.DEBUG_PROGRESS) {
    console.debug('[LearningProgress] Learned summary debug', {
      rawCount: rawRows.length,
      filteredCount: summaries.length,
      summary: summaries,
    });
  }

  return summaries;
}

export async function regenerateTodaySelection(
  userKey: string,
  severity: SeverityLevel,
  category?: string | null
): Promise<TodaySelectionState> {
  clearTodayWordsInLocal(userKey);
  const mode = SEVERITY_TO_MODE[severity] ?? 'Light';
  const count = getDailyCount(severity);
  return fetchAndCommitTodaySelection({ userKey, mode, count, category: category ?? null });
}

export function getModeForSeverity(severity: SeverityLevel): DailyMode {
  return SEVERITY_TO_MODE[severity] ?? 'Light';
}

export function getCountForSeverity(severity: SeverityLevel): number {
  return getDailyCount(severity);
}
