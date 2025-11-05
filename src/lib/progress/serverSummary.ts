export type ServerSummary = {
  learning: number;
  learned: number;
  due: number;
  remaining: number;
  learnedDays?: string[];
};

type WithCounts = Partial<{
  learning_count: number | string | bigint;
  learned_count: number | string | bigint;
  learning_due_count: number | string | bigint;
  remaining_count: number | string | bigint;
  v_learned_days: unknown;
}>;

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((entry) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        return trimmed.length ? trimmed : null;
      }
      if (typeof entry === "number" && Number.isFinite(entry)) {
        return String(entry);
      }
      if (typeof entry === "bigint") {
        return String(entry);
      }
      return null;
    })
    .filter((entry): entry is string => entry !== null);
  if (normalized.length === 0) return [];
  return normalized;
}

export function extractServerSummary(rows: WithCounts[] | null | undefined): ServerSummary | null {
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  const learning = toNumber(r.learning_count);
  const learned = toNumber(r.learned_count);
  const due = toNumber(r.learning_due_count);
  const remaining = toNumber(r.remaining_count);
  if (
    learning == null ||
    learned == null ||
    due == null ||
    remaining == null
  ) {
    return null;
  }

  return {
    learning,
    learned,
    due,
    remaining,
    learnedDays: toStringArray(r.v_learned_days),
  };
}
