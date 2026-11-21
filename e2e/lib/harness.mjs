import puppeteer from 'puppeteer-core';
import { startServer } from './server.mjs';
import { createFake, FAKE_HOST, EDGE_HOST } from './fake.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const E2E_DIR = path.resolve(HERE, '..');
export const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const SPEECH = fs.readFileSync(path.join(HERE, 'speechStub.js'), 'utf8');
const NOSPEECH = fs.readFileSync(path.join(HERE, 'noSpeech.js'), 'utf8');

export const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36';
export const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

// Hosts the app legitimately tries to reach that policy blocks (analytics, links, fonts).
const BLOCKED_BY_POLICY = [/googletagmanager\.com$/, /google-analytics\.com$/, /analytics\.google\.com$/, /youtube\.com$/, /youtu\.be$/,
  /docs\.google\.com$/, /fonts\.googleapis\.com$/, /fonts\.gstatic\.com$/, /doubleclick\.net$/];

export const NETWORK = { faked: [], blocked: [], escaped: [] };   // global, whole run
export const isLocal = (host) => host === 'localhost' || host === '127.0.0.1';

let browser, server, base;
export async function setup() {
  server = await startServer(process.env.E2E_DIST || '/tmp/lv-e2e-dist');
  base = `http://localhost:${server.port}`;
  browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--mute-audio',
      // Safety net: nothing but localhost can resolve, even if interception were bypassed.
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
      '--disable-features=PrivateNetworkAccessChecks'],
  });
  return { base, browser };
}
export async function teardown() { try { await browser?.close(); } finally { await server?.close(); } }
export const baseUrl = () => base;

const NOW = () => Math.floor(Date.now() / 1000);
export function signedInStorage(nick = 'e2e') {
  const key = nick.toLowerCase();
  return {
    'lazyVoca.nickname': nick, 'lazyVoca.passcode': '1234', 'lazyVoca.userKey': key,
    'lazyVoca.auth': JSON.stringify({ session_token: `e2e-session~${key}~0`, token_type: 'bearer', expires_in: 3600, expires_at: NOW() + 3600, user_unique_key: key, nickname: nick }),
    'lazyVoca.authState': JSON.stringify({ version: 4, session: { user_unique_key: key, nickname: nick, authenticated_at: new Date().toISOString(), user: { id: key, nickname: nick, email: null } } }),
    speechUnlocked: 'true',
  };
}

/**
 * Open a fresh incognito context + page.
 * opts: { signedIn=true, speech='stub'|'none'|'real', storage:{}, fake:{...}, viewport, noAutoEnd }
 */
export async function newSession(opts = {}) {
  const { signedIn = true, speech = 'stub', storage = {}, viewport = VIEWPORT } = opts;
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const fake = opts.fakeInstance || createFake(opts.fake || {});
  const errors = [];          // page errors, console.error, unhandled rejections
  const requests = [];
  const s = { ctx, page, fake, errors, requests, base, ignoreErrors: [] };

  await page.setViewport(viewport);
  await page.setUserAgent(UA);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    let url; try { url = new URL(req.url()); } catch { return req.continue(); }
    if (url.protocol === 'data:' || url.protocol === 'blob:' || url.protocol === 'about:') return req.continue();
    if (isLocal(url.hostname)) return req.continue();
    requests.push(req.url());
    const host = url.hostname;
    if (host === FAKE_HOST || host === EDGE_HOST) {
      let r; try { r = fake.handle(req.url(), req.method(), req.postData(), req.headers()); } catch (e) { r = { status: 500, headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: 'fake handler crashed: ' + e.message }) }; }
      NETWORK.faked.push(`${req.method()} ${url.origin}${url.pathname}`);
      if (r === 'abort') return req.abort('internetdisconnected');
      if (r === 'hang') return; // never answers
      return req.respond(r);
    }
    if (BLOCKED_BY_POLICY.some((re) => re.test(host))) { NETWORK.blocked.push(host); return req.abort('blockedbyclient'); }
    NETWORK.escaped.push(`${req.method()} ${req.url()}`);   // aborted but recorded -> global failure
    return req.abort('blockedbyclient');
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('requestfailed', () => {});

  const store = { ...(signedIn ? signedInStorage() : {}), ...storage };
  const init = `
    window.addEventListener('unhandledrejection', (e) => { (window.__rejections = window.__rejections || []).push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
    try { if (!sessionStorage.getItem('__e2e_seeded')) {
      sessionStorage.setItem('__e2e_seeded','1');
      const seed = ${JSON.stringify(store)};
      for (const k in seed) localStorage.setItem(k, seed[k]);
    } } catch (e) {}
  `;
  if (speech === 'stub') await page.evaluateOnNewDocument(SPEECH);
  if (speech === 'none') await page.evaluateOnNewDocument(NOSPEECH);
  if (!opts.noSeed) await page.evaluateOnNewDocument(init);
  if (opts.initScript) await page.evaluateOnNewDocument(opts.initScript);

  s.goto = async (p = '/') => { await page.goto(base + p, { waitUntil: 'domcontentloaded' }); await waitRoot(page); };
  s.reload = async () => { await page.reload({ waitUntil: 'domcontentloaded' }); await waitRoot(page); };
  s.close = async () => { try { await ctx.close(); } catch {} };
  s.rejections = () => page.evaluate(() => window.__rejections || []).catch(() => []);
  s.ls = (k) => page.evaluate((k) => localStorage.getItem(k), k);
  s.setLs = (k, v) => page.evaluate((k, v) => localStorage.setItem(k, v), k, v);
  return s;
}

export async function waitRoot(page, ms = 10000) {
  await page.waitForFunction(() => (document.getElementById('root')?.children.length || 0) > 0, { timeout: ms });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
