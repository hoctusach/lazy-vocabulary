// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const env = { native: true };
const net = { connected: true, metered: false };
const status = { downloaded: false, downloading: false, upgradeAvailable: false };
const plugin = {
  getStatus: vi.fn(async () => ({ supported: true, ...status, bytesOnDisk: 0, downloadSize: 332562608, version: 'v' })),
  getNetwork: vi.fn(async () => ({ ...net })),
  download: vi.fn(async () => ({ supported: true, downloaded: true, downloading: false, bytesOnDisk: 1, downloadSize: 1, version: 'v' })),
  cancelDownload: vi.fn(async () => {}),
  deleteModel: vi.fn(async () => ({ downloaded: false, downloading: false })),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
};
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => env.native, getPlatform: () => 'android' },
  registerPlugin: () => plugin,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

import * as tts from '../kokoro/kokoroTts';
import * as auto from '../kokoro/kokoroAutoDownload';
import * as prefs from '../kokoro/kokoroPrefs';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';

describe('[FB-04] kokoro auto download', () => {
  beforeEach(() => {
    tts.__resetKokoroForTests();
    window.localStorage.clear();
    vi.clearAllMocks();
    env.native = true;
    Object.assign(net, { connected: true, metered: false });
    Object.assign(status, { downloaded: false, downloading: false, upgradeAvailable: false });
    auto.answerMeteredPrompt('later'); // reset prompt visibility
    window.localStorage.clear();
  });

  it('does nothing when unsupported', async () => {
    env.native = false;
    expect(await auto.runAutoDownloadCheck()).toBe('unsupported');
    expect(plugin.download).not.toHaveBeenCalled();
  });

  it('starts silently on an unmetered network', async () => {
    expect(await auto.runAutoDownloadCheck()).toBe('started');
    expect(plugin.download).toHaveBeenCalledTimes(1);
    expect(auto.getMeteredPromptVisible()).toBe(false);
  });

  it('skips when ready, and starts again for an available upgrade', async () => {
    status.downloaded = true;
    expect(await auto.runAutoDownloadCheck()).toBe('ready');
    status.upgradeAvailable = true;
    expect(await auto.runAutoDownloadCheck()).toBe('started');
  });

  it('skips when offline', async () => {
    net.connected = false;
    expect(await auto.runAutoDownloadCheck()).toBe('offline');
    expect(plugin.download).not.toHaveBeenCalled();
  });

  it('metered: prompts once; Later persists and the download starts later on Wi-Fi', async () => {
    net.metered = true;
    expect(await auto.runAutoDownloadCheck()).toBe('prompt');
    expect(auto.getMeteredPromptVisible()).toBe(true);
    expect(plugin.download).not.toHaveBeenCalled();
    auto.answerMeteredPrompt('later');
    expect(auto.getMeteredPromptVisible()).toBe(false);
    expect(prefs.getMeteredAnswer()).toBe('later');
    expect(await auto.runAutoDownloadCheck()).toBe('later');
    expect(auto.getMeteredPromptVisible()).toBe(false);
    net.metered = false;
    expect(await auto.runAutoDownloadCheck()).toBe('started');
    expect(plugin.download).toHaveBeenCalledTimes(1);
  });

  it('metered: Download now starts the download', async () => {
    net.metered = true;
    await auto.runAutoDownloadCheck();
    auto.answerMeteredPrompt('now');
    expect(plugin.download).toHaveBeenCalledTimes(1);
    expect(await auto.runAutoDownloadCheck()).toBe('started');
  });

  it('never re-downloads after the user deleted it, until they tap Download', async () => {
    status.downloaded = true;
    await tts.refreshKokoroStatus();
    await tts.deleteKokoro();
    auto.onUserDeletedModel();
    status.downloaded = false;
    expect(await auto.runAutoDownloadCheck()).toBe('deleted');
    expect(plugin.download).not.toHaveBeenCalled();
    auto.userStartDownload();
    expect(plugin.download).toHaveBeenCalledTimes(1);
    expect(prefs.isKokoroUserDeleted()).toBe(false);
  });

  it('selects Heart when ready and the user never chose a voice', async () => {
    setFavoriteVoice('Some System Voice');
    status.downloaded = true;
    await tts.refreshKokoroStatus();
    expect(auto.applyDefaultVoiceIfReady(false)).toBe(true);
    expect(getFavoriteVoice()).toBe('Kokoro Heart (US female)');
  });

  it('preserves an explicit choice', async () => {
    setFavoriteVoice('Some System Voice');
    prefs.markVoiceExplicit();
    status.downloaded = true;
    await tts.refreshKokoroStatus();
    expect(auto.applyDefaultVoiceIfReady(true)).toBe(false);
    expect(getFavoriteVoice()).toBe('Some System Voice');
  });

  it('does not select anything until the model is ready', () => {
    setFavoriteVoice('Some System Voice');
    expect(auto.applyDefaultVoiceIfReady(true)).toBe(false);
  });

  it('uses the native downloadSize for UI sizes', async () => {
    await tts.refreshKokoroStatus();
    expect(tts.getKokoroState().totalBytes).toBe(332562608);
  });
});
