import { sleep } from './harness.mjs';
import path from 'node:path';
import { E2E_DIR } from './harness.mjs';

export const fx = (name) => path.join(E2E_DIR, 'fixtures', name);
export class Assert extends Error {}
export function ok(cond, msg) { if (!cond) throw new Assert(msg || 'assertion failed'); }
export function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Assert(`${msg || 'not equal'}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`); }

export const body = (s) => s.page.evaluate(() => document.body.innerText);
export async function waitText(s, text, timeout = 8000) {
  try {
    await s.page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
  } catch { throw new Assert(`text not found: "${text}". Body: ${(await body(s)).slice(0, 400).replace(/\n+/g, ' / ')}`); }
}
export async function waitGone(s, text, timeout = 8000) {
  try { await s.page.waitForFunction((t) => !document.body.innerText.includes(t), { timeout }, text); }
  catch { throw new Assert(`text still present: "${text}"`); }
}
export const hasText = (s, text) => s.page.evaluate((t) => document.body.innerText.includes(t), text);

/** find a visible clickable by aria-label, exact text, or (text) substring. */
export function findHandle(s, spec) {
  return s.page.evaluateHandle((spec) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
    const all = [...document.querySelectorAll('button, a, [role=button], [role=menuitem], [role=tab], summary')].filter(vis);
    const norm = (x) => (x || '').replace(/\s+/g, ' ').trim();
    const hit = all.filter((e) => {
      const label = e.getAttribute('aria-label'); const text = norm(e.innerText || e.textContent);
      if (spec.label !== undefined) return label === spec.label;
      if (spec.labelRe) return new RegExp(spec.labelRe, 'i').test(label || '');
      if (spec.text !== undefined) return text === spec.text;
      if (spec.textHas !== undefined) return text.includes(spec.textHas) || (label || '').includes(spec.textHas);
      return false;
    });
    // prefer elements inside open dialogs
    const dlg = hit.filter((e) => e.closest('[role=dialog],[role=alertdialog]'));
    const pool = spec.inDialog ? dlg : (dlg.length ? dlg : hit);
    return pool[spec.nth || 0] || null;
  }, spec);
}
export async function click(s, spec, { wait = 60 } = {}) {
  if (typeof spec === 'string') spec = { label: spec };
  let h;
  for (let i = 0; i < 20; i++) { h = (await findHandle(s, spec)).asElement(); if (h) break; await sleep(150); }
  if (!h) throw new Assert(`control not found: ${JSON.stringify(spec)}. Visible: ${(await controls(s)).join(', ').slice(0, 400)}`);
  await h.evaluate((e) => e.scrollIntoView({ block: 'center', inline: 'center' }));
  await h.click();
  await sleep(wait);
}
export const text = (t) => ({ text: t });
export const controls = (s) => s.page.evaluate(() => [...document.querySelectorAll('button, a, [role=button]')].filter((e) => e.offsetParent !== null || e.getClientRects().length)
  .map((e) => e.getAttribute('aria-label') || (e.innerText || '').trim().slice(0, 30)));

export async function tab(s, name) {
  await s.page.evaluate((n) => [...document.querySelectorAll('nav[aria-label=Primary] button')].find((b) => b.textContent.trim() === n).click(), name);
  await sleep(250);
}
export const prefs = async (s) => JSON.parse((await s.ls('lv_preferences')) || '{}');
export const speechCalls = (s) => s.page.evaluate(() => window.__speech ? window.__speech.calls : null);
export const speechInfo = (s) => s.page.evaluate(() => ({ calls: window.__speech.calls.length, cancels: window.__speech.cancels, last: window.__speech.calls.at(-1) }));
export const fireEnd = (s) => s.page.evaluate(() => window.__speech.fireEnd());
export const cardWord = (s) => s.page.evaluate(() => {
  // word is the first bold line after the category pill in the learn card
  const main = document.querySelector('main') || document.body;
  const el = main.querySelector('[data-testid="vocab-word"], h2.word, .vocab-word') || null;
  return el ? el.textContent.trim() : null;
});

