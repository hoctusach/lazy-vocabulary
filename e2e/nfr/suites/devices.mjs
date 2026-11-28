// NFR-DEV: device matrix. Layout, tap targets, text clipping, dark-theme contrast (axe-core), font scaling.
// Real device rendering (Samsung/iOS WKWebView fonts, notches) stays proxy/manual; this is Chrome emulation.
import { test, record, check, DEVICES, viewportOf, uaOf, AXE_SRC } from '../lib.mjs';
import * as U from '../../lib/ui.mjs';
import { sleep } from '../../lib/harness.mjs';
const { ok, boot, tab } = U;

const MIN_TARGET = 44;   // px (Apple HIG 44pt; Material 48dp ~ 48px; WCAG 2.5.8 AA minimum is 24px)
const KEY_BUTTONS = ['Pause', 'Next Word', 'Audio', 'Quick Search'];

/** Page-side probe. Returns facts only; the test decides. */
const PROBE = `(() => {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const vis = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !e.closest('[aria-hidden=true],[hidden],[inert]'); };
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
  const out = { vw, vh, docW: document.documentElement.scrollWidth, bodyW: document.body.scrollWidth, buttons: {}, nav: [], clipped: [], truncated: [], offscreen: [] };
  for (const l of ${JSON.stringify(KEY_BUTTONS)}) out.buttons[l] = box([...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === l && vis(b)));
  const navEl = document.querySelector('nav[aria-label=Primary]');
  out.navBox = box(navEl);
  out.nav = navEl ? [...navEl.querySelectorAll('button')].filter(vis).map((b) => ({ n: b.textContent.trim(), ...box(b) })) : [];
  for (const e of document.querySelectorAll('main *, header *, footer *, nav *')) {
    if (!vis(e)) continue;
    const st = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      let p = e.parentElement, inScroller = false;
      while (p && p !== document.body) { const ox = getComputedStyle(p).overflowX; if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth) { inScroller = true; break; } p = p.parentElement; }
      if (!inScroller) out.offscreen.push(e.tagName + '.' + String(e.className).slice(0, 40) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    }
    // content wider/taller than its box while the box hides the overflow = clipped text
    const hidesX = ['hidden', 'clip'].includes(st.overflowX), hidesY = ['hidden', 'clip'].includes(st.overflowY);
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText || e.clientWidth <= 1 || e.closest('.sr-only, [class*="sr-only"]')) continue;   // visually-hidden labels are meant to be 1px
    const label = e.tagName + '.' + String(e.className).slice(0, 30) + ' "' + e.textContent.trim().slice(0, 24) + '"';
    if (hidesX && e.scrollWidth > e.clientWidth + 1) (st.textOverflow === 'ellipsis' ? out.truncated : out.clipped).push(label + ' sw=' + e.scrollWidth + ' cw=' + e.clientWidth);
    else if (hidesY && e.scrollHeight > e.clientHeight + 1 && st.display !== 'inline') out.clipped.push(label + ' sh=' + e.scrollHeight + ' ch=' + e.clientHeight);
  }
  out.clipped = out.clipped.slice(0, 8); out.truncated = out.truncated.slice(0, 8); out.offscreen = out.offscreen.slice(0, 8);
  return out;
})()`;

async function openDevice(session, d, opts = {}) {
  const s = await session({ viewport: viewportOf(d), ...opts });
  await s.page.setUserAgent(uaOf(d));
  await boot(s);
  return s;
}
const small = (b) => !b || b.w < MIN_TARGET || b.h < MIN_TARGET;
const inView = (b, vw, vh) => b && b.l >= 0 && b.r <= vw + 1 && b.t >= 0 && b.b <= vh + 1;

function assertProbe(d, m, issues, { scaled = false } = {}) {
  if (m.docW > m.vw + 1) issues.push(`horizontal page overflow ${m.docW} > ${m.vw}`);
  if (m.bodyW > m.vw + 1) issues.push(`body overflow ${m.bodyW} > ${m.vw}`);
  if (m.offscreen.length) issues.push(`elements past the viewport edge: ${m.offscreen.join('; ')}`);
  if (m.clipped.length) issues.push(`clipped text: ${m.clipped.join('; ')}`);
  for (const l of KEY_BUTTONS) {
    const b = m.buttons[l];
    if (!b) { issues.push(`"${l}" not visible`); continue; }
    if (small(b)) issues.push(`"${l}" tap target ${b.w}x${b.h} < ${MIN_TARGET}`);
    if (!scaled && !inView(b, m.vw, m.vh)) issues.push(`"${l}" outside the first screen (${JSON.stringify(b)})`);
  }
  if (d.mobile && d.w < 768) {
    if (!m.navBox) issues.push('bottom nav missing');
    else {
      if (m.nav.length < 4) issues.push(`bottom nav has ${m.nav.length} tabs`);
      for (const t of m.nav) if (small(t)) issues.push(`nav "${t.n}" ${t.w}x${t.h} < ${MIN_TARGET}`);
      if (m.navBox.b > m.vh + 1 || m.navBox.t < m.vh / 2) issues.push(`bottom nav not at the bottom ${JSON.stringify(m.navBox)}`);
    }
  }
}

