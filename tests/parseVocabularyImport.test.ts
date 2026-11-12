import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseVocabularyImport } from '@/features/word-sets/parseVocabularyImport';
import { buildSampleCsv, buildSampleJson, buildSampleXlsx } from '@/features/word-sets/sampleTemplate';

describe('parseVocabularyImport', () => {
  it('parses a CSV with the required columns and keeps the category', () => {
    const csv = [
      'word,meaning,example,translation,category',
      'give up,to stop trying,Do not give up.,bỏ cuộc,phrasal verbs',
      'spare,extra,I have spare time.,rảnh,topic vocab',
    ].join('\n');

    const result = parseVocabularyImport({ fileName: 'My_verbs.csv', text: csv });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.nameSuggestion).toBe('My verbs');
    expect(result.wordCount).toBe(2);
    expect(result.sheets['phrasal verbs']?.[0]?.word).toBe('give up');
    expect(result.sheets['phrasal verbs']?.[0]?.translation).toBe('bỏ cuộc');
    expect(result.sheets['topic vocab']).toHaveLength(1);
  });

  it('parses quoted CSV fields that contain commas', () => {
    const csv = 'word,meaning,example\n"break, even","to have no loss","We broke, then even."\n';
    const result = parseVocabularyImport({ fileName: 'quoted.csv', text: csv });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheets.imported[0]).toMatchObject({
      word: 'break, even',
      meaning: 'to have no loss',
      example: 'We broke, then even.',
    });
  });

  it('accepts semicolon-separated CSV', () => {
    const csv = 'word;meaning;example\nhello;a greeting;Say hello.\n';
    const result = parseVocabularyImport({ fileName: 'eu.csv', text: csv });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheets.imported[0].word).toBe('hello');
  });

  it('returns a clear error when the meaning column is missing', () => {
    const result = parseVocabularyImport({
      fileName: 'bad.csv',
      text: 'word,notes\napple,a fruit\n',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/meaning/i);
  });

  it('returns a clear error when every row is missing a word or meaning', () => {
    const result = parseVocabularyImport({
      fileName: 'blank.csv',
      text: 'word,meaning\n,only meaning\nonly word,\n',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(' ')).toMatch(/word and a meaning/i);
  });

  it('rejects an empty file and an unsupported extension', () => {
    expect(parseVocabularyImport({ fileName: 'empty.csv', text: '   ' })).toEqual({
      ok: false,
      errors: ['The file is empty.'],
    });
    const wrong = parseVocabularyImport({ fileName: 'notes.txt', text: 'word,meaning\nhi,hello' });
    expect(wrong.ok).toBe(false);
    if (wrong.ok) return;
    expect(wrong.errors[0]).toMatch(/Unsupported file type/);
  });

  it('parses a JSON word list and a category map', () => {
    const list = parseVocabularyImport({
      fileName: 'list.json',
      text: JSON.stringify([
        { word: 'apple', meaning: 'a fruit', example: 'I ate an apple.' },
      ]),
    });
    expect(list.ok).toBe(true);
    if (list.ok) expect(list.sheets.imported[0].word).toBe('apple');

    const grouped = parseVocabularyImport({
      fileName: 'grouped.json',
      text: JSON.stringify({
        idioms: [{ word: 'break the ice', meaning: 'to start' }],
      }),
    });
    expect(grouped.ok).toBe(true);
    if (grouped.ok) expect(grouped.sheets.idioms[0].word).toBe('break the ice');
  });

  it('reports invalid JSON', () => {
    const result = parseVocabularyImport({ fileName: 'bad.json', text: '{not json' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/not valid JSON/i);
  });

  it('parses an Excel workbook and uses the sheet name as the category', () => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      { word: 'look up', meaning: 'to search', example: 'Look up the word.' },
      { Word: 'set off', Meaning: 'to start a journey', Example: 'We set off early.' },
    ]);
    XLSX.utils.book_append_sheet(book, sheet, 'phrasal verbs');
    const other = XLSX.utils.aoa_to_sheet([
      ['term', 'definition'],
      ['mitigate', 'to make less severe'],
    ]);
    XLSX.utils.book_append_sheet(book, other, 'topic vocab');
    const data = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

    const result = parseVocabularyImport({ fileName: 'class.xlsx', data });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheets['phrasal verbs'].map((word) => word.word)).toEqual(['look up', 'set off']);
    expect(result.sheets['topic vocab'][0].word).toBe('mitigate');
  });

  it('returns a clear error for an Excel sheet without word and meaning columns', () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['notes'], ['hello']]), 'Sheet1');
    const data = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const result = parseVocabularyImport({ fileName: 'notes.xlsx', data });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/word/i);
  });

  it('round-trips the downloadable CSV, JSON, and Excel templates', () => {
    const csv = parseVocabularyImport({ fileName: 'vocabulary-set-template.csv', text: buildSampleCsv() });
    expect(csv.ok).toBe(true);
    if (csv.ok) expect(csv.wordCount).toBe(3);

    const json = parseVocabularyImport({ fileName: 'vocabulary-set-template.json', text: buildSampleJson() });
    expect(json.ok).toBe(true);
    if (json.ok) expect(json.sheets['phrasal verbs'][0].word).toBe('give up');

    const xlsx = parseVocabularyImport({
      fileName: 'vocabulary-set-template.xlsx',
      data: buildSampleXlsx(),
    });
    expect(xlsx.ok).toBe(true);
    if (xlsx.ok) {
      expect(xlsx.wordCount).toBe(3);
      expect(xlsx.sheets['phrasal verbs'][0].word).toBe('give up');
      expect(xlsx.sheets['topic vocab'].map((word) => word.word)).toContain('spare');
    }
  });
});
