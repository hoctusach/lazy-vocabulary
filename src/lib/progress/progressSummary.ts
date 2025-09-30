import { getSupabaseClient } from '@/lib/supabaseClient';
import { TOTAL_WORDS } from './srsSyncByUserKey';

export type ProgressSummaryFields = {
  learning_count: number;
  learned_count: number;
  learning_due_count: number;
  remaining_count: number;
  learning_time: number;
  learned_days: string[];
  updated_at: string | null;
};

type PartialSummary = Partial<ProgressSummaryFields>;

type SummaryRow = {
  learning_count: number | null;
  learned_count: number | null;
  learning_due_count: number | null;
  remaining_count: number | null;
  learning_time: number | null;
  learned_days: string[] | null;
  updated_at: string | null;
};

export function persistProgressSummaryLocal(summary: ProgressSummaryFields): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('progressSummary', JSON.stringify(summary));
    }
  } catch (error) {
    console.warn('progressSummary:persistLocal', error);
  }
}

function readProgressSummaryLocal(): SummaryRow | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('progressSummary');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ProgressSummaryFields>;
    const toNumber = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;
    const toString = (v: unknown) => (typeof v === 'string' ? v : null);

    return {
      learning_count: toNumber(parsed.learning_count),
      learned_count: toNumber(parsed.learned_count),
      learning_due_count: toNumber(parsed.learning_due_count),
      remaining_count: toNumber(parsed.remaining_count),
      learning_time: toNumber(parsed.learning_time),
      learned_days: Array.isArray(parsed.learned_days)
        ? parsed.learned_days.filter((d): d is string => typeof d === 'string')
        : null,
      updated_at: toString(parsed.updated_at),
    };
  } catch (e) {
    console.warn('progressSummary:readLocal', e);
    return null;
  }
}

async function fetchExistingSummary(userKey: string): Promise<SummaryRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const local = readProgressSummaryLocal();

  const { data, error } = await client
    .from('user_progress_summary')
    .select('learning_count, learned_count, learning_due_count, remaining_count, updated_at')
    .eq('user_unique_key', userKey)
    .maybeSingle<Pick<
      SummaryRow,
      'learning_count' | 'learned_count' | 'learning_due_count' | 'remaining_count' | 'updated_at'
    >>();

  // PGRST116 = no rows; fall back to local cache if present
  if (error && (error as any).code !== 'PGRST116') {
    console.warn('progressSummary:fetchExistingSummary', error.message);
    return local;
  }
  const counts = data ?? null;
  if (!counts && !local) return null;

  const learnedCount = counts?.learned_count ?? local?.learned_count ?? 0;

  return {
    learning_count: counts?.learning_count ?? local?.learning_count ?? 0,
    learned_count: learnedCount,
    learning_due_count: counts?.learning_due_count ?? local?.learning_due_count ?? 0,
    remaining_count:
      counts?.remaining_count ??
      local?.remaining_count ??
      Math.max(TOTAL_WORDS - learnedCount, 0),
    learning_time: local?.learning_time ?? 0,          // not stored server-side in schema you showed
    learned_days: local?.learned_days ?? null,         // local-only detail
    updated_at: counts?.updated_at ?? local?.updated_at ?? null,
  };
}

export async function refreshProgressSummary(
  userKey: string
): Promise<ProgressSummaryFields | null> {
  if (!userKey) return null;
  const client = getSupabaseClient();
  if (!client) return null;

  const local = readProgressSummaryLocal();

  // Server recompute (SECURITY DEFINER RPC)
  await client
    .rpc('refresh_user_progress_summary', { p_user_key: userKey })
    .catch((err) => {
      console.warn('progressSummary:refresh:rpc', err?.message ?? err);
    });

  const { data, error } = await client
    .from('user_progress_summary')
    .select('learning_count, learned_count, learning_due_count, remaining_count, updated_at')
    .eq('user_unique_key', userKey)
    .maybeSingle<Pick<
      SummaryRow,
      'learning_count' | 'learned_count' | 'learning_due_count' | 'remaining_count' | 'updated_at'
    >>();

  if (error && (error as any).code !== 'PGRST116') {
    console.warn('progressSummary:refresh', error.message);

    if (!local) return null;
    const fallback: ProgressSummaryFields = {
      learning_count: local.learning_count ?? 0,
      learned_count: local.learned_count ?? 0,
      learning_due_count: local.learning_due_count ?? 0,
      remaining_count:
        local.remaining_count ?? Math.max(TOTAL_WORDS - (local.learned_count ?? 0), 0),
      learning_time: local.learning_time ?? 0,
      learned_days: normaliseDays(local.learned_days),
      updated_at: local.updated_at ?? null,
    };
    persistProgressSummaryLocal(fallback);
    return fallback;
  }

  if (!data && !local) return null;

  const learnedCount = (data?.learned_count ?? local?.learned_count) ?? 0;

  const summary: ProgressSummaryFields = {
    learning_count: data?.learning_count ?? local?.learning_count ?? 0,
    learned_count: learnedCount,
    learning_due_count: data?.learning_due_count ?? local?.learning_due_count ?? 0,
    remaining_count:
      data?.remaining_count ??
      local?.remaining_count ??
      Math.max(TOTAL_WORDS - learnedCount, 0),
    learning_time: local?.learning_time ?? 0,
    learned_days: normaliseDays(local?.learned_days),
    updated_at: data?.updated_at ?? local?.updated_at ?? null,
  };

  persistProgressSummaryLocal(summary);
  return summary;
}

