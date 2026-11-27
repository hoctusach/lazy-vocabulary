/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { fetchAndCommitTodaySelection } from '@/services/learningProgressService';
import { MAX_TOTAL } from '@/lib/progress/dailyTarget';
import { localKey } from '@/lib/progress/streak';
import { buildTodayQueue, emptyProgress } from '@/features/word-sets/vocabularySetStore';

// [FB-56] The user again saw "Today: 10/20 (2 new + 8 due ...)". These tests trigger the SHORT day on every path.
const uniq = Array.from(new Set(Object.values(DEFAULT_VOCABULARY_DATA).flat().map((w) => w.word)));
const W = (i: number) => uniq[i];
const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const dayKey = (d: number) => localKey(new Date(Date.now() + d * 86_400_000));

const { state } = vi.hoisted(() => ({ state: { rows: [] as Record<string, unknown>[], calls: [] as number[] } }));
vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    rpc: (name: string, args: { p_count?: number }) => {
      if (name === 'generate_daily_selection_v2') {
        state.calls.push(args.p_count ?? 0);
        // the real function: never more than p_count active rows (+ learned rows)
        const active = state.rows.filter((r) => r.is_today_selection !== false && r.srs_state !== 'learned');
        const rest = state.rows.filter((r) => !(r.is_today_selection !== false && r.srs_state !== 'learned'));
        return { select: async () => ({ data: [...active.slice(0, args.p_count ?? 10), ...rest], error: null }) };
      }
      return Promise.resolve({ data: [], error: null });
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  }),
}));
vi.mock('@/lib/preferences/localPreferences', () => ({
  getLocalPreferences: vi.fn().mockResolvedValue({ daily_option: 'light' }),
  saveLocalPreferences: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/progress/srsSyncByUserKey', () => ({
  bootstrapLearnedFromServerByKey: vi.fn().mockResolvedValue(undefined),
  markLearnedServerByKey: vi.fn().mockResolvedValue(null),
  ensureUserKey: vi.fn().mockResolvedValue('user-key'),
  TOTAL_WORDS: 0,
}));

const base = { category: 'idioms', meaning: 'm', example: 'e', translation: null, in_review_queue: true, learning_count: 0, learned_count: 0, learning_due_count: 0, remaining_count: 0 };
const newRow = (word: string) => ({ ...base, word_id: `${word}::idioms`, word, is_today_selection: true, due_selected_today: false, srs_state: 'learning', review_count: 1, last_review_at: iso(0), next_review_at: iso(1) });
const dueRow = (word: string, today = true) => ({ ...base, word_id: `${word}::idioms`, word, is_today_selection: today, due_selected_today: today, srs_state: 'learning', review_count: 2, last_review_at: iso(-2), next_review_at: iso(-1) });
const learnedRow = (word: string, day: string) => ({ ...base, word_id: `${word}::idioms`, word, is_today_selection: false, due_selected_today: false, srs_state: 'learned', review_count: 5, mark_learned_at: day, last_review_at: `${day}T03:00:00Z`, next_review_at: iso(30) });
const params = { userKey: 'user-key', mode: 'Light' as const, count: 20 };

beforeEach(() => { state.rows = []; state.calls = []; localStorage.clear(); });

const shortDay = () => [
  ...Array.from({ length: 2 }, (_, i) => newRow(W(i))),
  ...Array.from({ length: 8 }, (_, i) => dueRow(W(10 + i))),
  ...Array.from({ length: 6 }, (_, i) => dueRow(`server-only-due-${i}`)), // not in the 3,261-word bundle
  ...Array.from({ length: 40 }, (_, i) => learnedRow(W(300 + i), dayKey(-1 - (i % 20)))), // learned on earlier days
  ...Array.from({ length: 5 }, (_, i) => dueRow(W(60 + i), false)), // more due words the server did not pick
];

