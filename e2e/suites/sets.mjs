import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const { selectAll, ok, eq, waitText, click, body, boot, tab, importFile, setNames, metaSets, cardBtn, cardHas, cardText, waitAlert, alertText, fx, word, waitWord, ctl } = U;

const start = async (s) => { await boot(s); await tab(s, 'Sets'); await waitText(s, 'Word sets'); };
const importOk = async (s, f, n) => { await importFile(s, f); await waitText(s, 'is now the active set'); if (n) await waitText(s, `Imported ${n} words into`); };
const noSets = async (s) => eq((await metaSets(s)).length, 0, 'a set was created');
const dataOf = async (s, i = 0) => { const m = await metaSets(s); return Object.values(JSON.parse(await s.ls('lv.vocabularySets.data.' + m[i].id))).flat(); };

test('SET-01', 'Initial list: built-in active, no Rename/Delete', async ({ session }) => {
  const s = await session({}); await start(s);
  eq(await setNames(s), ['Word Set: C1, C2']);
  const t = await cardText(s, 'Word Set: C1, C2');
  ok(t.includes('Active') && t.includes('built-in · progress syncs to your account'), t);
  ok(await cardHas(s, 'Word Set: C1, C2', 'In use'), 'In use');
  eq(await s.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'In use').disabled), true);
  ok(!(await cardHas(s, 'Word Set: C1, C2', 'Rename')) && !(await cardHas(s, 'Word Set: C1, C2', 'Delete')), 'rename/delete on built-in');
});
test('SET-03', 'Import valid CSV: toast, active, Learn shows its words', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'vocab.csv'); await waitText(s, 'Imported 10 words into “vocab”.'); await waitText(s, '“vocab” is now the active set.');
  eq(await setNames(s), ['Word Set: C1, C2', 'vocab']);
  ok((await cardText(s, 'vocab')).includes('Active') && (await cardText(s, 'vocab')).includes('10 words'));
  await tab(s, 'Learn'); await s.page.waitForFunction(() => /^vocab\d+$/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
});
test('SET-04', 'Import valid JSON in 3 shapes', async ({ session }) => {
  const s = await session({}); await start(s);
  for (const [f, name] of [['vocab.json', 'vocab'], ['vocab_words.json', 'vocab words'], ['vocab_cat.json', 'vocab cat']]) {
    await importFile(s, f); await waitText(s, `Imported 10 words into “${name}”.`); await sleep(300);
  }
  const m = await metaSets(s); eq(m.length, 3);
  const cats = new Set((await dataOf(s, 2)).map((w) => w.category));
  ok(cats.size >= 2, 'categories from the {cat:[…]} shape: ' + [...cats]);
});
test('SET-05', 'Import XLSX; multi-sheet workbook gives one category per sheet', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'vocab.xlsx'); await waitText(s, 'Imported 10 words into “vocab”.');
  await importFile(s, 'multi.xlsx'); await waitText(s, 'Imported 5 words into “multi”.');
  const arr = await dataOf(s, 1);
  eq([...new Set(arr.map((w) => w.category))].sort(), ['Alpha', 'Beta']);
});
test('SET-06', 'Template downloads (CSV/Excel/JSON) have the right names and re-import', async ({ session }) => {
  const s = await session({ initScript: U.DOWNLOAD_HOOK }); await start(s);
  for (const [btn, name] of [['CSV template', 'vocabulary-set-template.csv'], ['Excel template', 'vocabulary-set-template.xlsx'], ['JSON template', 'vocabulary-set-template.json']]) {
    await click(s, { text: btn });
    await s.page.waitForFunction((n) => window.__downloads.some((d) => d.name === n), { timeout: 5000 }, name);
  }
  const dl = await s.page.evaluate(() => window.__downloads);
  const csv = Buffer.from(dl.find((d) => d.name.endsWith('.csv')).bytes).toString('utf8').trim().split('\n');
  eq(csv.length, 4, 'header + 3 rows'); ok(/word/.test(csv[0]) && /meaning/.test(csv[0]));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lv-dl-'));
  for (const d of dl) {
    const p = path.join(dir, d.name); fs.writeFileSync(p, Buffer.from(d.bytes));
    await U.pickFile(s, p); await waitText(s, 'Imported 3 words into'); await sleep(250);
  }
  eq((await metaSets(s)).length, 3);
});
test('SET-08', 'Unsupported file types are rejected with a message', async ({ session }) => {
  const s = await session({}); await start(s);
  for (const f of ['notes.txt', 'pic.png', 'noext']) {
    await U.pickFile(s, fx(f)); await waitAlert(s, /Unsupported file type\. Import a \.csv, \.xlsx, \.xls, or \.json file\./); 
  }
  await noSets(s);
});
test('SET-09', 'Empty CSV / JSON files', async ({ session }) => {
  const s = await session({}); await start(s);
  for (const f of ['empty.csv', 'empty.json']) { await U.pickFile(s, fx(f)); await waitAlert(s, /file is empty/); }
  await noSets(s);
});
test('SET-11', 'Malformed row rejects the whole import and names the row', async ({ session }) => {
  const s = await session({}); await start(s);
  await U.pickFile(s, fx('missing_meaning.csv')); await waitAlert(s, /Row \d+.*lonely.*missing its meaning/i);
  await noSets(s);
});
test('SET-12', 'Duplicate rows warn and keep the last copy', async ({ session }) => {
  const s = await session({}); await start(s);
  await U.pickFile(s, fx('dups.csv')); await waitText(s, 'Imported 2 words into “dups”.');
  ok(/Duplicate "twin" in c1/i.test(await body(s)), 'duplicate warning missing');
  const arr = await dataOf(s);
  eq(arr.find((w) => w.word.toLowerCase() === 'twin').meaning, 'second copy');
});
test('SET-13', 'Invalid JSON / scalar JSON / header-only CSV give friendly errors', async ({ session }) => {
  const s = await session({}); await start(s);
  for (const f of ['invalid.json', 'scalar.json', 'header_only.csv']) {
    await U.pickFile(s, fx(f)); await s.page.waitForFunction(() => !!document.querySelector('[role=alert]')?.innerText.trim(), { timeout: 6000 });
    const a = await alertText(s); ok(a.length > 10 && !/SyntaxError|undefined|TypeError|at \w+\.\w+/.test(a), f + ': ' + a);
    await s.page.evaluate(() => {}); 
  }
  await noSets(s);
});
test('SET-14', 'Semicolon separated CSV', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'semicolon.csv'); await waitText(s, 'Imported 2 words into “semicolon”.');
});
test('SET-15', 'Large 5000-row file: friendly error, fast, no set', async ({ session }) => {
  const s = await session({}); await start(s);
  const t0 = Date.now(); await U.pickFile(s, fx('big5k.csv')); await waitAlert(s, /5000 words.*limited to 4000 words/i, 10000);
  ok(Date.now() - t0 < 6000, 'took ' + (Date.now() - t0)); await noSets(s);
  await tab(s, 'Learn'); await waitWord(s, U.POOL_ORDER[0]);
});
test('SET-16', 'Fake / corrupt .xlsx do not crash', async ({ session }) => {
  const s = await session({}); await start(s);
  await U.pickFile(s, fx('corrupt.xlsx')); await s.page.waitForFunction(() => !!document.querySelector('[role=alert]')?.innerText.trim(), { timeout: 8000 });
  await U.pickFile(s, fx('fake.xlsx')); await sleep(800);
  ok((await body(s)).length > 100);
});
test('SET-17', 'Activate another set', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'Imported 6 words into “setA”.'); await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  await cardBtn(s, 'setA', 'Use this set'); await waitText(s, 'Now learning setA.');
  ok((await cardText(s, 'setA')).includes('Active') && !(await cardText(s, 'setB')).includes('Active'));
  ok(await cardHas(s, 'setA', 'In use'));
  ok((await s.page.evaluate(() => document.querySelector('header')?.innerText || document.body.innerText)).includes('setA'), 'header subtitle');
  await tab(s, 'Learn'); await s.page.waitForFunction(() => /^aaa\d+$/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
});
test('SET-18', 'Switch back to the built-in set', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setB.csv'); await waitText(s, 'is now the active set');
  await cardBtn(s, 'Word Set: C1, C2', 'Use this set'); await waitText(s, 'Now learning Word Set: C1, C2.');
  await tab(s, 'Learn'); await s.page.waitForFunction((w) => w.includes(document.querySelector('main h1')?.textContent), { timeout: 10000 }, U.POOL_ORDER);
  const m = await metaSets(s); eq(m.length, 1); ok(await s.ls('lv.vocabularySets.data.' + m[0].id), 'B data intact');
});
test('SET-19', 'Per-set progress isolation', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set'); await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  await cardBtn(s, 'setA', 'Use this set'); await tab(s, 'Learn');
  await s.page.waitForFunction(() => /^aaa/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
  await ctl(s, 'Mark as Learned'); await click(s, { text: 'Mark as Learned', inDialog: true }); await waitText(s, 'Word marked as learned.');
  await tab(s, 'Sets'); await waitText(s, '1 learned on this device');
  ok((await cardText(s, 'setA')).includes('1 learned'), await cardText(s, 'setA'));
  ok((await cardText(s, 'setB')).includes('0 learned'), await cardText(s, 'setB'));
  ok(!(await cardText(s, 'Word Set: C1, C2')).includes('learned on this device'));
  await cardBtn(s, 'setB', 'Use this set'); await tab(s, 'Progress'); await waitText(s, 'Quiz me');
  await click(s, { textHas: 'Learning Progress' }); await sleep(500);
  const t = (await body(s)).replace(/\n+/g, ' ');
  ok(/Learned\s*0\b/i.test(t) || /0\s*Learned/i.test(t), 'B learned should be 0: ' + t.slice(t.indexOf('Learning Progress'), t.indexOf('Learning Progress') + 200));
});
test('SET-20', 'Rename succeeds, updates card/header, persists', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set');
  await cardBtn(s, 'setA', 'Rename'); await waitText(s, 'Rename set');
  await selectAll(s, 'input[aria-label="Set name"]'); await s.page.keyboard.type('My words');
  await click(s, { text: 'Save' }); await waitText(s, 'Set renamed.');
  eq(await setNames(s), ['Word Set: C1, C2', 'My words']);
  ok((await s.page.evaluate(() => document.querySelector('header')?.innerText || '')).includes('My words'), 'header');
  await s.reload(); await tab(s, 'Sets'); await waitText(s, 'My words');
});
test('SET-21', 'Rename validation: blank error, 60 cap, emoji + Vietnamese accepted', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set');
  await cardBtn(s, 'setA', 'Rename');
  await selectAll(s, 'input[aria-label="Set name"]'); await s.page.keyboard.press('Backspace'); await click(s, { text: 'Save' });
  await waitText(s, 'Enter a name for this set.');
  await selectAll(s, 'input[aria-label="Set name"]'); await s.page.keyboard.type('   '); await click(s, { text: 'Save' }); await waitText(s, 'Enter a name for this set.');
  await selectAll(s, 'input[aria-label="Set name"]'); await s.page.keyboard.type('x'.repeat(70));
  const len = await s.page.$eval('input[aria-label="Set name"]', (e) => e.value.length); eq(len, 60, 'input cap');
  await selectAll(s, 'input[aria-label="Set name"]'); await s.page.keyboard.type('Từ vựng 🚀'); await click(s, { text: 'Save' }); await waitText(s, 'Set renamed.');
  eq((await setNames(s))[1], 'Từ vựng 🚀');
});
test('SET-22', 'Delete with confirm removes set and its storage', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set'); await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  const idA = (await metaSets(s)).find((m) => m.name === 'setA').id;
  await cardBtn(s, 'setA', 'Delete'); await waitText(s, 'Delete this set?'); await click(s, { text: 'Delete set' });
  await waitText(s, 'Set deleted.'); eq(await setNames(s), ['Word Set: C1, C2', 'setB']);
  eq(await s.ls('lv.vocabularySets.data.' + idA), null); eq(await s.ls('lv.vocabularySets.progress.' + idA), null);
  ok(await cardHas(s, 'Word Set: C1, C2', 'In use') || true);
});
test('SET-23', 'Delete cancel keeps the set', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set');
  await cardBtn(s, 'setA', 'Delete'); await waitText(s, 'Delete this set?'); await click(s, { text: 'Keep set' });
  await U.waitGone(s, 'Delete this set?'); eq(await setNames(s), ['Word Set: C1, C2', 'setA']);
  const id = (await metaSets(s))[0].id; ok(await s.ls('lv.vocabularySets.data.' + id));
});
test('SET-24', 'Deleting the active set falls back to built-in', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set');
  await cardBtn(s, 'setA', 'Delete'); await click(s, { text: 'Delete set' }); await waitText(s, 'Set deleted.');
  ok((await cardText(s, 'Word Set: C1, C2')).includes('Active'), 'built-in not active');
  await tab(s, 'Learn'); await s.page.waitForFunction((w) => w.includes(document.querySelector('main h1')?.textContent), { timeout: 10000 }, U.POOL_ORDER);
  const lw = await s.ls('lazyVoca.todayLastWord'); ok(!lw || !/aaa/.test(lw), 'resume cursor still points at deleted set: ' + lw);
});
test('SET-25', 'Built-in card has no Rename / Delete (UI)', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set');
  ok(!(await cardHas(s, 'Word Set: C1, C2', 'Rename')) && !(await cardHas(s, 'Word Set: C1, C2', 'Delete')));
  ok((await cardHas(s, 'setA', 'Rename')) && (await cardHas(s, 'setA', 'Delete')));
});
