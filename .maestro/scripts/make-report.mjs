// Builds a markdown test report from the Maestro JUnit file and (optionally) a Vitest JSON file.
// Usage: node .maestro/scripts/make-report.mjs --out reports/e2e-android-2026-11-26.md
//          [--junit e2e-results/report.xml] [--unit unit-results.json] [--device "Pixel 7, Android 14"] [--commit abc123]
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const out = arg('out');
if (!out) throw new Error('--out is required');
const junitPath = arg('junit');
const unitPath = arg('unit');
const device = arg('device') ?? 'not recorded';
const commit = arg('commit') ?? 'not recorded';

// Cases come from the flow files so the report always lists all of them.
const flowsDir = '.maestro/flows';
const cases = readdirSync(flowsDir)
  .filter((f) => f.endsWith('.yaml'))
  .sort()
  .map((file) => {
    const text = readFileSync(join(flowsDir, file), 'utf8');
    const name = /^name:\s*'(.*)'/m.exec(text)?.[1] ?? file;
    const tags = /^tags:\s*\[(.*)\]/m.exec(text)?.[1] ?? '';
    const num = /^#(\d+)/.exec(name)?.[1];
    return { file, name, tags, num, result: 'NOT RUN', note: '' };
  });

if (junitPath && existsSync(junitPath)) {
  const xml = readFileSync(junitPath, 'utf8');
  const re = /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const body = m[2] ?? '';
    const name = /name="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const num = /#(\d+)/.exec(name)?.[1];
    const c = cases.find((x) => x.num && x.num === num);
    if (!c) continue;
    const status = /status="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const failed = /<failure|<error/.test(body) || /ERROR|FAIL/i.test(status);
    const skipped = /<skipped/.test(body) || /SKIPPED/i.test(status);
    c.result = skipped ? 'SKIPPED' : failed ? 'FAIL' : 'PASS';
    c.note = failed ? (/<(?:failure|error)[^>]*message="([^"]*)"/.exec(body)?.[1] ?? '').slice(0, 160) : '';
  }
}

const count = (r) => cases.filter((c) => c.result === r).length;
let md = `# Test report\n\n`;
md += `- Date: ${new Date().toISOString().slice(0, 10)}\n- Commit: ${commit}\n- Device: ${device}\n\n`;

if (unitPath && existsSync(unitPath)) {
  const d = JSON.parse(readFileSync(unitPath, 'utf8'));
  md += `## 1. Unit and component tests (Vitest)\n\n`;
  md += `Files: ${d.testResults.filter((f) => f.status === 'passed').length}/${d.testResults.length} passed. Tests: ${d.numPassedTests}/${d.numTotalTests} passed, ${d.numFailedTests} failed.\n\n`;
  md += `| File | Tests | Result |\n| --- | ---: | --- |\n`;
  for (const f of [...d.testResults].sort((a, b) => a.name.localeCompare(b.name))) {
    const file = f.name.split('/tests/').pop();
    md += `| ${file} | ${f.assertionResults.length} | ${f.status === 'passed' ? 'PASS' : 'FAIL'} |\n`;
  }
  md += `\n`;
}

md += `## 2. End-to-end tests (Maestro, Android)\n\n`;
md += `PASS ${count('PASS')} / FAIL ${count('FAIL')} / SKIPPED ${count('SKIPPED')} / NOT RUN ${count('NOT RUN')} of ${cases.length} cases.\n\n`;
md += `| # | Case | Tags | Result | Notes |\n| ---: | --- | --- | --- | --- |\n`;
for (const c of cases) {
  md += `| ${c.num ?? ''} | ${c.name.replace(/^#\d+\s*/, '')} | ${c.tags} | ${c.result} | ${c.note} |\n`;
}
md += `\nCases tagged \`pending\` need the background-playback branch merged into main.\n`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md);
console.log(`Report written to ${out}`);
