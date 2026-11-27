import { describe, expect, it } from 'vitest';
import { parseVocabularyImport } from '@/features/word-sets/parseVocabularyImport';
import { buildSampleCsv } from '@/features/word-sets/sampleTemplate';

const csv = (text: string, fileName = 'x.csv') => parseVocabularyImport({ fileName, text });

describe('word set import parsing', () => {
  it('SET-02: parses the template CSV (3 words, 3 categories, Vietnamese kept, name from file)', () => {
    const r = parseVocabularyImport({ fileName: 'lazy_vocab-template.csv', text: buildSampleCsv() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.wordCount).toBe(3);
    expect(Object.keys(r.sheets).sort()).toEqual(['idioms', 'phrasal verbs', 'topic vocab']);
    expect(r.sheets['phrasal verbs'][0].translation).toBe('bỏ cuộc');
    expect(r.nameSuggestion).toBe('lazy vocab-template');
  });

  it('SET-04: imports JSON as an array, {words:[]} and {category:[]}', () => {
    const item = { word: 'a', meaning: 'b' };
    const arr = parseVocabularyImport({ fileName: 'a.json', text: JSON.stringify([item]) });
    const obj = parseVocabularyImport({ fileName: 'a.json', text: JSON.stringify({ words: [item] }) });
    const cat = parseVocabularyImport({ fileName: 'a.json', text: JSON.stringify({ idioms: [item] }) });
    for (const r of [arr, obj, cat]) expect(r.ok).toBe(true);
    if (arr.ok) expect(Object.keys(arr.sheets)).toEqual(['imported']);
    if (obj.ok) expect(Object.keys(obj.sheets)).toEqual(['imported']);
    if (cat.ok) expect(Object.keys(cat.sheets)).toEqual(['idioms']);
  });

  it('SET-05: rejects empty CSV', () => {
    for (const text of ['', '   \n  ']) {
      const r = csv(text);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0]).toBe('The file is empty.');
    }
    const headerOnly = csv('word,meaning\n');
    expect(headerOnly.ok).toBe(false);
  });

  it('SET-10: missing columns are reported; translation alone becomes the meaning with a warning', () => {
    const r = csv('word\nhello\n');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/^Missing required columns/);
    const t = csv('word,translation\nhello,xin chào\n');
    expect(t.ok).toBe(true);
    if (t.ok) {
      expect(t.sheets.imported[0].meaning).toBe('xin chào');
      expect(t.warnings.join(' ')).toMatch(/translation column was used as the meaning/);
    }
  });

  it('SET-12: duplicate in one category keeps the last copy; same word in two categories is kept twice', () => {
    const r = csv('word,meaning,category\nApple,first,fruit\napple,second,fruit\nApple,third,tech\n');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings).toContain('Duplicate "apple" in fruit — kept the last copy.');
    expect(r.sheets.fruit).toHaveLength(1);
    expect(r.sheets.fruit[0].meaning).toBe('second');
    expect(r.sheets.tech).toHaveLength(1);
    expect(r.wordCount).toBe(2);
  });

  it('SET-13: invalid JSON gives friendly errors and never throws', () => {
    for (const text of ['{oops', '42', '"str"', '[1,2]', '{"a":1}']) {
      let r: ReturnType<typeof parseVocabularyImport> | undefined;
      expect(() => {
        r = parseVocabularyImport({ fileName: 'bad.json', text });
      }).not.toThrow();
      expect(r!.ok).toBe(false);
      if (!r!.ok) {
        expect(r!.errors.length).toBeGreaterThan(0);
        expect(r!.errors[0]).not.toMatch(/SyntaxError|undefined|Unexpected token/);
      }
    }
  });

  it('SET-14: handles ; and tab delimiters, quoted commas, "" escapes, CRLF, BOM and trailing blanks', () => {
    const semi = csv('word;meaning\nhi;greeting\n');
    const tab = csv('word\tmeaning\nhi\tgreeting\n');
    const quoted = csv('word,meaning\n"a, b","say ""hi"""\r\n\r\n\r\n');
    const bom = csv('﻿word,meaning\r\nhi,greeting\r\n');
    for (const r of [semi, tab, quoted, bom]) expect(r.ok).toBe(true);
    if (quoted.ok) {
      expect(quoted.sheets.imported[0].word).toBe('a, b');
      expect(quoted.sheets.imported[0].meaning).toBe('say "hi"');
      expect(quoted.wordCount).toBe(1);
    }
    if (bom.ok) expect(bom.wordCount).toBe(1);
  });

  it('SET-15: names the offending row when a row is incomplete', () => {
    const r = csv('word,meaning\nok,fine\nlonely,\n,orphan meaning\n');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/^Row 3 "lonely" is missing its meaning/);
    expect(r.errors[1]).toMatch(/^Row 4 has a meaning \("orphan meaning"\) but no word/);
  });

  it('SET-16: duplicates are removed before the 4000-word cap is applied', () => {
    const rows = ['word,meaning'];
    for (let i = 0; i < 5000; i += 1) rows.push(`dup${i % 10},m`);
    const r = csv(rows.join('\n'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.wordCount).toBe(10);
  });

  it('SET-17: more than 4000 unique words is still rejected with a clear message', () => {
    const rows = ['word,meaning'];
    for (let i = 0; i < 4001; i += 1) rows.push(`w${i},m`);
    const r = csv(rows.join('\n'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/limited to 4000 words/);
  });

  it('EDGE-04: Vietnamese, emoji and NFC/NFD forms stay intact (NFC and NFD are different words)', () => {
    const nfc = 'bỏ cuộc'.normalize('NFC');
    const nfd = 'bỏ cuộc'.normalize('NFD');
    const r = csv(`word,meaning\n${nfc},a\n${nfd},b\nĐà Nẵng,city\n🚀 launch,start\n`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const words = r.sheets.imported.map((w) => w.word);
    expect(words).toContain('Đà Nẵng');
    expect(words).toContain('🚀 launch');
    expect(words).toContain(nfc);
    expect(words).toContain(nfd);
    expect(r.wordCount).toBe(4);
  });
});

