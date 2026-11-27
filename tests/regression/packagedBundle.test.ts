import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectPackagedDir, inspectPackagedIndex, inspectAab } from './packagedBundle';

const root = (p: string) => resolve(process.cwd(), p);
const FIX = root('tests/fixtures/packaged-1.0.2');

describe('[FB-28] release 1.0.2 (3) opened as a blank white screen: it packaged the stale website', () => {
  it('capacitor webDir is not the website folder docs/', () => {
    const cfg = readFileSync(root('capacitor.config.ts'), 'utf8');
    const m = cfg.match(/webDir:\s*['"]([^'"]+)['"]/);
    expect(m?.[1]).toBeTruthy();
    expect(m![1].replace(/\/$/, '')).not.toBe('docs');
    expect(m![1]).toBe('capacitor-www');
    expect(readFileSync(root('.gitignore'), 'utf8')).toMatch(/^capacitor-www\/?$/m);
  });

  it('build:mobile builds into capacitor-www with relative asset paths', () => {
    const s = JSON.parse(readFileSync(root('package.json'), 'utf8')).scripts['build:mobile'] as string;
    expect(s).toContain('--outDir capacitor-www');
    expect(s).toContain('--base ./');
    expect(s).not.toMatch(/\bdocs\b/);
  });

  it('source index.html keeps the boot watchdog', () => {
    const html = readFileSync(root('index.html'), 'utf8');
    expect(html).toContain('Boot watchdog');
    expect(html).toContain('could not start');
  });

  it('the actual 1.0.2 packaged index.html is rejected', () => {
    const html = readFileSync(`${FIX}/index.html`, 'utf8');
    const files = new Set(readFileSync(`${FIX}/files.txt`, 'utf8').split('\n').filter(Boolean));
    const problems = inspectPackagedIndex(html, (f) => files.has(f));
    expect(problems).toContain('missing boot watchdog');
    expect(problems.join('\n')).toContain('index-K2ipXdwq.js');
    expect(problems.join('\n')).toContain('15 minutes a day');
  });

  it('a good packaged index passes; dropping the watchdog or a file fails', () => {
    const good = `<html><head><title>Lazy Vocabulary – Just 15 minutes a day</title>
      <script>/* Boot watchdog */ var t='Lazy Vocabulary could not start';</script>
      <script type="module" crossorigin src="./assets/index-new.js"></script>
      <link rel="stylesheet" href="./assets/index-new.css"></head><body><div id="root"></div></body></html>`;
    const has = (f: string) => ['assets/index-new.js', 'assets/index-new.css'].includes(f);
    expect(inspectPackagedIndex(good, has)).toEqual([]);
    expect(inspectPackagedIndex(good.replace('Boot watchdog', ''), has)).toContain('missing boot watchdog');
    expect(inspectPackagedIndex(good, (f) => f !== 'assets/index-new.js').join()).toContain('referenced file missing');
    expect(inspectPackagedIndex(good.replace('./assets/index-new.js', '/assets/index-new.js'), has).join()).toContain('absolute asset path');
  });

  it('capacitor-www/ (when a mobile build exists) passes the same checks', (ctx) => {
    if (!existsSync(root('capacitor-www/index.html'))) return ctx.skip();
    expect(inspectPackagedDir(root('capacitor-www'))).toEqual([]);
  });

  it('PACKAGED_AAB (optional env) passes the same checks', (ctx) => {
    const aab = process.env.PACKAGED_AAB;
    if (!aab || !existsSync(aab)) return ctx.skip();
    expect(inspectAab(aab)).toEqual([]);
  });
});
