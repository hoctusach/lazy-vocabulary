// Study reminders (More tab). The native plugin is replaced by a mock at window.__LV_LOCAL_NOTIFICATIONS__.
import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, waitText, boot, tab } = U;

const mock = (display) => `
  window.__ln = { display: ${JSON.stringify(display)}, pending: [], calls: [] };
  window.__LV_LOCAL_NOTIFICATIONS__ = {
    checkPermissions: async () => ({ display: window.__ln.display }),
    requestPermissions: async () => { window.__ln.calls.push('request'); if (window.__ln.display === 'prompt') window.__ln.display = window.__ln.grant === false ? 'denied' : 'granted'; return { display: window.__ln.display }; },
    getPending: async () => ({ notifications: window.__ln.pending.map((n) => ({ id: n.id, extra: n.extra })) }),
    cancel: async (o) => { window.__ln.calls.push('cancel'); window.__ln.pending = window.__ln.pending.filter((n) => !o.notifications.some((c) => c.id === n.id)); },
    schedule: async (o) => { window.__ln.calls.push('schedule'); window.__ln.pending.push(...o.notifications); },
    addListener: async () => ({ remove() {} }),
  };`;
const ln = (s) => s.page.evaluate(() => ({ display: window.__ln.display, n: window.__ln.pending.length, calls: window.__ln.calls.slice(), first: window.__ln.pending[0] && { title: window.__ln.pending[0].title, body: window.__ln.pending[0].body, icon: window.__ln.pending[0].smallIcon, extra: window.__ln.pending[0].extra }, hours: [...new Set(window.__ln.pending.map((p) => new Date(p.schedule.at).toTimeString().slice(0, 5)))].sort() }));
const settle = () => sleep(500);
const toggle = (s) => s.page.click('[data-testid=reminders-toggle]');

test('REM-01', 'Web without the plugin: no reminders card, no errors', async ({ session }) => {
  const s = await session({}); await boot(s); await tab(s, 'More'); await waitText(s, 'More');
  await sleep(500);
  ok(!(await s.page.$('[data-testid=reminders-card]')), 'card must be hidden without plugin');
});

