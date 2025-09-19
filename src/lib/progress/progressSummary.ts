import { CUSTOM_AUTH_MODE } from '@/lib/customAuthMode';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { TOTAL_WORDS } from './srsSyncByUserKey';

export type ProgressSummaryFields = {
  learning_count: number;
  learned_count: number;
  learning_due_count: number;
  remaining_count: number;
  learning_time: number;
  learned_days: string[];
};

type PartialSummary = Partial<ProgressSummaryFields>;

type SummaryRow = {
  learning_count: number | null;
  learned_count: number | null;
  learning_due_count: number | null;
  remaining_count: number | null;
  learning_time: number | null;
  learned_days: string[] | null;
};

async function fetchExistingSummary(userKey: string): Promise<SummaryRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('user_progress_summary')
    .select(
      'learning_count, learned_count, learning_due_count, remaining_count, learning_time, learned_days'
    )
    .eq('user_unique_key', userKey)
    .maybeSingle<SummaryRow>();

  if (error && error.code !== 'PGRST116') {
    console.warn('progressSummary:fetchExistingSummary', error.message);
    return null;
  }

  return data ?? null;
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
  if (CUSTOM_AUTH_MODE) return;

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
  };

  await client.from('user_progress_summary').upsert(
    {
      user_unique_key: userKey,
      ...merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_unique_key' }
  );
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
  if (CUSTOM_AUTH_MODE) return;

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

  if (CUSTOM_AUTH_MODE) return;

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
    if (CUSTOM_AUTH_MODE) return;
    await mergeProgressSummary(userKey, { learned_days: learnedDays });
  }
}
