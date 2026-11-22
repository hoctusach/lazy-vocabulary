// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ttsSpeak = vi.fn();
const kSpeak = vi.fn();
const kStatus = { downloaded: true, downloading: false };

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
  registerPlugin: () => ({
    getStatus: async () => ({ supported: true, ...kStatus, bytesOnDisk: 0, downloadSize: 1, version: 'v' }),
    speak: (o: unknown) => kSpeak(o),
    stop: async () => {},
    release: async () => {},
    addListener: async () => ({ remove: async () => {} }),
  }),
}));
vi.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: {
    speak: (o: unknown) => ttsSpeak(o),
    stop: async () => {},
    getSupportedVoices: async () => ({ voices: [{ voiceURI: 'a', name: 'US Voice', lang: 'en-US', localService: true, default: true }] }),
  },
}));

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const HEART = 'Kokoro Heart (US female)';
const MICHAEL = 'Kokoro Michael (US male)';

describe('[FB-04][FB-06] Pro voice gating (Kokoro Michael)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_ENABLE_PRO', 'true');
    [ttsSpeak, kSpeak].forEach((m) => m.mockReset());
    ttsSpeak.mockResolvedValue(undefined);
    kSpeak.mockResolvedValue({ interrupted: false });
    kStatus.downloaded = true;
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  async function install() {
    const w = window as unknown as Record<string, unknown>;
    delete w.speechSynthesis; delete w.SpeechSynthesisUtterance;
    const { installNativeSpeechShim } = await import('../nativeSpeechShim');
    installNativeSpeechShim();
    await wait();
    return window.speechSynthesis;
  }
  const speak = (synth: SpeechSynthesis, name: string) => {
    const u = new window.SpeechSynthesisUtterance('hello');
    u.voice = synth.getVoices().find((v) => v.name === name)!; u.lang = 'en-US'; u.rate = 0.8;
    synth.speak(u);
  };

  it('speech never uses Michael for a free user: Heart when Kokoro is ready', async () => {
    const synth = await install();
    speak(synth, MICHAEL);
    await wait();
    expect(kSpeak).toHaveBeenCalledTimes(1);
    expect(kSpeak.mock.calls[0][0].voice).toBe('af_heart');
  });

  it('...and the system voice when Kokoro is not ready', async () => {
    kStatus.downloaded = false;
    const synth = await install();
    const u = new window.SpeechSynthesisUtterance('hello');
    u.voice = { name: MICHAEL, index: -2, lang: 'en-US' } as never; u.lang = 'en-US';
    synth.speak(u);
    await wait(100);
    expect(kSpeak).not.toHaveBeenCalled();
    expect(ttsSpeak).toHaveBeenCalledTimes(1);
  });

  it('Pro user gets Michael', async () => {
    const ent = await import('@/services/billing/entitlement');
    ent.setProEntitlement();
    const synth = await install();
    speak(synth, MICHAEL);
    await wait();
    expect(kSpeak.mock.calls[0][0].voice).toBe('am_michael');
  });

  it('flag off: Michael works as before', async () => {
    vi.stubEnv('VITE_ENABLE_PRO', 'false');
    const synth = await install();
    speak(synth, MICHAEL);
    await wait();
    expect(kSpeak.mock.calls[0][0].voice).toBe('am_michael');
  });

  it('saved Michael falls back to Heart for free users (preferences + cycle skipping + sheet)', async () => {
    const { sanitizeVoiceName, isVoiceLocked, nextAllowedVoice } = await import('../voiceAccess');
    const { getProUpgradeState } = await import('@/services/billing/proUpgradeStore');
    const { resolvePlaybackPreferences } = await import('@/lib/preferences/playbackPreferences');
    expect(isVoiceLocked(MICHAEL)).toBe(true);
    expect(isVoiceLocked(HEART)).toBe(false);
    expect(isVoiceLocked('US Voice')).toBe(false);
    expect(sanitizeVoiceName(MICHAEL)).toBe(HEART);
    expect(sanitizeVoiceName('US Voice')).toBe('US Voice');

    localStorage.setItem('lv_preferences', JSON.stringify({ favorite_voice: MICHAEL }));
    const voices = [HEART, MICHAEL, 'US Voice'].map((name) => ({ name })) as unknown as SpeechSynthesisVoice[];
    expect(resolvePlaybackPreferences(voices).resolvedVoice).toBe(HEART);
    // Heart not listed (Kokoro not ready): nothing resolves, callers fall back to the first system voice
    expect(resolvePlaybackPreferences([{ name: 'US Voice' }] as unknown as SpeechSynthesisVoice[]).resolvedVoice).toBeNull();

    expect(nextAllowedVoice(voices, HEART)?.name).toBe('US Voice');
    expect(getProUpgradeState()).toMatchObject({ open: true, feature: 'maleVoice' });
  });

  it('Pro: cycling reaches Michael and no sheet opens', async () => {
    const ent = await import('@/services/billing/entitlement');
    ent.setProEntitlement();
    const { nextAllowedVoice } = await import('../voiceAccess');
    const { getProUpgradeState } = await import('@/services/billing/proUpgradeStore');
    const voices = [HEART, MICHAEL, 'US Voice'].map((name) => ({ name }));
    expect(nextAllowedVoice(voices, HEART)?.name).toBe(MICHAEL);
    expect(getProUpgradeState().open).toBe(false);
  });
});
