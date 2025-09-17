import { parse } from 'json2csv';
import fs from 'fs';
import path from 'path';

const inputPath = path.resolve('./public/defaultVocabulary.json');
const outputPath = path.resolve('./public/defaultVocabulary4.csv');

try {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const rows = [];
  const wordCounter = {}; // Track duplicates

  for (const category in raw) {
    raw[category].forEach(entry => {
      let word = entry.word?.trim() || '';

      // Normalize for duplicate detection (case-insensitive)
      const key = word.toLowerCase();

      if (wordCounter[key] === undefined) {
        wordCounter[key] = 1;
      } else {
        wordCounter[key] += 1;
        word = `${word} ${wordCounter[key]}`; // e.g., "apply 2"
      }

      rows.push({
        category,
        word,
        meaning: entry.meaning,
        example: entry.example,
        translation: entry.translation,
        count: entry.count
      });
    });
  }

  const csv = parse(rows, {
    fields: ['category', 'word', 'meaning', 'example', 'translation', 'count'],
    quote: '"',
    escapedQuote: '""'
  });

  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log(`✅ CSV file created with renamed duplicates: ${outputPath}`);
} catch (err) {
  console.error('Error converting JSON to CSV:', err);
}
