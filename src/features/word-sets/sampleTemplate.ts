import JSON2CSVParser from '@json2csv-parser';
import * as XLSX from 'xlsx';

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

const FIELDS = ['word', 'meaning', 'example', 'translation', 'category'] as const;

/**
 * CSV template produced with json2csv. Import the parser file directly so the
 * browser bundle does not pull the package's Node stream helpers, whose
 * published "module" entry is missing.
 */
export function buildSampleCsv(): string {
  const parser = new JSON2CSVParser({ fields: [...FIELDS], eol: '\n' });
  return parser.parse(SAMPLE_TEMPLATE_ROWS);
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
  const output = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return output;
}

export function buildSampleJson(): string {
  return `${JSON.stringify({ name: 'Sample set', words: SAMPLE_TEMPLATE_ROWS }, null, 2)}\n`;
}