/** Import a fixture on the Sets tab. Returns after the UI settled. */
export async function importFile(s, fixture) {
  await tab(s, 'Sets');
  const input = await s.page.$('input[type=file][aria-label="Import vocabulary file"]');
  ok(input, 'file input not found');
  await input.uploadFile(fx(fixture));
  await sleep(400);
}
export async function setNames(s) {
  return s.page.evaluate(() => [...document.querySelectorAll('h3')].filter((h) => !h.closest('[hidden]')).map((h) => h.textContent.trim()).filter((t) => t && t !== 'Import a set'));
}
export const metaSets = async (s) => (JSON.parse((await s.ls('lv.vocabularySets.v1')) || '{"sets":[]}').sets) || [];
export const selectAll = async (s, sel) => { await s.page.focus(sel); await s.page.$eval(sel, (e) => e.select()); };

export async function openDark(s, on = true) {
  await tab(s, 'More');
  const isDark = await s.page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (isDark !== on) await click(s, { labelRe: '^Switch to (dark|light) mode$' });
}

import { POOL } from './fake.mjs';
export const P = [...POOL].sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));   // A-Z, as the card shows them
export const POOL_ORDER = P.map((w) => w.word);
export const re0 = new RegExp(P[0].word); export const re1 = new RegExp(P[1].word);
export const word = (s) => s.page.evaluate(() => document.querySelector('main h1')?.textContent.trim() || null);
export async function waitWord(s, w, timeout = 8000) {
  try { await s.page.waitForFunction((w) => document.querySelector('main h1')?.textContent.trim() === w, { timeout }, w); }
  catch { throw new Assert(`expected card word "${w}", got "${await word(s)}"`); }
}
export async function waitSpeech(s, re, timeout = 6000) {
  try { await s.page.waitForFunction((src) => window.__speech.calls.some((c) => new RegExp(src).test(c.text)), { timeout }, re.source || String(re)); }
  catch { throw new Assert(`no utterance matching ${re}. Calls: ${JSON.stringify((await speechCalls(s)).map((c) => c.text.slice(0, 30)))}`); }
}
export async function boot(s, path = '/') { await s.goto(path); await waitWord(s, POOL_ORDER[0], 12000); await waitSpeech(s, re0); await sleep(600); }
export const label = (s, l) => s.page.evaluate((l) => !![...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === l && b.offsetParent), l);
export const ctl = (s, l) => click(s, { label: l });

