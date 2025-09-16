import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureSessionForNickname, getStoredPasscode } from "@/lib/auth";
import { getSupabaseClient } from "../supabaseClient";

type ProgressRow = {
  word_key: string;
  status?: number | string;
  review_count?: number;
  next_review_at?: string;
  learned_at?: string;
};

type CountRow = {
  word_key: string;
  count: number;
  last_shown?: string;
};

type TimeRow = {
  dayISO: string;
  duration_ms: number;
};

const NICKNAME_KEY = "lazyVoca.nickname";
const LEARNED_COUNT_THRESHOLD = 3;

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function getLS(key: string): string | null {
  if (!hasLocalStorage()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseJSON<T = unknown>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function coerceString(value: unknown): string | undefined {
  if (isNonEmptyString(value)) return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function stripNullish<T extends Record<string, unknown>>(row: T): T {
  Object.keys(row).forEach(key => {
    if (row[key] === null || row[key] === undefined) {
      delete row[key];
    }
  });
  return row;
}

function hasMeaningfulData(row: ProgressRow): boolean {
  return Object.keys(row).some(key => key !== "word_key");
}

function extractLearningProgress(): ProgressRow[] {
  const rows: ProgressRow[] = [];
  const map = parseJSON<Record<string, any>>(getLS("learningProgress"));
  const nowISO = new Date().toISOString();

  if (map && typeof map === "object") {
    for (const [wordKey, raw] of Object.entries(map)) {
      if (!isNonEmptyString(wordKey)) continue;
      const row: ProgressRow = { word_key: wordKey };

      const status = raw?.status ?? raw?.status_value ?? raw?.statusValue;
      if (status !== null && status !== undefined && status !== "") {
        row.status = status;
      }

      const reviewCount = coerceNumber(raw?.review_count ?? raw?.reviewCount ?? raw?.count);
      if (typeof reviewCount === "number") {
        row.review_count = reviewCount;
      }

      const nextReview = coerceString(
        raw?.next_review_at ??
          raw?.nextReviewAt ??
          raw?.next_review_date ??
          raw?.nextReviewDate ??
          raw?.reviewDueAt
      );
      if (nextReview) {
        row.next_review_at = nextReview;
      }

      const learnedFromData = coerceString(raw?.learned_at ?? raw?.learnedAt ?? raw?.learnedDate);
      const numericStatus = coerceNumber(raw?.status ?? raw?.status_value ?? raw?.statusValue);
      const statusString = coerceString(raw?.status ?? raw?.status_value ?? raw?.statusValue);
      const learnedByStatus =
        (typeof numericStatus === "number" && numericStatus >= LEARNED_COUNT_THRESHOLD) ||
        (typeof statusString === "string" && statusString.toLowerCase().includes("learn"));
      const learnedByCount = typeof row.review_count === "number" && row.review_count >= LEARNED_COUNT_THRESHOLD;
      const isLearned = raw?.isLearned === true || learnedByStatus || learnedByCount;

      if (learnedFromData) {
        row.learned_at = learnedFromData;
      } else if (isLearned) {
        row.learned_at = nowISO;
      }

      stripNullish(row);
      if (hasMeaningfulData(row)) {
        rows.push(row);
      }
    }
  }

  if (!rows.length) {
    const counts = parseJSON<Record<string, { count?: number; lastShown?: string; last_shown?: string }>>(
      getLS("vocabulary-word-counts")
    );
    if (counts && typeof counts === "object") {
      for (const [wordKey, raw] of Object.entries(counts)) {
        if (!isNonEmptyString(wordKey)) continue;
        const count = coerceNumber(raw?.count);
        if (typeof count === "number" && count >= LEARNED_COUNT_THRESHOLD) {
          const row: ProgressRow = {
            word_key: wordKey,
            review_count: count,
            status: 3,
            learned_at: coerceString(raw?.lastShown ?? raw?.last_shown) ?? nowISO
          };
          rows.push(row);
        }
      }
    }
  }

  return rows;
}

function extractWordCounts(): CountRow[] {
  const counts = parseJSON<Record<string, { count?: number; lastShown?: string; last_shown?: string }>>(
    getLS("vocabulary-word-counts")
  );
  if (!counts || typeof counts !== "object") return [];

  const rows: CountRow[] = [];
  for (const [wordKey, raw] of Object.entries(counts)) {
    if (!isNonEmptyString(wordKey)) continue;
    const count = coerceNumber(raw?.count) ?? 0;
    const safeCount = count < 0 ? 0 : Math.floor(count);
    const lastShown = coerceString(raw?.lastShown ?? raw?.last_shown);
    const row: CountRow = { word_key: wordKey, count: safeCount };
    if (lastShown) row.last_shown = lastShown;
    rows.push(row);
  }
  return rows;
}

function extractDailySelection(): { date: string; selection: unknown } | null {
  const selection = parseJSON(getLS("dailySelection"));
  if (!selection) return null;
  const date = getLS("lastSelectionDate");
  const dateValue = isNonEmptyString(date) ? date : new Date().toISOString().slice(0, 10);
  return { date: dateValue, selection };
}

function extractResumeState(): { today?: unknown; byCategory?: unknown } | null {
  const today = parseJSON(getLS("lazyVoca.todayLastWord"));
  const byCategory = parseJSON(getLS("lazyVoca.lastWordByCategory"));
  if (!today && !byCategory) return null;
  const result: { today?: unknown; byCategory?: unknown } = {};
  if (today) result.today = today;
  if (byCategory) result.byCategory = byCategory;
  return result;
}

function extractLearningTime(): TimeRow[] {
  if (!hasLocalStorage()) return [];
  const totals = new Map<string, number>();

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      const match = key.match(/^(?:dailyTime_|learningTime_)(\d{4}-\d{2}-\d{2})$/);
      if (!match) continue;
      const raw = localStorage.getItem(key);
      const duration = coerceNumber(raw);
      if (typeof duration !== "number" || duration <= 0) continue;
      const dayISO = `${match[1]}T00:00:00.000Z`;
      const accumulated = totals.get(dayISO) ?? 0;
      totals.set(dayISO, accumulated + Math.floor(duration));
    }
  } catch {
    // ignore localStorage iteration errors
  }

  const rows: TimeRow[] = [];
  totals.forEach((duration, dayISO) => {
    const safe = Math.max(0, Math.floor(duration));
    if (safe > 0) {
      rows.push({ dayISO, duration_ms: safe });
    }
  });
  return rows;
}

async function upsertProgress(client: SupabaseClient, name: string, rows: ProgressRow[]) {
  if (!rows.length) return;
  const payload = rows.map(row => stripNullish({ name, ...row }));
  await client.from("learning_progress").upsert(payload, { onConflict: "name,word_key", defaultToNull: false });
}

async function upsertCounts(client: SupabaseClient, name: string, rows: CountRow[]) {
  if (!rows.length) return;
  const payload = rows.map(row => stripNullish({ name, ...row }));
  await client.from("word_counts").upsert(payload, { onConflict: "name,word_key", defaultToNull: false });
}

async function upsertDailySelection(
  client: SupabaseClient,
  name: string,
  entry: { date: string; selection: unknown } | null
) {
  if (!entry) return;
  const row = stripNullish({ name, date: entry.date, selection_json: entry.selection });
  if (!row.selection_json) return;
  await client.from("daily_selection").upsert(row, { onConflict: "name,date", defaultToNull: false });
}

async function upsertResume(
  client: SupabaseClient,
  name: string,
  resume: { today?: unknown; byCategory?: unknown } | null
) {
  if (!resume) return;
  const row = stripNullish({ name, today_json: resume.today, by_category_json: resume.byCategory });
  if (Object.keys(row).length <= 1) return;
  await client.from("resume_state").upsert(row, { onConflict: "name", defaultToNull: false });
}

async function upsertLearningTime(client: SupabaseClient, name: string, rows: TimeRow[]) {
  if (!rows.length) return;
  const payload = rows.map(row => ({ name, day_iso: row.dayISO, duration_ms: row.duration_ms }));
  await client.from("learning_time").upsert(payload, { onConflict: "name,day_iso", defaultToNull: false });
}

export async function autoBackfillOnReload(): Promise<void> {
  if (!hasLocalStorage()) return;
  const nickname = getLS(NICKNAME_KEY)?.trim();
  if (!nickname) return;

  const client = getSupabaseClient();
  if (!client) return;

  const passcode = getStoredPasscode() ?? undefined;
  const session = await ensureSessionForNickname(nickname, passcode);
  if (!session) return;

  const progress = extractLearningProgress();
  const counts = extractWordCounts();
  const dailySelection = extractDailySelection();
  const resumeState = extractResumeState();
  const learningTime = extractLearningTime();

  const tasks: Promise<unknown>[] = [
    upsertProgress(client, nickname, progress),
    upsertCounts(client, nickname, counts),
    upsertDailySelection(client, nickname, dailySelection),
    upsertResume(client, nickname, resumeState),
    upsertLearningTime(client, nickname, learningTime)
  ];

  try {
    await Promise.allSettled(tasks);
  } catch {
    // ignore errors to keep the reload silent
  }
}
