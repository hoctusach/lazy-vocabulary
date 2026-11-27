// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ttsSpeak = vi.fn();
const ttsStop = vi.fn(async () => {});
const kSpeak = vi.fn();
const kStop = vi.fn(async () => {});
const kRelease = vi.fn(async () => {});
const kStatus = { downloaded: true, downloading: false };
const env = { native: true, android: true, pro: false };
vi.mock('@/services/billing/proFeatures', () => ({ hasFeature: () => env.pro }));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => env.native, getPlatform: () => (env.android ? 'android' : 'ios') },
  registerPlugin: () => ({
    getStatus: async () => ({ supported: true, ...kStatus, bytesOnDisk: 0, downloadSize: 1, version: 'v' }),
    speak: (o: unknown) => kSpeak(o),
    stop: () => kStop(),
    release: () => kRelease(),
    addListener: async () => ({ remove: async () => {} }),
  }),
}));
vi.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: {
    speak: (o: unknown) => ttsSpeak(o),
    stop: () => ttsStop(),
    getSupportedVoices: async () => ({ voices: [{ voiceURI: 'a', name: 'US Voice', lang: 'en-US', localService: true, default: true }] }),
  },
}));

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe('shim + Kokoro', () => {
  beforeEach(() => {
    vi.resetModules();
    [ttsSpeak, ttsStop, kSpeak, kStop, kRelease].forEach((m) => m.mockClear());
    ttsSpeak.mockResolvedValue(undefined);
    kSpeak.mockResolvedValue({ interrupted: false });
    kStatus.downloaded = true;
    env.native = true; env.android = true; env.pro = false;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { env.native = false; vi.restoreAllMocks(); });

  async function install() {
    const w = window as unknown as Record<string, unknown>;
    delete w.speechSynthesis; delete w.SpeechSynthesisUtterance;
    const { installNativeSpeechShim } = await import('../nativeSpeechShim');
    expect(installNativeSpeechShim()).toBe(true);
    await wait();
    return window.speechSynthesis;
  }
  const speakText = (synth: SpeechSynthesis, voiceIdx: number, text = 'hello') => {
    const u = new window.SpeechSynthesisUtterance(text);
    u.voice = synth.getVoices()[voiceIdx]; u.lang = 'en-US'; u.rate = 0.8;
    const events: string[] = [];
    u.onend = () => events.push('end');
    u.onerror = () => events.push('error');
    synth.speak(u);
    return events;
  };

  it('lists Kokoro voices first, only when downloaded', async () => {
    let synth = await install();
    expect(synth.getVoices().map((v) => v.name)).toEqual(['Kokoro Heart (US female)', 'Kokoro Michael (US male)', 'US Voice']);
    vi.resetModules(); kStatus.downloaded = false;
    synth = await install();
    expect(synth.getVoices().map((v) => v.name)).toEqual(['US Voice']);
  });

  it('shows no Kokoro voices when unsupported', async () => {
    env.android = false;
    const synth = await install();
    expect(synth.getVoices().map((v) => v.name)).toEqual(['US Voice']);
  });

  it('a Pro user speaking Kokoro Michael goes through the plugin with mapped speed', async () => {
    env.pro = true;
    const synth = await install();
    const events = speakText(synth, 1);
    await wait();
    expect(kSpeak).toHaveBeenCalledWith({ text: 'hello', voice: 'am_michael', speed: expect.closeTo(1.0) });
    expect(ttsSpeak).not.toHaveBeenCalled();
    expect(events).toEqual(['end']);
  });

  it('a free user asking for Michael speaks Heart (Pro voice gating), never the system voice', async () => {
    const synth = await install();
    const events = speakText(synth, 1);
    await wait();
    expect(kSpeak).toHaveBeenCalledWith({ text: 'hello', voice: 'af_heart', speed: expect.any(Number) });
    expect(ttsSpeak).not.toHaveBeenCalled();
    expect(events).toEqual(['end']);
  });

  it('falls back to the system voice on rejection without an error event', async () => {
    kSpeak.mockRejectedValue({ code: 'OOV' });
    const synth = await install();
    const events = speakText(synth, 0);
    await wait(400);
    expect(ttsSpeak).toHaveBeenCalledTimes(1);
    expect(ttsSpeak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello', voice: 0 }));
    expect(events).toEqual(['end']);
  });

  it('cancel and pause stop Kokoro', async () => {
    kSpeak.mockImplementation(() => new Promise(() => {}));
    const synth = await install();
    speakText(synth, 0);
    await wait();
    synth.pause();
    expect(kStop).toHaveBeenCalledTimes(1);
    synth.cancel();
    expect(kStop).toHaveBeenCalledTimes(2);
  });

  it('releases Kokoro once when a system voice speaks afterwards', async () => {
    const synth = await install();
    speakText(synth, 0);
    await wait();
    speakText(synth, 2, 'one');
    await wait();
    speakText(synth, 2, 'two');
    await wait();
    expect(kRelease).toHaveBeenCalledTimes(1);
    expect(ttsSpeak).toHaveBeenCalledTimes(2);
  });
});
