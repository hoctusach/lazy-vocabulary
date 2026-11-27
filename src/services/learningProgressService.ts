import type { DailyMode, DailySelection, LearningProgress, SeverityLevel } from '@/types/learning';
import type { TodayWord, TodayWordSrs } from '@/types/vocabulary';
import { getDailySelectionV2, type DailySelectionV2Row } from '@/lib/db/supabase';
import type { LearnedWordUpsert } from '@/lib/db/learned';
import { ensureUserKey, markLearnedServerByKey } from '@/lib/progress/srsSyncByUserKey';
import { getDefaultVocabularyTotal, normalizeCategory } from '@/data/defaultVocabulary';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { filterByBuiltinGroups } from '@/features/word-sets/mixQueue';
import { buildTodaysWords } from '@/utils/todayWords';
import {
  DAILY_SELECTION_KEY,
  LAST_SELECTION_DATE_KEY,
  TODAY_DATE_KEY,
  TODAY_SELECTION_KEY,
  TODAY_WORDS_KEY,
} from '@/utils/storageKeys';
import { formatDateKey, normalizeTimeZone, resolveLocalTimezone } from '@/utils/dateKey';
import {
  computeLearnedWordStats,
  type DerivedProgressSummary,
  type LearnedWordRow,
  type LearnedWordSummary,
  type TodayLearnedWordSummary,
} from '@/lib/progress/learnedWordStats';
import { markStudiedToday } from '@/lib/reminders/studySignal';
import { extractServerSummary } from '@/lib/progress/serverSummary';
import { MASTER_INTERVAL_DAYS, REVIEW_INTERVALS_DAYS } from '@/lib/progress/reviewSchedule';
import { todayKey } from '@/lib/progress/streak';
import { isInActiveSet, pickTopUp, rowWord, toTodaySummary } from '@/services/dailyTopUp';
import { DAILY_TARGET, topUpNeeded } from '@/lib/progress/dailyTarget';

export type GenerateParams = {
  userKey: string;
  mode: DailyMode;
  count: number;
  category?: string | null;
  /**
   * Multi-set mixing, 2-5 built-in groups: the RPC is called with `category` NULL and the rows are
   * filtered to these groups client-side. The server quota is shared across all groups, so fewer
   * built-in words than usual may arrive that day. Ignored when null/empty.
   */
  filterGroups?: string[] | null;
};

export type TodaySelectionState = {
  date: string;
  mode: DailyMode;
  count: number;
  category: string | null;
  timezone: string | null;
  words: TodayWord[];
  selection: DailySelection;
};

export type TodaySelectionWithStats = TodaySelectionState & {
  summary: DerivedProgressSummary | null;
  learnedWords: LearnedWordSummary[];
  /** [FB-51] Words marked learned today only (local date). */
  learnedTodayWords: LearnedWordSummary[];
  newTodayWords: TodayLearnedWordSummary[];
  dueTodayWords: TodayLearnedWordSummary[];
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
  timezone: string | null;
};

/**
 * FB-35 (Option A): one daily target, 20 words TOTAL (new + review). If few reviews are due the rest is filled
 * with new words up to 20. The old Light/Medium/Hard sizes (25/50/100) contradicted that, so every severity now
 * maps to the same total; the severity type stays only so stored preferences keep parsing.
 */
export const DAILY_TOTAL_WORDS = DAILY_TARGET;

// The review schedule constants live in lib/progress/reviewSchedule.ts (the Mark as Learned dialog reads them too).
export { REVIEW_INTERVALS_DAYS, MASTER_INTERVAL_DAYS };
const EXPOSURE_DELAYS_MINUTES = [0, 5, 7, 10, 15, 30, 60, 90, 120];
const MASTER_EXPOSURE_DELAY_MINUTES = 180;

const TODAY_SELECTION_STORAGE_KEY = TODAY_SELECTION_KEY;
const TODAY_DATE_STORAGE_KEY = TODAY_DATE_KEY;

