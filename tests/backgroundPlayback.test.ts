import { describe, expect, it } from 'vitest';
import { buildBackgroundQueue, resolveResumeIndex, speechTextFor } from '@/lib/platform/backgroundPlayback';
import type { VocabularyWord } from '@/types/vocabulary';

const words: VocabularyWord[] = ['a', 'b', 'c', 'd'].map((letter) => ({
  word: letter,
  meaning: `${letter} means`,
  example: `${letter} example`,
  count: 0,
  category: 'x',
}));

describe('background playback queue', () => {
  it('starts at the current word and wraps around', () => {
    const items = buildBackgroundQueue(words, 2);
    expect(items.map((item) => item.title)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('builds the same text the foreground player speaks', () => {
    expect(speechTextFor(words[0])).toContain('a means');
    expect(speechTextFor(words[0])).toContain('a example');
  });

  it('caps the queue size and handles an empty list', () => {
    expect(buildBackgroundQueue(words, 0, 2)).toHaveLength(2);
    expect(buildBackgroundQueue([], 0)).toEqual([]);
  });

  it('works out where playback resumed', () => {
    expect(resolveResumeIndex(2, 0, 4)).toBe(2);
    expect(resolveResumeIndex(2, 3, 4)).toBe(1);
    expect(resolveResumeIndex(0, 9, 4)).toBe(1);
    expect(resolveResumeIndex(0, 5, 0)).toBe(0);
  });
});
