import * as XLSX from 'xlsx';
import type { SheetData, VocabularyWord } from '@/types/vocabulary';
import type { ImportParseResult, ImportSource } from './types';

const MAX_WORDS = 4000;
const MAX_TEXT_CHARS = 3_500_000;
const MAX_ERRORS = 8;

const WORD_HEADERS = ['word', 'vocabulary', 'term', 'front'];
const MEANING_HEADERS = ['meaning', 'definition', 'def'];
const EXAMPLE_HEADERS = ['example', 'examples', 'sentence', 'usage'];
const TRANSLATION_HEADERS = ['translation', 'translate'];
const CATEGORY_HEADERS = ['category', 'sheet', 'topic', 'tag'];
const COUNT_HEADERS = ['count', 'frequency'];

const LIMITS = {
  word: 100,
  meaning: 500,
  example: 1000,
  translation: 500,
  category: 40,
};

function extensionOf(fileName: string): string {
  const base = fileName.trim().split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.slice(dot + 1).toLowerCase();
}

function nameFromFile(fileName: string): string {
  const base = (fileName.trim().split(/[/\\]/).pop() ?? 'Imported set').replace(/\.[^.]+$/, '');
  const cleaned = base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 60) || 'Imported set';
}

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function cleanText(value: unknown, max: number): string {
  if (value == null) return '';
  let text = '';
  for (const char of String(value)) {
    const code = char.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    text += char;
  }
  text = text.trim();
  return text.length > max ? text.slice(0, max) : text;
}

function findHeader(headers: string[], aliases: string[]): string | null {
  return headers.find((header) => aliases.includes(header)) ?? null;
}

function pushError(errors: string[], message: string) {
  if (errors.length < MAX_ERRORS) errors.push(message);
}

function finishErrors(errors: string[], extra: number): string[] {
  if (extra > 0) {
    errors.push(`${extra} more problem${extra === 1 ? '' : 's'} were hidden. Fix the rows above and import again.`);
  }
  return errors;
}

interface ColumnMap {
  word: string;
  meaning: string;
  example: string | null;
  translation: string | null;
  category: string | null;
  count: string | null;
  usedTranslationAsMeaning: boolean;
}

function mapColumns(headers: string[]): { map: ColumnMap | null; error: string | null } {
  const word = findHeader(headers, WORD_HEADERS);
  let meaning = findHeader(headers, MEANING_HEADERS);
  const translation = findHeader(headers, TRANSLATION_HEADERS);
  let usedTranslationAsMeaning = false;
  if (!meaning && translation) {
    meaning = translation;
    usedTranslationAsMeaning = true;
  }
  if (!word || !meaning) {
    return {
      map: null,
      error:
        'Missing required columns. The first row needs a word column (word, vocabulary, or term) and a meaning column (meaning or definition). Optional columns: example, translation, category.',
    };
  }
  return {
    map: {
      word,
      meaning,
      example: findHeader(headers, EXAMPLE_HEADERS),
      translation: usedTranslationAsMeaning ? null : translation,
      category: findHeader(headers, CATEGORY_HEADERS),
      count: findHeader(headers, COUNT_HEADERS),
      usedTranslationAsMeaning,
    },
    error: null,
  };
}

function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    const header = normalizeHeader(key);
    if (!header) return;
    const current = normalized[header];
    const currentEmpty = current == null || String(current).trim() === '';
    const nextEmpty = value == null || String(value).trim() === '';
    if (currentEmpty || !nextEmpty) normalized[header] = value;
  });
  return normalized;
}

function cell(row: Record<string, unknown>, header: string | null): unknown {
  if (!header) return '';
  if (header in row) return row[header];
  const match = Object.keys(row).find((key) => normalizeHeader(key) === header);
  return match ? row[match] : '';
}

