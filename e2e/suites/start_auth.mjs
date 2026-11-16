import { test } from '../lib/framework.mjs';
import * as U from '../lib/ui.mjs';
import { sleep } from '../lib/harness.mjs';
const { ok, eq, waitText, click, body } = U;

const NICK = 'input[placeholder="e.g., Mi mi U"]';
async function fill(s, nick, pass) {
  await s.page.click(NICK, { clickCount: 3 }); await s.page.keyboard.press('Backspace');
  await s.page.type(NICK, nick);
  await s.page.click('input[type=password]', { clickCount: 3 }); await s.page.keyboard.press('Backspace');
  if (pass) await s.page.type('input[type=password]', pass);
}
const submit = (s, name = 'Sign in') => click(s, { text: name });
const gate = async (s) => { await s.goto('/'); await waitText(s, 'Access your vocabulary'); };

test('START-01', 'Cold start signed-out: no blank page, header, AuthGate over Learn', async ({ session }) => {
  const s = await session({ signedIn: false });
  const t0 = Date.now();
  await s.goto('/');
  await waitText(s, 'Access your vocabulary');
  ok(Date.now() - t0 < 5000, 'slow start');
  ok((await s.page.$eval('h1', (e) => e.textContent)).includes('Lazy Vocabulary'), 'header');
  await waitText(s, 'Word Set: C1, C2');
});
test('START-02', 'Cold start signed-in: no AuthGate, card shows word/meaning/example, no tap chip', async ({ session }) => {
  const s = await session({});
  await U.boot(s);
  const b = await body(s);
  ok(!b.includes('Access your vocabulary'), 'gate shown');
  ok(b.includes('* to start a conversation in a tense setting') && b.includes('* He told a joke to break the ice.'), 'meaning/example');
  ok(!b.includes('Tap anywhere to turn the audio on'), 'chip should be hidden');
  ok(s.fake.count('generate_daily_selection_v2') >= 1, 'daily selection RPC');
});
test('START-03', 'Signed-out Learn fallback shows a real local card behind the gate', async ({ session }) => {
  const s = await session({ signedIn: false });
  await s.goto('/'); await waitText(s, 'Access your vocabulary');
  await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 10000 });
  ok(!(await body(s)).includes('No vocabulary data'), 'no data card');
});

