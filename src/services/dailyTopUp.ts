import { DEFAULT_VOCABULARY_DATA, normalizeCategory } from '@/data/defaultVocabulary';
import { filterByBuiltinGroups } from '@/features/word-sets/mixQueue';
import type { TodayLearnedWordSummary } from '@/lib/progress/learnedWordStats';
import type { TodayWord } from '@/types/vocabulary';

export { DAILY_TARGET, MIN_ACTIVE, MAX_TOTAL, dailyTarget, activeTarget, topUpNeeded } from '@/lib/progress/dailyTarget';

const wordKey = (word: string): string => word.trim().toLowerCase();

let bundleWords: Set<string> | null = null;

/** Lower-cased words of the bundled built-in vocabulary (what the app can actually show on this device). */
function getBundleWords(): Set<string> {
  if (!bundleWords) {
    bundleWords = new Set<string>();
    for (const list of Object.values(DEFAULT_VOCABULARY_DATA)) {
      for (const entry of list ?? []) {
        if (entry && typeof entry.word === 'string' && entry.word.trim()) bundleWords.add(wordKey(entry.word));
      }
    }
  }
  return bundleWords;
}

/** The word text of a server row / word id ('word::category'). */
export function rowWord(row: { word?: string | null; word_id?: string | null }): string {
  const direct = typeof row.word === 'string' ? row.word.trim() : '';
  if (direct) return direct;
  const id = typeof row.word_id === 'string' ? row.word_id : '';
  return (id.split('::')[0] ?? '').trim();
}

/**
 * The server table has ~739 words the shipped bundle lacks. Rows for them are dropped (the device cannot show or
 * play them), so the day must be topped up from the bundle instead of ending short.
 */
export function isInActiveSet(row: { word?: string | null; word_id?: string | null }): boolean {
  const w = rowWord(row);
  return w.length > 0 && getBundleWords().has(wordKey(w));
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface TopUpInput {
  need: number;
  /** Due reviews in the active set, not already in today's list and not learned. Picked first, in the given order. */
  dueCandidates?: TodayWord[];
  /** Words (any state) that must not be picked again: today's list, learned today, learned before. */
  excludeWords: Iterable<string>;
  /** Built-in groups in play; null/empty = all. */
  groups?: readonly string[] | null;
  /** Stable seed (user + local date) so a reload picks the same new words. */
  seed: string;
}

export interface TopUpResult {
  due: TodayWord[];
  fresh: TodayWord[];
}

/** New (never seen / not learned) bundle words for the selected groups, in a stable per-day pseudo-random order. */
export function newBundleCandidates(
  excludeWords: Iterable<string>,
  groups: readonly string[] | null | undefined,
  seed: string
): TodayWord[] {
  const skip = new Set<string>();
  for (const w of excludeWords) skip.add(wordKey(w));
  const flat: TodayWord[] = [];
  const seen = new Set<string>();
  for (const [sheet, list] of Object.entries(DEFAULT_VOCABULARY_DATA)) {
    for (const entry of list ?? []) {
      if (!entry || typeof entry.word !== 'string' || !entry.word.trim()) continue;
      const key = wordKey(entry.word);
      if (skip.has(key) || seen.has(key)) continue;
      seen.add(key);
      const category = String(normalizeCategory(entry.category || sheet) ?? sheet);
      flat.push({
        word_id: `${entry.word}::${category}`,
        word: entry.word,
        meaning: entry.meaning ?? '',
        example: entry.example ?? '',
        translation: entry.translation || undefined,
        count: 0,
        category,
        is_due: false,
      });
    }
  }
  const scoped = groups && groups.length > 0 ? filterByBuiltinGroups(flat, groups) : flat;
  return scoped
    .map((word) => ({ word, order: hash(`${seed}|${word.word_id}`) }))
    .sort((a, b) => a.order - b.order)
    .map((item) => item.word);
}

/** Due first (until Due runs out), then New, until `need` words are picked. Never picks an excluded word twice. */
export function pickTopUp(input: TopUpInput): TopUpResult {
  const result: TopUpResult = { due: [], fresh: [] };
  let remaining = Math.max(0, Math.trunc(input.need));
  if (remaining === 0) return result;
  const taken = new Set<string>();
  for (const w of input.excludeWords) taken.add(wordKey(w));

  for (const candidate of input.dueCandidates ?? []) {
    if (remaining === 0) break;
    const key = wordKey(candidate.word);
    if (taken.has(key) || !isInActiveSet(candidate)) continue;
    taken.add(key);
    result.due.push({ ...candidate, is_due: true });
    remaining -= 1;
  }
  if (remaining > 0) {
    for (const candidate of newBundleCandidates(taken, input.groups, input.seed)) {
      if (remaining === 0) break;
      result.fresh.push(candidate);
      remaining -= 1;
    }
  }
  return result;
}

export function toTodaySummary(word: TodayWord, due: boolean): TodayLearnedWordSummary {
  return {
    word: word.word,
    category: word.category,
    reviewCount: due ? word.srs?.review_count : 0,
    nextReviewAt: due ? word.srs?.next_review_at : undefined,
    dueSelectedToday: due,
  };
}
