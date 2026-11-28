// NFR runner: node e2e/nfr/run.mjs [--grep REGEX] [--build]
// Same harness as e2e/run.mjs (fake backend, localhost only) but its own suites, dist and results file.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as H from '../lib/harness.mjs';
import { registry, runOne } from '../lib/framework.mjs';
import { generate } from '../fixtures/generate.mjs';
import { METRICS, WARNINGS } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const grep = args.includes('--grep') ? new RegExp(args[args.indexOf('--grep') + 1]) : null;
const DIST = process.env.NFR_DIST || process.env.E2E_DIST || '/tmp/lv-nfr-dist';
process.env.E2E_DIST = DIST;
// One results file per --grep so the three sub-scripts of `npm run test:nfr` do not overwrite each other.
const TAG = grep ? '-' + grep.source.replace(/[^A-Za-z0-9]+/g, '').toLowerCase() : '';
const OUT = (process.env.NFR_RESULTS || '/workspace/qa/nfr-results.json').replace(/\.json$/, `${TAG}.json`);
const JOBS = Number(process.env.NFR_JOBS || 3);

// Never build into docs/ (live website). Same fake-backend build as the e2e run.
if (path.resolve(DIST).startsWith(path.join(ROOT, 'docs'))) { console.error('refusing to use docs/ as dist'); process.exit(2); }
const MARKER = path.join(DIST, '.e2e-pro-flag');
if (args.includes('--build') || !fs.existsSync(path.join(DIST, 'index.html')) || !fs.existsSync(MARKER)) {
  const r = spawnSync('npx', ['vite', 'build', '--outDir', DIST, '--emptyOutDir'], {
    cwd: ROOT, stdio: 'inherit',
    env: { ...process.env, VITE_SUPABASE_URL: 'http://fake-supabase.test', VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.e30.dummy', VITE_GA_MEASUREMENT_ID: 'G-FAKE', VITE_ENABLE_PRO: 'true' },
  });
  if (r.status !== 0) { console.error('build failed'); process.exit(2); }
  fs.writeFileSync(MARKER, 'VITE_ENABLE_PRO=true\n');
}
{
  const hosts = new Set();
  for (const f of fs.readdirSync(path.join(DIST, 'assets'))) if (f.endsWith('.js')) {
    for (const m of fs.readFileSync(path.join(DIST, 'assets', f), 'utf8').matchAll(/https?:\/\/([a-z0-9.-]+\.(?:supabase\.co|supabase\.in|test))/gi)) hosts.add(m[1]);
  }
  const bad = [...hosts].filter((h) => h !== 'fake-supabase.test' && h !== 'vijvcojvemkzgpzpowzh.supabase.co');
  if (!hosts.has('fake-supabase.test') || bad.length) { console.error('Refusing to run: bundle was not built with the fake backend. hosts=', [...hosts]); process.exit(2); }
}
generate();

for (const f of fs.readdirSync(path.join(HERE, 'suites')).sort()) if (f.endsWith('.mjs')) await import(`./suites/${f}`);

await H.setup();
const todo = registry.filter((t) => !grep || grep.test(t.id) || grep.test(t.title));
const results = new Array(todo.length);
const report = (r) => {
  const tag = { pass: 'PASS', skip: 'SKIP', known: 'KNOWN', fail: 'FAIL' }[r.status];
  console.log(`${tag} ${r.id}: ${r.title}${r.error ? '\n      ' + r.error : ''}`);
};
async function exec(i) {
  const t = todo[i];
  let r = await runOne(t);
  if (t.known && r.status === 'fail') r = { ...r, status: 'known', error: `${t.known} -- ${r.error}` };
  if (t.known && r.status === 'pass') WARNINGS.push(`${t.id}: marked known-issue but now passes -- fixed? remove the known flag (${t.known})`);
  if (METRICS[t.id]) r.metrics = METRICS[t.id];
  results[i] = r; report(r);
}
// Timing-sensitive tests (serial: true) run one at a time first; the rest share a small pool.
const serial = todo.map((t, i) => [t, i]).filter(([t]) => t.serial !== false && /^NFR-(PERF|REL)/.test(t.id));
for (const [, i] of serial) await exec(i);
const rest = todo.map((t, i) => i).filter((i) => !serial.some(([, j]) => j === i));
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, rest.length) }, async () => { while (next < rest.length) await exec(rest[next++]); }));

const escaped = [...new Set(H.NETWORK.escaped)];
console.log(`network: faked=${H.NETWORK.faked.length} blocked-by-policy=${H.NETWORK.blocked.length} escaped=${escaped.length}`);
await H.teardown();
if (escaped.length) results.push({ id: 'NFR-NET', title: 'No request left localhost except faked supabase', status: 'fail', error: escaped.slice(0, 10).join(' ; ') });

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), warnings: WARNINGS, results }, null, 2));
const c = (s) => results.filter((r) => r.status === s).length;
console.log(`\nNFR: ${c('pass')} pass, ${c('known')} known-issue, ${c('fail')} fail, ${c('skip')} skip (of ${results.length}) -> ${OUT}`);
process.exit(c('fail') ? 1 : 0);