function rowsToSheets(
  rows: Array<Record<string, unknown>>,
  headers: string[],
  fallbackCategory: string,
  warnings: string[]
): { sheets: SheetData | null; errors: string[] } {
  const { map, error } = mapColumns(headers);
  const errors: string[] = [];
  if (!map || error) {
    return { sheets: null, errors: [error ?? 'Missing required columns.'] };
  }
  if (map.usedTranslationAsMeaning) {
    warnings.push('No meaning column was found, so the translation column was used as the meaning.');
  }

  const sheets: SheetData = {};
  const seen = new Set<string>();
  let hidden = 0;
  let valid = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const word = cleanText(cell(row, map.word), LIMITS.word);
    const meaning = cleanText(cell(row, map.meaning), LIMITS.meaning);
    if (!word && !meaning) return;
    if (!word || !meaning) {
      if (errors.length < MAX_ERRORS) {
        pushError(errors, `Row ${rowNumber} needs both a word and a meaning.`);
      } else {
        hidden += 1;
      }
      return;
    }
    const example = cleanText(cell(row, map.example), LIMITS.example);
    const translation = cleanText(cell(row, map.translation), LIMITS.translation);
    const category =
      cleanText(cell(row, map.category), LIMITS.category) || fallbackCategory || 'imported';
    const countRaw = cell(row, map.count);
    const countNumber = typeof countRaw === 'number' ? countRaw : Number.parseInt(String(countRaw ?? ''), 10);
    const count = Number.isFinite(countNumber) && countNumber > 0 ? Math.min(countNumber, 1_000_000) : 0;
    const key = `${category.toLowerCase()}::${word.toLowerCase()}`;
    if (seen.has(key)) {
      warnings.push(`Duplicate "${word}" in ${category} — kept the last copy.`);
    }
    seen.add(key);
    const entry: VocabularyWord = {
      word,
      meaning,
      example,
      count,
      category,
      ...(translation ? { translation } : {}),
    };
    if (!sheets[category]) sheets[category] = [];
    const list = sheets[category];
    const existing = list.findIndex((item) => item.word.toLowerCase() === word.toLowerCase());
    if (existing >= 0) list[existing] = entry;
    else list.push(entry);
    valid += 1;
  });

  if (valid === 0) {
    if (errors.length === 0) {
      errors.push('No vocabulary rows found. Each row needs a word and a meaning.');
    }
    return { sheets: null, errors: finishErrors(errors, hidden) };
  }
  if (valid > MAX_WORDS) {
    return {
      sheets: null,
      errors: [`This file has ${valid} words. Imports are limited to ${MAX_WORDS} words so the set can be stored on the device.`],
    };
  }
  if (errors.length > 0) {
    return { sheets: null, errors: finishErrors(errors, hidden) };
  }
  return { sheets, errors: [] };
}

function parseDelimited(text: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    if (char === '\r') continue;
    field += char;
  }
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function detectDelimiter(headerLine: string): ',' | ';' | '\t' {
  if (headerLine.includes('"')) return ',';
  const commas = (headerLine.match(/,/g) ?? []).length;
  const semis = (headerLine.includes(';') ? headerLine.split(';').length - 1 : 0);
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  if (tabs > commas && tabs >= semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

function parseCsv(text: string, warnings: string[]): ImportParseResult | { sheets: SheetData } {
  const headerLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const table = parseDelimited(text, detectDelimiter(headerLine));
  if (table.length === 0) {
    return { ok: false, errors: ['The CSV file is empty.'] };
  }
  const headers = table[0].map((header) => normalizeHeader(header));
  if (headers.every((header) => header === '')) {
    return { ok: false, errors: ['The CSV file needs a header row.'] };
  }
  const records = table.slice(1).map((values) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = values[index] ?? '';
    });
    return record;
  });
  const converted = rowsToSheets(records, headers, 'imported', warnings);
  if (!converted.sheets) return { ok: false, errors: converted.errors };
  return { sheets: converted.sheets };
}

function parseJson(text: string, warnings: string[]): { sheets: SheetData } | ImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This file is not valid JSON.'] };
  }

  if (Array.isArray(parsed)) {
    return recordsFromUnknownList(parsed, 'imported', warnings);
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      errors: ['JSON must be a list of words, or an object with a words array, or category names mapped to word lists.'],
    };
  }

  const record = parsed as Record<string, unknown>;
  if (Array.isArray(record.words)) {
    return recordsFromUnknownList(record.words, 'imported', warnings);
  }

  const entries = Object.entries(record).filter(([, value]) => Array.isArray(value));
  if (entries.length === 0) {
    return {
      ok: false,
      errors: [
        'JSON must be a list of words, { "words": [ ... ] }, or { "category name": [ { "word": "...", "meaning": "..." } ] }.',
      ],
    };
  }

  const sheets: SheetData = {};
  const errors: string[] = [];
  for (const [category, value] of entries) {
    const converted = recordsFromUnknownList(value as unknown[], category, warnings);
    if ('ok' in converted && converted.ok === false) {
      errors.push(...converted.errors.map((message) => `${category}: ${message}`));
      continue;
    }
    if ('sheets' in converted) {
      for (const [name, words] of Object.entries(converted.sheets)) {
        sheets[name] = [...(sheets[name] ?? []), ...words];
      }
    }
  }
  const wordCount = Object.values(sheets).reduce((sum, words) => sum + words.length, 0);
  if (wordCount === 0) {
    return {
      ok: false,
      errors: errors.length > 0 ? errors.slice(0, MAX_ERRORS) : ['No vocabulary rows found in the JSON file.'],
    };
  }
  if (errors.length > 0) {
    return { ok: false, errors: errors.slice(0, MAX_ERRORS) };
  }
  if (wordCount > MAX_WORDS) {
    return {
      ok: false,
      errors: [`This file has ${wordCount} words. Imports are limited to ${MAX_WORDS} words so the set can be stored on the device.`],
    };
  }
  return { sheets };
}

