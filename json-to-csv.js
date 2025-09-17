import { parse } from 'json2csv';
import fs from 'fs';
import path from 'path';

const inputPath = path.resolve('./public/defaultVocabulary.json');
const outputPath = path.resolve('./public/defaultVocabulary.csv');

try {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const rows = [];

  // Add category field
  for (const category in raw) {
    raw[category].forEach(entry => {
      rows.push({
        category, // add parent key as a column
        ...entry
      });
    });
  }

  const csv = parse(rows, {
    fields: ['category', 'word', 'meaning', 'example', 'translation', 'count'],
  });

  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log(`✅ CSV file created: ${outputPath}`);
} catch (err) {
  console.error('Error converting JSON to CSV:', err);
}
