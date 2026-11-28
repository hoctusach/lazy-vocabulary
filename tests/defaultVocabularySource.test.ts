import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_VOCABULARY_DATA,
  getDefaultVocabularyTotal,
  normalizeCategory,
  normalizeSheetCategories,
} from '@/data/defaultVocabulary';
import { VocabularyDataProcessor } from '@/services/vocabulary/VocabularyDataProcessor';

const root = join(__dirname, '..');
const all = Object.values(DEFAULT_VOCABULARY_DATA).flat();
const find = (w: string) => all.filter((e) => e.word === w);

describe('default vocabulary single source', () => {
  it('normalises the singular collocation category (any case/spacing)', () => {
    expect(normalizeCategory('phrases, collocation')).toBe('phrases, collocations');
    expect(normalizeCategory(' Phrases ,  Collocation ')).toBe('phrases, collocations');
    expect(normalizeCategory('phrases, collocations')).toBe('phrases, collocations');
    expect(normalizeCategory('idioms')).toBe('idioms');
    const merged = normalizeSheetCategories({
      'phrases, collocation': [{ word: 'a', meaning: '', example: '', count: 0, category: 'phrases, collocation' }],
      'phrases, collocations': [{ word: 'b', meaning: '', example: '', count: 0 }],
    });
    expect(Object.keys(merged)).toEqual(['phrases, collocations']);
    expect(merged['phrases, collocations'].map((w) => w.word)).toEqual(['a', 'b']);
    expect(merged['phrases, collocations'][0].category).toBe('phrases, collocations');
  });

  it('the loader processor normalises categories for any data source', () => {
    const out = new VocabularyDataProcessor().processDataTypes({
      'phrases, collocation': [{ word: 'x', meaning: 'm', example: 'e' }],
    });
    expect(Object.keys(out)).toEqual(['phrases, collocations']);
    expect(out['phrases, collocations'][0].category).toBe('phrases, collocations');
  });

  it('has exactly one bundled copy and no runtime fetch of it', () => {
    expect(existsSync(join(root, 'public/defaultVocabulary.json'))).toBe(false);
    expect(existsSync(join(root, 'public/defaultVocabulary4.csv'))).toBe(false);
    expect(existsSync(join(root, 'src/data/defaultVocabulary.json'))).toBe(true);
    const manager = readFileSync(join(root, 'src/services/vocabulary/VocabularyDataManager.ts'), 'utf8');
    expect(manager).not.toMatch(/fetch\(/);
    const copies: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(dir, e.name));
        else if (e.name === 'defaultVocabulary.json') copies.push(join(dir, e.name));
      }
    };
    walk(join(root, 'src'));
    walk(join(root, 'public'));
    expect(copies).toHaveLength(1);
  });

  it('is free of "sth" -> "something" corruption', () => {
    // [FB-86] "AsomethingMA" was renamed to "asthma" (merged with the existing ASTHMA row).
    const text = JSON.stringify(DEFAULT_VOCABULARY_DATA);
    expect(text).not.toMatch(/[a-z]something|something[a-z]/i);
  });

  it('has no IELTS study-note entries', () => {
    expect(all.some((e) => /IELTS speaking test/.test(e.word))).toBe(false);
    expect(all.some((e) => e.word.startsWith('some ‘less common’ vocabulary'))).toBe(false);
  });

  it('has the rewritten example sentences', () => {
    const ex = (w: string) => find(w).map((e) => e.example);
    expect(ex('for the time being')).toEqual([
      "My laptop is being repaired, so I'm using my sister's old one for the time being.",
    ]);
    expect(ex('not have a leg to stand on')).toEqual([
      "Without the receipt, she didn't have a leg to stand on when she asked for a refund.",
    ]);
    expect(ex('not see the wood for the trees')).toEqual([
      "He spent hours fixing the fonts on his slides and couldn't see the wood for the trees – the main argument was still missing.",
    ]);
    expect(ex('Slogan (noun)')).toEqual(["The charity's new slogan was short, catchy and easy to remember."]);
    const lock = find('lock up /lɒk ʌp/');
    expect(lock.find((e) => e.meaning === 'to imprison someone')?.example).toBe(
      'After the trial, the judge decided to lock him up for five years.'
    );
  });

  it('computes the total from the data (unique word keys)', () => {
    const unique = new Set(all.map((e) => e.word)).size;
    expect(getDefaultVocabularyTotal()).toBe(unique);
    expect(unique).toBeGreaterThan(3000);
    expect(unique).toBeLessThanOrEqual(all.length);
  });
});

describe('computed totals', () => {
  it('no hard-coded TOTAL_WORDS remains and progress code uses the helper', () => {
    const read = (p: string) => readFileSync(join(root, p), 'utf8');
    expect(read('src/lib/progress/srsSyncByUserKey.ts')).not.toMatch(/TOTAL_WORDS|3261/);
    for (const p of ['src/lib/progress/progressSummary.ts', 'src/services/learningProgressService.ts']) {
      const text = read(p);
      expect(text).not.toMatch(/\bTOTAL_WORDS\b/);
      expect(text).toMatch(/getDefaultVocabularyTotal\(\)/);
    }
  });

  it('has no verbatim textbook phrasal-verb examples left (64 rewritten)', () => {
    const old: string[] = JSON.parse(
      readFileSync(join(root, 'tests/fixtures/phrasalOldExamples.json'), 'utf8'),
    );
    expect(old).toHaveLength(64);
    const examples = new Set(all.map((e) => e.example));
    for (const s of old) expect(examples.has(s), s).toBe(false);
    const think = find("think up /θɪŋk ʌp/");
    expect(think).toHaveLength(1);
    expect(think[0].meaning).toBe("to come up with a new idea, plan, story or reason using your mind");
  });

  it("keeps the write-down sense under 'take down', not 'take in'", () => {
    const wd = 'to write down information or statements';
    expect(find('take in /teɪk ɪn/').filter((e) => e.meaning === wd)).toHaveLength(0);
    const down = find('take down /teɪk daʊn/').filter((e) => e.meaning === wd);
    expect(down).toHaveLength(1);
    expect(down[0].example).toBe(
      "During the call, Priya took down the client's exact wording so nothing would be misquoted later.",
    );
  });
});