test('AUTH-01', 'Popup content: fields, masked numeric passcode, buttons, focus', async ({ session }) => {
  const s = await session({ signedIn: false });
  await gate(s);
  const info = await s.page.evaluate((NICK) => {
    const p = document.querySelector('input[type=password]');
    return { type: p.type, mode: p.getAttribute('inputmode'), focus: document.activeElement === document.querySelector(NICK),
      labels: [...document.querySelectorAll('label')].map((l) => l.textContent.trim()) };
  }, NICK);
  eq(info.type, 'password'); eq(info.mode, 'numeric'); ok(info.focus, 'nickname focused');
  ok(info.labels.some((l) => /Nickname/i.test(l)) && info.labels.some((l) => /Passcode/i.test(l)), 'labels ' + info.labels);
  await click(s, { text: 'Sign in' }); await click(s, { text: 'Create a new profile' });
  await waitText(s, 'Create your profile');
});
test('AUTH-02', 'Nickname too short: validation error, no network call', async ({ session }) => {
  const s = await session({ signedIn: false });
  await gate(s); await fill(s, 'ab', '1234'); await submit(s);
  await waitText(s, 'Nickname must be at least 3 characters.');
  eq(s.fake.calls.filter((c) => c.kind === 'edge').length, 0, 'edge calls');
});
test('AUTH-05', 'Successful sign-in stores session and reloads without the gate', async ({ session }) => {
  const s = await session({ signedIn: false });
  await gate(s); await fill(s, 'Tester One', '1234'); await submit(s);
  await s.page.waitForFunction(() => localStorage.getItem('lazyVoca.nickname') === 'Tester One', { timeout: 8000 });
  ok(await s.ls('lazyVoca.passcode'), 'passcode stored'); ok(await s.ls('lazyVoca.auth'), 'session stored');
  await sleep(1500);
  await U.waitWord(s, U.POOL_ORDER[0], 12000);
  ok(!(await body(s)).includes('Access your vocabulary'), 'gate still visible');
  eq(s.fake.calls.filter((c) => c.name === 'nickname-passcode-exchange').length >= 1, true);
});
test('AUTH-06', 'Incorrect passcode: message, passcode cleared+focused, nickname kept', async ({ session }) => {
  const s = await session({ signedIn: false, fake: { exchange: 'INCORRECT_PASSCODE' } }); s.allow.push(/AuthGate:signIn/);
  await gate(s); await fill(s, 'Tester', '9999'); await submit(s);
  await waitText(s, 'Incorrect passcode. Try again.');
  const st = await s.page.evaluate((NICK) => ({ pass: document.querySelector('input[type=password]').value, nick: document.querySelector(NICK).value,
    focus: document.activeElement === document.querySelector('input[type=password]') }), NICK);
  eq(st.pass, ''); eq(st.nick, 'Tester'); ok(st.focus, 'passcode focused');
  await waitText(s, 'Access your vocabulary');
});
test('AUTH-07', 'Unknown nickname switches to create mode and keeps entered values', async ({ session }) => {
  const s = await session({ signedIn: false, fake: { exchange: 'NICKNAME_NOT_FOUND' } }); s.allow.push(/AuthGate:signIn/);
  await gate(s); await fill(s, 'Newbie', '4321'); await submit(s);
  await waitText(s, 'Create your profile');
  await waitText(s, "We couldn’t find this nickname");
  const st = await s.page.evaluate((NICK) => ({ pass: document.querySelector('input[type=password]').value, nick: document.querySelector(NICK).value }), NICK);
  eq(st, { pass: '4321', nick: 'Newbie' });
  ok(await U.findHandle(s, { text: 'Create profile' }).then((h) => !!h.asElement()), 'Create profile button');
});
test('AUTH-08', 'Create profile success signs in', async ({ session }) => {
  const s = await session({ signedIn: false });
  await gate(s); await click(s, { text: 'Create a new profile' }); await fill(s, 'Fresh User', '2468'); await submit(s, 'Create profile');
  await s.page.waitForFunction(() => localStorage.getItem('lazyVoca.nickname') === 'Fresh User', { timeout: 8000 });
  ok(s.fake.count('set_nickname_passcode') === 1, 'set_nickname_passcode called');
  await sleep(1500); await U.waitWord(s, U.POOL_ORDER[0], 12000);
});
test('AUTH-09', 'Nickname taken message; stays in create mode', async ({ session }) => {
  const s = await session({ signedIn: false, fake: { create: 'taken' } }); s.allow.push(/AuthGate:createProfile/);
  await gate(s); await click(s, { text: 'Create a new profile' }); await fill(s, 'Taken Name', '2468'); await submit(s, 'Create profile');
  await waitText(s, 'That nickname is already taken. Try another.');
  await waitText(s, 'Create your profile');
});
test('AUTH-10', 'Backend unreachable: friendly message, button re-enabled, no crash', async ({ session }) => {
  const s = await session({ signedIn: false, fake: { mode: 'down' } }); s.allow.push(/Failed to fetch|NetworkError/);
  await gate(s); await fill(s, 'Tester', '1234'); await submit(s);
  await waitText(s, "Can't reach the server");
  const dis = await s.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sign in')?.disabled);
  eq(dis, false, 'sign in button should be enabled again');
  ok(!(await body(s)).includes('Failed to fetch'), 'raw browser message leaked');
});
test('AUTH-12', 'Expired session with stored passcode: no gate, app still shows local words with backend down', async ({ session }) => {
  const s = await session({ fake: { mode: 'down' }, storage: { 'lazyVoca.auth': JSON.stringify({ session_token: 'a.b.c', expires_at: 1, user_unique_key: 'e2e', nickname: 'e2e' }) } });
  await s.goto('/'); await sleep(2500);
  ok(!(await body(s)).includes('Access your vocabulary'), 'gate shown for expired session');
  await s.page.waitForFunction(() => (document.querySelector('main h1')?.textContent || '').trim().length > 0, { timeout: 10000 });
});
