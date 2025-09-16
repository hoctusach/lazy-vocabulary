import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureUserKey } from "@/lib/progress/srsSyncByUserKey";
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
  last_shown_at?: string;
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
    const counts = parseJSON<Record<string, { count?: number; lastShown?: string; last_shown?: string; last_shown_at?: string }>>(
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
            learned_at: coerceString(raw?.lastShown ?? raw?.last_shown ?? raw?.last_shown_at) ?? nowISO
          };
          rows.push(row);
        }
      }
    }
  }

  return rows;
}

function extractWordCounts(): CountRow[] {
  const counts = parseJSON<Record<string, { count?: number; lastShown?: string; last_shown?: string; last_shown_at?: string }>>(
    getLS("vocabulary-word-counts")
  );
  if (!counts || typeof counts !== "object") return [];

  const rows: CountRow[] = [];
  for (const [wordKey, raw] of Object.entries(counts)) {
    if (!isNonEmptyString(wordKey)) continue;
    const count = coerceNumber(raw?.count) ?? 0;
    const safeCount = count < 0 ? 0 : Math.floor(count);
    const lastShown = coerceString(raw?.lastShown ?? raw?.last_shown ?? raw?.last_shown_at);
    const row: CountRow = { word_key: wordKey, count: safeCount };
    if (lastShown) row.last_shown_at = lastShown;
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

async function ensureAnonSession(client: SupabaseClient): Promise<boolean> {
  try {
    const { data } = await client.auth.getSession();
    if (data?.session?.user) return true;
  } catch {
    // ignore and fall through to anonymous sign-in
  }

  try {
    const { error, data } = await client.auth.signInAnonymously();
    if (error) return false;
    return Boolean(data?.user);
  } catch {
    return false;
  }
}

async function upsertProgress(client: SupabaseClient, userKey: string, rows: ProgressRow[]) {
  if (!rows.length) return;
  const payload = rows.map(row =>
    stripNullish({
      user_unique_key: userKey,
      word_key: row.word_key,
      category: row.category ?? null,
      status: row.status ?? null,
      review_count: row.review_count ?? null,
      next_review_at: row.next_review_at ?? null,
      learned_at: row.learned_at ?? null,
    })
  );
  await client
    .from("learning_progress")
    .upsert(payload, { onConflict: "user_unique_key,word_key", defaultToNull: false });
}

async function upsertCounts(client: SupabaseClient, userKey: string, rows: CountRow[]) {
  if (!rows.length) return;
  const payload = rows.map(row =>
    stripNullish({
      user_unique_key: userKey,
      word_key: row.word_key,
      count: row.count,
      last_shown_at: row.last_shown_at ?? null,
    })
  );
  await client
    .from("word_counts")
    .upsert(payload, { onConflict: "user_unique_key,word_key", defaultToNull: false });
}

async function upsertDailySelection(
  client: SupabaseClient,
  userKey: string,
  entry: { date: string; selection: unknown } | null
) {
  if (!entry) return;
  const dateValue = entry.date?.slice(0, 10) ?? null;
  const row = stripNullish({
    user_unique_key: userKey,
    selection_date: dateValue,
    selection_json: entry.selection,
  });
  if (!row.selection_json || !row.selection_date) return;
  await client
    .from("daily_selection")
    .upsert(row, { onConflict: "user_unique_key,selection_date", defaultToNull: false });
}

async function upsertResume(
  client: SupabaseClient,
  userKey: string,
  resume: { today?: unknown; byCategory?: unknown } | null
) {
  if (!resume) return;
  const row = stripNullish({
    user_unique_key: userKey,
    category: "__aggregate__",
    today_json: resume.today,
    by_category_json: resume.byCategory,
  });
  if (Object.keys(row).length <= 2) return;
  await client
    .from("resume_state")
    .upsert(row, { onConflict: "user_unique_key,category", defaultToNull: false });
}

async function upsertLearningTime(client: SupabaseClient, userKey: string, rows: TimeRow[]) {
  if (!rows.length) return;
  const payload = rows.map(row => ({
    user_unique_key: userKey,
    day_iso: row.dayISO?.slice(0, 10),
    duration_ms: Math.max(0, Math.floor(row.duration_ms)),
  }));
  const filtered = payload.filter(row => row.day_iso);
  if (!filtered.length) return;
  await client
    .from("learning_time")
    .upsert(filtered, { onConflict: "user_unique_key,day_iso", defaultToNull: false });
}

export async function autoBackfillOnReload(): Promise<void> {
  if (!hasLocalStorage()) return;
  const nickname = getLS(NICKNAME_KEY)?.trim();
  if (!nickname) return;

  const client = getSupabaseClient();
  if (!client) return;

  const signedIn = await ensureAnonSession(client);
  if (!signedIn) return;

  const userKey = await ensureUserKey();
  if (!userKey) return;

  const progress = extractLearningProgress();
  const counts = extractWordCounts();
  const dailySelection = extractDailySelection();
  const resumeState = extractResumeState();
  const learningTime = extractLearningTime();

  const tasks: Promise<unknown>[] = [
    upsertProgress(client, userKey, progress),
    upsertCounts(client, userKey, counts),
    upsertDailySelection(client, userKey, dailySelection),
    upsertResume(client, userKey, resumeState),
    upsertLearningTime(client, userKey, learningTime)
  ];

  try {
    await Promise.allSettled(tasks);
  } catch {
    // ignore errors to keep the reload silent
  }
}
