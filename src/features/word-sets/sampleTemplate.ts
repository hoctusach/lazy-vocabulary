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

/** Built-in group names, exact strings (same as the Word Set groups). [FB-44] */
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

/** Plain-language notes shown next to the template buttons and embedded in the JSON/XLSX templates. */
export const CATEGORY_HELP_LINES: string[] = [
  'Required columns/fields: word, meaning. Optional: example, translation, category.',
  `category: the built-in group names are exactly: ${BUILTIN_CATEGORY_NAMES.map((n) => `"${n}"`).join(', ')}.`,
  'Any other category text is also accepted: it becomes its own group inside your imported set, so a tool that needs a custom group is not stuck.',
  'A blank category falls back to "imported". In an Excel file without a category column, the sheet name is the category.',
  'Keep text as plain UTF-8 (any language). CSV has no comments, so this note lives here and in the JSON/Excel templates.',
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
  // Help sheet: skipped by the importer (see HELP_SHEET_NAMES).
  const help = XLSX.utils.aoa_to_sheet([['Notes'], ...CATEGORY_HELP_LINES.map((line) => [line])]);
  XLSX.utils.book_append_sheet(book, help, 'README');
  const output = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return output;
}

export function buildSampleJson(): string {
  // JSON has no comments: `_help` is a documentation-only field the importer ignores.
  return `${JSON.stringify({ name: 'Sample set', _help: CATEGORY_HELP_LINES, words: SAMPLE_TEMPLATE_ROWS }, null, 2)}\n`;
}