/** Click a button inside the Sets-tab card whose title is `setName`. */
export async function cardBtn(s, setName, btnText) {
  const h = (await s.page.evaluateHandle((setName, btnText) => {
    const li = [...document.querySelectorAll('li')].find((l) => l.querySelector('h3')?.textContent.trim() === setName);
    return li ? [...li.querySelectorAll('button')].find((b) => b.textContent.trim() === btnText) || null : null;
  }, setName, btnText)).asElement();
  if (!h) throw new Assert(`no "${btnText}" button in card "${setName}"`);
  await h.evaluate((e) => e.scrollIntoView({ block: 'center' })); await h.click(); await sleep(200);
}
export const cardHas = (s, setName, btnText) => s.page.evaluate((setName, btnText) => {
  const li = [...document.querySelectorAll('li')].find((l) => l.querySelector('h3')?.textContent.trim() === setName);
  return !!li && [...li.querySelectorAll('button')].some((b) => b.textContent.trim() === btnText);
}, setName, btnText);
export const cardText = (s, setName) => s.page.evaluate((setName) => [...document.querySelectorAll('li')].find((l) => l.querySelector('h3')?.textContent.trim() === setName)?.innerText || null, setName);
const BUILTIN_PARENT = 'Select all groups of Word Set: C1, C2';
const boxHandle = async (s, label) => {
  const h = (await s.page.evaluateHandle((label) => [...document.querySelectorAll('input[type=checkbox]')].find((i) => i.getAttribute('aria-label') === label) || null, label)).asElement();
  if (!h) throw new Assert(`no checkbox "${label}"`);
  return h;
};
/** Set a Sets-tab checkbox (by aria-label) to `want`. */
export async function setBox(s, label, want) {
  const h = await boxHandle(s, label);
  if ((await h.evaluate((e) => e.checked)) !== want) { await h.evaluate((e) => e.scrollIntoView({ block: 'center' })); await h.click(); await sleep(200); }
}
export const boxChecked = async (s, label) => (await boxHandle(s, label)).evaluate((e) => e.checked);
export const boxState = async (s, label) => (await boxHandle(s, label)).evaluate((e) => ({ checked: e.checked, indeterminate: e.indeterminate }));
const GROUPS = ['topic vocab', 'phrasal verbs', 'idioms', 'grammar', 'phrases, collocations', 'word formation'];
/** Untick every built-in group (needs at least one imported set selected). Leaves you on the Sets tab. */
export async function builtinOff(s) {
  await tab(s, 'Sets');
  let st = await boxState(s, BUILTIN_PARENT);
  if (st.indeterminate) { await setBox(s, BUILTIN_PARENT, true); st = await boxState(s, BUILTIN_PARENT); }
  if (st.checked) await setBox(s, BUILTIN_PARENT, false);
}
/** Select exactly one source: an imported set by name, or null for the whole built-in set. */
export async function useOnly(s, name) {
  await tab(s, 'Sets');
  const labels = await s.page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].map((i) => i.getAttribute('aria-label')));
  const imported = labels.filter((l) => l && l.startsWith('Include ') && !GROUPS.includes(l.slice(8)));
  if (name) {
    await setBox(s, `Include ${name}`, true);
    for (const l of imported) if (l !== `Include ${name}`) await setBox(s, l, false);
    await builtinOff(s);
  } else {
    await setBox(s, BUILTIN_PARENT, true);
    for (const l of imported) await setBox(s, l, false);
  }
}
/** Select exactly the given built-in groups plus the given imported sets. */
export async function mix(s, groups, sets = []) {
  await tab(s, 'Sets');
  const labels = await s.page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].map((i) => i.getAttribute('aria-label')));
  const imported = labels.filter((l) => l && l.startsWith('Include ') && !GROUPS.includes(l.slice(8)));
  for (const g of GROUPS) if (groups.includes(g)) await setBox(s, `Include ${g}`, true);
  for (const n of sets) await setBox(s, `Include ${n}`, true);
  for (const g of GROUPS) if (!groups.includes(g)) await setBox(s, `Include ${g}`, false);
  for (const l of imported) if (!sets.includes(l.slice(8))) await setBox(s, l, false);
}
export const alertText = (s) => s.page.evaluate(() => document.querySelector('[role=alert]')?.innerText || '');
export async function waitAlert(s, re, timeout = 8000) {
  try { await s.page.waitForFunction((src) => new RegExp(src, 'i').test(document.querySelector('[role=alert]')?.innerText || ''), { timeout }, re.source); }
  catch { throw new Assert(`alert ${re} not shown. alert="${await alertText(s)}"`); }
}
export const DOWNLOAD_HOOK = `
  window.__downloads = [];
  const __orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download) { const name = this.download; fetch(this.href).then((r) => r.arrayBuffer()).then((b) => window.__downloads.push({ name, bytes: Array.from(new Uint8Array(b)) })); return; }
    return __orig.call(this);
  };`;
export async function pickFile(s, absPath) {
  const input = await s.page.$('input[type=file][aria-label="Import vocabulary file"]'); ok(input, 'no file input');
  await input.uploadFile(absPath); await sleep(400);
}
