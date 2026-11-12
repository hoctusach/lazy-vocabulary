import * as XLSX from 'xlsx';
import type { SheetData, VocabularyWord } from '@/types/vocabulary';
import { MAX_IMPORT_BYTES, MAX_IMPORT_WORDS } from './constants';
import type { VocabularyParseResult, WordSetSource } from './types';

export class VocabularyImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VocabularyImportError';
  }
}

const WORD_KEYS = ['word', 'vocabulary', 'term', 'phrase', 'expression', 'english'];
const MEANING_KEYS = ['meaning', 'definition', 'gloss', 'definition_en'];
const EXAMPLE_KEYS = ['example', 'examples', 'sentence', 'usage', 'sample'];
const CATEGORY_KEYS = ['category', 'sheet', 'topic', 'group', 'type', 'tag'];
const TRANSLATION_KEYS = ['translation', 'translate', 'vietnamese', 'meaning_vi', 'vi'];
const COUNT_KEYS = ['count', 'views', 'frequency'];

type RawRow = Record<string, unknown>;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : '';
}

function sourceForExtension(ext: string): Exclude<WordSetSource, 'builtin'> {
  if (ext === 'json') return 'json';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  return 'csv';
}

function asText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

function lookup(row: RawRow, keys: string[]): string {
  const entries = Object.keys(row).map((key) => [normalizeHeader(key), key] as const);
  for (const alias of keys) {
    const found = entries.find(([normalized]) => normalized === alias);
    if (found) return asText(row[found[1]]);
  }
  return '';
}

function columnPresent(rows: RawRow[], keys: string[]): boolean {
  return rows.some((row) => Object.keys(row).some((header) => keys.includes(normalizeHeader(header))));
}

function rowToWord(row: RawRow, fallbackCategory: string): VocabularyWord | null {
  const word = lookup(row, WORD_KEYS);
  if (!word) return null;
  const category = lookup(row, CATEGORY_KEYS) || fallbackCategory;
  const countRaw = lookup(row, COUNT_KEYS);
  const count = countRaw ? Number.parseInt(countRaw, 10) || 0 : 0;
  return {
    word,
    meaning: lookup(row, MEANING_KEYS),
    example: lookup(row, EXAMPLE_KEYS),
    translation: lookup(row, TRANSLATION_KEYS),
    category,
    count,
  };
}

function addWord(sheets: SheetData, word: VocabularyWord, seen: Set<string>): 'added' | 'duplicate' {
  const category = word.category?.trim() || 'Imported';
  const key = `${category.toLowerCase()}::${word.word.toLowerCase()}`;
  if (seen.has(key)) return 'duplicate';
  seen.add(key);
  if (!sheets[category]) sheets[category] = [];
  sheets[category].push({ ...word, category });
  return 'added';
}

function sheetsFromRows(rows: RawRow[], fallbackCategory: string): { data: SheetData; wordCount: number; missingMeaning: number; duplicates: number } {
  if (!columnPresent(rows, WORD_KEYS)) {
    throw new VocabularyImportError(
      'Could not find a word column. Add a header named word (term, vocabulary, or phrase also work).'
    );
  }

  const data: SheetData = {};
  const seen = new Set<string>();
  let wordCount = 0;
  let missingMeaning = 0;
  let duplicates = 0;

  for (const row of rows) {
    const word = rowToWord(row, fallbackCategory);
    if (!word) continue;
    if (!word.meaning) missingMeaning += 1;
    const outcome = addWord(data, word, seen);
    if (outcome === 'duplicate') {
      duplicates += 1;
      continue;
    }
    wordCount += 1;
    if (wordCount > MAX_IMPORT_WORDS) {
      throw new VocabularyImportError(
        `This file has more than ${MAX_IMPORT_WORDS.toLocaleString()} words. Split it into smaller sets.`
      );
    }
  }

  if (wordCount === 0) {
    throw new VocabularyImportError('No vocabulary rows found. Each row needs a word.');
  }

  return { data, wordCount, missingMeaning, duplicates };
}

function fallbackCategory(sheetName: string): string {
  const trimmed = sheetName.trim();
  if (!trimmed || /^sheet\d*$/i.test(trimmed)) return 'Imported';
  return trimmed;
}

function warningsFor(missingMeaning: number, duplicates: number): string[] {
  const warnings: string[] = [];
  if (missingMeaning > 0) {
    warnings.push(
      `${missingMeaning} ${missingMeaning === 1 ? 'row has' : 'rows have'} a word but no meaning. ${missingMeaning === 1 ? 'It was' : 'They were'} still imported.`
    );
  }
  if (duplicates > 0) {
    warnings.push(
      `${duplicates} duplicate ${duplicates === 1 ? 'word was' : 'words were'} skipped. The first one in each category is kept.`
    );
  }
  return warnings;
}

function readTable(bytes: ArrayBuffer | string, filename: string): XLSX.WorkBook {
  const ext = extensionOf(filename);
  try {
    if (typeof bytes === 'string' || ext === 'csv' || ext === 'tsv') {
      const text = typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes);
      const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
      let FS = ',';
      if (ext === 'tsv') FS = '\t';
      else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) FS = ';';
      return XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string', FS });
    }
    return XLSX.read(bytes, { type: 'array' });
  } catch {
    throw new VocabularyImportError(
      ext === 'csv' || ext === 'tsv'
        ? 'This CSV file could not be read. Check that the first row is a header.'
        : 'This Excel file could not be read. Export it again as .xlsx or CSV.'
    );
  }
}