test('REM-02', 'Granted: toggle on schedules 3 slots/day, edit time and slot-off re-plan, toggle off cancels all [FB-07]', async ({ session }) => {
  const s = await session({ initScript: mock('granted') }); await boot(s); await tab(s, 'More');
  await s.page.waitForSelector('[data-testid=reminders-card]');
  eq(await s.page.$('[data-testid=reminders-slots]'), null, 'slots hidden while off');
  await toggle(s); await s.page.waitForSelector('[data-testid=reminders-slots]'); await settle();
  let r = await ln(s);
  ok(r.n >= 36 && r.n <= 42, `scheduled ${r.n}`);
  eq(r.hours, ['08:00', '12:30', '20:30']);
  eq(r.first.icon, 'ic_stat_notify'); ok(r.first.extra.lvReminder && r.first.extra.route === 'learn', 'extra');
  ok(/Lazy Vocabulary/.test(r.first.title) && r.first.body.length > 5, 'copy');
  eq(await s.page.$$eval('[data-testid^=reminder-slot-on-]', (e) => e.length), 3, 'max 3 slots');
  // time edit (native time input)
  await s.page.$eval('[data-testid=reminder-slot-time-1]', (el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '13:15'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await settle(); eq((await ln(s)).hours, ['08:00', '13:15', '20:30']);
  // slot off
  await s.page.click('[data-testid=reminder-slot-on-0]'); await settle();
  eq((await ln(s)).hours, ['13:15', '20:30']);
  // persists across reload
  await s.reload(); await tab(s, 'More'); await s.page.waitForSelector('[data-testid=reminders-slots]');
  eq(await s.page.$eval('[data-testid=reminder-slot-time-1]', (e) => e.value), '13:15');
  // off cancels all
  await toggle(s); await settle();
  eq((await ln(s)).n, 0, 'all cancelled');
  eq(await s.page.$('[data-testid=reminders-slots]'), null);
});

test('REM-03', 'Denied: toggle stays off with a short hint and nothing is scheduled', async ({ session }) => {
  const s = await session({ initScript: mock('denied') }); await boot(s); await tab(s, 'More');
  await s.page.waitForSelector('[data-testid=reminders-card]');
  await toggle(s); await s.page.waitForSelector('[data-testid=reminders-denied]');
  eq(await s.page.$eval('[data-testid=reminders-toggle]', (e) => e.checked), false);
  eq((await ln(s)).n, 0);
});

test('REM-04', 'Prompt state: nothing asked on launch; turning the toggle on asks once', async ({ session }) => {
  const s = await session({ initScript: mock('prompt') }); await boot(s); await sleep(1500);
  eq((await ln(s)).calls.includes('request'), false, 'no prompt on launch');
  await tab(s, 'More'); await s.page.waitForSelector('[data-testid=reminders-card]');
  await toggle(s); await s.page.waitForSelector('[data-testid=reminders-slots]'); await settle();
  eq((await ln(s)).calls.filter((c) => c === 'request').length, 1);
  ok((await ln(s)).n > 0, 'scheduled after grant');
});

// ---------- [FB-73] / [FB-74] reminder Play action, cold start, new day without opening the app ----------
const mockAction = (retained) => `
  window.__ln = { display: 'granted', pending: [], calls: [], types: null, cb: null };
  window.__LV_LOCAL_NOTIFICATIONS__ = {
    checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
    getPending: async () => ({ notifications: window.__ln.pending.map((n) => ({ id: n.id, extra: n.extra })) }),
    cancel: async (o) => { window.__ln.pending = window.__ln.pending.filter((n) => !o.notifications.some((c) => c.id === n.id)); },
    schedule: async (o) => { window.__ln.calls.push('schedule'); window.__ln.pending.push(...o.notifications); },
    registerActionTypes: async (o) => { window.__ln.types = o.types; },
    addListener: async (ev, cb) => { window.__ln.cb = cb; ${retained ? "setTimeout(() => cb({ actionId: 'play', notification: { extra: { lvReminder: true } } }), 0);" : ''} return { remove() {} }; },
  };`;
const fire = (s, actionId) => s.page.evaluate((a) => window.__ln.cb({ actionId: a, notification: { extra: { lvReminder: true, route: 'learn' } } }), actionId);

test('REM-05', 'Reminders carry a Play action type; scheduled notifications reference it [FB-74]', async ({ session }) => {
  const s = await session({ initScript: mockAction(false) }); await boot(s); await tab(s, 'More');
  await s.page.waitForSelector('[data-testid=reminders-card]');
  await toggle(s); await s.page.waitForSelector('[data-testid=reminders-slots]'); await settle();
  const r = await s.page.evaluate(() => ({ types: window.__ln.types, ids: [...new Set(window.__ln.pending.map((n) => n.actionTypeId))] }));
  eq(r.types[0].actions.map((a) => a.id), ['play']); eq(r.types[0].actions[0].title, 'Play');
  eq(r.ids, ['lv-reminder']);
});

test('REM-06', 'Play action while paused resumes today\'s playback; a plain tap only opens Learn (no autoplay) [FB-74]', async ({ session }) => {
  const s = await session({ initScript: mockAction(false) }); await boot(s);
  await s.page.waitForFunction(() => !!window.__ln.cb); await sleep(300);
  await U.ctl(s, 'Pause'); await waitText(s, 'Playback paused'); ok(await U.label(s, 'Play'), 'paused');
  await tab(s, 'More');
  await fire(s, 'tap'); await sleep(800);
  ok(await U.label(s, 'Play'), 'a plain tap must not start playback');
  await tab(s, 'More');
  await fire(s, 'play'); await sleep(1200);
  ok(await U.label(s, 'Pause'), 'Play action must resume playback (Pause button visible)');
  eq(await s.page.$eval('nav[aria-label=Primary] [aria-current=page]', (e) => e.textContent.trim()), 'Learn', 'opens Learn');
});

test('REM-07', 'Cold start with a retained Play action: today\'s words load, then playback starts once [FB-74]', async ({ session }) => {
  const s = await session({ initScript: mockAction(true) });
  await s.goto('/'); await U.waitWord(s, U.POOL_ORDER[0], 12000); await U.waitSpeech(s, U.re0); await sleep(500);
  ok(await U.label(s, 'Pause'), 'playing after cold-start Play');
});

test('REM-08', 'New day without opening the app: clock crosses midnight, today\'s plan + reminders refresh [FB-74]', async ({ session }) => {
  const clock = `(() => { const R = Date; let off = 0; window.__setClock = (ms) => { off = ms; };
    class D extends R { constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); } static now() { return R.now() + off; } }
    window.Date = D; })();`;
  const s = await session({ initScript: clock + mockAction(false) }); await boot(s);
  await tab(s, 'More'); await s.page.waitForSelector('[data-testid=reminders-card]');
  await toggle(s); await s.page.waitForSelector('[data-testid=reminders-slots]'); await settle();
  const before = await s.page.evaluate(() => ({ plan: JSON.parse(localStorage.getItem('lazyVoca.todayPlan.v1') || 'null'), sched: window.__ln.calls.filter((c) => c === 'schedule').length }));
  ok(before.plan && before.plan.date, 'plan for today exists');
  // Phone sat unused overnight: the clock is now 26h later, no timer ran; the app comes back to the foreground.
  await s.page.evaluate(() => { window.__setClock(26 * 3600 * 1000); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(1500);
  const after = await s.page.evaluate(() => ({ plan: JSON.parse(localStorage.getItem('lazyVoca.todayPlan.v1') || 'null'), sched: window.__ln.calls.filter((c) => c === 'schedule').length, first: window.__ln.pending[0] && new Date(window.__ln.pending[0].schedule.at).getTime() }));
  ok(!after.plan || after.plan.date !== before.plan.date, 'yesterday\'s frozen plan must be dropped/re-snapshotted on the new day: ' + JSON.stringify(after.plan));
  ok(after.sched > before.sched, 'reminders re-planned on the new day');
});
