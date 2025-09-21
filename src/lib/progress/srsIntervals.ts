export const SRS_FIXED_INTERVALS_DAYS = [1, 3, 7, 14, 21, 30, 45, 60] as const;
export const SRS_REPEAT_INTERVAL_DAYS = 20 as const;

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const int = Math.trunc(value);
  return int > 0 ? int : null;
}

export function calculateNextIntervalDays(
  reviewCount: number,
  _previousInterval?: number | null
): number {
  const safeCount = toPositiveInteger(reviewCount);
  if (!safeCount) {
    return 1;
  }

  const index = safeCount - 1;
  if (index < SRS_FIXED_INTERVALS_DAYS.length) {
    return SRS_FIXED_INTERVALS_DAYS[index];
  }

  return SRS_REPEAT_INTERVAL_DAYS;
}

export function addIntervalDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}
