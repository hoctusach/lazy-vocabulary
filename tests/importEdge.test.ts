import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseVocabularyImport } from '@/features/word-sets/parseVocabularyImport';

const csv = (text: string) => parseVocabularyImport({ fileName: 'set.csv', text });
const rowsOf = (result: ReturnType<typeof csv>) => (result.ok ? Object.values(result.sheets).flat() : []);

describe('size limits (E6)', () => {
  it('rejects more than 4000 words', () => {
    const lines = ['word,meaning', ...Array.from({ length: 4001 }, (_, i) => `w${i},m${i}`)];
    const result = csv(lines.join('\n'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/4000 words/);
  });

  it('accepts exactly 4000 words', () => {
    const lines = ['word,meaning', ...Array.from({ length: 4000 }, (_, i) => `w${i},m${i}`)];
    expect(csv(lines.join('\n')).ok).toBe(true);
  });

  it('rejects a text file over 3.5 million characters', () => {
    const result = csv(`word,meaning\n${'a'.repeat(3_600_000)},x`);
    expect(result.ok).toBe(false);
  });
});

describe('field cleaning (E7, E8, E13)', () => {
  it('cuts fields at the limits and says so', () => {
    const result = csv(`word,meaning,example,translation,category\n${'w'.repeat(150)},${'m'.repeat(600)},${'e'.repeat(1200)},${'t'.repeat(600)},${'c'.repeat(60)}`);
    const row = rowsOf(result)[0];
    expect([row.word.length, row.meaning.length, row.example.length, row.translation?.length, row.category?.length]).toEqual([100, 500, 1000, 500, 40]);
    expect(result.ok && result.warnings.join(' ')).toMatch(/5 text fields were longer than the limit and were shortened/);
  });

  it('does not warn when nothing was cut', () => {
    const result = csv('word,meaning\na,x');
    expect(result.ok && result.warnings).toEqual([]);
  });

  it('built-in entries longer than the limits are shortened and the file says so', () => {
    const result = csv(`word,meaning,example
${'w'.repeat(176)},${'m'.repeat(933)},${'e'.repeat(1257)}`);
    const row = rowsOf(result)[0];
    expect([row.word.length, row.meaning.length, row.example.length]).toEqual([100, 500, 1000]);
    expect(result.ok && result.warnings.join(' ')).toMatch(/3 text fields were longer than the limit/);
  });

  it('never cuts an emoji in half', () => {
    const result = csv(`word,meaning\n${'😀'.repeat(150)},x`);
    const word = rowsOf(result)[0].word;
    expect(Array.from(word)).toHaveLength(100);
    expect(word).toBe('😀'.repeat(100));
  });

  it('removes control characters and keeps emoji, CJK, Thai and Arabic text', () => {
    const result = csv('word,meaning,translation\nhel\u0000lo\u0007,greeting 😀,你好 สวัสดี مرحبا');
    expect(rowsOf(result)[0]).toMatchObject({ word: 'hello', meaning: 'greeting 😀', translation: '你好 สวัสดี مرحبا' });
  });

  it('clamps the count column', () => {
    const result = csv('word,meaning,count\na,x,abc\nb,x,-5\nc,x,9999999\nd,x,12');
    expect(rowsOf(result).map((r) => r.count)).toEqual([0, 0, 1_000_000, 12]);
  });

  it('a blank category becomes "imported" for CSV', () => {
    expect(rowsOf(csv('word,meaning,category\na,x,'))[0].category).toBe('imported');
  });
});

describe('error list (E3, E26)', () => {
  it('shows 8 problems and says how many were hidden', () => {
    const lines = ['word,meaning', ...Array.from({ length: 20 }, (_, i) => `w${i},`)];
    const result = csv(lines.join('\n'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(9);
      expect(result.errors[8]).toMatch(/12 more problems were hidden/);
    }
  });

  it('numbers rows like a spreadsheet (header is row 1)', () => {
    const result = csv('word,meaning\na,x\nb,');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Row 3/);
  });
});

describe('Excel workbooks (E10)', () => {
  const book = (sheets: Record<string, unknown[][]>) => {
    const wb = XLSX.utils.book_new();
    for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  };
  const xlsx = (sheets: Record<string, unknown[][]>) => parseVocabularyImport({ fileName: 'set.xlsx', data: book(sheets) });

  it('uses the sheet name as the category when the column is missing', () => {
    const result = xlsx({ idioms: [['word', 'meaning'], ['spare', 'extra']], grammar: [['word', 'meaning'], ['if', 'condition']] });
    expect(result.ok && Object.keys(result.sheets).sort()).toEqual(['grammar', 'idioms']);
  });

  it('skips readme / notes / instructions sheets, in any case', () => {
    const result = xlsx({ words: [['word', 'meaning'], ['a', 'x']], README: [['hello']], Notes: [['x']], Instructions: [['y']] });
    expect(result.ok && result.wordCount).toBe(1);
  });

  it('skips an empty sheet', () => {
    const result = xlsx({ words: [['word', 'meaning'], ['a', 'x']], empty: [] });
    expect(result.ok && result.wordCount).toBe(1);
  });

  it('names the sheet in the error when its columns are wrong', () => {
    const result = xlsx({ words: [['word', 'meaning'], ['a', 'x']], bad: [['foo', 'bar'], ['1', '2']] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/Sheet "bad"/);
  });

  it('reports a corrupt file', () => {
    const result = parseVocabularyImport({ fileName: 'x.xlsx', data: new Uint8Array([1, 2, 3, 4]) });
    expect(result.ok).toBe(false);
  });

  it('merges two sheets that clean up to the same category', () => {
    const result = xlsx({ A: [['word', 'meaning', 'category'], ['a', 'x', 'shared']], B: [['word', 'meaning', 'category'], ['b', 'y', 'shared']] });
    expect(result.ok && result.sheets.shared).toHaveLength(2);
  });
});

describe('JSON shapes (E9)', () => {
  it('reports the category in nested errors', () => {
    const result = parseVocabularyImport({ fileName: 'x.json', text: JSON.stringify({ idioms: [{ word: 'a', meaning: 'x' }], bad: [{ word: 'only' }] }) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/bad:/);
  });

  it('rejects a list with a non-object', () => {
    expect(parseVocabularyImport({ fileName: 'x.json', text: '[1,2]' }).ok).toBe(false);
  });

  it('rejects a JSON primitive and an empty list', () => {
    expect(parseVocabularyImport({ fileName: 'x.json', text: '42' }).ok).toBe(false);
    expect(parseVocabularyImport({ fileName: 'x.json', text: '[]' }).ok).toBe(false);
  });
});