function parseWorkbook(workbook: XLSX.WorkBook): { data: SheetData; wordCount: number; warnings: string[] } {
  if (!workbook.SheetNames.length) {
    throw new VocabularyImportError('This file has no sheets.');
  }

  const combined: SheetData = {};
  const seen = new Set<string>();
  let wordCount = 0;
  let missingMeaning = 0;
  let duplicates = 0;
  let usedSheets = 0;
  let sawRows = false;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: false });
    if (!rows.length) continue;
    sawRows = true;
    if (!columnPresent(rows, WORD_KEYS)) {
      if (workbook.SheetNames.length === 1) {
        throw new VocabularyImportError(
          'Could not find a word column. Add a header named word (term, vocabulary, or phrase also work).'
        );
      }
      continue;
    }
    usedSheets += 1;
    for (const row of rows) {
    const word = rowToWord(row, fallbackCategory(sheetName));
      if (!word) continue;
      if (!word.meaning) missingMeaning += 1;
      const outcome = addWord(combined, word, seen);
      if (outcome === 'duplicate') {
        duplicates += 1;
        continue;
      }
      wordCount += 1;
      if (wordCount > MAX_IMPORT_WORDS) {
        throw new VocabularyImportError(
          `This file has more than ${MAX_IMPORT_WORDS.toLocaleString()} words. Split it into smaller sets.`
        );
      }
    }
  }

  if (usedSheets === 0) {
    throw new VocabularyImportError(
      sawRows
        ? 'Could not find a word column. Add a header named word (term, vocabulary, or phrase also work).'
        : 'No vocabulary rows found. Each row needs a word.'
    );
  }
  if (wordCount === 0) {
    throw new VocabularyImportError('No vocabulary rows found. Each row needs a word.');
  }

  return { data: combined, wordCount, warnings: warningsFor(missingMeaning, duplicates) };
}

function isWordRow(value: unknown): value is RawRow {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonValue(value: unknown): { data: SheetData; wordCount: number; warnings: string[] } {
  if (Array.isArray(value)) {
    const rows = value.filter(isWordRow);
    const parsed = sheetsFromRows(rows, 'Imported');
    return { data: parsed.data, wordCount: parsed.wordCount, warnings: warningsFor(parsed.missingMeaning, parsed.duplicates) };
  }

  if (!value || typeof value !== 'object') {
    throw new VocabularyImportError(
      'This JSON file should be a list of words, or an object whose values are lists of words.'
    );
  }

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.words) || Array.isArray(record.items)) {
    return parseJsonValue(record.words ?? record.items);
  }

  const arrayEntries = Object.entries(record).filter(([, entry]) => Array.isArray(entry));
  if (!arrayEntries.length) {
    throw new VocabularyImportError(
      'This JSON file should be a list of { word, meaning, example } objects, or categories mapped to those lists.'
    );
  }

  const data: SheetData = {};
  const seen = new Set<string>();
  let wordCount = 0;
  let missingMeaning = 0;
  let duplicates = 0;

  for (const [category, entry] of arrayEntries) {
    for (const item of entry as unknown[]) {
      if (!isWordRow(item)) continue;
      const word = rowToWord(item, category);
      if (!word) continue;
      if (!word.meaning) missingMeaning += 1;
      const outcome = addWord(data, word, seen);
      if (outcome === 'duplicate') {
        duplicates += 1;
        continue;
      }
      wordCount += 1;
      if (wordCount > MAX_IMPORT_WORDS) {
        throw new VocabularyImportError(
          `This file has more than ${MAX_IMPORT_WORDS.toLocaleString()} words. Split it into smaller sets.`
        );
      }
    }
  }

  if (wordCount === 0) {
    throw new VocabularyImportError('No vocabulary rows found. Each item needs a word.');
  }

  return { data, wordCount, warnings: warningsFor(missingMeaning, duplicates) };
}

function assertSize(bytes: ArrayBuffer | string): void {
  const size = typeof bytes === 'string' ? new TextEncoder().encode(bytes).byteLength : bytes.byteLength;
  if (size === 0) {
    throw new VocabularyImportError('The file is empty.');
  }
  if (size > MAX_IMPORT_BYTES) {
    throw new VocabularyImportError('File is larger than 10 MB. Split it into a smaller set.');
  }
}

/**
 * Parse a CSV, TSV, Excel, or JSON vocabulary file.
 * Accepts headers: word, meaning, example, category, translation, count.
 * Excel sheets become categories unless a category column is present.
 */
export function parseVocabularyFile(filename: string, bytes: ArrayBuffer | string): VocabularyParseResult {
  const ext = extensionOf(filename);
  if (!['csv', 'tsv', 'xlsx', 'xls', 'json'].includes(ext)) {
    throw new VocabularyImportError('Unsupported file type. Use CSV, Excel (.xlsx), or JSON.');
  }
  assertSize(bytes);

  if (ext === 'json') {
    const text = typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch {
      throw new VocabularyImportError(
        'This JSON file could not be read. Use a list of { word, meaning, example } objects.'
      );
    }
    const result = parseJsonValue(parsed);
    return { ...result, source: 'json' };
  }

  const workbook = readTable(bytes, filename);
  const result = parseWorkbook(workbook);
  return { ...result, source: sourceForExtension(ext) };
}

export function assertSupportedImport(filename: string, size: number): void {
  const ext = extensionOf(filename);
  if (!['csv', 'tsv', 'xlsx', 'xls', 'json'].includes(ext)) {
    throw new VocabularyImportError('Unsupported file type. Use CSV, Excel (.xlsx), or JSON.');
  }
  if (size <= 0) {
    throw new VocabularyImportError('The file is empty.');
  }
  if (size > MAX_IMPORT_BYTES) {
    throw new VocabularyImportError('File is larger than 10 MB. Split it into a smaller set.');
  }
}
