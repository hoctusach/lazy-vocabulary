import { upsertProgress } from './pushers';

const FLUSH_INTERVAL_MS = 30_000;
let lastFlush = 0;

const LEARNED_COUNT_THRESHOLD = 3; // fallback if status flags are absent

function isLearnedRecord(p: any): boolean {
  if (!p) return false;
  if (p.isLearned === true) return true;
  if (typeof p.status === 'string' && ['learned', 'mastered'].includes(p.status.toLowerCase())) return true;
  if (typeof p.status === 'number' && p.status >= 3) return true;
  const rc =
    typeof p.review_count === 'number'
      ? p.review_count
      : typeof p.reviewCount === 'number'
      ? p.reviewCount
      : typeof p.count === 'number'
      ? p.count
      : null;
  return rc !== null && rc >= LEARNED_COUNT_THRESHOLD;
}

function extractLearnedFromLocal(): Array<{ word_key: string; learned_at: string; status?: number | string | null; review_count?: number }> {
  const learned: Array<{ word_key: string; learned_at: string; status?: number | string | null; review_count?: number }> = [];
  try {
    const raw = localStorage.getItem('learningProgress');
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, any>;
      for (const [word_key, p] of Object.entries(obj)) {
        if (isLearnedRecord(p)) {
          learned.push({
            word_key,
            learned_at: new Date().toISOString(),
            status: p.status ?? null,
            review_count:
              typeof p.review_count === 'number'
                ? p.review_count
                : typeof p.reviewCount === 'number'
                ? p.reviewCount
                : typeof p.count === 'number'
                ? p.count
                : undefined,
          });
        }
      }
    }
  } catch {}
  // Fallback path: infer from vocabulary-word-counts if no learningProgress info
  try {
    if (learned.length === 0) {
      const countsRaw = localStorage.getItem('vocabulary-word-counts');
      if (countsRaw) {
        const counts = JSON.parse(countsRaw) as Record<string, { count: number; lastShown?: string }>;
        for (const [word_key, v] of Object.entries(counts)) {
          if ((v?.count ?? 0) >= LEARNED_COUNT_THRESHOLD) {
            learned.push({
              word_key,
              learned_at: new Date().toISOString(),
              review_count: v.count,
            });
          }
        }
      }
    }
  } catch {}
  return learned;
}

export async function flushLocalToServer(name: string) {
  const now = Date.now();
  if (now - lastFlush < FLUSH_INTERVAL_MS) return;
  lastFlush = now;

  const rowsProgress: Array<{
    word_key: string;
    category?: string | null;
    status?: number | string | null;
    review_count?: number;
    next_review_at?: string | null;
    learned_at?: string | null;
  }> = [];

  try {
    const raw = localStorage.getItem('learningProgress');
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, any>;
      for (const [word_key, p] of Object.entries(obj)) {
        rowsProgress.push({
          word_key,
          category: p.category ?? null,
          status: p.status ?? null,
          review_count:
            typeof p.reviewCount === 'number'
              ? p.reviewCount
              : typeof p.review_count === 'number'
              ? p.review_count
              : undefined,
          next_review_at: p.nextReviewDate ?? p.next_review_at ?? null,
          learned_at: p.learnedDate ?? null,
        });
      }
    }
  } catch {}

  // 2b) ensure learned words are explicitly upserted with learned_at
  const learnedRows = extractLearnedFromLocal();
  if (learnedRows.length) {
    // Merge into rowsProgress (so learned_at is preserved on the same upsert)
    const map = new Map(rowsProgress.map(r => [r.word_key, r]));
    for (const L of learnedRows) {
      const existing = map.get(L.word_key);
      if (existing) {
        existing.learned_at = existing.learned_at ?? L.learned_at;
        existing.review_count = existing.review_count ?? L.review_count;
        if (existing.status == null) existing.status = L.status ?? 3; // 3 ~ learned
      } else {
        map.set(L.word_key, {
          word_key: L.word_key,
          learned_at: L.learned_at,
          review_count: L.review_count,
          status: L.status ?? 3,
        });
      }
    }
    rowsProgress.length = 0;
    rowsProgress.push(...map.values());
  }

  if (rowsProgress.length) {
    await upsertProgress(name, rowsProgress);
  }
}

