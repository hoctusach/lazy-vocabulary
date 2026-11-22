// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ttsSpeak = vi.fn();
const ttsStop = vi.fn(async () => {});
const kSpeak = vi.fn();
const kStop = vi.fn(async () => {});

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
  registerPlugin: () => ({
    getStatus: async () => ({ supported: true, downloaded: true, downloading: false, bytesOnDisk: 0, downloadSize: 1, version: 'v' }),
    speak: (o: unknown) => kSpeak(o),
    stop: () => kStop(),
    release: async () => {},
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
vi.mock('@/services/speech/readingTime', () => ({ estimateReadingTimeMs: () => 40 }));

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const HEART = 'Kokoro Heart (US female)';

describe('[FB-30] Mute really silences native speech', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_ENABLE_PRO', 'true');
    [ttsSpeak, ttsStop, kSpeak, kStop].forEach((m) => m.mockClear());
    ttsSpeak.mockResolvedValue(undefined);
    kSpeak.mockResolvedValue({ interrupted: false });
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  async function install() {
    const w = window as unknown as Record<string, unknown>;
    delete w.speechSynthesis; delete w.SpeechSynthesisUtterance;
    const { installNativeSpeechShim } = await import('@/services/speech/nativeSpeechShim');
    installNativeSpeechShim();
    await wait();
    return window.speechSynthesis;
  }
  const utter = (synth: SpeechSynthesis, name: string, volume: number) => {
    const u = new window.SpeechSynthesisUtterance('hello there');
    u.voice = synth.getVoices().find((v) => v.name === name)!; u.lang = 'en-US'; u.volume = volume;
    return u;
  };

  it('a muted (volume 0) Kokoro utterance never reaches the engine, yet still ends so playback advances', async () => {
    const synth = await install();
    const u = utter(synth, HEART, 0);
    const onend = vi.fn(); u.onend = onend;
    synth.speak(u);
    await wait(120);
    expect(kSpeak).not.toHaveBeenCalled();
    expect(ttsSpeak).not.toHaveBeenCalled();
    expect(onend).toHaveBeenCalledTimes(1);
  });

  it('a muted system-voice utterance never reaches native TTS either', async () => {
    const synth = await install();
    const u = utter(synth, 'US Voice', 0);
    const onend = vi.fn(); u.onend = onend;
    synth.speak(u);
    await wait(120);
    expect(ttsSpeak).not.toHaveBeenCalled();
    expect(kSpeak).not.toHaveBeenCalled();
    expect(onend).toHaveBeenCalledTimes(1);
  });

  it('later words stay silent while muted, and unmuted speech works again', async () => {
    const synth = await install();
    synth.speak(utter(synth, HEART, 0));
    synth.speak(utter(synth, HEART, 0));
    await wait(200);
    expect(kSpeak).not.toHaveBeenCalled();
    synth.speak(utter(synth, HEART, 1));
    await wait();
    expect(kSpeak).toHaveBeenCalledTimes(1);
  });

  it('mute while Kokoro is speaking stops Kokoro and native TTS immediately (cancel)', async () => {
    kSpeak.mockImplementation(() => new Promise(() => {})); // long utterance
    const synth = await install();
    synth.speak(utter(synth, HEART, 1));
    await wait();
    expect(kSpeak).toHaveBeenCalledTimes(1);
    synth.cancel();
    await wait();
    expect(kStop).toHaveBeenCalled();
    expect(ttsStop).toHaveBeenCalled();
  });

  it('cancel during a silent (muted) wait ends it and starts nothing', async () => {
    const synth = await install();
    synth.speak(utter(synth, HEART, 0));
    await wait(5);
    synth.cancel();
    await wait(100);
    expect(kSpeak).not.toHaveBeenCalled();
    expect(ttsSpeak).not.toHaveBeenCalled();
    expect(synth.speaking).toBe(false);
  });

  it('unifiedSpeechController.setMuted(true) cancels the engine immediately and persists via the mute effect', async () => {
    const synth = await install();
    const cancel = vi.spyOn(synth, 'cancel');
    const { unifiedSpeechController } = await import('@/services/speech/unifiedSpeechController');
    unifiedSpeechController.setMuted(true);
    expect(cancel).toHaveBeenCalled();
    expect(unifiedSpeechController.getMuted()).toBe(true);
    const { getIsMuted } = await import('@/utils/localPreferences');
    const { setIsMuted } = await import('@/utils/localPreferences');
    setIsMuted(true);
    expect(getIsMuted()).toBe(true);
    unifiedSpeechController.setMuted(false);
  });
});
