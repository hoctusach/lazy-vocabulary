/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearningProgress } from '@/hooks/useLearningProgress';

const { rpc, rows } = vi.hoisted(() => {
  const mkRow = (word: string, category: string) => ({
    word_id: `${word}::${category}`,
    word,
    category,
    meaning: 'm',
    example: 'e',
    is_today_selection: true,
    new_selected_today: true,
  });
  const rows = [
    mkRow('keep a straight face', 'idioms'),
    mkRow('The passive', 'grammar'),
    mkRow('Knuckle down', 'phrasal verbs'),
    mkRow('pay /peɪ/', 'phrases, collocation'),
  ];
  const rpc = vi.fn((name: string) => {
    if (name === 'generate_daily_selection_v2') {
      return { select: async () => ({ data: rows, error: null }) };
    }
    return Promise.resolve({ data: [], error: null });
  });
  return { rpc, rows };
});

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    rpc,
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
vi.mock('@/services/analyticsService', () => ({
  identifyUser: vi.fn(),
  trackDailySelectionEvent: vi.fn(),
  trackReviewDue: vi.fn(),
  trackWordLearned: vi.fn(),
  trackWordReset: vi.fn(),
}));

const dailyCalls = () => rpc.mock.calls.filter(([name]) => name === 'generate_daily_selection_v2');
// [FB-51] A 4-row day is topped up on the device to 20 (and the server may be asked once more), so assert the
// server rows are kept rather than the exact total.
const mine = ['keep a straight face', 'The passive', 'Knuckle down', 'pay /peɪ/'];
const ALL = ['topic vocab', 'phrasal verbs', 'idioms', 'grammar', 'phrases, collocations', 'word formation'];

describe('built-in daily selection with a group mix (client-side only)', () => {
  beforeEach(() => {
    rpc.mockClear();
    localStorage.clear();
  });

  it('all six groups: p_category NULL, every row kept', async () => {
    const { result } = renderHook(() => useLearningProgress({ builtinGroups: ALL }));
    await waitFor(() => expect(result.current.todayWords).toHaveLength(20));
    expect(dailyCalls().length).toBeGreaterThanOrEqual(1);
    expect(result.current.todayWords.map((word) => word.word)).toEqual(expect.arrayContaining(mine));
    expect(dailyCalls()[0][1]).toMatchObject({ p_user_key: 'user-key', p_category: null });
  });

  it('no options behaves like all six', async () => {
    const { result } = renderHook(() => useLearningProgress());
    await waitFor(() => expect(result.current.todayWords).toHaveLength(20));
    expect(dailyCalls()[0][1]).toMatchObject({ p_category: null });
  });

  it('exactly one group: that group is passed as p_category', async () => {
    renderHook(() => useLearningProgress({ builtinGroups: ['idioms'] }));
    await waitFor(() => expect(dailyCalls().length).toBeGreaterThanOrEqual(1));
    expect(dailyCalls()[0][1]).toMatchObject({ p_category: 'idioms' });
  });

  it('2-5 groups: p_category NULL and rows filtered client-side', async () => {
    const { result } = renderHook(() => useLearningProgress({ builtinGroups: ['idioms', 'phrases, collocations'] }));
    await waitFor(() => expect(result.current.todayWords.length).toBeGreaterThan(0));
    expect(dailyCalls()[0][1]).toMatchObject({ p_category: null });
    const words = result.current.todayWords.map((word) => word.word);
    expect(words).toEqual(expect.arrayContaining(['keep a straight face', 'pay /peɪ/']));
    // grammar / phrasal rows are filtered out client-side; only the two selected groups remain (topped up to 20)
    expect(words).not.toContain('The passive');
    expect(words).not.toContain('Knuckle down');
  });

  it('no built-in group: the RPC is never called', async () => {
    const { result } = renderHook(() => useLearningProgress({ builtinGroups: [] }));
    await waitFor(() => expect(result.current.isDailySelectionLoading).toBe(false));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(dailyCalls()).toHaveLength(0);
    expect(result.current.todayWords).toEqual([]);
  });
});
