// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { activeProgressStats } from '@/features/word-sets/mixQueue';
import {
  BUILTIN_GROUPS,
  builtinSelectedWordCount,
  countSheetWords,
} from '@/features/word-sets/vocabularySetStore';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { computeLearnedWordStats } from '@/lib/progress/learnedWordStats';

const ALL = countSheetWords(DEFAULT_VOCABULARY_DATA);

describe('[FB-38] Learning Progress Total = active selection (same count as the Word Set card)', () => {
  it('all six groups = the Word Set card count (row count, not distinct words, not 4000)', () => {
    expect(builtinSelectedWordCount(BUILTIN_GROUPS)).toBe(ALL);
    expect(ALL).toBe(3964);
    const s = activeProgressStats(builtinSelectedWordCount(BUILTIN_GROUPS), { learned: 67, learning: 755, due: 333 }, null);
    expect(s.total).toBe(ALL);
    expect(s.new).toBe(ALL - 67 - 755);
  });

  it('shrinks when groups are deselected', () => {
    const some = BUILTIN_GROUPS.slice(0, 2);
    expect(builtinSelectedWordCount(some)).toBeLessThan(ALL);
    expect(activeProgressStats(builtinSelectedWordCount(some), null, null).total).toBe(builtinSelectedWordCount(some));
    expect(activeProgressStats(builtinSelectedWordCount([]), null, null).total).toBe(0);
  });

  it('adds selected imported sets once; Learned + Learning + New = Total; Due is a subset of Learning', () => {
    const imported = { total: 50, learned: 5, learning: 10, new: 35, due: 4 };
    const s = activeProgressStats(ALL, { learned: 67, learning: 755, due: 333 }, imported);
    expect(s.total).toBe(ALL + 50);
    expect(s.learned + s.learning + s.new).toBe(s.total);
    expect(s.due).toBeLessThanOrEqual(s.learning);
  });

  it('a server-sized 4000 total / remaining cannot override the active total', () => {
    const server = { learned: 67, learning: 755, due: 333, total: 4000, new: 3178, remaining: 3178 } as never;
    const s = activeProgressStats(ALL, server, null);
    expect(s.total).toBe(ALL);
    expect(s.new).toBe(ALL - 67 - 755);
  });

  it('clamps account-wide progress into a partial selection', () => {
    const s = activeProgressStats(100, { learned: 80, learning: 755, due: 300 }, null);
    expect(s.learned).toBe(80);
    expect(s.learning).toBe(20);
    expect(s.new).toBe(0);
    expect(s.due).toBe(20);
  });

  it('client computeLearnedWordStats: new = total - learned - learning', () => {
    const rows = [
      { word_id: 'a', srs_state: 'learned' },
      { word_id: 'b', srs_state: 'learning' },
    ] as never[];
    const r = computeLearnedWordStats(rows, { totalWords: 10 });
    expect(r.summary.new).toBe(8);
    expect(r.summary.learned + r.summary.learning + r.summary.new).toBe(10);
  });
});
