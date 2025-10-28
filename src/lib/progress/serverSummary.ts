export type ServerSummary = {
  learning: number;
  learned: number;
  due: number;
  remaining: number;
  learnedDays?: string[];
};

type WithCounts = Partial<{
  learning_count: number;
  learned_count: number;
  learning_due_count: number;
  remaining_count: number;
  v_learned_days: string[];
}>;

export function extractServerSummary(rows: WithCounts[] | null | undefined): ServerSummary | null {
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  const ok =
    typeof r.learning_count === 'number' &&
    typeof r.learned_count === 'number' &&
    typeof r.learning_due_count === 'number' &&
    typeof r.remaining_count === 'number';
  if (!ok) return null;

  return {
    learning: r.learning_count!,
    learned: r.learned_count!,
    due: r.learning_due_count!,
    remaining: r.remaining_count!,
    learnedDays: Array.isArray(r.v_learned_days) ? r.v_learned_days : undefined,
  };
}
