// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getCountForSeverity, DAILY_TOTAL_WORDS } from '@/services/learningProgressService';
import { computeLearnedWordStats, type LearnedWordRow } from '@/lib/progress/learnedWordStats';
import { buildTodayQueue, emptyProgress, BUILTIN_GROUPS, DAILY_TOTAL } from '@/features/word-sets/vocabularySetStore';
import { filterByBuiltinGroups, planBuiltinSelection } from '@/features/word-sets/mixQueue';

// FB-32 / FB-35 lock today's selection math so a future quota change is a visible, deliberate test edit.
// The body of generate_daily_selection_v2 is NOT in this repo: server-side behaviour is not asserted here.
const NOW = new Date('2026-11-22T05:00:00Z');
const row = (id: string, over: Partial<LearnedWordRow> = {}): LearnedWordRow => ({
  word_id: id, srs_state: 'learning', learned_at: null, mark_learned_at: null, last_review_at: null,
  next_review_at: null, next_display_at: null, in_review_queue: null, review_count: 0, srs_interval_days: null,
  srs_ease: null, is_today_selection: true, due_selected_today: false, category: 'Phrasal Verb', ...over,
});

describe('[FB-35] signed-in daily request size: 20 words TOTAL (Option A)', () => {
  it('every severity requests 20 (no 25/50/100); p_count is the daily total', () => {
    expect(DAILY_TOTAL_WORDS).toBe(20);
    expect(getCountForSeverity('light')).toBe(20);
    expect(getCountForSeverity('moderate')).toBe(20);
    expect(getCountForSeverity('intense')).toBe(20);
  });
});

describe('[FB-32] Progress labels: NEW TODAY / DUE TODAY are learning rows of today, not the daily quota', () => {
  it('NEW = learning + today + not due; DUE = learning + today + due; learned and non-today rows are in neither', () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, i) => row(`n${i}`)),
      ...Array.from({ length: 4 }, (_, i) => row(`d${i}`, { due_selected_today: true, next_review_at: '2026-11-21T00:00:00Z' })),
      row('l1', { srs_state: 'learned' }), // marked learned today: leaves NEW TODAY, counts as LEARNED
      row('old', { is_today_selection: false }),
    ];
    const r = computeLearnedWordStats(rows, { now: NOW, timezone: 'Asia/Saigon' });
    expect(r.newTodayWords).toHaveLength(7);
    expect(r.dueTodayWords).toHaveLength(4);
    expect(r.learnedWords).toHaveLength(1);
  });

  it('marking a word learned shrinks NEW TODAY: 20 selected, 13 marked learned => 7 new left', () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, i) => row(`n${i}`)),
      ...Array.from({ length: 13 }, (_, i) => row(`x${i}`, { srs_state: 'learned' })),
    ];
    const r = computeLearnedWordStats(rows, { now: NOW });
    expect(r.newTodayWords).toHaveLength(7);
    expect(r.learnedWords).toHaveLength(13);
  });

  it('without server flags, today is derived from last_review_at in the user timezone and due from next_review_at', () => {
    const rows = [
      row('a', { is_today_selection: null, due_selected_today: null, last_review_at: '2026-11-22T01:00:00Z', next_review_at: '2026-11-23T00:00:00Z' }),
      row('b', { is_today_selection: null, due_selected_today: null, last_review_at: '2026-11-22T01:00:00Z', next_review_at: '2026-11-22T02:00:00Z' }),
      row('c', { is_today_selection: null, due_selected_today: null, last_review_at: '2026-11-10T01:00:00Z', next_review_at: '2026-11-11T00:00:00Z' }),
    ];
    const r = computeLearnedWordStats(rows, { now: NOW, timezone: 'Asia/Saigon' });
    expect(r.newTodayWords.map((w) => w.word)).toEqual(['a']);
    expect(r.dueTodayWords.map((w) => w.word)).toEqual(['b']);
  });
});

describe('[FB-35] imported-set daily queue: 20 TOTAL, due first, fill with new', () => {
  const words = (n: number, p = 'w') => Array.from({ length: n }, (_, i) => ({ word: `${p}${i}`, category: 'c', meaning: 'm', example: 'e' })) as never[];
  const due = (progress: ReturnType<typeof emptyProgress>, n: number) => {
    for (let i = 0; i < n; i++) progress.learned[`c::w${i}`] = { nextReviewAt: '2026-11-21T00:00:00Z' } as never;
  };
  it('constant is 20', () => expect(DAILY_TOTAL).toBe(20));
  it('50 fresh, nothing due => 20 new words (no separate new-cap of 8)', () => {
    expect(buildTodayQueue(words(50), emptyProgress(), '2026-11-22')).toHaveLength(20);
  });
  it('30 due + 50 fresh => capped at 20, all due first', () => {
    const progress = emptyProgress();
    due(progress, 30);
    const q = buildTodayQueue(words(80), progress, '2026-11-22') as { word: string }[];
    expect(q).toHaveLength(20);
    expect(q.every((w) => Number(w.word.slice(1)) < 30)).toBe(true);
  });
  it('4 due + 50 fresh => 20 (4 due + 16 new)', () => {
    const progress = emptyProgress();
    due(progress, 4);
    const q = buildTodayQueue(words(54), progress, '2026-11-22') as { word: string }[];
    expect(q).toHaveLength(20);
    expect(q.slice(0, 4).map((w) => w.word)).toEqual(['w0', 'w1', 'w2', 'w3']);
  });
  it('only 12 words in the set => all 12 (never pads)', () => {
    expect(buildTodayQueue(words(12), emptyProgress(), '2026-11-22')).toHaveLength(12);
  });
});

describe('[FB-32] mixing 2-5 built-in groups: server called with NULL, rows filtered client-side', () => {
  it('plan: 1 group => category; all => NULL, no filter; 2-5 => NULL + filterGroups', () => {
    const g = [...BUILTIN_GROUPS];
    expect(planBuiltinSelection([g[0]])).toMatchObject({ call: true, category: g[0], filterGroups: null });
    expect(planBuiltinSelection(g)).toMatchObject({ call: true, category: null, filterGroups: null });
    const two = planBuiltinSelection([g[0], g[1]]);
    expect(two.category).toBeNull();
    expect(two.filterGroups).toEqual([g[0], g[1]]);
  });
  it('the filter drops rows outside the picked groups, so a 20-word server quota shrinks', () => {
    const g = [...BUILTIN_GROUPS];
    const rows = Array.from({ length: 20 }, (_, i) => ({ category: g[i % g.length] }));
    const kept = filterByBuiltinGroups(rows, [g[0], g[1]]);
    expect(kept.length).toBeLessThan(20);
    expect(kept.every((r) => r.category === g[0] || r.category === g[1])).toBe(true);
  });
});
