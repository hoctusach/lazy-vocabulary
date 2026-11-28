// [FB-69] iPad / large-screen layout: no overflow, readable column, two columns on wide screens.
// The iPad viewports are >= 768px, so the app uses its non-tab "desktop" page (see TAB-07); the tablet CSS
// (src/styles/tablet.css) constrains it. Real iPad Safari/WKWebView rendering is proxy/manual (catalog).
import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, boot } = U;

const IPAD_UA = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const vp = (width, height) => ({ width, height, deviceScaleFactor: 1, isMobile: false, hasTouch: true });
const SIZES = [
  { id: 'IPAD-PORTRAIT-13', label: '13" iPad portrait 1024x1366', w: 1024, h: 1366, cols: 1 },
  { id: 'IPAD-LANDSCAPE-13', label: '13" iPad landscape 1366x1024', w: 1366, h: 1024, cols: 2 },
  { id: 'IPAD-PORTRAIT-11', label: '11" iPad portrait 834x1194', w: 834, h: 1194, cols: 1 },
  { id: 'IPAD-LANDSCAPE-11', label: '11" iPad landscape 1194x834', w: 1194, h: 834, cols: 2 },
];

/** Measure layout facts in the page. */
const MEASURE = `(() => {
  const vw = document.documentElement.clientWidth;
  const vis = (e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && !e.closest('[aria-hidden=true],[hidden]'); };
  const clipped = [];
  for (const e of document.querySelectorAll('main *, header *, footer *')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      // inside a horizontally scrollable strip is fine
      let p = e.parentElement, scroll = false;
      while (p && p !== document.body) { const ox = getComputedStyle(p).overflowX; if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth) { scroll = true; break; } p = p.parentElement; }
      if (!scroll) clipped.push((e.tagName + '.' + String(e.className).slice(0, 40)) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    }
  }
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const stack = document.querySelector('.lv-learn-stack');
  const card = document.querySelector('[data-lv-main-card]');
  const panels = [...(stack ? stack.children : [])].filter((c) => !c.hasAttribute('data-lv-main-card') && vis(c));
  const text = document.body.innerText;
  return {
    layout: document.querySelector('[data-layout]')?.dataset.layout,
    vw, innerW: window.innerWidth,
    docScrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth,
    clipped: clipped.slice(0, 6),
    tabbar: !!document.querySelector('nav[aria-label=Primary]'),
    stack: rect(stack), card: rect(card), firstPanel: rect(panels[0]), lastPanel: rect(panels.at(-1)),
    gridCols: stack ? getComputedStyle(stack).gridTemplateColumns.split(' ').length : 0,
    hasLibrary: /Library/.test(text), hasProgress: /Learning Progress/.test(text), hasStreak: /streak/i.test(text),
    hasWord: !!document.querySelector('main h1'),
  };
})()`;

async function openIpad(session, size) {
  const s = await session({ viewport: vp(size.w, size.h) });
  await s.page.setUserAgent(IPAD_UA);
  await boot(s);
  await sleep(300);
  return s;
}

function assertLayout(m, size) {
  eq(m.layout, 'desktop', `${size.label}: tablet uses the wide layout`);
  ok(!m.tabbar, `${size.label}: no phone tab bar on iPad`);
  ok(m.docScrollW <= m.innerW + 1, `${size.label}: horizontal page overflow (scrollWidth ${m.docScrollW} > ${m.innerW})`);
  ok(m.bodyScrollW <= m.innerW + 1, `${size.label}: body overflow ${m.bodyScrollW} > ${m.innerW}`);
  eq(m.clipped, [], `${size.label}: elements cut off by the viewport edge`);
  ok(m.hasWord && m.card, `${size.label}: word card rendered`);
  ok(m.hasStreak && m.hasProgress && m.hasLibrary, `${size.label}: streak, Learning Progress and Library present (${JSON.stringify({ s: m.hasStreak, p: m.hasProgress, l: m.hasLibrary })})`);
  ok(m.card.left >= 0 && m.card.right <= m.innerW, `${size.label}: card inside the viewport`);
  ok(m.stack && m.stack.width <= 1216 + 1, `${size.label}: Learn stack must not stretch edge to edge (width ${m.stack?.width})`);
  if (size.cols === 1) {
    ok(m.stack.width <= 768 + 1, `${size.label}: portrait column should be a readable <=48rem column (width ${m.stack.width})`);
    eq(m.gridCols, 1, `${size.label}: single column`);
    ok(m.firstPanel.top >= m.card.bottom - 1, `${size.label}: panels stack under the card`);
  } else {
    eq(m.gridCols, 2, `${size.label}: two columns`);
    ok(m.card.right <= m.firstPanel.left + 1, `${size.label}: card left of the panels (card.right ${m.card.right}, panel.left ${m.firstPanel.left})`);
    ok(Math.abs(m.firstPanel.top - m.card.top) < 40, `${size.label}: panels start level with the card (${m.firstPanel.top} vs ${m.card.top})`);
    ok(m.card.width >= 380, `${size.label}: card is not squeezed (${m.card.width}px)`);
    ok(m.firstPanel.width >= 380, `${size.label}: panels are not squeezed (${m.firstPanel.width}px)`);
  }
}

