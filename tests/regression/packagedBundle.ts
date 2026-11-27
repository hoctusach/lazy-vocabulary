import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Inspect an index.html that is about to be packaged into the native app (FB-28). */
export function inspectPackagedIndex(html: string, hasFile: (relPath: string) => boolean): string[] {
  const problems: string[] = [];
  if (!/Boot watchdog/i.test(html) || !html.includes('could not start')) problems.push('missing boot watchdog');
  if (!html.includes('15 minutes a day')) problems.push('missing "15 minutes a day" title (stale website index?)');
  if (html.includes('index-K2ipXdwq.js')) problems.push('references stale GitHub Pages bundle index-K2ipXdwq.js');
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const assetRefs = refs.filter((r) => /(^|\/)assets\//.test(r) && !/^https?:/.test(r));
  if (!assetRefs.some((r) => r.endsWith('.js'))) problems.push('no app script under assets/');
  for (const r of assetRefs) {
    if (r.startsWith('/')) problems.push(`absolute asset path ${r} (expected ./assets/...)`);
    if (!hasFile(r.replace(/^\.?\//, ''))) problems.push(`referenced file missing: ${r}`);
  }
  return problems;
}

function listDir(root: string, rel = ''): string[] {
  return readdirSync(join(root, rel)).flatMap((n) => {
    const p = rel ? `${rel}/${n}` : n;
    return statSync(join(root, p)).isDirectory() ? listDir(root, p) : [p];
  });
}

export function inspectPackagedDir(dir: string): string[] {
  const files = new Set(listDir(dir));
  return inspectPackagedIndex(readFileSync(join(dir, 'index.html'), 'utf8'), (f) => files.has(f));
}

/** Needs `unzip` on PATH. */
export function inspectAab(aabPath: string): string[] {
  const prefix = 'base/assets/public/';
  const names = new Set(
    execFileSync('unzip', ['-Z1', aabPath], { encoding: 'utf8', maxBuffer: 1 << 26 })
      .split('\n').filter((n) => n.startsWith(prefix)).map((n) => n.slice(prefix.length)),
  );
  const html = execFileSync('unzip', ['-p', aabPath, `${prefix}index.html`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  return inspectPackagedIndex(html, (f) => names.has(f));
}

