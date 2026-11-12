import * as XLSX from 'xlsx';
import { SAMPLE_CSV } from './constants';
import { saveBinaryFile, saveTextFile } from '@/lib/native/saveTextFile';

export async function downloadSampleCsv(): Promise<void> {
  await saveTextFile('vocabulary-template.csv', SAMPLE_CSV, 'text/csv;charset=utf-8');
}

export async function downloadSampleXlsx(): Promise<void> {
  const rows = SAMPLE_CSV.trim().split('\n').map((line) => {
    const [word, meaning, example, category, translation] = splitCsvLine(line);
    return { word, meaning, example, category, translation };
  });
  const header = rows.shift();
  if (!header) return;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'vocabulary');
  const bytes = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  await saveBinaryFile(
    'vocabulary-template.xlsx',
    new Uint8Array(bytes),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}
