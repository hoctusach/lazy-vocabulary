const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    getFormatter(trimmed);
    return trimmed;
  } catch {
    return null;
  }
}

export function resolveLocalTimezone(): string | null {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return normalizeTimeZone(resolved);
  } catch {
    return null;
  }
}

export function formatDateKey(date: Date, timeZone?: string | null): string {
  if (timeZone) {
    try {
      const parts = getFormatter(timeZone).formatToParts(date);
      const year = parts.find((part) => part.type === 'year')?.value;
      const month = parts.find((part) => part.type === 'month')?.value;
      const day = parts.find((part) => part.type === 'day')?.value;
      if (year && month && day) {
        return `${year}-${month}-${day}`;
      }
    } catch {
      // Fall back to UTC slice below when timezone formatting fails.
    }
  }

  return date.toISOString().slice(0, 10);
}

export function toDateKeyFromISOString(
  isoString: string | null | undefined,
  timeZone?: string | null
): string | null {
  if (!isoString) return null;
  const trimmed = isoString.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return formatDateKey(new Date(parsed), timeZone);
}
