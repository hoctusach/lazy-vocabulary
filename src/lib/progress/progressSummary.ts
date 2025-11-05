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

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readProgressSummaryLocal(): SummaryRow | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('progressSummary');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ProgressSummaryFields>;
    return {
      learning_count: toNumber(parsed.learning_count),
      learned_count: toNumber(parsed.learned_count),
      learning_due_count: toNumber(parsed.learning_due_count),
      remaining_count: toNumber(parsed.remaining_count),
      learning_time: toNumber(parsed.learning_time),
      learned_days: toStringArray(parsed.learned_days),
      updated_at: toString(parsed.updated_at),
    };
  } catch (e) {
    console.warn('progressSummary:readLocal', e);
    return null;
  }
}

async function fetchSummaryFromServer(userKey: string): Promise<SummaryRow | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('user_progress_summary')
      .select(
        'learning_count, learned_count, learning_due_count, remaining_count, learning_time, learned_days, updated_at'
      )
      .eq('user_unique_key', userKey)
      .maybeSingle();

    if (error) {
      console.warn('progressSummary:fetchServer', error.message);
      return null;
    }

    if (!data) return null;

    const record = data as Record<string, unknown>;
    return {
      learning_count: toNumber(record.learning_count),
      learned_count: toNumber(record.learned_count),
      learning_due_count: toNumber(record.learning_due_count),
      remaining_count: toNumber(record.remaining_count),
      learning_time: toNumber(record.learning_time),
      learned_days: toStringArray(record.learned_days),
      updated_at: toString(record.updated_at),
    };
  } catch (error) {
    console.warn('progressSummary:fetchServer', error);
    return null;
  }
}

async function fetchExistingSummary(userKey: string): Promise<SummaryRow | null> {
  if (!userKey) return null;

  const local = readProgressSummaryLocal();
  if (local) {
    return {
      learning_count: local.learning_count ?? 0,
      learned_count: local.learned_count ?? 0,
      learning_due_count: local.learning_due_count ?? 0,
      remaining_count:
        local.remaining_count ??
        Math.max(TOTAL_WORDS - (local.learned_count ?? 0), 0),
      learning_time: local.learning_time ?? 0,
      learned_days: local.learned_days ?? null,
      updated_at: local.updated_at ?? null,
    };
  }

  const remote = await fetchSummaryFromServer(userKey);
  if (remote) {
    return {
      learning_count: remote.learning_count ?? 0,
      learned_count: remote.learned_count ?? 0,
      learning_due_count: remote.learning_due_count ?? 0,
      remaining_count:
        remote.remaining_count ??
        Math.max(TOTAL_WORDS - (remote.learned_count ?? 0), 0),
      learning_time: remote.learning_time ?? 0,
      learned_days: remote.learned_days ?? null,
      updated_at: remote.updated_at ?? null,
    };
  }

  // TODO: compute progress summary client-side
  return {
    learning_count: 0,
    learned_count: 0,
    learning_due_count: 0,
    remaining_count: Math.max(TOTAL_WORDS, 0),
    learning_time: 0,
    learned_days: [],
    updated_at: null,
  };
}

export async function refreshProgressSummary(
  userKey: string
): Promise<ProgressSummaryFields | null> {
  if (!userKey) return null;
  const remote = await fetchSummaryFromServer(userKey);
  const summary = toProgressSummary(remote) ?? toProgressSummary(await fetchExistingSummary(userKey));
  if (!summary) return null;

  persistProgressSummaryLocal(summary);
  return summary;
}

export async function getProgressSummary(
  userKey: string
): Promise<ProgressSummaryFields | null> {
  if (!userKey) return null;
  return toProgressSummary(await fetchExistingSummary(userKey));
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

function toProgressSummary(source: SummaryRow | null): ProgressSummaryFields | null {
  if (!source) return null;
  const learnedCount = source.learned_count ?? 0;
  return {
    learning_count: source.learning_count ?? 0,
    learned_count: learnedCount,
    learning_due_count: source.learning_due_count ?? 0,
    remaining_count:
      source.remaining_count ?? Math.max(TOTAL_WORDS - learnedCount, 0),
    learning_time: source.learning_time ?? 0,
    learned_days: normaliseDays(source.learned_days),
    updated_at: source.updated_at ?? null,
  };
}

export async function mergeProgressSummary(
  userKey: string,
  updates: PartialSummary
): Promise<void> {
  if (!userKey) return;
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
}

export async function recalcProgressSummary(userKey: string): Promise<void> {
  if (!userKey) return;

  const remote = await fetchSummaryFromServer(userKey);
  if (!remote) return;

  const learnedCount = remote.learned_count ?? 0;

  await mergeProgressSummary(userKey, {
    learning_count: remote.learning_count ?? 0,
    learned_count: learnedCount,
    learning_due_count: remote.learning_due_count ?? 0,
    remaining_count:
      remote.remaining_count ?? Math.max(TOTAL_WORDS - learnedCount, 0),
    learning_time: remote.learning_time ?? undefined,
    learned_days: remote.learned_days ?? undefined,
    updated_at: remote.updated_at ?? undefined,
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
