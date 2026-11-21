// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

const env = { supported: true };
const plugin = {
  getStatus: vi.fn(async () => ({ supported: true, downloaded: false, downloading: false, bytesOnDisk: 0, downloadSize: 1, version: 'v' })),
  download: vi.fn(),
  cancelDownload: vi.fn(async () => {}),
  deleteModel: vi.fn(async () => ({ downloaded: false, downloading: false })),
  speak: vi.fn(), stop: vi.fn(), release: vi.fn(),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
};
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => env.supported, getPlatform: () => 'android' },
  registerPlugin: () => plugin,
}));

import NaturalVoicesCard from '../NaturalVoicesCard';
import { getFavoriteVoice } from '@/lib/preferences/localPreferences';
import * as store from '@/services/speech/kokoro/kokoroTts';

describe('NaturalVoicesCard', () => {
  beforeEach(() => {
    cleanup();
    store.__resetKokoroForTests();
    env.supported = true;
    window.localStorage.clear();
    plugin.getStatus.mockResolvedValue({ supported: true, downloaded: false, downloading: false, bytesOnDisk: 0, downloadSize: 1, version: 'v' });
  });

  it('renders nothing when unsupported', () => {
    env.supported = false;
    const { container } = render(<NaturalVoicesCard />);
    expect(container.innerHTML).toBe('');
  });

  it('offers the download and disables Kokoro options until downloaded', async () => {
    render(<NaturalVoicesCard />);
    await act(async () => {});
    expect(screen.getByText('Download (121 MB)')).toBeTruthy();
    expect((screen.getByLabelText('Kokoro - female (Heart)') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows download progress with cancel', async () => {
    let resolve: (v: unknown) => void = () => {};
    plugin.download.mockImplementation(() => new Promise((r) => { resolve = r; }));
    render(<NaturalVoicesCard />);
    await act(async () => {});
    await act(async () => { fireEvent.click(screen.getByText('Download (121 MB)')); });
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    await act(async () => { resolve({ downloaded: true, downloading: false }); });
    expect(screen.getByText('Delete voices (121 MB)')).toBeTruthy();
  });

  it('selecting a Kokoro voice sets the favorite', async () => {
    plugin.getStatus.mockResolvedValue({ supported: true, downloaded: true, downloading: false, bytesOnDisk: 1, downloadSize: 1, version: 'v' });
    render(<NaturalVoicesCard />);
    await act(async () => {});
    await act(async () => { fireEvent.click(screen.getByLabelText('Kokoro - male (Michael)')); });
    expect(getFavoriteVoice()).toBe('Kokoro Michael (US male)');
  });
});
