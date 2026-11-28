import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { isInActiveSet } from '@/services/dailyTopUp';

type Key = { word: string; category: string };
const keys: Key[] = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/c1c2-704-keys.json'), 'utf8'),
);
const all = Object.entries(DEFAULT_VOCABULARY_DATA).flatMap(([g, rows]) =>
  rows.map((r) => ({ ...r, group: g })),
);
const ids = new Set(keys.map((k) => `${k.category}|${k.word}`));
const added = all.filter((r) => ids.has(`${r.group}|${r.word}`));

describe('[FB-72] C1/C2 bundle gains the server-only words (704 minus AsomethingMA, merged into asthma by FB-86)', () => {
  it('has 704 distinct keys (447 collocations + 256 topic vocab) and all are in the bundle', () => {
    expect(keys).toHaveLength(703);
    expect(ids.size).toBe(703);
    expect(keys.filter((k) => k.category === 'phrases, collocations')).toHaveLength(447);
    expect(keys.filter((k) => k.category === 'topic vocab')).toHaveLength(256);
    expect(added).toHaveLength(703);
  });

  it('each added row has meaning, example, translation and count 0', () => {
    for (const r of added) {
      expect(r.meaning?.trim(), r.word).toBeTruthy();
      expect(r.example?.trim(), r.word).toBeTruthy();
      expect(r.translation?.trim(), r.word).toBeTruthy();
      expect(r.count).toBe(0);
    }
  });

  it('bundle total = 3261 existing + 704 new, by group', () => {
    expect(all).toHaveLength(3261 + keys.length);
    const n = (g: string) => DEFAULT_VOCABULARY_DATA[g].length;
    expect(n('phrases, collocations')).toBe(221 + 447);
    expect(n('topic vocab')).toBe(1874 + 256);
    expect(n('phrasal verbs')).toBe(536);
    expect(n('idioms')).toBe(283);
    expect(n('grammar')).toBe(92);
    expect(n('word formation')).toBe(255);
  });

  it('no exact word+category duplicates were introduced against the previous rows', () => {
    const old = all.filter((r) => !ids.has(`${r.group}|${r.word}`));
    expect(old).toHaveLength(3261);
    const seen = new Set(old.map((r) => `${r.group}|${r.word}`));
    for (const k of keys) expect(seen.has(`${k.category}|${k.word}`), k.word).toBe(false);
    expect(new Set(added.map((r) => `${r.group}|${r.word}`)).size).toBe(added.length);
  });

  it('isInActiveSet accepts the new words and still drops the typography / sense-suffix keys not added', () => {
    expect(isInActiveSet({ word: 'a congestion charge' })).toBe(true);
    for (const k of keys.slice(0, 50)) expect(isInActiveSet({ word: k.word }), k.word).toBe(true);
    expect(isInActiveSet({ word: 'brighten up 2' })).toBe(false);
    expect(isInActiveSet({ word: 'Twist somebody ’s arm' })).toBe(false);
  });
});
