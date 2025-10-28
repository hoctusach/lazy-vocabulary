import { formatDateKey, toDateKeyFromISOString } from '@/utils/dateKey';

type Nullable<T> = T | null | undefined;

export type LearnedWordRow = {
  word_id: string | null;
  srs_state: string | null;
  learned_at: string | null;
  mark_learned_at: string | null;
  last_review_at: string | null;
  next_review_at: string | null;
  next_display_at: string | null;
  in_review_queue: boolean | null;
  review_count: number | null;
  srs_interval_days: number | null;
  srs_ease: number | null;
  is_today_selection: boolean | null;
  due_selected_today: boolean | null;
  category?: string | null;
  word?: string | null;
};

export type LearnedWordSummary = {
  word: string;
  category?: string;
  learnedDate?: string;
};

export type TodayLearnedWordSummary = {
  word: string;
  category?: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  reviewCount?: number;
  dueSelectedToday: boolean;
};

export type DerivedProgressSummary = {
  learned: number;
  learning: number;
  new: number;
  due: number;
  remaining: number;
  total?: number;
  learnedDays?: string[];
  source?: 'client' | 'server';
};

type ComputeOptions = {
  now?: Date;
  totalWords?: number;
  timezone?: string | null;
};

// Normalizes arbitrary timestamp input into a consistent ISO string so that
// date-only values (e.g. "2024-02-01") and timezone-offset strings can be
// compared safely. Invalid inputs resolve to null.
function normaliseIso(value: Nullable<string>): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

function matchesToday(value: Nullable<string>, today: Date, timezone: string | null): boolean {
  const iso = normaliseIso(value);
  if (!iso) return false;
  const dateKey = toDateKeyFromISOString(iso, timezone);
  if (!dateKey) return false;
  return dateKey === formatDateKey(today, timezone);
}

function isDue(row: LearnedWordRow, now: Date): boolean {
  const iso = normaliseIso(row.next_review_at);
  if (!iso) return false;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return false;
  return parsed <= now.getTime();
}

function toWordAndCategory(row: LearnedWordRow): { word: string; category?: string } | null {
  const rawWordId = typeof row?.word_id === 'string' ? row.word_id : '';
  const fallbackCategory =
    typeof row?.category === 'string' && row.category.trim().length > 0
      ? row.category.trim()
      : '';
  const fallbackWord = typeof row?.word === 'string' ? row.word.trim() : '';

  const segments = rawWordId
    .split('::')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    if (!fallbackWord) {
      return null;
    }
    return {
      word: fallbackWord,
      category: fallbackCategory || undefined,
    };
  }

  let word = segments[0];
  let categoryFromId = segments.length > 1 ? segments.slice(1).join('::') : '';

  if (fallbackCategory && segments[0].toLowerCase() === fallbackCategory.toLowerCase()) {
    word = segments[segments.length - 1];
    categoryFromId = fallbackCategory;
  }

  const category = categoryFromId || fallbackCategory || undefined;

  return {
    word: word || fallbackWord || rawWordId,
    category,
  };
}

function toLearnedSummary(row: LearnedWordRow): LearnedWordSummary | null {
  const base = toWordAndCategory(row);
  if (!base) return null;
  const learnedDate =
    normaliseIso(row.mark_learned_at) ??
    normaliseIso(row.learned_at) ??
    normaliseIso(row.last_review_at) ??
    normaliseIso(row.next_review_at) ??
    undefined;
  return {
    ...base,
    learnedDate,
  };
}

function toTodaySummary(row: LearnedWordRow, dueSelectedToday: boolean): TodayLearnedWordSummary | null {
  const base = toWordAndCategory(row);
  if (!base) return null;
  const lastReviewedAt = normaliseIso(row.last_review_at) ?? undefined;
  const nextReviewAt = normaliseIso(row.next_review_at) ?? undefined;
  const reviewCount = typeof row.review_count === 'number' ? row.review_count : undefined;
  return {
    ...base,
    lastReviewedAt,
    nextReviewAt,
    reviewCount,
    dueSelectedToday,
  };
}

/**
 * Shapes the Supabase learned_words RPC payload into UI friendly learned word
 * summaries and derived progress counters.
 *
 * - Missing timestamps fallback to the most recent available column so we can
 *   keep the "learned" list stable even when the backend omits optional data.
 * - Date comparisons prefer backend-provided flags and fall back to the user's
 *   timezone when classifying "today" entries.
 */
export function computeLearnedWordStats(
  rows: LearnedWordRow[],
  options: ComputeOptions = {}
): {
  learnedWords: LearnedWordSummary[];
  newTodayWords: TodayLearnedWordSummary[];
  dueTodayWords: TodayLearnedWordSummary[];
  summary: DerivedProgressSummary;
} {
  const now = options.now ?? new Date();
  const totalWords = Math.max(options.totalWords ?? 0, 0);

  const safeRows = Array.isArray(rows) ? rows : [];
  const learnedRows = safeRows.filter((row) => (row?.srs_state ?? '').toLowerCase() === 'learned');
  const learningRows = safeRows.filter((row) => (row?.srs_state ?? '').toLowerCase() === 'learning');

  const dueRows = learningRows.filter((row) => isDue(row, now));

  const timezone = options.timezone ?? null;

  const isTodaySelection = (row: LearnedWordRow) => {
    if (row?.is_today_selection !== null && row?.is_today_selection !== undefined) {
      return Boolean(row.is_today_selection);
    }
    return matchesToday(row.last_review_at, now, timezone);
  };

  const isDueSelectedToday = (row: LearnedWordRow) => {
    if (row?.due_selected_today !== null && row?.due_selected_today !== undefined) {
      return Boolean(row.due_selected_today);
    }
    return isDue(row, now);
  };

  const newTodayWords = learningRows
    .filter((row) => isTodaySelection(row) && !isDueSelectedToday(row))
    .map((row) => toTodaySummary(row, false))
    .filter((value): value is TodayLearnedWordSummary => value !== null);

  const dueTodayWords = learningRows
    .filter((row) => isTodaySelection(row) && isDueSelectedToday(row))
    .map((row) => toTodaySummary(row, true))
    .filter((value): value is TodayLearnedWordSummary => value !== null);

  const learnedWords = learnedRows
    .map(toLearnedSummary)
    .filter((value): value is LearnedWordSummary => value !== null);

  const learnedCount = learnedRows.length;
  const learningCount = learningRows.length;
  const remainingCount = Math.max(totalWords - learnedCount - learningCount, 0);

  const summary: DerivedProgressSummary = {
    learned: learnedCount,
    learning: learningCount,
    new: Math.max(totalWords - learningCount, 0),
    due: dueRows.length,
    remaining: remainingCount,
    total: learnedCount + learningCount + remainingCount,
    source: 'client',
  };

  return { learnedWords, newTodayWords, dueTodayWords, summary };
}