function persistTodaySelectionState(state: TodaySelectionState | null): void {
  if (typeof localStorage === 'undefined') return;

  if (!state || !state.selection) {
    try {
      localStorage.removeItem(DAILY_SELECTION_KEY);
      localStorage.removeItem(TODAY_SELECTION_STORAGE_KEY);
      localStorage.removeItem(TODAY_WORDS_KEY);
      localStorage.removeItem(TODAY_DATE_STORAGE_KEY);
    } catch (error) {
      console.warn('[LearningProgress] Failed to clear today selection cache', error);
    }
    return;
  }

  const dateKey = state.date || formatDateKey(new Date(), state.timezone ?? null);

  try {
    const serialisedSelection = JSON.stringify(state.selection);
    localStorage.setItem(DAILY_SELECTION_KEY, serialisedSelection);
    localStorage.setItem(TODAY_SELECTION_STORAGE_KEY, serialisedSelection);
    localStorage.setItem(TODAY_WORDS_KEY, JSON.stringify(state.words ?? []));
    localStorage.setItem(LAST_SELECTION_DATE_KEY, dateKey);
    localStorage.setItem(TODAY_DATE_STORAGE_KEY, dateKey);
  } catch (error) {
    console.warn('[LearningProgress] Failed to persist today selection cache', error);
  }
}

export function hasCachedTodaySelection(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const selection =
      localStorage.getItem(TODAY_SELECTION_STORAGE_KEY) ?? localStorage.getItem(DAILY_SELECTION_KEY);
    const words = localStorage.getItem(TODAY_WORDS_KEY);
    return Boolean(selection && words);
  } catch {
    return false;
  }
}

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

const timezoneCache = new Map<string, string | null>();

async function resolveUserTimezone(userKey: string): Promise<string | null> {
  if (!userKey) return resolveLocalTimezone();
  if (timezoneCache.has(userKey)) {
    return timezoneCache.get(userKey) ?? null;
  }

  let timezone: string | null = null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('nicknames')
      .select('timezone')
      .eq('user_unique_key', userKey)
      .maybeSingle();

    if (error) {
      console.warn('[LearningProgress] Failed to fetch user timezone', error.message);
    }

    const normalized = normalizeTimeZone(data?.timezone);
    timezone = normalized ?? resolveLocalTimezone();
  } catch (error) {
    console.warn('[LearningProgress] Unable to resolve user timezone', error);
    timezone = resolveLocalTimezone();
  }

  timezoneCache.set(userKey, timezone ?? null);
  return timezone ?? null;
}

