import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, tab, importFile, boot, waitText } = U;

const LIST = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !e.closest('[aria-hidden=true]'); };
  const dlg = document.querySelector('[role=dialog],[role=alertdialog]');
  const scope = dlg || document;
  return [...scope.querySelectorAll('button, a[href], [role=button], [role=tab]')].filter(vis).filter((e) => !e.disabled)
    .filter((e) => !/Sign out/i.test(e.textContent) || !!dlg)
    .map((e) => ({ name: e.getAttribute('aria-label') || (e.innerText || '').trim().slice(0, 30), ext: e.tagName === 'A' && (e.target === '_blank' || /^https?:/.test(e.getAttribute('href') || '') && !e.href.startsWith(location.origin)), href: e.getAttribute('href'), target: e.target, rel: e.rel }));
})()`;

async function dismiss(s) {
  for (let i = 0; i < 3; i++) {
    const open = await s.page.evaluate(() => !!document.querySelector('[role=dialog],[role=alertdialog]'));
    if (!open) return;
    await s.page.keyboard.press('Escape'); await sleep(200);
    const still = await s.page.evaluate(() => !!document.querySelector('[role=dialog],[role=alertdialog]'));
    if (!still) return;
    for (const spec of [{ text: 'Cancel' }, { text: 'Close' }, { label: 'Close practice' }, { text: 'Done' }, { text: 'Keep set' }]) {
      const h = (await U.findHandle(s, spec)).asElement(); if (h) { await h.click().catch(() => {}); await sleep(250); break; }
    }
  }
}
async function rootOk(s, ctx) { ok(await s.page.evaluate(() => (document.getElementById('root')?.children.length || 0) > 0), 'empty #root after ' + ctx); }

/** Click every visible control reachable from `prepare()` state. */
async function sweep(s, label, prepare, { max = 45, skip = () => false } = {}) {
  await prepare(); const n = Math.min((await s.page.evaluate(LIST)).length, max); const clicked = [];
  for (let i = 0; i < n; i++) {
    await prepare();
    const items = await s.page.evaluate(LIST); const it = items[i]; if (!it) break;
    if (it.ext) { ok(it.target === '_blank' && /noopener/.test(it.rel) && /^https?:/.test(it.href), `external link ${it.name} needs target=_blank rel=noopener: ${JSON.stringify(it)}`); clicked.push(it.name + ' (external, asserted)'); continue; }
    if (skip(it)) continue;
    const handle = (await s.page.evaluateHandle((i, src) => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !e.closest('[aria-hidden=true]'); };
      const dlg = document.querySelector('[role=dialog],[role=alertdialog]'); const scope = dlg || document;
      return [...scope.querySelectorAll('button, a[href], [role=button], [role=tab]')].filter(vis).filter((e) => !e.disabled).filter((e) => !/Sign out/i.test(e.textContent) || !!dlg)[i] || null;
    }, i)).asElement();
    if (!handle) continue;
    const before = s.page.url();
    await handle.evaluate((e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
    try { await handle.click(); } catch { /* covered or detached: still counts as attempted */ }
    await sleep(300); clicked.push(it.name);
    if (s.page.url() !== before) { await s.page.goBack().catch(() => {}); await sleep(500); }
    await dismiss(s); await rootOk(s, `${label} → ${it.name}`);
  }
  return clicked;
}

test('E2E-SWEEP-01', 'Click every visible control on each tab and in each dialog', async ({ session }) => {
  const s = await session({ initScript: U.DOWNLOAD_HOOK }); await boot(s);
  await importFile(s, 'setA.csv'); await waitText(s, 'is now the active set');
  const all = {};
  const go = (name) => async () => { await dismiss(s); if (s.page.url().includes('/vocabulary/')) await s.page.goBack(); await tab(s, name); await sleep(150); };
  all.learn = await sweep(s, 'Learn', async () => { await go('Learn')(); await sleep(300); });
  all.progress = await sweep(s, 'Progress', go('Progress'));
  all.sets = await sweep(s, 'Sets', async () => { await go('Sets')(); if (!(await U.setNames(s)).includes('setA')) { await importFile(s, 'setA.csv'); await sleep(300); } }, { skip: (it) => /^(Delete)$/.test(it.name) });
  all.more = await sweep(s, 'More', go('More'), { skip: (it) => /^Reset player$/.test(it.name) });
  // dialogs: open each and click every control in it
  const openers = [
    ['Learned dialog', 'Learn', () => U.click(s, { label: 'Mark as Learned' })],
    ['Search', 'Learn', () => U.click(s, { label: 'Quick Search' })],
    ['Practice', 'Learn', () => U.click(s, { label: 'Practice' })],
    ['Quiz', 'Progress', () => U.click(s, { text: 'Quiz me' })],
    ['Rename', 'Sets', () => U.cardBtn(s, 'setA', 'Rename')],
    ['Delete', 'Sets', async () => { if (!(await U.setNames(s)).includes('setA')) await importFile(s, 'setA.csv'); await U.cardBtn(s, 'setA', 'Delete'); }],
    ['Reset player', 'More', () => U.click(s, { text: 'Reset player' })],
  ];
  for (const [name, tabName, open] of openers) {
    const prep = async () => { await dismiss(s); await tab(s, tabName); await sleep(200); await open(); await sleep(300); };
    // the reload-causing confirm of Reset/Delete runs last by index order; Cancel comes first
    all[name] = await sweep(s, name, prep, { max: 12 });
    await rootOk(s, name);
    await s.page.waitForFunction(() => (document.getElementById('root')?.children.length || 0) > 0);
  }
  await dismiss(s);
  console.log('SWEEP clicked:', Object.entries(all).map(([k, v]) => `${k}=${v.length}`).join(' '));
  ok(all.learn.length >= 8 && all.progress.length >= 3 && all.sets.length >= 5 && all.more.length >= 6, 'too few controls found: ' + JSON.stringify(Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.length]))));
  // finally Sign out
  await tab(s, 'More'); await U.click(s, { text: 'Sign out' }); await waitText(s, 'Access your vocabulary');
}, { timeout: 280000, allow: [/RPC failed/] });