describe('[FB-56] a short server day (2 new + 8 due) still lands on ~20, due first, then new', () => {
  const check = (r: Awaited<ReturnType<typeof fetchAndCommitTodaySelection>>) => {
    expect(r.words.length).toBeGreaterThanOrEqual(20);
    expect(r.words.length).toBeLessThanOrEqual(MAX_TOTAL);
    expect(new Set(r.words.map((w) => w.word)).size).toBe(r.words.length);
    expect(r.words.some((w) => w.word.startsWith('server-only'))).toBe(false);
    expect(r.learnedTodayWords).toHaveLength(0); // earlier days never sit in today's LEARNED list
    // Due first: every due candidate in the bundle (8 picked + 5 unpicked = 13) is in, before New fills the rest
    expect(r.dueTodayWords.length).toBe(13);
    expect(r.newTodayWords.length).toBe(r.words.length - 13);
  };

  it('built-in, signed in, all groups', async () => {
    state.rows = shortDay();
    check(await fetchAndCommitTodaySelection(params));
  });

  it('built-in, signed in, with a group filter (server does not know the filter)', async () => {
    state.rows = shortDay();
    check(await fetchAndCommitTodaySelection({ ...params, filterGroups: ['idioms', 'topic vocab'] }));
  });

  it('server only returns the 10 picked rows: the device still fills to 20 (new words, since no more due is known)', async () => {
    state.rows = shortDay().slice(0, 2).concat(shortDay().slice(2, 10));
    const r = await fetchAndCommitTodaySelection(params);
    expect(r.words.length).toBeGreaterThanOrEqual(20);
    expect(r.words.length).toBeLessThanOrEqual(MAX_TOTAL);
  });
});

describe('[FB-56] earlier-day learned rows never count as today', () => {
  it('learned-before rows that the server flags as today rows (is_today_selection) do not shrink the top-up or fill LEARNED', async () => {
    state.rows = [
      ...Array.from({ length: 2 }, (_, i) => newRow(W(i))),
      ...Array.from({ length: 8 }, (_, i) => dueRow(W(10 + i))),
      ...Array.from({ length: 12 }, (_, i) => ({ ...learnedRow(W(400 + i), dayKey(-2)), is_today_selection: true })),
    ];
    const r = await fetchAndCommitTodaySelection(params);
    expect(r.learnedTodayWords).toHaveLength(0);
    expect(r.words.length).toBeGreaterThanOrEqual(20);
    expect(r.words.length).toBeLessThanOrEqual(MAX_TOTAL);
    expect(r.words.some((w) => state.rows.some((x) => x.word === w.word && x.srs_state === 'learned'))).toBe(false);
  });

  it('a learned-today row (marked a few minutes ago) counts toward 20 but a learned row with a stale last_review_at today does not leak in from earlier days', async () => {
    state.rows = [
      ...Array.from({ length: 10 }, (_, i) => newRow(W(i))),
      { ...learnedRow(W(500), dayKey(-3)), last_review_at: new Date().toISOString() }, // reviewed today, learned 3 days ago
    ];
    const r = await fetchAndCommitTodaySelection(params);
    expect(r.learnedTodayWords.map((w) => w.word)).not.toContain(W(500));
    expect(r.words.length).toBeGreaterThanOrEqual(20);
  });
});

describe('[FB-56] imported-set path', () => {
  it('a new day of a 60-word imported set is 20 words, due first; earlier-day learned words are not in today', () => {
    const words = Array.from({ length: 60 }, (_, i) => ({ word: `imp${i}`, meaning: 'm', example: '', category: 'imported' }));
    const progress = emptyProgress();
    const day = dayKey(0);
    // 10 learned on earlier days (not due), 2 due
    (progress as any).learned = {};
    for (let i = 0; i < 10; i += 1) {
      (progress as any).learned[`imported::imp${i}`] = { learnedAt: iso(-3), lastReviewAt: iso(-3), nextReviewAt: iso(20), reviewCount: 3 };
    }
    for (let i = 10; i < 12; i += 1) {
      (progress as any).learned[`imported::imp${i}`] = { learnedAt: iso(-3), lastReviewAt: iso(-3), nextReviewAt: iso(-1), reviewCount: 1 };
    }
    const q = buildTodayQueue(words as never, progress, day);
    expect(q.length).toBeGreaterThanOrEqual(20);
    expect(q.length).toBeLessThanOrEqual(MAX_TOTAL);
    expect(q.slice(0, 2).map((w) => w.word)).toEqual(['imp10', 'imp11']);
    expect(q.some((w) => Number(w.word.slice(3)) < 10)).toBe(false);
  });
});
