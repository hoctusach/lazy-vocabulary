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

/** Built-in group names, exact strings (same as the C1, C2 groups). [FB-44] */
export const BUILTIN_CATEGORY_NAMES = [
  'topic vocab',
  'phrasal verbs',
  'idioms',
  'grammar',
  'phrases, collocations',
  'word formation',
] as const;

/** Sheet names the Excel importer ignores (documentation only). */
export const HELP_SHEET_NAMES = ['readme', '_help'];

/** Short help lines shown on the Library screen (one per line) and in the Excel example file. [FB-44][FB-60] */
export const CATEGORY_HELP_LINES: string[] = [
  'Required columns: word, meaning',
  'Optional: example, translation, category',
  'Categories: topic vocab, phrasal verbs, idioms, grammar, phrases, collocations, word formation',
  'Other category names make their own group. Blank means imported.',
];

/** Extra note that only makes sense inside the Excel file. */
const XLSX_EXTRA_NOTES: string[] = ['No category column? The sheet name is used as the category.'];

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
  // Help sheet: skipped by the importer (see HELP_SHEET_NAMES).
  const help = XLSX.utils.aoa_to_sheet([['Notes'], ...[...CATEGORY_HELP_LINES, ...XLSX_EXTRA_NOTES].map((line) => [line])]);
  XLSX.utils.book_append_sheet(book, help, 'README');
  const output = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return output;
}
