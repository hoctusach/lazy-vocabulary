/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { renderHook, waitFor, act, render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { fetchAndCommitTodaySelection } from '@/services/learningProgressService';
import { activeTarget, dailyTarget, topUpNeeded, MAX_TOTAL } from '@/lib/progress/dailyTarget';
import { isInActiveSet, newBundleCandidates, pickTopUp } from '@/services/dailyTopUp';
import { computeLearnedWordStats, type LearnedWordRow } from '@/lib/progress/learnedWordStats';
import { buildTodayQueue, emptyProgress, DAILY_TOTAL } from '@/features/word-sets/vocabularySetStore';
import { localKey } from '@/lib/progress/streak';

// [FB-51] Daily generation stuck at ~10/20 and LEARNED listing earlier days.
const bundle = Object.values(DEFAULT_VOCABULARY_DATA).flat().map((w) => w.word);
const uniq = Array.from(new Set(bundle));
const W = (i: number) => uniq[i];
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString();
const dayKey = (offsetDays: number) => localKey(new Date(Date.now() + offsetDays * 86_400_000));

const { state } = vi.hoisted(() => ({ state: { rows: [] as Record<string, unknown>[], calls: [] as number[] } }));

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    rpc: (name: string, args: { p_count?: number }) => {
      if (name === 'generate_daily_selection_v2') {
        state.calls.push(args.p_count ?? 0);
        return { select: async () => ({ data: state.rows, error: null }) };
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
vi.mock('@/services/analyticsService', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  identifyUser: vi.fn(),
  trackDailySelectionEvent: vi.fn(),
  trackReviewDue: vi.fn(),
  trackWordLearned: vi.fn(),
  trackWordReset: vi.fn(),
}));

const base = {
  category: 'idioms', meaning: 'm', example: 'e', translation: null, in_review_queue: true,
  learning_count: 0, learned_count: 0, learning_due_count: 0, remaining_count: 0,
};
const newRow = (word: string) => ({
  ...base, word_id: `${word}::idioms`, word, is_today_selection: true, due_selected_today: false,
  srs_state: 'learning', review_count: 1, last_review_at: iso(0), next_review_at: iso(1),
});
const dueRow = (word: string, today = true) => ({
  ...base, word_id: `${word}::idioms`, word, is_today_selection: today, due_selected_today: today,
  srs_state: 'learning', review_count: 2, last_review_at: iso(-2), next_review_at: iso(-1),
});
const learnedRow = (word: string, day: string) => ({
  ...base, word_id: `${word}::idioms`, word, is_today_selection: false, due_selected_today: false,
  srs_state: 'learned', review_count: 5, mark_learned_at: day, last_review_at: `${day}T03:00:00Z`, next_review_at: iso(30),
});

const params = { userKey: 'user-key', mode: 'Light' as const, count: 20 };

beforeEach(() => {
  state.rows = [];
  state.calls = [];
  localStorage.clear();
});

describe('[FB-51] daily size rule (pure)', () => {
  it('target is 20 total; learned-today counts; never shrinks; a little over only when few are left to study', () => {
    expect(dailyTarget(0)).toBe(20);
    expect(activeTarget(0)).toBe(20);
    expect(topUpNeeded(10, 0)).toBe(10); // the "stuck at 10/20" screenshot
    expect(topUpNeeded(7 + 3, 0)).toBe(10);
    expect(topUpNeeded(17, 3)).toBe(0); // 17 active + 3 learned today = 20: nothing changes, nothing shrinks
    expect(topUpNeeded(20, 0)).toBe(0);
    expect(topUpNeeded(19, 1)).toBe(0); // marking one learned at 20 does not force a top-up
    expect(topUpNeeded(5, 15)).toBe(5); // learned most of the day: keep >=10 words to study...
    expect(dailyTarget(15)).toBeLessThanOrEqual(MAX_TOTAL); // ...but never wildly over 20
    expect(activeTarget(40)).toBe(0);
  });

  it('top-up picks Due first until Due runs out, then New; never an excluded word', () => {
    const due = Array.from({ length: 3 }, (_, i) => ({
      word_id: `${W(i)}::idioms`, word: W(i), meaning: '', example: '', count: 0, category: 'idioms', is_due: true,
    }));
    const r = pickTopUp({ need: 8, dueCandidates: due, excludeWords: [W(10), W(11)], seed: 's' });
    expect(r.due.map((w) => w.word)).toEqual([W(0), W(1), W(2)]);
    expect(r.fresh).toHaveLength(5);
    const all = [...r.due, ...r.fresh].map((w) => w.word);
    expect(new Set(all).size).toBe(8);
    expect(all).not.toContain(W(10));
    // stable per day/user
    expect(newBundleCandidates([], null, 's').slice(0, 5)).toEqual(newBundleCandidates([], null, 's').slice(0, 5));
  });

  it('server-only words are not in the active set; bundle words are', () => {
    expect(isInActiveSet({ word: W(0) })).toBe(true);
    expect(isInActiveSet({ word_id: `${W(1)}::idioms` })).toBe(true);
    expect(isInActiveSet({ word: 'zzz-server-only-word' })).toBe(false);
  });
});

describe('[FB-51] built-in daily selection is topped up to 20 on the device', () => {
  it('7 due + 3 new from the server (90/10 split + floor quotas leave ~10) -> 20 today, Due first, then New', async () => {
    const extraDue = Array.from({ length: 5 }, (_, i) => dueRow(W(100 + i), false)); // due but not picked by the server
    state.rows = [
      ...Array.from({ length: 7 }, (_, i) => dueRow(W(i))),
      ...Array.from({ length: 3 }, (_, i) => newRow(W(20 + i))),
      ...extraDue,
    ];
    const r = await fetchAndCommitTodaySelection(params);
    expect(r.words).toHaveLength(20);
    expect(r.dueTodayWords).toHaveLength(7 + 5); // remaining Due first
    expect(r.newTodayWords).toHaveLength(3 + 5); // then New
    expect(new Set(r.words.map((w) => w.word)).size).toBe(20);
    expect(r.words.map((w) => w.word)).toEqual(expect.arrayContaining(extraDue.map((d) => d.word)));
  });

  it('server returns 20 rows, 10 of them not in the client bundle -> they are dropped and the day is topped up to 20', async () => {
    state.rows = [
      ...Array.from({ length: 10 }, (_, i) => newRow(W(i))),
      ...Array.from({ length: 10 }, (_, i) => newRow(`server-only-${i}`)),
    ];
    const r = await fetchAndCommitTodaySelection(params);
    expect(r.words.some((w) => w.word.startsWith('server-only-'))).toBe(false);
    expect(r.newTodayWords.some((w) => w.word.startsWith('server-only-'))).toBe(false);
    expect(r.words).toHaveLength(20);
    expect(r.words.map((w) => w.word)).toEqual(expect.arrayContaining(Array.from({ length: 10 }, (_, i) => W(i))));
  });

  it('the server is asked again for more (<=25) before the device fills the rest', async () => {
    state.rows = Array.from({ length: 10 }, (_, i) => newRow(W(i)));
    await fetchAndCommitTodaySelection(params);
    expect(state.calls[0]).toBe(20);
    expect(Math.max(...state.calls)).toBeLessThanOrEqual(25);
  });

  it('already 20 for today with some learned today: nothing shrinks, nothing extra is added', async () => {
    state.rows = [
      ...Array.from({ length: 17 }, (_, i) => newRow(W(i))),
      ...Array.from({ length: 3 }, (_, i) => ({ ...learnedRow(W(50 + i), dayKey(0)), is_today_selection: true })),
    ];
    const r = await fetchAndCommitTodaySelection(params);
    expect(r.words).toHaveLength(17);
    expect(r.learnedTodayWords).toHaveLength(3);
    expect(state.calls).toEqual([20]); // no second call
  });

  it('LEARNED today lists only words marked today; 72 learned on earlier days do not appear', async () => {
    state.rows = [
      ...Array.from({ length: 20 }, (_, i) => newRow(W(i))),
      ...Array.from({ length: 72 }, (_, i) => learnedRow(W(200 + i), dayKey(-1 - (i % 9)))),
      learnedRow(W(300), dayKey(0)),
      learnedRow(W(301), dayKey(0)),
    ];
    const r = await fetchAndCommitTodaySelection(params);
    expect(r.learnedTodayWords.map((w) => w.word).sort()).toEqual([W(300), W(301)].sort());
    expect(r.learnedWords.length).toBe(74); // all-time list is untouched (Learning Progress counts it)
    // the helper itself, with rows that have no usable date
    const none = computeLearnedWordStats([{ ...(learnedRow('x', dayKey(0)) as unknown as LearnedWordRow), mark_learned_at: null, last_review_at: null }]);
    expect(none.learnedTodayWords).toHaveLength(0);
  });
});

describe('[FB-51] marking a word learned moves it to LEARNED today and keeps the day at 20', () => {
  it('numerator stays consistent; a short day is topped up (due first, then new)', async () => {
    state.rows = Array.from({ length: 20 }, (_, i) => newRow(W(i)));
    const { result } = renderHook(() => useLearningProgress());
    await waitFor(() => expect(result.current.todayWords).toHaveLength(20));
    expect(result.current.learnedTodayWords).toHaveLength(0);

    await act(async () => { await result.current.markWordLearned(W(0)); });
    const total = () =>
      result.current.newTodayLearnedWords.length + result.current.dueTodayLearnedWords.length + result.current.learnedTodayWords.length;
    expect(result.current.learnedTodayWords.map((w) => w.word)).toEqual([W(0)]);
    expect(result.current.newTodayLearnedWords.map((w) => w.word)).not.toContain(W(0));
    expect(result.current.todayWords.map((w) => w.word)).not.toContain(W(0));
    expect(total()).toBe(20);
    expect(result.current.todayWords).toHaveLength(19);

    // learn most of the list: still >=10 words to study, never more than 25 in total
    for (let i = 1; i <= 14; i += 1) {
      await act(async () => { await result.current.markWordLearned(result.current.todayWords[0].word); });
    }
    expect(result.current.learnedTodayWords).toHaveLength(15);
    expect(result.current.todayWords.length).toBeGreaterThanOrEqual(10);
    expect(total()).toBeLessThanOrEqual(25);
    expect(total()).toBeGreaterThanOrEqual(20);
  });
});

describe('[FB-51] imported / manual sets use the same Today + LEARNED-today rules', () => {
  const words = Array.from({ length: 60 }, (_, i) => ({ word: `w${i}`, meaning: 'm', example: 'e', count: 0, category: 'x' }));
  const today = '2026-11-24';
  const stamp = '2026-11-24T05:00:00.000Z';

  it('fresh set: 20 (DAILY_TOTAL), due first', () => {
    expect(DAILY_TOTAL).toBe(20);
    expect(buildTodayQueue(words, emptyProgress(), today)).toHaveLength(20);
  });

  it('restored list that lost words to learning is topped up only to the rule; learned today still counts', () => {
    const progress = {
      ...emptyProgress(),
      todayDate: today,
      todayKeys: Array.from({ length: 17 }, (_, i) => `x::w${i + 3}`),
      learned: Object.fromEntries(
        [0, 1, 2].map((i) => [`x::w${i}`, {
          word: `w${i}`, category: 'x', reviewCount: 1, learnedAt: stamp, lastReviewAt: stamp, nextReviewAt: '2026-11-25T05:00:00.000Z',
        }])
      ),
    };
    // 17 active + 3 learned today = 20: left alone
    const q = buildTodayQueue(words, progress, today);
    expect(q).toHaveLength(17);
    expect(q.map((w) => w.word)).not.toContain('w0');
    // 12 active + 3 learned (15) is short: top up with new words (none of the learned ones)
    const short = { ...progress, todayKeys: progress.todayKeys.slice(0, 12) };
    const q2 = buildTodayQueue(words, short, today);
    expect(q2).toHaveLength(17);
    expect(q2.map((w) => w.word)).not.toContain('w0');
  });
});

describe('[FB-51] Word Summary: Today numerator and LEARNED section', () => {
  it('Today = new + due + learned today over 20, LEARNED shows only today\'s words', async () => {
    vi.resetModules();
    vi.doMock('@/components/vocabulary-app/VocabularyAppContainerNew', () => ({
      default: ({ underPlayerContent }: { underPlayerContent?: React.ReactNode }) => <div>{underPlayerContent}</div>,
    }));
    vi.doMock('@/hooks/useLearningProgress', () => ({
      useLearningProgress: () => ({
        dailySelection: null,
        progressStats: { total: 0, learning: 0, new: 0, due: 0, learned: 72 },
        generateDailyWords: vi.fn(),
        markWordAsPlayed: vi.fn(),
        learnedWords: Array.from({ length: 72 }, (_, i) => ({ word: `old${i}`, category: 'idioms', learnedDate: '2026-01-01' })),
        learnedTodayWords: [{ word: 'doneToday', category: 'idioms', learnedDate: new Date().toISOString() }],
        newTodayLearnedWords: Array.from({ length: 8 }, (_, i) => ({ word: `n${i}`, category: 'idioms', dueSelectedToday: false })),
        dueTodayLearnedWords: Array.from({ length: 11 }, (_, i) => ({ word: `d${i}`, category: 'idioms', dueSelectedToday: true })),
        markWordLearned: vi.fn(),
        markWordAsNew: vi.fn(),
        todayWords: [],
      }),
    }));
    vi.doMock('@/services/vocabularyService', () => ({
      vocabularyService: {
        loadDefaultVocabulary: vi.fn(), getAllSheetNames: vi.fn().mockReturnValue([]), switchSheet: vi.fn(),
        getWordList: vi.fn().mockReturnValue([]), getCurrentWord: vi.fn().mockReturnValue(null),
        addVocabularyChangeListener: vi.fn(), removeVocabularyChangeListener: vi.fn(), hasData: vi.fn().mockReturnValue(true),
      },
    }));
    const { default: App } = await import('@/components/VocabularyAppWithLearning');
    const { TooltipProvider } = await import('@/components/ui/tooltip');
    render(<TooltipProvider><App /></TooltipProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Word Summary/i }));
    await screen.findByText(/NEW TODAY \(8\)/);
    expect(screen.getByText(/DUE TODAY \(11\)/)).toBeTruthy();
    // [FB-56] the "Today: n/20 (...)" line is gone
    expect(screen.queryByTestId('today-total')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Today:\s*\d+\/\d+/);
    expect(screen.getByText(/LEARNED \(1\)/)).toBeTruthy();
    expect(screen.getByText('doneToday')).toBeTruthy();
    expect(screen.queryByText('old0')).toBeNull();
  });
});
