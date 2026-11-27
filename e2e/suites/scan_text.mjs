// FB-66 "Scan text": camera/gallery -> OCR -> tap/drag selection -> meaning -> translation -> editable preview -> save.
// Camera/OCR, the dictionary (fetch) and ML Kit translation are mocked in the page; nothing leaves localhost.
import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, waitText, click, boot, tab, metaSets } = U;

const FREE = { pro: false };
const TEXT = 'Abandon the quokka at dawn. The pond will dry up in summer. Never zzzmiss it.';
const MOCK = `(() => {
  const st = window.__scan = { text: ${JSON.stringify(TEXT)}, picks: [], recog: 0, script: null, cancel: false, dict: 'hit', dictCalls: [], downloaded: [], translated: [], models: [], downloadMs: 700, scanFail: false };
  window.__LV_SCAN_ADAPTER__ = {
    isAvailable: async () => true,
    pickImage: async (src) => { st.picks.push(src); return st.cancel ? null : { path: 'mock.jpg' }; },
    recognize: async (img, script) => { st.recog++; st.script = script; return { text: st.text }; },
  };
  window.__LV_TRANSLATION_ADAPTER__ = {
    isAvailable: async () => true,
    isModelDownloaded: async (l) => st.models.includes(l),
    downloadModel: async (l) => { await new Promise((r) => setTimeout(r, st.downloadMs)); st.models.push(l); st.downloaded.push(l); },
    translate: async (t, f, to) => { st.translated.push([t, f, to]); return 'tr-' + to + ':' + t; },
  };
  const real = window.fetch.bind(window);
  window.fetch = async (u, init) => {
    const url = String((u && u.url) || u);
    if (!url.includes('api.dictionaryapi.dev')) return real(u, init);
    st.dictCalls.push(url);
    if (st.dict === 'offline') throw new TypeError('Failed to fetch');
    const w = decodeURIComponent(url.split('/').pop());
    if (st.dict === '404' || w.startsWith('zzz')) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify([{ phonetic: '/draɪ/', meanings: [{ definitions: [{ definition: 'free of moisture', example: 'dict example' }] }] }]), { status: 200 });
  };
})();`;
const lang = (l) => `(() => { const L = ${JSON.stringify(l)}; Object.defineProperty(navigator, 'language', { get: () => L[0], configurable: true }); Object.defineProperty(navigator, 'languages', { get: () => L, configurable: true }); })();`;
const init = (l = ['en-US', 'en']) => lang(l) + MOCK;

const mk = async (session, opts = {}) => {
  const s = await session({ initScript: init(opts.lang), ...(opts.free ? FREE : {}), storage: opts.storage });
  await boot(s); await tab(s, 'Library'); await waitText(s, 'Create your own set');
  return s;
};
const tid = (s, id) => s.page.waitForSelector(`[data-testid="${id}"]`, { visible: true, timeout: 8000 });
const clickTid = async (s, id) => { const h = await tid(s, id); await h.evaluate((e) => e.scrollIntoView({ block: 'center' })); await h.click(); await sleep(80); };
const openScan = async (s) => { await clickTid(s, 'scan-text-button'); await tid(s, 'scan-dialog'); };
const scan = async (s, src = 'camera') => { await clickTid(s, src === 'camera' ? 'scan-camera' : 'scan-gallery'); await tid(s, 'scan-text'); };
const st = (s) => s.page.evaluate(() => JSON.parse(JSON.stringify(window.__scan)));
const tokenBox = async (s, w, nth = 0) => s.page.evaluate((w, nth) => {
  const e = [...document.querySelectorAll('[data-tok]')].filter((x) => x.textContent === w)[nth]; const r = e.getBoundingClientRect();
  e.scrollIntoView({ block: 'center' }); const r2 = e.getBoundingClientRect(); return { x: r2.x + r2.width / 2, y: r2.y + r2.height / 2 };
}, w, nth);
const tapWord = async (s, w, nth = 0) => { const b = await tokenBox(s, w, nth); await s.page.mouse.click(b.x, b.y); await sleep(100); };
const selection = (s) => s.page.evaluate(() => document.querySelector('[data-testid=scan-selection]').innerText);
const selected = (s) => s.page.evaluate(() => [...document.querySelectorAll('[data-tok][data-selected=true]')].map((e) => e.textContent));
const field = (s, id) => s.page.$eval(`#${id}`, (e) => e.value);
const setField = async (s, id, v) => { await s.page.focus(`#${id}`); await s.page.keyboard.down('Control'); await s.page.keyboard.press('KeyA'); await s.page.keyboard.up('Control'); await s.page.keyboard.press('Backspace'); if (v) await s.page.type(`#${id}`, v); };
const lookup = async (s, w) => { await tapWord(s, w); await clickTid(s, 'scan-lookup'); await tid(s, 'scan-save'); await sleep(500); };
const dialogText = (s) => s.page.evaluate(() => document.querySelector('[data-testid=scan-dialog]')?.innerText || '');
const setData = async (s, i = 0) => { const m = await metaSets(s); return Object.values(JSON.parse(await s.ls('lv.vocabularySets.data.' + m[i].id))).flat(); };

