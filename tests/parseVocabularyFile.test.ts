import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { VocabularyImportError, parseVocabularyFile } from '@/lib/wordSets/parseVocabularyFile';
import { SAMPLE_CSV } from '@/lib/wordSets/constants';

function textFile(name: string, contents: string) {
  return parseVocabularyFile(name, contents);
}

describe('parseVocabularyFile', () => {
  it('parses the sample CSV into categories', () => {
    const result = textFile('vocabulary-template.csv', SAMPLE_CSV);
    expect(result.source).toBe('csv');
    expect(result.wordCount).toBe(3);
    expect(result.data.academic?.map((word) => word.word)).toEqual(['serendipity']);
    expect(result.data['phrasal verbs']?.[0]).toMatchObject({
      word: 'give up',
      meaning: 'to stop trying',
      translation: 'bỏ cuộc',
    });
    expect(result.data.idioms?.[0].word).toBe('break the ice');
  });

  it('accepts alternate headers and warns when meaning is missing', () => {
    const csv = 'term,definition,sentence\nalpha,first letter,\nbeta,,Beta is second.\n';
    const result = textFile('lesson.csv', csv);
    expect(result.wordCount).toBe(2);
    expect(result.data.Imported?.map((word) => word.word)).toEqual(['alpha', 'beta']);
    expect(result.warnings.some((warning) => warning.includes('no meaning'))).toBe(true);
  });

  it('reads semicolon-separated CSV', () => {
    const csv = 'word;meaning;example\nciao;hello;Ciao, friend!\n';
    const result = textFile('it.csv', csv);
    expect(result.data.Imported?.[0]).toMatchObject({ word: 'ciao', meaning: 'hello' });
  });

  it('rejects a table with no word column', () => {
    expect(() => textFile('notes.csv', 'note,detail\nhello,world\n')).toThrow(VocabularyImportError);
    expect(() => textFile('notes.csv', 'note,detail\nhello,world\n')).toThrow(/word column/);
  });

  it('rejects an empty file and an unsupported type', () => {
    expect(() => textFile('empty.csv', '')).toThrow(/empty/i);
    expect(() => textFile('words.txt', 'word,meaning\nhi,hello\n')).toThrow(/Unsupported file type/);
  });

  it('rejects a header-only spreadsheet', () => {
    expect(() => textFile('only.csv', 'word,meaning,example\n')).toThrow(/No vocabulary rows/);
  });

  it('parses a JSON list and a category map', () => {
    const list = JSON.stringify([
      { word: 'keen', meaning: 'eager', example: 'She is keen to start.' },
    ]);
    expect(textFile('list.json', list).data.Imported?.[0].word).toBe('keen');

    const grouped = JSON.stringify({
      travel: [{ word: 'gate', meaning: 'airport exit', example: 'The gate is closed.' }],
    });
    const groupedResult = textFile('groups.json', grouped);
    expect(groupedResult.source).toBe('json');
    expect(groupedResult.data.travel?.[0].word).toBe('gate');
  });

  it('explains invalid JSON', () => {
    expect(() => textFile('bad.json', '{')).toThrow(/JSON file could not be read/);
  });

  it('parses an Excel workbook and skips duplicate words', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['word', 'meaning', 'example', 'category'],
      ['alpha', 'first', 'Alpha comes first.', 'demo'],
      ['alpha', 'first again', 'Duplicate.', 'demo'],
      ['beta', 'second', 'Beta follows.', 'demo'],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
    const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

    const result = parseVocabularyFile('class.xlsx', bytes);
    expect(result.source).toBe('xlsx');
    expect(result.wordCount).toBe(2);
    expect(result.data.demo?.map((word) => word.word)).toEqual(['alpha', 'beta']);
    expect(result.warnings.some((warning) => warning.includes('duplicate'))).toBe(true);
  });

  it('uses the Excel sheet name when no category column exists', () => {
    const sheet = XLSX.utils.json_to_sheet([
      { Word: 'run into', Meaning: 'meet by chance', Example: 'I ran into an old friend.' },
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'phrasal verbs');
    const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const result = parseVocabularyFile('verbs.xlsx', bytes);
    expect(result.data['phrasal verbs']?.[0].word).toBe('run into');
  });
});