export async function getProgressSummary(
  userKey: string
): Promise<ProgressSummaryFields | null> {
  if (!userKey) return null;
  const existing = await fetchExistingSummary(userKey);
  if (!existing) return null;

  const learnedCount = existing.learned_count ?? 0;

  return {
    learning_count: existing.learning_count ?? 0,
    learned_count: learnedCount,
    learning_due_count: existing.learning_due_count ?? 0,
    remaining_count: existing.remaining_count ?? Math.max(TOTAL_WORDS - learnedCount, 0),
    learning_time: existing.learning_time ?? 0,
    learned_days: normaliseDays(existing.learned_days),
    updated_at: existing.updated_at ?? null,
  };
}

function normaliseDays(days: string[] | null | undefined): string[] {
  if (!Array.isArray(days)) return [];
  const seen = new Set<string>();
  for (const day of days) {
    if (typeof day === 'string' && day.trim().length === 10) {
      seen.add(day.trim());
    }
  }
  return Array.from(seen).sort();
}

export async function mergeProgressSummary(
  userKey: string,
  updates: PartialSummary
): Promise<void> {
  if (!userKey) return;
  const client = getSupabaseClient();
  if (!client) return;
  const existing = await fetchExistingSummary(userKey);

  const nextLearnedCount =
    updates.learned_count ?? existing?.learned_count ?? 0;
  const merged: ProgressSummaryFields = {
    learning_count: updates.learning_count ?? existing?.learning_count ?? 0,
    learned_count: nextLearnedCount,
    learning_due_count:
      updates.learning_due_count ?? existing?.learning_due_count ?? 0,
    remaining_count:
      updates.remaining_count ??
      existing?.remaining_count ??
      Math.max(TOTAL_WORDS - nextLearnedCount, 0),
    learning_time: updates.learning_time ?? existing?.learning_time ?? 0,
    learned_days: updates.learned_days
      ? normaliseDays(updates.learned_days)
      : normaliseDays(existing?.learned_days ?? []),
    updated_at: updates.updated_at ?? existing?.updated_at ?? null,
  };

  persistProgressSummaryLocal(merged);

  await client
    .rpc('refresh_user_progress_summary', { p_user_key: userKey })
    .catch((error) => {
      console.warn('progressSummary:merge:rpc', error?.message ?? error);
    });
}

function isDueToday(nextReviewAt: string | null | undefined): boolean {
  if (!nextReviewAt) return false;
  const parsed = Date.parse(nextReviewAt);
  if (Number.isNaN(parsed)) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return parsed <= today.getTime();
}

type LearnedWordRow = {
  in_review_queue: boolean | null;
  next_review_at: string | null;
};

export async function recalcProgressSummary(userKey: string): Promise<void> {
  if (!userKey) return;
  const client = getSupabaseClient();
  if (!client) return;
  const { data, error } = await client
    .from('learned_words')
    .select('in_review_queue, next_review_at')
    .eq('user_unique_key', userKey);

  if (error) {
    console.warn('progressSummary:recalc', error.message);
    return;
  }

  const rows: LearnedWordRow[] = Array.isArray(data) ? (data as LearnedWordRow[]) : [];
  let learning = 0;
  let learned = 0;
  let due = 0;

  for (const row of rows) {
    const inQueue = row?.in_review_queue === true;
    if (inQueue) {
      learning += 1;
      if (isDueToday(row?.next_review_at ?? null)) {
        due += 1;
      }
    } else {
      learned += 1;
    }
  }

  await mergeProgressSummary(userKey, {
    learning_count: learning,
    learned_count: learned,
    learning_due_count: due,
    remaining_count: Math.max(TOTAL_WORDS - learned, 0),
  });
}

export async function setLearningTimeForDay(
  userKey: string,
  dayISO: string,
  totalMs: number
): Promise<void> {
  if (!userKey) return;
  const safeDay = typeof dayISO === 'string' ? dayISO.slice(0, 10) : '';
  if (!safeDay) return;

  const existing = await fetchExistingSummary(userKey);
  const learnedDays = normaliseDays(existing?.learned_days ?? []);
  const hours = Math.max(0, totalMs) / 3_600_000;

  if (hours > 0 && !learnedDays.includes(safeDay)) {
    learnedDays.push(safeDay);
    learnedDays.sort();
  }

  await mergeProgressSummary(userKey, {
    learning_time: hours,
    learned_days: learnedDays,
  });
}

export async function ensureLearnedDay(userKey: string, dayISO: string): Promise<void> {
  if (!userKey) return;
  const safeDay = typeof dayISO === 'string' ? dayISO.slice(0, 10) : '';
  if (!safeDay) return;

  const existing = await fetchExistingSummary(userKey);
  const learnedDays = normaliseDays(existing?.learned_days ?? []);
  if (!learnedDays.includes(safeDay)) {
    learnedDays.push(safeDay);
    learnedDays.sort();
    await mergeProgressSummary(userKey, { learned_days: learnedDays });
  }
}
