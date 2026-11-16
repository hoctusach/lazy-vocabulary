// E2E runner: node e2e/run.mjs [--grep REGEX] [--build]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as H from './lib/harness.mjs';
import { registry, runOne } from './lib/framework.mjs';
import { generate } from './fixtures/generate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const args = process.argv.slice(2);
const grep = args.includes('--grep') ? new RegExp(args[args.indexOf('--grep') + 1]) : null;
const DIST = process.env.E2E_DIST || '/tmp/lv-e2e-dist';
process.env.E2E_DIST = DIST;
const OUT = process.env.E2E_RESULTS || '/workspace/qa/e2e-results.json';
const JOBS = Number(process.env.E2E_JOBS || 4);

if (args.includes('--build') || !fs.existsSync(path.join(DIST, 'index.html'))) {
  // Fake backend config only: never the repo .env values. Shell env wins over .env in Vite.
  const r = spawnSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], {
    cwd: ROOT, stdio: 'inherit',
    env: { ...process.env, VITE_SUPABASE_URL: 'http://fake-supabase.test', VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.e30.dummy', VITE_GA_MEASUREMENT_ID: 'G-FAKE' },
  });
  if (r.status !== 0) { console.error('build failed'); process.exit(2); }
}
// Guard: the bundle must point at the fake backend only (the hard-coded edge URL is intercepted at runtime).
{
  const dir = path.join(DIST, 'assets');
  const hosts = new Set();
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) {
    for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/https?:\/\/([a-z0-9.-]+\.(?:supabase\.co|supabase\.in|test))/gi)) hosts.add(m[1]);
  }
  const bad = [...hosts].filter((h) => h !== 'fake-supabase.test' && h !== 'vijvcojvemkzgpzpowzh.supabase.co');
  if (!hosts.has('fake-supabase.test') || bad.length) { console.error('Refusing to run: bundle was not built with the fake backend. hosts=', [...hosts]); process.exit(2); }
}
generate();

for (const f of fs.readdirSync(path.join(HERE, 'suites')).sort()) if (f.endsWith('.mjs')) await import(`./suites/${f}`);

await H.setup();
const todo = registry.filter((t) => !grep || grep.test(t.id) || grep.test(t.title));
const results = new Array(todo.length);
let next = 0;
async function worker() {
  while (next < todo.length) {
    const i = next++; const t = todo[i];
    const r = await runOne(t);
    results[i] = r;
    console.log(`${r.status === 'pass' ? 'PASS' : r.status === 'skip' ? 'SKIP' : 'FAIL'} ${r.id}: ${r.title}${r.error ? '\n      ' + r.error : ''}`);
  }
}
const heavy = todo.filter((t) => t.serial);
await Promise.all(Array.from({ length: Math.min(JOBS, todo.length) }, worker));

// OFFLINE-07: global network policy
const escaped = [...new Set(H.NETWORK.escaped)];
const off = { id: 'OFFLINE-07', title: 'No request left localhost except faked supabase or policy-blocked analytics', status: escaped.length ? 'fail' : 'pass' };
if (escaped.length) off.error = 'escaped requests: ' + escaped.slice(0, 10).join(' ; ');
if (!grep || grep.test('OFFLINE-07')) { results.push(off); console.log(`${off.status.toUpperCase()} ${off.id}${off.error ? '\n      ' + off.error : ''}`); }
console.log(`network: faked=${H.NETWORK.faked.length} blocked-by-policy=${H.NETWORK.blocked.length} (${[...new Set(H.NETWORK.blocked)].join(',')}) escaped=${escaped.length}`);
await H.teardown();

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
const c = (s) => results.filter((r) => r.status === s).length;
console.log(`\nE2E: ${c('pass')} pass, ${c('fail')} fail, ${c('skip')} skip (of ${results.length}) -> ${OUT}`);
process.exit(c('fail') ? 1 : 0);