function toDateKey(value: Date, timezone: string | null = null): string {
  return formatDateKey(value, timezone);
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

function getDailyCount(_severity: SeverityLevel): number {
  return DAILY_TOTAL_WORDS;
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

  if (isLearnedState(srs)) {
    return null;
  }

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

function toLearningProgress(word: TodayWord, timezone: string | null): LearningProgress {
  const srs = word.srs ?? undefined;
  const reviewCount = srs?.review_count ?? 0;
  const learnedAt = srs?.learned_at ?? null;
  const nextReviewIso = srs?.next_review_at ?? null;
  const nextReviewDate = nextReviewIso ? toDateKey(new Date(nextReviewIso), timezone) : '';
  // A word that has been reviewed at least once is in its schedule ("not_due" / "due"), not "new".
  const status = determineStatus(reviewCount, nextReviewIso ?? '', isLearnedState(srs) || reviewCount > 0);

  return {
    word: word.word,
    type: undefined,
    category: word.category,
    isLearned: isLearnedState(srs),
    reviewCount,
    lastPlayedDate: srs?.last_review_at ?? '',
    status,
    nextReviewDate,
    createdDate: learnedAt
      ? toDateKey(new Date(learnedAt), timezone)
      : toDateKey(new Date(), timezone),
    learnedDate: learnedAt ?? undefined,
    nextAllowedTime: srs?.next_display_at ?? undefined,
  };
}

function buildSelection(words: TodayWord[], severity: SeverityLevel, meta: SelectionNormalizationMeta): DailySelection {
  const reviewWords: LearningProgress[] = [];
  const newWords: LearningProgress[] = [];
  let dueCount = 0;

  for (const word of words) {
    const progress = toLearningProgress(word, meta.timezone);
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
    date: meta ? toDateKey(new Date(), meta.timezone) : undefined,
    mode: meta.mode,
    count: meta.count,
    category: meta.category ?? null,
    timezone: meta.timezone ?? null,
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
  const dateKey = toDateKey(new Date(), meta.timezone);
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
    timezone: meta.timezone ?? null,
    words: ordered,
    selection: selectionPayload,
  };
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

export async function loadDailySelectionSummary(
  userKey: string,
  opts?: { count?: number; category?: string | null; timezone?: string }
): Promise<{ summary: DerivedProgressSummary; rows: DailySelectionRow[] }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client unavailable');
  }

  const rows = await getDailySelectionV2(client, {
    userKey,
    count: opts?.count ?? 10,
    category: opts?.category ?? null,
  });

  const server = extractServerSummary(rows);
  if (server) {
    const total = server.learned + server.learning + server.remaining;
    const summary: DerivedProgressSummary = {
      learned: server.learned,
      learning: server.learning,
      new: server.remaining,
      due: server.due,
      remaining: server.remaining,
      total,
      learnedDays: server.learnedDays,
      source: 'server',
    };

    return { summary, rows };
  }

  const fallback = computeLearnedWordStats(rows as unknown as LearnedWordRow[], {
    totalWords: getDefaultVocabularyTotal(),
    timezone: opts?.timezone ?? null,
  });

  return {
    summary: fallback.summary,
    rows,
  };
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

const SERVER_MAX_PER_CALL = 25; // generate_daily_selection_v2 clamps p_count to 25

type ServerPass = {
  rawRows: DailySelectionRow[];
  /** Rows the device can show (bundle words), limited to the selected groups. */
  rows: DailySelectionRow[];
  today: TodaySelectionState;
  /** Active (not learned) today rows the server counted, including words this device cannot show. */
  serverActive: number;
};

async function loadServerPass(
  userKey: string,
  mode: DailyMode,
  count: number,
  category: string | null,
  filterGroups: string[] | null,
  timezone: string | null
): Promise<ServerPass> {
  const rawRows = await generateDailySelectionV2(userKey, mode, count, category);
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('No daily selection rows returned');
  }
  const serverActive = rawRows.filter(
    (row) => row.is_today_selection !== false && (row.srs_state ?? '').toLowerCase() !== 'learned'
  ).length;

  // [FB-51] Words the shipped bundle lacks (server-only) are dropped here, then topped up from the bundle.
  let rows = rawRows.filter((row) => isInActiveSet(row));
  if (filterGroups && filterGroups.length > 0) {
    rows = filterByBuiltinGroups(rows, filterGroups);
  }

  const selectionById = new Map(
    rows
      .filter(
        (row) =>
          typeof row?.word_id === 'string' && row.word_id.length > 0 && row.is_today_selection !== false
      )
      .map((row) => [row.word_id, row])
  );
  const ids = Array.from(selectionById.keys());

  let vocabMap: Record<string, VocabularyRow> = {};
  if (ids.length > 0) {
    vocabMap = await fetchVocabularyByIds(ids);
  }
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
        category: normalizeCategory(selection?.category ?? vocab?.category ?? null),
        count: vocab?.count ?? 0,
      };
      return merged;
    })
    .filter((row): row is VocabularyRow => Boolean(row));

  const today = normalizeToDailySelection(vocabRows, rows, {
    mode,
    count,
    category: category ?? null,
    timezone: timezone ?? null,
  });
  return { rawRows, rows, today, serverActive };
}

