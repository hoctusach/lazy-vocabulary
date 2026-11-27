// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const env = vi.hoisted(() => ({ native: true }));
const plugin = vi.hoisted(() => ({
  getStatus: vi.fn(async () => ({ supported: true, downloaded: true, downloading: false, upgradeAvailable: false, bytesOnDisk: 1, downloadSize: 332562608, version: 'v' })),
  getNetwork: vi.fn(async () => ({ connected: true, metered: false })),
  download: vi.fn(), cancelDownload: vi.fn(), deleteModel: vi.fn(),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => env.native, getPlatform: () => 'android' },
  registerPlugin: () => plugin,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import MorePanel from '@/components/mobile/MorePanel';
import { ThemeProvider } from '@/contexts/ThemeContext';
import NaturalVoiceRow from '@/components/mobile/NaturalVoiceRow';

window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as unknown as MediaQueryList);
afterEach(() => cleanup());

describe('[FB-04] More has only the compact natural-voice row, no voice download/settings card', () => {
  it('renders one compact one-line row and no separate card for downloading voices', async () => {
    const { container, findByText } = render(<ThemeProvider><MorePanel /></ThemeProvider>);
    await findByText(/Natural voice:/);
    const rows = container.querySelectorAll('[data-section="natural-voice"]');
    expect(rows.length).toBe(1);
    // compact: a single paragraph, not a card surface with headings
    expect(rows[0].tagName).toBe('P');
    expect(rows[0].classList.contains('theme-card-surface')).toBe(false);
    expect(rows[0].querySelector('h1,h2,h3,h4')).toBeNull();
    // no voice-settings card anywhere in More
    expect(container.querySelector('[data-section="kokoro"],[data-section="voice-settings"],[data-testid="kokoro-card"]')).toBeNull();
    const headings = [...container.querySelectorAll('h1,h2,h3,h4,summary')].map((h) => h.textContent || '');
    expect(headings.filter((t) => /voice|kokoro|download/i.test(t))).toEqual([]);
  });

  it('is absent where Kokoro is unsupported (web)', () => {
    env.native = false;
    const { container } = render(<NaturalVoiceRow />);
    env.native = true;
    expect(container.querySelector('[data-section="natural-voice"]')).toBeNull();
  });
});
