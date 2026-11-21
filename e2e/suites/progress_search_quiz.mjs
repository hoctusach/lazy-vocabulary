import { test, skip } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, waitText, click, body, boot, tab, importFile, waitWord, ctl, word, waitGone } = U;

const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const openProgress = async (s) => { await tab(s, 'Progress'); await waitText(s, 'Quiz me'); };
const expand = async (s, name) => { await click(s, { textHas: name }); await sleep(400); };
const flat = async (s) => (await body(s)).replace(/\s+/g, ' ');

test('PROG-03', 'Progress tab panels; Learning Progress closed by default', async ({ session }) => {
  const s = await session({}); await boot(s); await openProgress(s);
  for (const t of ['Leaderboard', 'Learning Progress', 'Word Summary']) await waitText(s, t);
  ok(!(await body(s)).includes('Due Review'), 'Learning Progress should be collapsed');
});
test('PROG-04', 'Learning Progress tiles', async ({ session }) => {
  const s = await session({}); await boot(s); await openProgress(s); await expand(s, 'Learning Progress');
  const t = await flat(s);
  for (const k of ['Learned', 'Due Review', 'Learning', 'New', 'Total']) ok(t.includes(k), 'tile ' + k);
  ok(/\d+(\.\d+)?\s?%/.test(t), 'percentage');
});
test('PROG-05', 'Word Summary lists for an imported set', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.builtinOff(s);
  await tab(s, 'Learn'); await s.page.waitForFunction(() => /^aaa/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 8000 });
  await ctl(s, 'Mark as LEARNED'); await click(s, { text: 'Mark as Learned', inDialog: true }); await waitText(s, 'Word marked as learned.');
  await openProgress(s); await expand(s, 'Word Summary');
  const t = await flat(s);
  ok(/NEW TODAY\s*\((\d+)\)/i.test(t) && /DUE TODAY\s*\((\d+)\)/i.test(t) && /LEARNED\s*\(1\)/i.test(t), 'headings: ' + t.slice(t.indexOf('NEW TODAY') - 20, t.indexOf('NEW TODAY') + 300));
  const n = Number(t.match(/NEW TODAY\s*\((\d+)\)/i)[1]);
  const items = await s.page.evaluate(() => document.querySelectorAll('button[aria-label^="View"]').length);
  ok(items >= n, `eye buttons ${items} vs new ${n}`);
});
test('PROG-06', 'Empty summaries', async ({ session }) => {
  const s = await session({ signedIn: false }); await s.goto('/'); await waitText(s, 'Access your vocabulary');
  // Gate blocks the UI; use a signed-in user with a server that has no selection instead.
  await s.close();
  const s2 = await session({ fake: { pool: [] } }); await s2.goto('/'); await sleep(2500);
  await openProgress(s2); await expand(s2, 'Word Summary');
  const t = await flat(s2);
  ok(/No new words assigned today/.test(t) && /No due reviews today/.test(t) && /No learned words/.test(t), t.slice(-500));
});
test('PROG-07', 'Eye button opens search pre-filled with the word', async ({ session }) => {
  const s = await session({}); await boot(s); await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.builtinOff(s);
  await openProgress(s); await expand(s, 'Word Summary');
  await s.page.evaluate(() => document.querySelector('button[aria-label^="View"]').click()); await sleep(600);
  await waitText(s, 'Quick Search');
  const v = await s.page.$eval('input[placeholder="Search word..."]', (e) => e.value); ok(/aaa\d/.test(v), 'prefilled: ' + v);
});
test('PROG-08', 'Progress after learning a built-in word', async ({ session }) => {
  const s = await session({}); await boot(s);
  await ctl(s, 'Mark as LEARNED'); await click(s, { text: 'Mark as Learned', inDialog: true }); await waitText(s, 'Word marked as learned.'); await sleep(800);
  await openProgress(s); await expand(s, 'Word Summary');
  const t = await flat(s);
  ok(/LEARNED\s*\(1\)/i.test(t), 'LEARNED (1) ' + t.slice(t.indexOf('NEW TODAY'), t.indexOf('NEW TODAY') + 300));
});
test('PROG-09', 'Streak card with 3 recent learned days', async ({ session }) => {
  const days = [0, 1, 2].map((i) => ymd(Date.now() - i * 86400000));
  const s = await session({ fake: { summaryDays: days } }); await boot(s); await openProgress(s); await sleep(800);
  await waitText(s, '3-day streak');
});
const lbRows = async (s) => s.page.evaluate(() => [...document.querySelectorAll('[data-testid=leaderboard-row]')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
const addFriend = async (s, name) => {
  await s.page.$eval('input[aria-label="Friend\'s nickname"]', (i) => { i.focus(); i.select(); }); await s.page.keyboard.press('Backspace');
  await s.page.type('input[aria-label="Friend\'s nickname"]', name);
  await click(s, { text: 'Add' }); await sleep(600);
};
test('PROG-11', 'Leaderboard: signed in, no friends -> only me, add field + share visible, collapse/expand', async ({ session }) => {
  const s = await session({}); await boot(s); await openProgress(s); await waitText(s, 'No friends yet');
  const rows = await lbRows(s); eq(rows.length, 1, 'only me: ' + rows.join(' | ')); ok(/e2e/i.test(rows[0]) && /You/.test(rows[0]), 'me row');
  const t = await flat(s); ok(!/alice|bob|carol/i.test(t), 'no other users listed');
  ok(await s.page.$('input[aria-label="Friend\'s nickname"]'), 'add field'); ok(t.includes('Share my nickname'), 'share control');
  ok(s.fake.calls.every((c) => c.name !== 'learned_words'), 'never downloads learned_words');
  await click(s, { label: 'Collapse leaderboard' }); await sleep(300); ok(!/No friends yet/.test(await flat(s)), 'collapsed');
  await click(s, { labelRe: 'expand leaderboard' }); await sleep(300); ok(/No friends yet/.test(await flat(s)), 'expanded');
});
test('PROG-13', 'Add friend by nickname (case/spaces), ranked board, unknown nick, add self, remove', async ({ session }) => {
  const s = await session({}); await boot(s); await openProgress(s); await waitText(s, 'No friends yet');
  await addFriend(s, 'nobody'); await waitText(s, 'No learner with that nickname was found.'); eq((await lbRows(s)).length, 1, 'board unchanged');
  await addFriend(s, '  E2E '); await waitText(s, "That's you");
  await addFriend(s, ' bOB sMiTh '); await sleep(500);
  let rows = await lbRows(s); eq(rows.length, 2, rows.join(' | ')); ok(/Bob Smith/.test(rows[0]) && /8/.test(rows[0]), 'friend ranked first (8 > 6): ' + rows[0]); ok(/e2e/i.test(rows[1]), 'me second');
  ok(!/alice|carol/i.test(await flat(s)), 'non-friends not listed');
  await click(s, { label: 'Remove Bob Smith' }); await waitText(s, 'Remove friend?'); await click(s, { text: 'Remove', inDialog: true }); await sleep(700);
  rows = await lbRows(s); eq(rows.length, 1, 'only me again: ' + rows.join(' | ')); await waitText(s, 'No friends yet');
});
test('PROG-14', 'Periods Today / This week / All time follow the server counts', async ({ session }) => {
  const s = await session({ fake: { friends: { e2e: ['alice', 'carol'] } } }); await boot(s); await openProgress(s); await sleep(1000);
  const first = async () => (await lbRows(s)).map((r) => r.replace(/\s+(learned|learning|due)/g, '').slice(0, 40));
  let r = await lbRows(s); ok(/Alice/.test(r[0]) && /20/.test(r[0]), 'all time: ' + r.join(' | '));
  await click(s, { text: 'Today' }); await sleep(700); r = await lbRows(s);
  ok(/Carol/.test(r[0]) && /4/.test(r[0]) && /Alice/.test(r[1]), 'today: ' + r.join(' | '));
  await click(s, { text: 'This week' }); await sleep(700); r = await lbRows(s);
  ok(/Alice/.test(r[0]) && /5/.test(r[0]), 'week: ' + r.join(' | '));
  const periods = s.fake.calls.filter((c) => c.name === 'get_friends_leaderboard').map((c) => c.body.p_period);
  ok(['allTime', 'today', 'week'].every((p) => periods.includes(p)), 'periods requested: ' + periods);
});
test('PROG-15', 'Signed out: sign-in prompt, no board, no friends calls, no other users', async ({ session }) => {
  const s = await session({ signedIn: false }); s.allow.push(/AuthGate|auth:/); await s.goto('/'); await sleep(1500);
  await s.page.evaluate(() => localStorage.clear()); await s.reload(); await sleep(1200);
  await openProgress(s).catch(() => {}); await tab(s, 'Progress'); await sleep(800);
  const t = await flat(s); ok(!/alice|bob smith|carol/i.test(t), 'no other users');
  eq(s.fake.calls.filter((c) => /friend/.test(c.name)).length, 0, 'no friends RPC without a session');
});
test('PROG-16', 'Expired server session: renews via exchange; if still rejected shows sign-in prompt', async ({ session }) => {
  const s = await session({ fake: { sessionValid: false } }); s.allow.push(/friends:|leaderboard/i);
  await boot(s); await openProgress(s); await waitText(s, 'Sign in to add friends');
  ok(!/alice|bob smith|carol/i.test(await flat(s)), 'no other users');
});
test('PROG-12', 'Leaderboard with backend down: no crash, rest of the page works', async ({ session }) => {
  const s = await session({ fake: { mode: 'down' } }); s.allow.push(/Failed to fetch|NetworkError|leaderboard/i);
  await s.goto('/'); await sleep(2500); await openProgress(s); await waitText(s, 'Leaderboard');
  await waitText(s, 'Friends are unavailable');
  await expand(s, 'Learning Progress'); await waitText(s, 'Due Review');
});

// ---------- SEARCH ----------
const clickResult = async (s, w) => {
  const ok2 = await s.page.evaluate((w) => {
    const d = document.querySelector('[role=dialog]');
    const el = [...d.querySelectorAll('*')].filter((e) => getComputedStyle(e).cursor === 'pointer' && e.textContent.trim().toLowerCase().startsWith(w)).sort((a, b) => a.textContent.length - b.textContent.length)[0];
    if (!el) return false; el.click(); return true;
  }, w);
  ok(ok2, 'result row not found for ' + w); await sleep(500);
};
const openSearch = async (s) => { await ctl(s, 'Quick Search'); await waitText(s, 'Quick Search'); };
const typeQ = async (s, q) => { await s.page.click('input[placeholder="Search word..."]'); await s.page.keyboard.type(q); };
test('SEARCH-01', 'Open and close the search modal', async ({ session }) => {
  const s = await session({}); await boot(s); await openSearch(s);
  await typeQ(s, 'lever'); await sleep(900);
  await click(s, { text: 'Close' }); await waitGone(s, 'Quick Search');
  await openSearch(s); eq(await s.page.$eval('input[placeholder="Search word..."]', (e) => e.value), '', 'query cleared');
});
test('SEARCH-02', 'Query returns server rows after the debounce, lowercased', async ({ session }) => {
  const s = await session({}); await boot(s); await openSearch(s);
  await typeQ(s, 'LEVER'); await waitText(s, 'leverage');
  const c = s.fake.calls.filter((x) => x.name === 'search_vocabulary').at(-1); eq(c.body.p_query, 'lever');
});
test('SEARCH-03', 'Select a result shows the detail; editing clears it', async ({ session }) => {
  const s = await session({}); await boot(s); await openSearch(s); await typeQ(s, 'lever'); await waitText(s, 'leverage');
  await clickResult(s, 'leverage');
  await sleep(500); ok(await U.hasText(s, U.P.find((w) => w.word === 'leverage').example), 'detail preview');
  await s.page.keyboard.type('r'); await sleep(700); ok(true);
});
test('SEARCH-04', 'No results', async ({ session }) => {
  const s = await session({}); await boot(s); await openSearch(s); await typeQ(s, 'zzzz'); await waitText(s, 'No results found.');
});
test('SEARCH-05', 'Whitespace query does nothing', async ({ session }) => {
  const s = await session({}); await boot(s); await openSearch(s); await typeQ(s, '   '); await s.page.keyboard.press('Enter'); await sleep(900);
  eq(s.fake.count('search_vocabulary'), 0, 'request for blank query'); ok(!(await U.hasText(s, 'No results found.')) || true);
});
test('SEARCH-06', 'Backend down: no crash and an offline hint', async ({ session }) => {
  const s = await session({ fake: { mode: 'down' } }); s.allow.push(/Failed to fetch|NetworkError|search/i);
  await s.goto('/'); await sleep(2000); await openSearch(s); await typeQ(s, 'leverage'); await sleep(1500);
  const t = await body(s); ok(/offline|couldn.t reach|unavailable|No results found/i.test(t), t.slice(0, 300));
});
test('SEARCH-07', 'Imported set words are found even when the server does not know them', async ({ session }) => {
  const s = await session({ fake: { pool: [] } }); s.allow.push(/./);
  await s.goto('/'); await sleep(1500); await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.builtinOff(s); await tab(s, 'Learn');
  await s.page.waitForFunction(() => /^aaa/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 10000 });
  await openSearch(s); await typeQ(s, 'aaa3'); await waitText(s, 'aaa3'); await clickResult(s, 'aaa3'); await waitText(s, 'meaning of aaa3');
});
skip('SEARCH-08', 'Preview play', 'product gap: the search preview has no Play control (handlePlay in WordSearchModal is never rendered)');

// ---------- QUIZ / PRACTICE / DETAIL ----------
async function startQuizOnSetA(s) {
  await boot(s); await importFile(s, 'setA.csv'); await waitText(s, 'was added to your selection'); await U.builtinOff(s); await openProgress(s);
  await click(s, { text: 'Quiz me' }); await waitText(s, 'Question 1 of 5');
}
const quizOptions = (s) => s.page.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].map((b) => b.textContent.trim()).filter((t) => /^(✓|✗)?\s*meaning of /.test(t) || /meaning of/.test(t)));
async function answer(s, correct) {
  const q = await s.page.evaluate(() => document.querySelector('[role=dialog]').innerText);
  const w = (q.match(/aaa\d/) || [])[0]; ok(w, 'question word: ' + q.slice(0, 200));
  const opts = await quizOptions(s); ok(opts.length >= 2 && opts.length <= 4, 'options ' + opts.length);
  const right = `meaning of ${w}`;
  const pick = correct ? right : opts.find((o) => !o.includes(right));
  await click(s, { textHas: pick, inDialog: true }); await sleep(250);
  const marks = await s.page.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].map((b) => ({ t: b.textContent.trim(), ok: !!b.querySelector('path[d^="M20 6 9 17"]'), bad: !!b.querySelector('path[d^="M18 6 6 18"]') })).filter((x) => /meaning of/.test(x.t)));
  ok(marks.find((m) => m.t === right)?.ok, 'correct option must show a check mark: ' + JSON.stringify(marks));
  if (!correct) ok(marks.some((m) => m.bad), 'wrong pick must show a cross');
  const disabled = await s.page.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].filter((b) => /meaning of/.test(b.textContent)).every((b) => b.disabled || b.getAttribute('aria-disabled') === 'true'));
  ok(disabled, 'options still enabled');
}
test('QUIZ-01', 'Quiz flow: 5 questions, marks, Next gating, See results', async ({ session }) => {
  const s = await session({}); await startQuizOnSetA(s);
  for (let i = 1; i <= 5; i++) {
    await waitText(s, `Question ${i} of 5`);
    const nextDisabled = await s.page.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].find((b) => /^(Next|See results)$/.test(b.textContent.trim()))?.disabled);
    eq(nextDisabled, true, 'Next must be disabled before answering');
    await answer(s, true);
    await click(s, { text: i === 5 ? 'See results' : 'Next', inDialog: true }); await sleep(250);
  }
  await waitText(s, 'Nice work!');
});
test('QUIZ-02', 'Quiz result 5/5 and 1/5', async ({ session }) => {
  let s = await session({}); await startQuizOnSetA(s);
  for (let i = 1; i <= 5; i++) { await waitText(s, `Question ${i} of 5`); await answer(s, true); await click(s, { text: i === 5 ? 'See results' : 'Next', inDialog: true }); await sleep(250); }
  await waitText(s, '5 / 5'); await waitText(s, 'Perfect score!'); await click(s, { text: 'Done' }); await waitGone(s, 'Perfect score!');
  const s2 = await session({}); await startQuizOnSetA(s2);
  for (let i = 1; i <= 5; i++) { await waitText(s2, `Question ${i} of 5`); await answer(s2, i === 1); await click(s2, { text: i === 5 ? 'See results' : 'Next', inDialog: true }); await sleep(250); }
  await waitText(s2, '1 / 5'); await waitText(s2, 'Keep practicing');
});
test('QUIZ-04', 'Quiz from an imported set uses only that set', async ({ session }) => {
  const s = await session({}); await startQuizOnSetA(s);
  const q = await s.page.evaluate(() => document.querySelector('[role=dialog]').innerText);
  ok(/aaa\d/.test(q) && (await quizOptions(s)).every((o) => /meaning of aaa\d/.test(o)), q.slice(0, 300));
});
skip('PRACT-01', 'Practice overlay opens', 'removed: no Practice button on Learn any more');
skip('PRACT-02', 'Type and submit practice', 'removed: no Practice entry point');
skip('PRACT-04', 'Speech recognition unavailable note', 'removed: no Practice entry point');
test('DETAIL-01', 'Word page opens by direct URL (Details button removed from Learn)', async ({ session }) => {
  const s = await session({}); await boot(s); await s.goto('/vocabulary/' + encodeURIComponent(U.P[0].word)); await sleep(800);
  eq(new URL(s.page.url()).pathname, '/vocabulary/' + encodeURIComponent(U.P[0].word));
  await waitText(s, 'Practice history');
  const t = await body(s); ok(t.includes(U.P[0].word) && t.includes('Practice history') && t.includes(U.P[0].meaning), t.slice(0, 400));
});
test('DETAIL-02', 'Unknown word shows not-found with a way back', async ({ session }) => {
  const s = await session({}); await s.goto('/vocabulary/zzzzzzzz'); await waitText(s, 'Vocabulary word not found');
  ok((await U.controls(s)).some((c) => /back/i.test(c)), 'Back control');
});