for (const d of DEVICES) {
  test(`NFR-DEV-01-${d.key}`, `${d.w >= 768 && d.w < 816 ? '[FB-80] ' : ''}${d.label}: no horizontal overflow, bottom nav + key buttons visible and >= ${MIN_TARGET}px, no clipped text (all tabs)`, async ({ session }) => {
    const s = await openDevice(session, d);
    const issues = [];
    let m = await s.page.evaluate(PROBE);
    record(`NFR-DEV-01-${d.key}`, { pause: m.buttons.Pause && `${m.buttons.Pause.w}x${m.buttons.Pause.h}`, next: m.buttons['Next Word'] && `${m.buttons['Next Word'].w}x${m.buttons['Next Word'].h}`, nav_min: m.nav.length ? Math.min(...m.nav.map((t) => Math.min(t.w, t.h))) : null, truncated_ellipsis: m.truncated.length });
    assertProbe(d, m, issues);
    if (d.mobile && d.w < 768) {
      for (const name of ['Progress', 'Library', 'More']) {
        await tab(s, name); await sleep(350);
        const t = await s.page.evaluate(PROBE);
        if (t.docW > t.vw + 1) issues.push(`${name}: horizontal overflow ${t.docW} > ${t.vw}`);
        if (t.offscreen.length) issues.push(`${name}: past the edge: ${t.offscreen.join('; ')}`);
        if (t.clipped.length) issues.push(`${name}: clipped: ${t.clipped.join('; ')}`);
        if (!t.navBox) issues.push(`${name}: bottom nav missing`);
      }
    }
    ok(!issues.length, `${d.label}: ${issues.join(' | ')}`);
  }, d.known ? { known: d.known } : {});
}

// ---- dark theme contrast with axe-core (WCAG 2 AA color-contrast) ----
async function axeContrast(s) {
  await s.page.evaluate(AXE_SRC());
  return s.page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations'] });
    return r.violations.flatMap((v) => v.nodes.map((n) => `${(n.target || []).join(' ').slice(0, 50)} :: ${(n.any[0]?.message || '').replace(/Element has insufficient color contrast of /, '').slice(0, 70)}`));
  });
}
for (const d of DEVICES.filter((x) => ['android-small', 'pixel7', 'iphone-13', 'ipad-landscape'].includes(x.key))) {
  test(`NFR-DEV-02-${d.key}`, `${d.label}: dark theme Learn screen passes axe color-contrast (WCAG AA)`, async ({ session }) => {
    const s = await openDevice(session, d, { storage: { 'lv-dark': 'true' } });
    ok(await s.page.evaluate(() => document.documentElement.classList.contains('dark')), 'dark mode is on');
    const v = await axeContrast(s);
    record(`NFR-DEV-02-${d.key}`, { violations: v.length });
    ok(!v.length, `${v.length} contrast violations: ${v.slice(0, 5).join(' | ')}`);
  });
}

const THEMES = [['notes', 'Margin Notes'], ['sloth', 'Cozy Sloth'], ['blocks', 'Bold Blocks'], ['pixel', 'Pixel Quest'], ['riso', 'Riso Zine']];
for (const [name, label] of THEMES) {
  test(`NFR-DEV-03-${name}`, `${name === 'blocks' ? '[FB-81] ' : ''}${label} (dark) on Pixel 7: Learn, Progress, Library and More pass axe color-contrast`, async ({ session }) => {
    const d = DEVICES.find((x) => x.key === 'pixel7');
    const s = await openDevice(session, d, { storage: { 'lv-dark': 'true' } });
    await tab(s, 'More'); await U.click(s, { label }); await sleep(300);
    const bad = [];
    for (const t of ['More', 'Learn', 'Progress', 'Library']) {
      await tab(s, t); await sleep(400);
      for (const v of await axeContrast(s)) bad.push(`${t}: ${v}`);
    }
    record(`NFR-DEV-03-${name}`, { violations: bad.length });
    ok(!bad.length, `${bad.length} contrast violations: ${bad.slice(0, 5).join(' | ')}`);
  });
}

// ---- font scaling: the app is rem-based, so Android "font size" maps to the root font size ----
for (const pct of [130, 200]) {
  for (const key of ['android-small', 'pixel7', 'iphone-se']) {
    const d = DEVICES.find((x) => x.key === key);
    test(`NFR-DEV-04-${pct}-${key}`, `${pct === 200 ? '[FB-82] ' : ''}${d.label} at ${pct}% font: no horizontal overflow, nothing clipped, Pause/Next/nav still reachable`, async ({ session }) => {
      const s = await openDevice(session, d);
      await s.page.evaluate((p) => { document.documentElement.style.fontSize = p + '%'; }, pct);
      await sleep(500);
      const issues = [];
      for (const t of ['Learn', 'Progress', 'Library', 'More']) {
        await tab(s, t); await sleep(350);
        const m = await s.page.evaluate(PROBE);
        if (m.docW > m.vw + 1) issues.push(`${t}: horizontal overflow ${m.docW} > ${m.vw}`);
        if (m.offscreen.length) issues.push(`${t}: past the edge: ${m.offscreen.join('; ')}`);
        if (m.clipped.length) issues.push(`${t}: clipped: ${m.clipped.join('; ')}`);
        if (!m.navBox || m.navBox.b > m.vh + 1) issues.push(`${t}: bottom nav lost`);
        if (t === 'Learn') {
          // controls may scroll below the fold at 200%, but must exist, be big enough and reachable by scrolling
          for (const l of ['Pause', 'Next Word']) { const b = m.buttons[l]; if (!b) issues.push(`Learn: "${l}" missing`); else if (small(b)) issues.push(`Learn: "${l}" ${b.w}x${b.h}`); }
          const reach = await s.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Pause' && x.offsetParent); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
          if (!reach) issues.push('Learn: Pause cannot be scrolled into view');
        }
      }
      ok(!issues.length, `${d.label} @${pct}%: ${issues.join(' | ')}`);
    });
  }
}