for (const size of SIZES) {
  test(`E2E-${size.id}`, `[FB-69][FB-85] ${size.label}: no overflow, constrained cards, ${size.cols === 2 ? 'two-column Learn' : 'single readable column'}`, async ({ session }) => {
    const s = await openIpad(session, size);
    assertLayout(await s.page.evaluate(MEASURE), size);
    // Main controls are real touch targets (>= 40px) and inside the viewport.
    const controls = await s.page.evaluate(() => ['Pause', 'Next Word', 'Quick Search'].map((l) => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === l && x.offsetParent); const r = b?.getBoundingClientRect(); return { l, w: r?.width ?? 0, h: r?.height ?? 0, inView: !!r && r.right <= window.innerWidth && r.left >= 0 }; }));
    for (const c of controls) ok(c.w >= 40 && c.h >= 40 && c.inView, `${size.label}: control ${JSON.stringify(c)}`);
    // [FB-85] the summary card is titled TODAY on iPad (iOS UA), never "Word Summary"
    const heads = await s.page.evaluate(() => [...document.querySelectorAll('[data-testid="word-summary-section"] h3')].map((h) => h.textContent.trim()));
    eq(heads, ['TODAY']);
    ok(!(await U.body(s)).includes('Word Summary'), `${size.label}: [FB-85] old title still visible`);
  });
}

test('E2E-IPAD-SCROLL', '[FB-69] iPad: scrolling to Library keeps content inside the viewport (portrait + landscape)', async ({ session }) => {
  for (const size of [SIZES[0], SIZES[1]]) {
    const s = await openIpad(session, size);
    await s.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(300);
    const m = await s.page.evaluate(MEASURE);
    ok(m.docScrollW <= m.innerW + 1, `${size.label}: overflow after scroll ${m.docScrollW}`);
    eq(m.clipped, [], `${size.label}: clipped after scroll`);
    const lib = await s.page.evaluate(() => { const w = document.querySelector('.lv-library-wrap'); const r = w?.getBoundingClientRect(); return r ? { width: r.width, left: r.left, right: r.right } : null; });
    ok(lib && lib.width <= 1216 + 1 && lib.left >= 0 && lib.right <= m.innerW, `${size.label}: Library column ${JSON.stringify(lib)}`);
  }
});

test('E2E-IPAD-ROTATE', '[FB-69] iPad rotation: portrait -> landscape -> portrait re-flows 1 -> 2 -> 1 columns without reload or overflow, playback survives', async ({ session }) => {
  const s = await openIpad(session, SIZES[0]);
  const word = await U.word(s);
  eq((await s.page.evaluate(MEASURE)).gridCols, 1, 'portrait starts single column');
  await s.page.setViewport(vp(1366, 1024)); await sleep(500);
  let m = await s.page.evaluate(MEASURE);
  eq(m.gridCols, 2, 'landscape two columns'); ok(m.docScrollW <= m.innerW + 1, 'no overflow in landscape');
  await s.page.setViewport(vp(1024, 1366)); await sleep(500);
  m = await s.page.evaluate(MEASURE);
  eq(m.gridCols, 1, 'back to one column'); ok(m.docScrollW <= m.innerW + 1, 'no overflow back in portrait');
  eq(await U.word(s), word, 'same word after rotating (state kept, no reload)');
});

test('E2E-IPAD-PHONE', '[FB-69] phone width still gets the tab shell (iPad layout does not leak to iPhone)', async ({ session }) => {
  const s = await session({ viewport: { width: 430, height: 932, deviceScaleFactor: 1, isMobile: true, hasTouch: true } });
  await boot(s);
  const m = await s.page.evaluate(MEASURE);
  ok(m.tabbar, 'tab bar on iPhone width'); eq(m.layout, 'mobile'); eq(m.gridCols, 0, 'no tablet grid on phone');
  ok(m.docScrollW <= m.innerW + 1, 'no overflow on phone');
});