function readLocallyLearnedWords(userKey: string): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem('learningProgress');
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    const mine = parsed && typeof parsed === 'object' ? (parsed[userKey] as Record<string, unknown> | undefined) : undefined;
    return mine && typeof mine === 'object' ? Object.keys(mine).map((id) => id.split('::')[0] ?? id) : [];
  } catch {
    return [];
  }
}

/** Add topped-up words to a day (same sort/selection rebuild as the server path). */
export function appendTodayWords(state: TodaySelectionState, extra: TodayWord[], severity: SeverityLevel): TodaySelectionState {
  if (extra.length === 0) return state;
  const ordered = buildTodaysWords([...state.words, ...extra], 'ALL');
  const selection = buildSelection(ordered, severity, {
    mode: state.mode,
    count: state.count,
    category: state.category,
    timezone: state.timezone,
  });
  selection.date = state.selection.date ?? state.date;
  selection.timezone = state.selection.timezone ?? state.timezone ?? null;
  return { ...state, words: ordered, selection };
}

export async function fetchAndCommitTodaySelection(
  params: GenerateParams
): Promise<TodaySelectionWithStats> {
  const { userKey, mode, count, category = null, filterGroups = null } = params;
  const timezone = await resolveUserTimezone(userKey);
  const severity = MODE_TO_SEVERITY[mode] ?? 'light';
  const localToday = todayKey();

  let pass = await loadServerPass(userKey, mode, count, category, filterGroups, timezone);
  const learnedTodayOf = (p: ServerPass) =>
    computeLearnedWordStats(p.rows as unknown as LearnedWordRow[], { timezone }).learnedTodayWords;

  // [FB-51] 1) Ask the server for more (it fills due first) while we are short after dropping server-only words.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const need = topUpNeeded(pass.today.words.length, learnedTodayOf(pass).length);
    const nextCount = Math.min(SERVER_MAX_PER_CALL, pass.serverActive + need);
    if (need === 0 || nextCount <= pass.serverActive) break;
    try {
      const again = await loadServerPass(userKey, mode, nextCount, category, filterGroups, timezone);
      if (again.today.words.length <= pass.today.words.length) break;
      pass = again;
    } catch {
      break;
    }
  }

  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] fetchAndCommitTodaySelection rpc result', {
      generatedCount: pass.rawRows.length,
      kept: pass.rows.length,
    });
  }

  const derived = computeLearnedWordStats(pass.rows as unknown as LearnedWordRow[], {
    totalWords: getDefaultVocabularyTotal(),
    timezone,
  });
  let today = pass.today;

  // [FB-51] 2) Device top-up: Due first (none known beyond the server's rows), then New from the bundle.
  const learnedBefore = [
    ...derived.learnedWords.map((entry) => entry.word),
    ...readLocallyLearnedWords(userKey),
  ];
  const serverLearnedAll = pass.rawRows
    .filter((row) => (row.srs_state ?? '').toLowerCase() === 'learned')
    .map((row) => rowWord(row));
  const planGroups = filterGroups && filterGroups.length > 0 ? filterGroups : category ? [category] : null;
  const need = topUpNeeded(today.words.length, derived.learnedTodayWords.length);
  const picked = pickTopUp({
    need,
    dueCandidates: pass.rawRows
      .filter(
        (row) =>
          row.is_today_selection === false &&
          (row.srs_state ?? '').toLowerCase() !== 'learned' &&
          row.in_review_queue !== false &&
          Boolean(row.next_review_at) &&
          Date.parse(row.next_review_at as string) <= Date.now()
      )
      .map((row) => buildTodayWord(row, undefined))
      .filter((word): word is TodayWord => Boolean(word)),
    excludeWords: [
      ...today.words.map((word) => word.word),
      ...pass.rawRows.filter((row) => row.is_today_selection !== false).map((row) => rowWord(row)),
      ...learnedBefore,
      ...serverLearnedAll,
    ],
    groups: planGroups,
    seed: `${userKey}|${localToday}`,
  });
  const extras = [...picked.due, ...picked.fresh];
  today = appendTodayWords(today, extras, severity);

  const newTodayWords = [
    ...derived.newTodayWords,
    ...picked.fresh.map((word) => toTodaySummary(word, false)),
  ];
  const dueTodayWords = [
    ...derived.dueTodayWords,
    ...picked.due.map((word) => toTodaySummary(word, true)),
  ];

  const serverSummary = extractServerSummary(pass.rawRows);
  const summary: DerivedProgressSummary = serverSummary
    ? {
        learned: serverSummary.learned,
        learning: serverSummary.learning,
        new: serverSummary.remaining,
        due: serverSummary.due,
        remaining: serverSummary.remaining,
        total: serverSummary.learned + serverSummary.learning + serverSummary.remaining,
        learnedDays: serverSummary.learnedDays,
        source: 'server',
      }
    : derived.summary;

  const result: TodaySelectionWithStats = {
    ...today,
    summary,
    learnedWords: derived.learnedWords,
    learnedTodayWords: derived.learnedTodayWords,
    newTodayWords,
    dueTodayWords,
  };

  persistTodaySelectionState(today);
  return result;
}

