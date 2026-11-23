import JSON2CSVParser from '@json2csv-parser';
import * as XLSX from 'xlsx';
import { DEFAULT_CATEGORY, KNOWN_CATEGORIES, WORD_LIMITS } from './wordValidation';

export const SAMPLE_TEMPLATE_ROWS = [
  {
    word: 'give up',
    meaning: 'to stop trying',
    example: 'Do not give up when a new word feels hard.',
    translation: 'bỏ cuộc',
    category: 'phrasal verbs',
  },
  {
    word: 'break the ice',
    meaning: 'to make people feel more comfortable',
    example: 'A short story can break the ice in class.',
    translation: 'phá vỡ sự ngại ngùng',
    category: 'idioms',
  },
  {
    word: 'spare',
    meaning: 'extra; available to use',
    example: 'I review new words in my spare time.',
    translation: 'rảnh, thừa',
    category: 'topic vocab',
  },
];

/** Plain-language notes shipped inside every template, for people (or tools) preparing a file. */
export const TEMPLATE_NOTES: string[] = [
  'word (required): the word or phrase, up to ' + WORD_LIMITS.word + ' characters.',
  'meaning (required): the definition, up to ' + WORD_LIMITS.meaning + ' characters.',
  'example (optional): an example sentence, up to ' + WORD_LIMITS.example + ' characters.',
  'translation (optional): your own translation in ANY language or script, up to ' + WORD_LIMITS.translation + ' characters.',
  'category (optional, up to ' + WORD_LIMITS.category + ' characters): a group name. Known values: ' +
    KNOWN_CATEGORIES.join(' | ') +
    '. Any other text is kept as your own custom category. If blank, the Excel sheet name is used, otherwise "' +
    DEFAULT_CATEGORY +
    '".',
  'Save the file as UTF-8 so every language displays correctly. Lines starting with # in CSV are ignored.',
];

/** Sheet name used for the notes in the Excel template. The importer skips it. */
export const NOTES_SHEET_NAME = 'readme';

const FIELDS = ['word', 'meaning', 'example', 'translation', 'category'] as const;

/**
 * CSV template produced with json2csv. Import the parser file directly so the
 * browser bundle does not pull the package's Node stream helpers, whose
 * published "module" entry is missing.
 */
export function buildSampleCsv(): string {
  const parser = new JSON2CSVParser({ fields: [...FIELDS], eol: '\n' });
  const notes = TEMPLATE_NOTES.map((line) => `# ${line}`).join('\n');
  return `${notes}\n${parser.parse(SAMPLE_TEMPLATE_ROWS)}`;
}

/** Excel template produced with the xlsx package. One sheet named "words". */
export function buildSampleXlsx(): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(
    SAMPLE_TEMPLATE_ROWS.map((row) => ({
      word: row.word,
      meaning: row.meaning,
      example: row.example,
      translation: row.translation,
      category: row.category,
    }))
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'words');
  const notes = XLSX.utils.aoa_to_sheet([['notes'], ...TEMPLATE_NOTES.map((line) => [line])]);
  XLSX.utils.book_append_sheet(book, notes, NOTES_SHEET_NAME);
  const output = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return output;
}

export function buildSampleJson(): string {
  return `${JSON.stringify({ name: 'Sample set', notes: TEMPLATE_NOTES, words: SAMPLE_TEMPLATE_ROWS }, null, 2)}\n`;
}
