import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const { selectAll, ok, eq, waitText, click, body, boot, tab, importFile, setNames, metaSets, cardBtn, cardHas, cardText, waitAlert, alertText, fx, word, waitWord, ctl } = U;

const start = async (s) => { await boot(s); await tab(s, 'Sets'); await waitText(s, 'Word sets'); };
const importOk = async (s, f, n) => { await importFile(s, f); await waitText(s, 'was added to your selection'); if (n) await waitText(s, `Imported ${n} words into`); };
const noSets = async (s) => eq((await metaSets(s)).length, 0, 'a set was created');
const dataOf = async (s, i = 0) => { const m = await metaSets(s); return Object.values(JSON.parse(await s.ls('lv.vocabularySets.data.' + m[i].id))).flat(); };

test('SET-01', 'Initial list: built-in with six checked groups, no Rename/Delete', async ({ session }) => {
  const s = await session({}); await start(s);
  eq(await setNames(s), ['Word Set: C1, C2']);
  const t = await cardText(s, 'Word Set: C1, C2');
  ok(t.includes('6 of 6 groups selected') && t.includes('built-in · progress syncs to your account'), t);
  for (const g of ['topic vocab', 'phrasal verbs', 'idioms', 'grammar', 'phrases, collocations', 'word formation']) eq(await U.boxChecked(s, 'Include ' + g), true, g);
  eq(await U.boxChecked(s, 'Select all groups of Word Set: C1, C2'), true);
  ok(/Selected: 6 sets · [\d,]+ words/.test(await body(s)), 'summary');
  ok(!(await cardHas(s, 'Word Set: C1, C2', 'Rename')) && !(await cardHas(s, 'Word Set: C1, C2', 'Delete')), 'rename/delete on built-in');
});
test('SET-03', 'Import valid CSV: toast, active, Learn shows its words', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'vocab.csv'); await waitText(s, 'Imported 10 words into “vocab”.'); await waitText(s, '“vocab” was added to your selection.');
  eq(await setNames(s), ['Word Set: C1, C2', 'vocab']);
  ok((await cardText(s, 'vocab')).includes('Selected') && (await cardText(s, 'vocab')).includes('10 words'));
  await U.useOnly(s, 'vocab'); await tab(s, 'Learn'); await s.page.waitForFunction(() => /^vocab\d+$/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
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
test('SET-17', 'Select only one of two imported sets', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'Imported 6 words into “setA”.'); await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  ok((await cardText(s, 'setA')).includes('Selected') && (await cardText(s, 'setB')).includes('Selected'), 'import adds to the selection');
  await U.useOnly(s, 'setA');
  ok((await cardText(s, 'setA')).includes('Selected') && !(await cardText(s, 'setB')).includes('Selected'));
  ok((await s.page.evaluate(() => document.querySelector('header')?.innerText || document.body.innerText)).includes('setA'), 'header subtitle');
  await tab(s, 'Learn'); await s.page.waitForFunction(() => /^aaa\d+$/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
});
test('SET-18', 'Select only the built-in set again', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setB.csv'); await waitText(s, 'was added to your selection');
  await U.useOnly(s, null);
  await tab(s, 'Learn'); await s.page.waitForFunction((w) => w.includes(document.querySelector('main h1')?.textContent), { timeout: 10000 }, U.POOL_ORDER);
  const m = await metaSets(s); eq(m.length, 1); ok(await s.ls('lv.vocabularySets.data.' + m[0].id), 'B data intact');
});
test('SET-19', 'Per-set progress isolation', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  await U.useOnly(s, 'setA'); await tab(s, 'Learn');
  await s.page.waitForFunction(() => /^aaa/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
  await ctl(s, 'Mark as LEARNED'); await click(s, { text: 'Mark as Learned', inDialog: true }); await waitText(s, 'Word marked as learned.');
  await tab(s, 'Sets'); await waitText(s, '1 learned on this device');
  ok((await cardText(s, 'setA')).includes('1 learned'), await cardText(s, 'setA'));
  ok((await cardText(s, 'setB')).includes('0 learned'), await cardText(s, 'setB'));
  ok(!(await cardText(s, 'Word Set: C1, C2')).includes('learned on this device'));
  await U.useOnly(s, 'setB'); await tab(s, 'Progress'); await waitText(s, 'Quiz me');
  await click(s, { textHas: 'Learning Progress' }); await sleep(500);
  const t = (await body(s)).replace(/\n+/g, ' ');
  ok(/Learned\s*0\b/i.test(t) || /0\s*Learned/i.test(t), 'B learned should be 0: ' + t.slice(t.indexOf('Learning Progress'), t.indexOf('Learning Progress') + 200));
});
test('SET-20', 'Rename succeeds, updates card/header, persists', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.useOnly(s, 'setA');
  await cardBtn(s, 'setA', 'Rename'); await waitText(s, 'Rename set');
  await selectAll(s, 'input[aria-label="Set name"]'); await s.page.keyboard.type('My words');
  await click(s, { text: 'Save' }); await waitText(s, 'Set renamed.');
  eq(await setNames(s), ['Word Set: C1, C2', 'My words']);
  ok((await s.page.evaluate(() => document.querySelector('header')?.innerText || '')).includes('My words'), 'header');
  await s.reload(); await tab(s, 'Sets'); await waitText(s, 'My words');
});
test('SET-21', 'Rename validation: blank error, 60 cap, emoji + Vietnamese accepted', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection');
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
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  const idA = (await metaSets(s)).find((m) => m.name === 'setA').id;
  await cardBtn(s, 'setA', 'Delete'); await waitText(s, 'Delete this set?'); await click(s, { text: 'Delete set' });
  await waitText(s, 'Set deleted.'); eq(await setNames(s), ['Word Set: C1, C2', 'setB']);
  eq(await s.ls('lv.vocabularySets.data.' + idA), null); eq(await s.ls('lv.vocabularySets.progress.' + idA), null);
});
test('SET-23', 'Delete cancel keeps the set', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection');
  await cardBtn(s, 'setA', 'Delete'); await waitText(s, 'Delete this set?'); await click(s, { text: 'Keep set' });
  await U.waitGone(s, 'Delete this set?'); eq(await setNames(s), ['Word Set: C1, C2', 'setA']);
  const id = (await metaSets(s))[0].id; ok(await s.ls('lv.vocabularySets.data.' + id));
});
test('SET-24', 'Deleting the only selected set falls back to the built-in groups', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.useOnly(s, 'setA');
  await cardBtn(s, 'setA', 'Delete'); await click(s, { text: 'Delete set' }); await waitText(s, 'Set deleted.');
  ok((await cardText(s, 'Word Set: C1, C2')).includes('6 of 6 groups selected'), 'built-in not selected again');
  await tab(s, 'Learn'); await s.page.waitForFunction((w) => w.includes(document.querySelector('main h1')?.textContent), { timeout: 10000 }, U.POOL_ORDER);
  const lw = await s.ls('lazyVoca.todayLastWord'); ok(!lw || !/aaa/.test(lw), 'resume cursor still points at deleted set: ' + lw);
});
test('SET-25', 'Built-in card has no Rename / Delete (UI)', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection');
  ok(!(await cardHas(s, 'Word Set: C1, C2', 'Rename')) && !(await cardHas(s, 'Word Set: C1, C2', 'Delete')));
  ok((await cardHas(s, 'setA', 'Rename')) && (await cardHas(s, 'setA', 'Delete')));
});
test('SET-26', 'The last selected source cannot be unticked (message shown)', async ({ session }) => {
  const s = await session({}); await start(s);
  await U.mix(s, ['idioms']);
  await U.setBox(s, 'Include idioms', false); await waitText(s, 'Keep at least one set selected.');
  eq(await U.boxChecked(s, 'Include idioms'), true);
  eq(JSON.parse(await s.ls('lazyVoca.selectedSources.v1')), ['default:idioms']);
});
test('SET-27', 'Selection persists across a reload and is mixed with imported sets', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection');
  await U.mix(s, ['idioms', 'grammar'], ['setA']);
  await s.reload(); await tab(s, 'Sets'); await waitText(s, 'Word sets');
  const id = (await metaSets(s))[0].id;
  eq(JSON.parse(await s.ls('lazyVoca.selectedSources.v1')), ['default:idioms', 'default:grammar', id]);
  eq(await U.boxChecked(s, 'Include setA'), true); eq(await U.boxChecked(s, 'Include grammar'), true); eq(await U.boxChecked(s, 'Include topic vocab'), false);
  const st = await U.boxState(s, 'Select all groups of Word Set: C1, C2'); eq(st.indeterminate, true);
});
test('SET-MIX-01', 'Built-in "idioms" + an imported set: Learn words come only from those sources', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'Imported 6 words into “setA”.');
  await U.mix(s, ['idioms'], ['setA']);
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/defaultVocabulary.json'), 'utf8'));
  const idioms = new Set(data.idioms.map((w) => w.word.trim()));
  const others = new Set(Object.entries(data).filter(([k]) => k !== 'idioms').flatMap(([, v]) => v.map((w) => w.word.trim())));
  const setA = new Set(['aaa1', 'aaa2', 'aaa3', 'aaa4', 'aaa5', 'aaa6']);
  await tab(s, 'Learn'); await sleep(1200);
  const seen = [];
  for (let i = 0; i < 14; i++) { seen.push(await word(s)); await ctl(s, 'Next Word'); await sleep(450); }
  for (const w of seen) ok(w && (setA.has(w) || idioms.has(w) || /kick yourself/.test(w)), `"${w}" is not from idioms or setA: ${seen}`);
  for (const w of seen) ok(setA.has(w) || !others.has(w) || idioms.has(w), `"${w}" is a word from another built-in group`);
  ok(seen.some((w) => setA.has(w)) && seen.some((w) => !setA.has(w)), 'queue is not mixed: ' + seen);
  const calls = s.fake.calls.filter((c) => c.name === 'generate_daily_selection_v2');
  ok(calls.length >= 2 && calls.at(-1).body.p_category === 'idioms', 'last p_category must be idioms: ' + JSON.stringify(calls.map((c) => c.body)));
});
test('SET-MIX-02', 'Two built-in groups: every card over ~10 Next presses belongs to them', async ({ session }) => {
  const s = await session({}); await start(s);
  await U.mix(s, ['phrasal verbs', 'idioms']);
  const pool = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'e2e/lib/pool.json'), 'utf8'));
  const allowed = new Set(pool.filter((w) => ['phrasal verbs', 'idioms'].includes(w.category)).map((w) => w.word.trim()));
  const outside = new Set(pool.filter((w) => !['phrasal verbs', 'idioms'].includes(w.category)).map((w) => w.word.trim()));
  await tab(s, 'Learn'); await sleep(1200);
  const seen = [];
  for (let i = 0; i < 10; i++) { seen.push(await word(s)); await ctl(s, 'Next Word'); await sleep(450); }
  for (const w of seen) ok(w && allowed.has(w) && !outside.has(w), `"${w}" is outside phrasal verbs + idioms: ${seen}`);
  ok(new Set(seen).size >= 2, 'expected more than one distinct card: ' + seen);
  const calls = s.fake.calls.filter((c) => c.name === 'generate_daily_selection_v2');
  ok(calls.length >= 1 && calls.at(-1).body.p_category == null, 'two groups -> p_category NULL: ' + JSON.stringify(calls.map((c) => c.body)));
});
test('SET-MIX-03', 'Deleting a selected imported set keeps the rest of the selection; survives reload', async ({ session }) => {
  const s = await session({}); await start(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'Imported 6 words into “setA”.');
  await importFile(s, 'setB.csv'); await waitText(s, 'Imported 6 words into “setB”.');
  await U.mix(s, ['idioms'], ['setA', 'setB']);
  const metas = await metaSets(s); const idB = metas.find((m) => m.name === 'setB').id;
  await cardBtn(s, 'setA', 'Delete'); await click(s, { text: 'Delete set' }); await waitText(s, 'Set deleted.');
  eq(JSON.parse(await s.ls('lazyVoca.selectedSources.v1')), ['default:idioms', idB]);
  await s.reload(); await tab(s, 'Sets'); await waitText(s, 'Word sets');
  eq(await U.boxChecked(s, 'Include setB'), true); eq(await U.boxChecked(s, 'Include idioms'), true);
  ok(/Selected: 2 sets/.test(await body(s)), 'summary after delete');
  await tab(s, 'Learn'); await sleep(1200);
  const seen = [];
  for (let i = 0; i < 10; i++) { seen.push(await word(s)); await ctl(s, 'Next Word'); await sleep(450); }
  for (const w of seen) ok(w && !/^aaa/.test(w), `deleted set's word shown: ${seen}`);
  ok(seen.some((w) => /^bbb/.test(w)), 'setB words missing: ' + seen);
});