export async function getOrCreateTodayWords(
  userKey: string,
  mode: DailyMode,
  count: number,
  category?: string | null,
  filterGroups?: string[] | null
): Promise<TodaySelectionWithStats> {
  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] getOrCreateTodayWords fetching selection', {
      category,
      planSize: count,
    });
  }

  return fetchAndCommitTodaySelection({
    userKey,
    mode,
    count,
    category: category ?? null,
    filterGroups: filterGroups ?? null,
  });
}

export async function prepareUserSession(): Promise<string | null> {
  const userKey = await ensureUserKey();
  if (process.env.NEXT_PUBLIC_LAZYVOCA_DEBUG === '1') {
    console.log('[LearningProgress] prepareUserSession resolved', { userKey });
  }
  if (!userKey) return null;
  return userKey;
}

export async function markWordReviewed(
  userKey: string,
  wordId: string,
  severity: SeverityLevel,
  currentState: TodaySelectionState
): Promise<{
  words: TodayWord[];
  selection: DailySelection;
  payload: LearnedWordUpsert;
  progress: LearningProgress;
  summary: DerivedProgressSummary | null;
  learnedWords: LearnedWordSummary[] | null;
  newTodayWords: TodayLearnedWordSummary[] | null;
  dueTodayWords: TodayLearnedWordSummary[] | null;
}> {
  const index = currentState.words.findIndex((entry) => entry.word_id === wordId);
  if (index === -1) {
    throw new Error('Word not found in today cache');
  }

  markStudiedToday('mark');
  const { payload, progress } = applyReviewToWord(currentState.words[index]);
  const words = [...currentState.words];

  // Remove the word from today's queue once it is explicitly marked as learned so
  // it will not continue to autoplay during the same session.
  words.splice(index, 1);

  const mode = SEVERITY_TO_MODE[severity] ?? currentState.mode;
  const count = getDailyCount(severity);
  const selection = buildSelection(words, severity, {
    mode,
    count,
    category: currentState.category,
    timezone: currentState.timezone,
  });
  selection.date = currentState.selection.date ?? currentState.date;
  selection.timezone = currentState.selection.timezone ?? currentState.timezone ?? null;

  const markResult = await markLearnedServerByKey(wordId, payload);

  let summary: DerivedProgressSummary | null = null;
  let learnedSummaries: LearnedWordSummary[] | null = null;
  let newTodaySummaries: TodayLearnedWordSummary[] | null = null;
  let dueTodaySummaries: TodayLearnedWordSummary[] | null = null;

  if (markResult) {
    const rows = markResult.rows;
    const {
      learnedWords: derivedWords,
      newTodayWords: derivedNewToday,
      dueTodayWords: derivedDueToday,
      summary: derivedSummary,
    } = computeLearnedWordStats(rows, {
      totalWords: getDefaultVocabularyTotal(),
      timezone: currentState.timezone,
    });
    summary = derivedSummary;
    learnedSummaries = derivedWords;
    newTodaySummaries = derivedNewToday;
    dueTodaySummaries = derivedDueToday;

    if (markResult.serverSummary) {
      const server = markResult.serverSummary;
      const total = server.learned + server.learning + server.remaining;
      summary = {
        learned: server.learned,
        learning: server.learning,
        new: server.remaining,
        due: server.due,
        remaining: server.remaining,
        total,
        learnedDays: server.learnedDays,
        source: 'server',
      };
    }
  }

  return {
    words,
    selection,
    payload,
    progress,
    summary,
    learnedWords: learnedSummaries,
    newTodayWords: newTodaySummaries,
    dueTodayWords: dueTodaySummaries,
  };
}

