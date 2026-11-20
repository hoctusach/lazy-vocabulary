import { normalizeCategory } from '@/data/defaultVocabulary';
import type { VocabularyWord } from '@/types/vocabulary';
import { BUILTIN_GROUPS } from './vocabularySetStore';

/**
 * Pure helpers for multi-set mixing. A queue item carries `sourceId`: the SET it came from
 * ('default' for the built-in set, the set id for an imported one). That is what routes
 * mark-learned / mark-new to the right progress store.
 */

export type SourcedWord<T extends VocabularyWord = VocabularyWord> = T & { sourceId: string };

export function tagWords<T extends VocabularyWord>(words: readonly T[], sourceId: string): SourcedWord<T>[] {
  return words.map((word) => ({ ...word, sourceId }));
}

function groupKey(category: string | null | undefined): string {
  return String(normalizeCategory(category ?? '') ?? '')
    .trim()
    .toLowerCase();
}

/** Keep built-in words whose category is one of the selected groups (spelling-insensitive). */
export function filterByBuiltinGroups<T extends { category?: string | null }>(
  words: readonly T[],
  groups: readonly string[]
): T[] {
  const wanted = new Set(groups.map(groupKey));
  return words.filter((word) => wanted.has(groupKey(word.category)));
}

export interface BuiltinPlan {
  /** False when no built-in group is selected: the daily-selection RPC must not be called. */
  call: boolean;
  /** Value for p_category: one group, or null for "all groups" (server balances them). */
  category: string | null;
  /**
   * Set for 2-5 groups: the RPC is called with NULL and the rows are filtered client-side,
   * so the server quota may deliver fewer built-in words that day.
   */
  filterGroups: string[] | null;
}

export function planBuiltinSelection(groups: readonly string[]): BuiltinPlan {
  const picked = BUILTIN_GROUPS.filter((group) => groups.includes(group));
  if (picked.length === 0) return { call: false, category: null, filterGroups: null };
  if (picked.length === BUILTIN_GROUPS.length) return { call: true, category: null, filterGroups: null };
  if (picked.length === 1) return { call: true, category: picked[0], filterGroups: null };
  return { call: true, category: null, filterGroups: picked };
}

/** Round-robin across lists: a1, b1, c1, a2, b2, ... Empty lists are skipped. */
export function interleave<T>(lists: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const longest = lists.reduce((max, list) => Math.max(max, list.length), 0);
  for (let i = 0; i < longest; i += 1) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
}

export function sourceWordKey(word: Pick<SourcedWord, 'word' | 'category' | 'sourceId'>): string {
  return `${word.sourceId}\u0000${(word.category ?? '').trim()}\u0000${word.word.trim()}`;
}

/** Drop repeats of the same (word, category, source); the first occurrence wins. */
export function dedupeBySource<T extends SourcedWord>(words: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const word of words) {
    const key = sourceWordKey(word);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export interface QueueSource<T extends VocabularyWord = VocabularyWord> {
  sourceId: string;
  words: readonly T[];
}

/** Tag each source's words, interleave the sources round-robin, then de-duplicate. */
export function buildMixedQueue<T extends VocabularyWord>(sources: readonly QueueSource<T>[]): SourcedWord<T>[] {
  return dedupeBySource(interleave(sources.map((source) => dedupeBySource(tagWords(source.words, source.sourceId)))));
}

/** Local (signed-out) built-in words for the chosen groups, one source per group so they mix. */
export function interleaveBuiltinGroups<T extends VocabularyWord>(
  sheets: Record<string, readonly T[] | undefined>,
  groups: readonly string[]
): T[] {
  const lists = BUILTIN_GROUPS.filter((group) => groups.includes(group)).map((group) =>
    (sheets[group] ?? []).map((word) => ({ ...word, category: word.category || group }))
  );
  return interleave(lists);
}

export interface MixStats {
  total: number;
  learned: number;
  learning: number;
  new: number;
  due: number;
}

export function sumStats(parts: readonly MixStats[]): MixStats {
  return parts.reduce<MixStats>(
    (acc, part) => ({
      total: acc.total + (part.total ?? 0),
      learned: acc.learned + (part.learned ?? 0),
      learning: acc.learning + (part.learning ?? 0),
      new: acc.new + (part.new ?? 0),
      due: acc.due + (part.due ?? 0),
    }),
    { total: 0, learned: 0, learning: 0, new: 0, due: 0 }
  );
}
