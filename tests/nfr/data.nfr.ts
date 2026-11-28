// NFR-PERF-06 / 08: built-in vocabulary load and daily selection compute. Budgets: tests/nfr/budgets.json
import { describe, it, expect } from 'vitest';
import { check, heapMB, timeMedian } from './util';

describe('NFR-PERF-06 vocabulary load/parse (~3965 built-in words)', () => {
  it('[NFR-PERF-06] parse + normalise the bundled JSON: time and heap', async () => {
    const raw = (await import('node:fs')).readFileSync('src/data/defaultVocabulary.json', 'utf8');
    const { normalizeSheetCategories, getDefaultVocabularyTotal } = await import('@/data/defaultVocabulary');
    const heap0 = heapMB();
    let parsed: any;
    const parseMs = await timeMedian(() => { parsed = JSON.parse(raw); });
    const normMs = await timeMedian(() => normalizeSheetCategories(parsed));
    const keep = normalizeSheetCategories(JSON.parse(raw));   // retained copy = what the app holds
    const heapGrowth = heapMB() - heap0;
    const total = getDefaultVocabularyTotal();
    expect(total).toBeGreaterThan(3700); // 3965 rows, 3740 distinct keys (repeated words in built-in data: KNOWN-ISSUES #7)
    expect(Object.values(keep).reduce((a, l) => a + l.length, 0)).toBeGreaterThan(3900);
    check('NFR-PERF-06', 'json_mb', raw.length / 1048576, { scale: false });
    check('NFR-PERF-06', 'parse_ms', parseMs);
    check('NFR-PERF-06', 'normalize_ms', normMs);
    check('NFR-PERF-06', 'retained_heap_mb', heapGrowth, { scale: false });
  });
});

describe('NFR-PERF-08 daily selection compute', () => {
  it('[NFR-PERF-08] buildTodayQueue over all built-in words with 1500 learned rows, and group filtering', async () => {
    const { DEFAULT_VOCABULARY_DATA } = await import('@/data/defaultVocabulary');
    const { flattenSheets, buildTodayQueue, emptyProgress, wordKey, localDateKey } = await import('@/features/word-sets/vocabularySetStore');
    const { filterByBuiltinGroups } = await import('@/features/word-sets/mixQueue');
    const words = flattenSheets(DEFAULT_VOCABULARY_DATA);
    expect(words.length).toBeGreaterThan(3900);
    const progress = emptyProgress();
    const past = new Date(Date.now() - 2 * 86400000).toISOString();
    words.slice(0, 1500).forEach((w, i) => {
      progress.learned[wordKey(w.word, w.category)] = { learnedAt: past, lastReviewAt: past, nextReviewAt: i % 3 ? new Date(Date.now() + 5 * 86400000).toISOString() : past, reviewCount: 1 + (i % 5) } as any;
    });
    let q: unknown[] = [];
    const ms = await timeMedian(() => { q = buildTodayQueue(words, progress, localDateKey()); }, 9);
    expect(q.length).toBeGreaterThan(0);
    const filterMs = await timeMedian(() => filterByBuiltinGroups(words, ['idioms', 'phrasal verbs']), 9);
    check('NFR-PERF-08', 'build_today_queue_ms', ms);
    check('NFR-PERF-08', 'filter_groups_ms', filterMs);
  });
});
