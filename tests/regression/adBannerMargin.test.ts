import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeBannerMarginDp } from '@/services/ads/adsPolicy';

// FB-36: the native banner margin must be bottom-of-screen -> TOP of the content that stays visible.
const VH = 800;
const read = (p: string) => readFileSync(p, 'utf8');

describe('[FB-36] native banner margin', () => {
  it('flush bar: margin = distance to the bar top (height 64 + safe area 16 => 80)', () => {
    expect(computeBannerMarginDp({ viewportHeight: VH, barTop: VH - 80, slotPx: 56 })).toBe(80);
  });

  it('uses bottom-to-top-of-bar, not height only: a floating bar (height 56, 10px + 24px safe area) => 90', () => {
    const barHeight = 56;
    const barTop = VH - (10 + 24) - barHeight;
    const margin = computeBannerMarginDp({ viewportHeight: VH, barTop, slotPx: 56 });
    expect(margin).toBe(90);
    expect(margin).toBeGreaterThan(barHeight); // height-only (old) would have been 56 and covered the nav
  });

  it('falls back when the bar cannot be measured', () => {
    expect(computeBannerMarginDp({ viewportHeight: VH, barTop: null, slotPx: 56 })).toBe(64);
    expect(computeBannerMarginDp({ viewportHeight: VH, barTop: VH + 5, slotPx: 56 })).toBe(64);
  });

  it('SRS line: banner is raised above it when it would cover it; untouched when the line is already above the zone', () => {
    const barTop = VH - 90;
    // SRS line right on top of the bar (slot not yet reserved): bottom edge 90 up, top edge 126 up
    const covered = computeBannerMarginDp({ viewportHeight: VH, barTop, srs: { top: VH - 126, bottom: VH - 90, height: 36 }, slotPx: 56 });
    expect(covered).toBe(126);
    // SRS line already placed above bar + --ad-slot (90 + 56 = 146)
    const clear = computeBannerMarginDp({ viewportHeight: VH, barTop, srs: { top: VH - 182, bottom: VH - 146, height: 36 }, slotPx: 56 });
    expect(clear).toBe(90);
    // hidden SRS line (zero height) is ignored
    expect(computeBannerMarginDp({ viewportHeight: VH, barTop, srs: { top: 0, bottom: 0, height: 0 }, slotPx: 56 })).toBe(90);
  });

  it('adsService passes the computed margin (not the tab bar height) and the SRS line is measurable', () => {
    const svc = read('src/services/ads/adsService.ts');
    expect(svc).toContain('margin: measureBannerMarginDp()');
    expect(svc).not.toContain('measureTabBarDp');
    expect(svc).toContain('data-srs-principle-line');
    expect(read('src/features/srs-principle/SrsPrincipleLine.tsx')).toContain('data-srs-principle-line');
  });

  it('--ad-slot stays reserved in Learn/main padding, including the floating-bar themes', () => {
    expect(read('src/pages/Index.tsx')).toContain('var(--ad-slot, 0px)');
    const css = read('src/styles/themes.css');
    for (const theme of ['sloth', 'blocks']) {
      const rules = [...css.matchAll(new RegExp(`body\\.theme-${theme} main[^{]*\\{[^}]*\\}`, 'g'))].map((m) => m[0]);
      expect(rules.length).toBeGreaterThanOrEqual(2); // default + Learn (SRS line)
      for (const r of rules) expect(r).toContain('var(--ad-slot, 0px)');
    }
  });

  it('banner policy unchanged: only Progress and Sets show ads (never Learn)', async () => {
    const { shouldShowBannerForTab } = await import('@/services/ads/adsPolicy');
    expect(shouldShowBannerForTab('learn')).toBe(false);
    expect(shouldShowBannerForTab('progress')).toBe(true);
    expect(shouldShowBannerForTab('sets')).toBe(true);
  });
});

describe('[FB-37] app version in the footer comes from package.json', () => {
  it('vite.config reads package.json (not only npm_package_version) and the lockfile root matches', () => {
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json'));
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
    const cfg = read('vite.config.ts');
    expect(cfg).toContain('package.json');
    expect(cfg).toContain('readAppVersion()');
    expect(pkg.version).toBe('1.0.5');
  });
});