export type MarkWordAsNewResult = {
  learnedWords: LearnedWordSummary[];
  learnedTodayWords: LearnedWordSummary[];
  newTodayWords: TodayLearnedWordSummary[];
  dueTodayWords: TodayLearnedWordSummary[];
  summary: DerivedProgressSummary;
};

export async function markWordAsNew(
  userKey: string,
  wordId: string
): Promise<MarkWordAsNewResult | null> {
  if (!userKey || !wordId) return null;
  markStudiedToday('mark');

  const client = getSupabaseClient();
  if (!client) return null;

  const timezone = await resolveUserTimezone(userKey);

  try {
    const { data, error } = await client.rpc('mark_word_new_by_key', {
      p_user_key: userKey,
      word_id: wordId,
    });

    if (error) {
      console.warn('[LearningProgress] Failed to reset learned word', error.message);
      return null;
    }

    const normalizedRows = Array.isArray(data)
      ? (data as unknown[])
          .map((entry) => normalizeLearnedWordRow(entry))
          .filter((row): row is LearnedWordRow => row !== null)
      : [];

    const { learnedWords, learnedTodayWords, newTodayWords, dueTodayWords, summary } = computeLearnedWordStats(normalizedRows, {
      totalWords: getDefaultVocabularyTotal(),
      timezone,
    });

    return {
      learnedWords,
      learnedTodayWords,
      newTodayWords,
      dueTodayWords,
      summary,
    };
  } catch (error) {
    console.warn('[LearningProgress] markWordAsNew RPC failed', error);
    return null;
  }
}

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function normalizeLearnedWordRow(value: unknown): LearnedWordRow | null {
  if (!isPlainObject(value)) return null;

  const ensureNumber = (candidate: unknown): number | null => {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'bigint') return Number(candidate);
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  return {
    word_id: typeof value.word_id === 'string' ? value.word_id : null,
    srs_state: typeof value.srs_state === 'string' ? value.srs_state : null,
    learned_at: typeof value.learned_at === 'string' ? value.learned_at : null,
    mark_learned_at: typeof value.mark_learned_at === 'string' ? value.mark_learned_at : null,
    last_review_at: typeof value.last_review_at === 'string' ? value.last_review_at : null,
    next_review_at: typeof value.next_review_at === 'string' ? value.next_review_at : null,
    next_display_at: typeof value.next_display_at === 'string' ? value.next_display_at : null,
    in_review_queue:
      typeof value.in_review_queue === 'boolean' ? value.in_review_queue : null,
    review_count: ensureNumber(value.review_count),
    srs_interval_days: ensureNumber(value.srs_interval_days),
    srs_ease: ensureNumber(value.srs_ease),
    is_today_selection:
      typeof value.is_today_selection === 'boolean' ? value.is_today_selection : null,
    due_selected_today:
      typeof value.due_selected_today === 'boolean' ? value.due_selected_today : null,
    category: typeof value.category === 'string' ? value.category : null,
    word: typeof value.word === 'string' ? value.word : null,
  };
}

export async function regenerateTodaySelection(
  userKey: string,
  severity: SeverityLevel,
  category?: string | null
): Promise<TodaySelectionWithStats> {
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