test('SCAN-01', 'Scan text: take a photo or pick from the gallery, and the recognized text is shown [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s);
  ok((await dialogText(s)).includes('Take photo') && (await dialogText(s)).includes('From gallery'), await dialogText(s));
  ok(!/English/.test(await dialogText(s)), 'the dialog must not name a language');
  await scan(s, 'camera');
  const t = await s.page.$eval('[data-testid=scan-text]', (e) => e.innerText);
  ok(t.includes('Abandon the quokka at dawn.') && t.includes('Never zzzmiss it.'), t);
  await click(s, { text: 'Scan again' }); await scan(s, 'gallery');
  const m = await st(s); eq(m.picks, ['camera', 'gallery']); eq(m.recog, 2); eq(m.script, 'latin', 'OCR script comes from the language profile');
});
test('SCAN-02', 'Scan text: tap a single word; tapping a second word extends it to a phrase [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s);
  eq(await selection(s), 'Nothing selected yet.');
  await tapWord(s, 'quokka'); eq(await selected(s), ['quokka']); ok((await selection(s)).includes('quokka'));
  await tapWord(s, 'dawn'); eq(await selected(s), ['quokka', 'at', 'dawn']); ok((await selection(s)).includes('quokka at dawn'), await selection(s));
  await tapWord(s, 'pond'); eq(await selected(s), ['pond']);
});
test('SCAN-03', 'Scan text: drag across words selects a phrase ("dry up") [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s);
  const a = await tokenBox(s, 'dry'); const b = await tokenBox(s, 'up');
  await s.page.mouse.move(a.x, a.y); await s.page.mouse.down(); await s.page.mouse.move((a.x + b.x) / 2, b.y, { steps: 4 }); await s.page.mouse.move(b.x, b.y, { steps: 4 }); await s.page.mouse.up(); await sleep(150);
  eq(await selected(s), ['dry', 'up']); ok((await selection(s)).includes('dry up'), await selection(s));
});
test('SCAN-04', 'Scan text: the sentence containing the selection becomes the example (context) [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s);
  const a = await tokenBox(s, 'dry'); const b = await tokenBox(s, 'up');
  await s.page.mouse.move(a.x, a.y); await s.page.mouse.down(); await s.page.mouse.move(b.x, b.y, { steps: 6 }); await s.page.mouse.up(); await sleep(100);
  await clickTid(s, 'scan-lookup'); await tid(s, 'scan-save'); await sleep(400);
  eq(await field(s, 'manual-example'), 'The pond will dry up in summer.');
  ok((await field(s, 'manual-word')).startsWith('dry up'), await field(s, 'manual-word'));
});
test('SCAN-05', 'Scan text: meaning from the app\'s own words first, then the dictionary (IPA prefilled) [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s);
  await lookup(s, 'Abandon');
  ok((await field(s, 'manual-meaning')).length > 3, 'bundle meaning');
  eq((await st(s)).dictCalls.length, 0, 'the app\'s own word must not call the dictionary');
  await click(s, { text: 'Back' }); await click(s, { text: 'Scan again' }); await scan(s); await tapWord(s, 'quokka'); await clickTid(s, 'scan-lookup'); await tid(s, 'scan-save'); await sleep(400);
  eq(await field(s, 'manual-meaning'), 'free of moisture');
  eq(await field(s, 'manual-word'), 'quokka /draɪ/', 'IPA uses the existing word shape');
  ok((await st(s)).dictCalls[0].includes('/entries/en/quokka'));
});
test('SCAN-06', 'Scan text: dictionary miss (404) leaves meaning empty and editable [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s);
  await lookup(s, 'zzzmiss');
  ok(/No meaning found/.test(await dialogText(s)), await dialogText(s));
  eq(await field(s, 'manual-meaning'), ''); eq(await field(s, 'manual-word'), 'zzzmiss');
  await setField(s, 'manual-meaning', 'a typed meaning'); eq(await field(s, 'manual-meaning'), 'a typed meaning');
});
test('SCAN-07', 'Scan text: offline dictionary shows a clear message and keeps the form editable [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s);
  await s.page.evaluate(() => { window.__scan.dict = 'offline'; });
  await lookup(s, 'quokka');
  ok(/offline/i.test(await dialogText(s)), await dialogText(s));
  eq(await field(s, 'manual-meaning'), ''); eq(await field(s, 'manual-word'), 'quokka');
});
test('SCAN-08', 'Scan text: translation is skipped when the device language matches the source language, and when the Vietnamese toggle is off [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s); await lookup(s, 'quokka');
  eq(await s.page.$('[data-testid=scan-download-prompt]'), null, 'no download prompt on an en device');
  eq((await st(s)).translated.length, 0); eq(await field(s, 'manual-translation'), '');
  const f = await mk(session, { lang: ['fr-FR', 'fr'] }); await openScan(f); await scan(f); await lookup(f, 'quokka');
  eq(await f.page.$('[data-testid=scan-download-prompt]'), null, 'FB-64: toggle off -> no translation');
  eq((await st(f)).translated.length, 0);
});
test('SCAN-09', 'Scan text: translation needed -> model-download prompt, progress, then the translation is filled [FB-66]', async ({ session }) => {
  const s = await mk(session, { lang: ['vi-VN', 'vi'] }); await openScan(s); await scan(s);
  await tapWord(s, 'quokka'); await clickTid(s, 'scan-lookup'); await tid(s, 'scan-download-prompt');
  ok(/language pack/.test(await dialogText(s)), await dialogText(s));
  eq((await st(s)).downloaded.length, 0, 'nothing downloads before the user agrees');
  await clickTid(s, 'scan-download-yes'); await tid(s, 'scan-download-progress');
  await s.page.waitForFunction(() => document.querySelector('#manual-translation')?.value.startsWith('tr-vi:'), { timeout: 8000 });
  eq(await field(s, 'manual-translation'), 'tr-vi:quokka');
  eq((await st(s)).downloaded.sort(), ['en', 'vi']);
  eq(await s.page.$('[data-testid=scan-download-progress]'), null, 'progress gone when done');
});
test('SCAN-10', 'Scan text: declining the language-pack download leaves the translation editable [FB-66]', async ({ session }) => {
  const s = await mk(session, { lang: ['vi-VN', 'vi'] }); await openScan(s); await scan(s);
  await tapWord(s, 'quokka'); await clickTid(s, 'scan-lookup'); await tid(s, 'scan-download-prompt');
  await clickTid(s, 'scan-download-no'); await tid(s, 'scan-translation-note');
  eq((await st(s)).downloaded.length, 0); eq(await field(s, 'manual-translation'), '');
  await setField(s, 'manual-translation', 'con quokka'); eq(await field(s, 'manual-translation'), 'con quokka');
});
test('SCAN-11', 'Scan text: edit the preview (meaning, category, example, translation) and save into a new set; validation applies [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s); await scan(s); await lookup(s, 'quokka');
  const opts = await s.page.$$eval('#manual-category option', (o) => o.map((x) => x.value));
  eq(opts, ['topic vocab', 'phrasal verbs', 'idioms', 'grammar', 'phrases, collocations', 'word formation']);
  await setField(s, 'manual-meaning', ''); eq(await field(s, 'manual-meaning'), '', 'meaning cleared');
  await s.page.type('[data-testid=scan-new-set-name]', 'Scanned');
  await clickTid(s, 'scan-save'); await waitText(s, 'Enter the meaning.');
  ok(await s.page.$('[data-testid=scan-dialog]'), 'dialog stays open on a validation error');
  eq((await metaSets(s)).length, 0, 'nothing saved');
  await setField(s, 'manual-meaning', 'a small marsupial'); await setField(s, 'manual-example', 'Look at the quokka.'); await setField(s, 'manual-translation', 'con quokka');
  await s.page.select('#manual-category', 'idioms');
  await clickTid(s, 'scan-save'); await waitText(s, 'Saved “quokka /draɪ/”.');
  const m = await metaSets(s); eq(m.length, 1); eq(m[0].name, 'Scanned');
  const w = (await setData(s))[0];
  eq([w.word, w.meaning, w.category, w.example, w.translation], ['quokka /draɪ/', 'a small marsupial', 'idioms', 'Look at the quokka.', 'con quokka']);
});
test('SCAN-12', 'Scan text: from a set\'s Add-word dialog it saves into that set, and a duplicate is rejected [FB-66]', async ({ session }) => {
  const s = await mk(session);
  await clickTid(s, 'new-set-button'); await tid(s, 'create-set-dialog');
  await s.page.type('[aria-label="Set name"]', 'My scans'); await s.page.type('#manual-word', 'seed'); await s.page.type('#manual-meaning', 'seed meaning');
  await clickTid(s, 'create-set-submit'); await tid(s, 'manage-set-dialog');
  await clickTid(s, 'manage-scan-text'); await tid(s, 'scan-dialog'); await scan(s); await lookup(s, 'quokka');
  eq(await s.page.$eval('#scan-target-set', (e) => e.selectedOptions[0].textContent), 'My scans');
  await clickTid(s, 'scan-save'); await waitText(s, 'Saved'); await sleep(600);
  eq((await setData(s)).map((w) => w.word).sort(), ['quokka /draɪ/', 'seed']);
  await openScan(s); await scan(s); await lookup(s, 'quokka');
  await clickTid(s, 'scan-save'); await waitText(s, 'already in this set');
  eq((await setData(s)).length, 2);
});
test('SCAN-13', 'Scan text: Free gets 5 scans a day (cancel does not count), the 6th is blocked with an upgrade; Pro lists the benefit [FB-66]', async ({ session }) => {
  const s = await mk(session, { free: true }); await openScan(s);
  ok(/Free scans left today: 5 of 5/.test(await dialogText(s)), await dialogText(s));
  await s.page.evaluate(() => { window.__scan.cancel = true; }); await clickTid(s, 'scan-camera'); await sleep(300);
  ok(/Free scans left today: 5 of 5/.test(await dialogText(s)), 'a cancelled camera must not count'); eq((await st(s)).recog, 0);
  await s.page.evaluate(() => { window.__scan.cancel = false; });
  for (let i = 1; i <= 5; i++) { await scan(s, i % 2 ? 'camera' : 'gallery'); await click(s, { text: 'Scan again' }); }
  ok(/Free scans left today: 0 of 5/.test(await dialogText(s)), await dialogText(s));
  eq((await st(s)).recog, 5);
  await clickTid(s, 'scan-camera'); await tid(s, 'scan-blocked');
  eq((await st(s)).picks.length, 6, '1 cancelled + 5 scans; the camera is not opened when blocked');
  eq((await st(s)).recog, 5, 'no 6th scan');
  await clickTid(s, 'scan-upgrade'); await s.page.waitForSelector('[data-testid=pro-upgrade-sheet]', { timeout: 8000 });
  ok(/Unlimited “Scan text”/.test(await s.page.$eval('[data-testid=pro-upgrade-sheet]', (e) => e.innerText)), 'Pro sheet lists unlimited scans');
});
test('SCAN-14', 'Scan text: Pro is unlimited (6+ scans, no counter) [FB-66]', async ({ session }) => {
  const s = await mk(session); await openScan(s);
  ok(!/Free scans left/.test(await dialogText(s)));
  for (let i = 0; i < 6; i++) { await scan(s); await click(s, { text: 'Scan again' }); }
  eq((await st(s)).recog, 6); eq(await s.page.$('[data-testid=scan-blocked]'), null);
});
