// Generates every import fixture used by the E2E suite. Never edit the outputs by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const w = (name, data) => fs.writeFileSync(path.join(DIR, name), data);
const csvEsc = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const toCsv = (rows, cols = ['word', 'meaning', 'example', 'translation', 'category']) =>
  [cols.join(','), ...rows.map((r) => cols.map((c) => csvEsc(r[c] ?? '')).join(','))].join('\n') + '\n';

const mk = (prefix, n, cats = ['alpha', 'beta']) => Array.from({ length: n }, (_, i) => ({
  word: `${prefix}${i + 1}`, meaning: `meaning of ${prefix}${i + 1}`, example: `Example sentence for ${prefix}${i + 1}.`,
  translation: `nghĩa ${i + 1}`, category: cats[i % cats.length],
}));

export function generate() {
  const ten = mk('vocab', 10);
  w('vocab.csv', toCsv(ten));
  w('vocab.json', JSON.stringify(ten, null, 2));
  w('vocab_words.json', JSON.stringify({ name: 'wrapped', words: ten }));
  const byCat = {};
  for (const r of ten) (byCat[r.category] ||= []).push({ word: r.word, meaning: r.meaning, example: r.example });
  w('vocab_cat.json', JSON.stringify(byCat));
  const sheet = (rows) => XLSX.utils.json_to_sheet(rows.map(({ category, ...r }) => r));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(ten), 'words');
  XLSX.writeFile(book, path.join(DIR, 'vocab.xlsx'));
  const multi = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(multi, sheet(mk('sheeta', 3)), 'Alpha');
  XLSX.utils.book_append_sheet(multi, sheet(mk('sheetb', 2)), 'Beta');
  XLSX.writeFile(multi, path.join(DIR, 'multi.xlsx'));

  w('notes.txt', 'just some notes\n');
  w('pic.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
  w('noext', 'word,meaning\nfoo,bar\n');
  w('empty.csv', '');
  w('empty.json', '');
  w('missing_meaning.csv', 'word,meaning,example\nfirst,the first one,ex one\nsecond,the second one,ex two\nlonely,,ex three\nfourth,the fourth,ex four\n');
  w('dups.csv', 'word,meaning,category\nTwin,first copy,c1\ntwin,second copy,c1\nsolo,only one,c1\n');
  w('big5k.csv', toCsv(mk('big', 5000)));
  w('invalid.json', '{oops');
  w('scalar.json', '42');
  w('fake.xlsx', toCsv(ten));
  w('corrupt.xlsx', Buffer.from('PK\u0003\u0004 not really a zip file at all'));
  w('header_only.csv', 'word,meaning\n');
  w('semicolon.csv', 'word;meaning;example\ngamma;third letter;The gamma ray.\ndelta;fourth letter;A river delta.\n');

  w('long_words.csv', toCsv([
    { word: 'x'.repeat(100), meaning: 'm'.repeat(500), example: ('long example ' ).repeat(77).slice(0, 1000), translation: 't'.repeat(100), category: 'long' },
    { word: 'normal', meaning: 'a normal meaning', example: 'A normal example.', translation: '', category: 'long' },
    { word: 'other', meaning: 'another meaning', example: 'Another example.', translation: '', category: 'long' },
    { word: 'fourth', meaning: 'fourth meaning', example: 'Fourth example.', translation: '', category: 'long' },
  ]));
  w('xss.json', JSON.stringify([
    { word: '<img src=x onerror=window.__xss=1>', meaning: '<script>window.__xss=2</script>meaning', example: '<b onmouseover=window.__xss=3>ex</b>', category: 'xss' },
    { word: 'safe', meaning: 'plain meaning', example: 'plain example', category: 'xss' },
    { word: 'safe two', meaning: 'plain meaning two', example: 'plain example two', category: 'xss' },
    { word: 'safe three', meaning: 'plain meaning three', example: 'plain example three', category: 'xss' },
  ]));
  w('unicode.csv', toCsv([
    { word: 'bỏ cuộc', meaning: 'to give up', example: 'Đừng bỏ cuộc.', translation: 'từ bỏ', category: 'viet' },
    { word: 'Đà Nẵng', meaning: 'a city in Vietnam', example: 'Tôi sống ở Đà Nẵng.', translation: '', category: 'viet' },
    { word: 'rocket 🚀', meaning: 'launch vehicle', example: 'The rocket 🚀 launched.', translation: '', category: 'viet' },
    { word: 'café', meaning: 'a small restaurant', example: 'A café nearby.', translation: '', category: 'viet' },
  ]));
  // Two small distinct sets for isolation tests, and one named like the built-in.
  w('setA.csv', toCsv(mk('aaa', 6)));
  w('setB.csv', toCsv(mk('bbb', 6)));
  w('Word_Set_Sixty_characters_long_name_for_the_header_overflow_test_x.csv', toCsv(mk('lng', 4)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { generate(); console.log('fixtures generated in', DIR); }