function recordsFromUnknownList(
  value: unknown[],
  fallbackCategory: string,
  warnings: string[]
): { sheets: SheetData } | ImportParseResult {
  if (value.length === 0) {
    return { ok: false, errors: ['The word list is empty.'] };
  }
  const records: Array<Record<string, unknown>> = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, errors: ['Each JSON word must be an object with word and meaning fields.'] };
    }
    records.push(normalizeRowKeys(item as Record<string, unknown>));
  }
  const headers = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  const converted = rowsToSheets(records, headers, fallbackCategory, warnings);
  if (!converted.sheets) return { ok: false, errors: converted.errors };
  return { sheets: converted.sheets };
}

function parseWorkbook(data: ArrayBuffer | Uint8Array, warnings: string[]): { sheets: SheetData } | ImportParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: 'array' });
  } catch {
    return { ok: false, errors: ['This Excel file could not be read. Export it again as .xlsx and try once more.'] };
  }
  if (!workbook.SheetNames.length) {
    return { ok: false, errors: ['The Excel file has no sheets.'] };
  }

  const sheets: SheetData = {};
  const errors: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
    if (rows.length === 0) continue;
    const normalizedRows = rows.map((row) => normalizeRowKeys(row));
    const headers = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row))));
    const category = cleanText(sheetName, LIMITS.category) || 'imported';
    const converted = rowsToSheets(normalizedRows, headers, category, warnings);
    if (!converted.sheets) {
      errors.push(...converted.errors.map((message) => `Sheet "${sheetName}": ${message}`));
      continue;
    }
    for (const [name, words] of Object.entries(converted.sheets)) {
      sheets[name] = [...(sheets[name] ?? []), ...words];
    }
  }

  const wordCount = Object.values(sheets).reduce((sum, words) => sum + words.length, 0);
  if (wordCount === 0) {
    return {
      ok: false,
      errors: errors.length
        ? errors.slice(0, MAX_ERRORS)
        : ['No vocabulary rows found. Each sheet needs a header row with word and meaning columns.'],
    };
  }
  if (errors.length > 0) return { ok: false, errors: errors.slice(0, MAX_ERRORS) };
  if (wordCount > MAX_WORDS) {
    return {
      ok: false,
      errors: [`This file has ${wordCount} words. Imports are limited to ${MAX_WORDS} words so the set can be stored on the device.`],
    };
  }
  return { sheets };
}

function success(fileName: string, sheets: SheetData, warnings: string[]): ImportParseResult {
  const wordCount = Object.values(sheets).reduce((sum, words) => sum + words.length, 0);
  const uniqueWarnings = Array.from(new Set(warnings)).slice(0, 6);
  return {
    ok: true,
    nameSuggestion: nameFromFile(fileName),
    sheets,
    wordCount,
    warnings: uniqueWarnings,
  };
}

/**
 * Parse a user vocabulary file into sheet data.
 * Supports CSV, Excel (.xlsx/.xls), and JSON. Pure enough to unit test without a DOM.
 */
export function parseVocabularyImport(source: ImportSource): ImportParseResult {
  const extension = extensionOf(source.fileName);
  if (!['csv', 'xlsx', 'xls', 'json'].includes(extension)) {
    return {
      ok: false,
      errors: ['Unsupported file type. Import a .csv, .xlsx, .xls, or .json file.'],
    };
  }

  const warnings: string[] = [];

  if (extension === 'xlsx' || extension === 'xls') {
    if (!source.data) {
      return { ok: false, errors: ['The Excel file was empty.'] };
    }
    const parsed = parseWorkbook(source.data, warnings);
    if ('ok' in parsed && parsed.ok === false) return parsed;
    if (!('sheets' in parsed)) return { ok: false, errors: ['The Excel file could not be read.'] };
    return success(source.fileName, parsed.sheets, warnings);
  }

  const text = source.text ?? '';
  if (!text.trim()) {
    return { ok: false, errors: ['The file is empty.'] };
  }
  if (text.length > MAX_TEXT_CHARS) {
    return {
      ok: false,
      errors: ['This file is too large to import on a phone. Split it into a smaller set and try again.'],
    };
  }

  const parsed = extension === 'csv' ? parseCsv(text, warnings) : parseJson(text, warnings);
  if ('ok' in parsed && parsed.ok === false) return parsed;
  if (!('sheets' in parsed)) return { ok: false, errors: ['The file could not be read.'] };
  return success(source.fileName, parsed.sheets, warnings);
}
