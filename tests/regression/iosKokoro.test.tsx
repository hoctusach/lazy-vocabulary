// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocked platform + mocked KokoroTts plugin + mocked AVSpeech voices (the real Swift plugin / audio are proxy/manual:
// ios/App/KokoroTtsKit tests run on the iOS Simulator in .github/workflows/ios.yml, and the device checklist is in IOS_KOKORO_SETUP.md).
const env = vi.hoisted(() => ({ native: true, platform: 'ios' as string, voices: [] as Array<Record<string, unknown>>, downloaded: false }));
const plugin = vi.hoisted(() => ({
  getStatus: vi.fn(),
  getNetwork: vi.fn(),
  download: vi.fn(),
  cancelDownload: vi.fn(),
  deleteModel: vi.fn(),
  speak: vi.fn(),
  stop: vi.fn(),
  release: vi.fn(),
  addListener: vi.fn(),
}));
const tts = vi.hoisted(() => ({ speak: vi.fn(), stop: vi.fn(), getSupportedVoices: vi.fn() }));
vi.mock('@/services/billing/proFeatures', () => ({ hasFeature: () => true }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => env.native, getPlatform: () => env.platform },
  registerPlugin: () => plugin,
}));
vi.mock('@capacitor-community/text-to-speech', () => ({ TextToSpeech: tts }));

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const V = (voiceURI: string, name: string, lang = 'en-US') => ({ voiceURI, name, lang, localService: true, default: false });
const AVA = V('com.apple.voice.premium.en-US.Ava', 'Ava (Premium)');
const EVAN = V('com.apple.voice.enhanced.en-US.Evan', 'Evan (Enhanced)');
const NATHAN = V('com.apple.voice.enhanced.en-US.Nathan', 'Nathan (Enhanced)');
const SAMANTHA = V('com.apple.voice.compact.en-US.Samantha', 'Samantha');
const ALEX = V('com.apple.voice.compact.en-GB.Daniel', 'Daniel', 'en-GB');

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  env.native = true; env.platform = 'ios'; env.downloaded = false;
  plugin.getStatus.mockImplementation(async () => ({ supported: true, downloaded: env.downloaded, downloading: false, bytesOnDisk: 0, downloadSize: 332562608, version: 'kokoro-v1.0-fp32', variant: 'fp32' }));
  plugin.getNetwork.mockResolvedValue({ connected: true, metered: false });
  plugin.download.mockImplementation(async () => { env.downloaded = true; return plugin.getStatus(); });
  plugin.speak.mockResolvedValue({ interrupted: false });
  plugin.stop.mockResolvedValue(undefined);
  plugin.release.mockResolvedValue(undefined);
  plugin.addListener.mockResolvedValue({ remove: vi.fn() });
  tts.speak.mockResolvedValue(undefined);
  tts.stop.mockResolvedValue(undefined);
  env.voices = [SAMANTHA];
  tts.getSupportedVoices.mockImplementation(async () => ({ voices: env.voices }));
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('[FB-73] iOS Kokoro (native Swift plugin) on the JS side', () => {
  it('[FB-73] isKokoroSupported is true on native iOS and Android, false on web/PWA', async () => {
    const { isKokoroSupported } = await import('@/services/speech/kokoro/kokoroTts');
    expect(isKokoroSupported()).toBe(true);
    env.platform = 'android'; expect(isKokoroSupported()).toBe(true);
    env.native = false; env.platform = 'web'; expect(isKokoroSupported()).toBe(false);
  });

  it('[FB-73] the app shows the Natural voice row / download flow on iOS (status -> download -> ready)', async () => {
    const k = await import('@/services/speech/kokoro/kokoroTts');
    let s = await k.refreshKokoroStatus();
    expect(s.downloaded).toBe(false);
    expect(s.totalBytes).toBe(332562608);
    await k.downloadKokoro();
    expect(plugin.download).toHaveBeenCalledTimes(1);
    s = k.getKokoroState();
    expect(s.downloaded).toBe(true);
    expect(s.downloading).toBe(false);
    expect((await k.getKokoroNetwork()).metered).toBe(false);
  });

  it('[FB-73] the iOS auto-download check starts a download on Wi-Fi and prompts on mobile data', async () => {
    const auto = await import('@/services/speech/kokoro/kokoroAutoDownload');
    expect(await auto.runAutoDownloadCheck()).toBe('started');
    await wait();
    expect(plugin.download).toHaveBeenCalled();
    vi.resetModules(); env.downloaded = false; plugin.download.mockClear();
    plugin.getNetwork.mockResolvedValue({ connected: true, metered: true });
    const auto2 = await import('@/services/speech/kokoro/kokoroAutoDownload');
    expect(await auto2.runAutoDownloadCheck()).toBe('prompt');
    expect(plugin.download).not.toHaveBeenCalled();
  });

  async function installShim() {
    const w = window as unknown as Record<string, unknown>;
    delete w.speechSynthesis; delete w.SpeechSynthesisUtterance;
    const { installNativeSpeechShim } = await import('@/services/speech/nativeSpeechShim');
    expect(installNativeSpeechShim()).toBe(true);
    await wait();
    return window.speechSynthesis;
  }
  const say = (synth: SpeechSynthesis, voiceName: string, text = 'hello') => {
    const u = new window.SpeechSynthesisUtterance(text);
    u.voice = synth.getVoices().find((v) => v.name === voiceName) ?? null;
    u.lang = 'en-US'; u.rate = 0.8;
    const events: string[] = [];
    u.onend = () => events.push('end');
    u.onerror = () => events.push('error');
    synth.speak(u);
    return events;
  };

  it('[FB-73] with the model downloaded, Heart speaks through the Kokoro plugin (not AVSpeech)', async () => {
    env.downloaded = true;
    const synth = await installShim();
    expect(synth.getVoices().map((v) => v.name).slice(0, 2)).toEqual(['Kokoro Heart (US female)', 'Kokoro Michael (US male)']);
    const events = say(synth, 'Kokoro Heart (US female)');
    await wait();
    expect(plugin.speak).toHaveBeenCalledWith({ text: 'hello', voice: 'af_heart', speed: expect.any(Number) });
    expect(tts.speak).not.toHaveBeenCalled();
    expect(events).toEqual(['end']);
  });

  it('[FB-73] model not downloaded: Kokoro voices are not listed and AVSpeech speaks', async () => {
    env.downloaded = false;
    const synth = await installShim();
    expect(synth.getVoices().some((v) => v.name.startsWith('Kokoro'))).toBe(false);
    const events = say(synth, 'Samantha');
    await wait();
    expect(plugin.speak).not.toHaveBeenCalled();
    expect(tts.speak).toHaveBeenCalledTimes(1);
    expect(tts.speak.mock.calls[0][0]).toMatchObject({ text: 'hello', category: 'playback' });
    expect(events).toEqual(['end']);
  });

  it('[FB-73] Kokoro error (OOV / NOT_DOWNLOADED / engine error) falls back to AVSpeech for that utterance', async () => {
    env.downloaded = true;
    plugin.speak.mockRejectedValueOnce(Object.assign(new Error('Unknown words'), { code: 'OOV' }));
    const synth = await installShim();
    const events = say(synth, 'Kokoro Heart (US female)', 'zorblax');
    await wait(60);
    expect(plugin.speak).toHaveBeenCalledTimes(1);
    expect(tts.speak).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['end']);
  });

  it('[FB-73] cancel stops the Kokoro plugin (interrupt) and AVSpeech', async () => {
    env.downloaded = true;
    plugin.speak.mockImplementation(() => new Promise(() => {}));
    const synth = await installShim();
    say(synth, 'Kokoro Heart (US female)');
    await wait();
    synth.cancel();
    await wait();
    expect(plugin.stop).toHaveBeenCalled();
    expect(tts.stop).toHaveBeenCalled();
  });
});

describe('[FB-74] Apple premium voice preference (iOS AVSpeech)', () => {
  it('[FB-74] order: Ava (Premium) > Evan (Enhanced) > Nathan (Enhanced), by voiceURI', async () => {
    const { findPreferredAppleVoiceIndex } = await import('@/services/speech/appleVoices');
    expect(findPreferredAppleVoiceIndex([SAMANTHA, NATHAN, EVAN, AVA])).toBe(3);
    expect(findPreferredAppleVoiceIndex([SAMANTHA, NATHAN, EVAN])).toBe(2);
    expect(findPreferredAppleVoiceIndex([SAMANTHA, NATHAN])).toBe(1);
    expect(findPreferredAppleVoiceIndex([SAMANTHA, ALEX])).toBeUndefined();
    expect(findPreferredAppleVoiceIndex([AVA, EVAN, NATHAN], 'male')).toBe(1);
  });

  it('[FB-74] matches by name + quality when the identifier is not the standard one', async () => {
    const { findPreferredAppleVoiceIndex } = await import('@/services/speech/appleVoices');
    expect(findPreferredAppleVoiceIndex([SAMANTHA, V('x', 'Ava (Premium)')])).toBe(1);
    expect(findPreferredAppleVoiceIndex([V('x', 'Ava')])).toBeUndefined(); // compact Ava is not the premium one
    expect(findPreferredAppleVoiceIndex([V('x', 'Evan (Enhanced)', 'en-GB')])).toBeUndefined();
  });

  it('[FB-74] default pick on iOS: preferred voice beats the generic quality ranking; Android/web are unchanged', async () => {
    const { pickVoiceIndex } = await import('@/services/speech/nativeTts');
    const list = [SAMANTHA, V('com.apple.voice.enhanced.en-US.Zoe', 'Zoe (Enhanced)'), AVA];
    expect(pickVoiceIndex(list, 'en-US', undefined, 'ios')).toBe(2);
    expect(pickVoiceIndex(list, 'en-US', undefined, 'android')).toBe(0);
    expect(pickVoiceIndex([SAMANTHA, EVAN], 'en-US', undefined, 'ios')).toBe(1);
    expect(pickVoiceIndex([SAMANTHA, EVAN, ALEX], 'en-GB', undefined, 'ios')).toBe(2); // UK request keeps the UK voice
    expect(pickVoiceIndex(list, 'en-US', 'Samantha', 'ios')).toBe(0); // an explicit user choice wins
  });

  it('[FB-74] default voice (nothing saved) on iOS is Ava (Premium) when installed', async () => {
    const { bestFallbackVoice } = await import('@/services/speech/voiceFallback');
    expect(bestFallbackVoice([SAMANTHA, EVAN, AVA], 'ios').name).toBe('Ava (Premium)');
    expect(bestFallbackVoice([SAMANTHA, NATHAN], 'ios').name).toBe('Nathan (Enhanced)');
    expect(bestFallbackVoice([SAMANTHA, EVAN, AVA], 'android').name).toBe('Samantha');
  });

  it('[FB-74] hint logic: only on iOS, only when none of the three is installed, only once (persisted)', async () => {
    const h = await import('@/services/speech/appleVoiceHint');
    expect(h.shouldShowAppleVoiceHint([SAMANTHA], 'ios')).toBe(true);
    expect(h.shouldShowAppleVoiceHint([SAMANTHA, EVAN], 'ios')).toBe(false);
    expect(h.shouldShowAppleVoiceHint([], 'ios')).toBe(false); // not loaded yet
    expect(h.shouldShowAppleVoiceHint([SAMANTHA], 'android')).toBe(false);
    expect(h.shouldShowAppleVoiceHint([SAMANTHA], null)).toBe(false);
    h.markAppleVoiceHintSeen();
    expect(localStorage.getItem(h.APPLE_VOICE_HINT_KEY)).toBe('1');
    expect(h.shouldShowAppleVoiceHint([SAMANTHA], 'ios')).toBe(false);
  });

  it('[FB-74] hint copy names the Settings path and the voices, EN + VI', async () => {
    const { appleVoiceHintCopy } = await import('@/services/speech/appleVoiceHint');
    const en = appleVoiceHintCopy(false);
    expect(en.body).toContain('Settings › Accessibility › Spoken Content (iOS 26: Read & Speak) › Voices › English');
    expect(en.body).toContain('Ava (Premium)');
    expect(en.body).toContain('Evan (Enhanced)');
    const vi_ = appleVoiceHintCopy(true);
    expect(vi_.body).toContain('Ava (Premium)');
    expect(vi_.body).toContain('Cài đặt');
    expect(vi_.action).not.toBe(en.action);
  });

  async function mountHint() {
    const toast = vi.fn();
    vi.doMock('sonner', () => ({ toast }));
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { act } = await import('react');
    const { default: AppleVoiceHint } = await import('@/components/AppleVoiceHint');
    const el = document.createElement('div');
    const root = createRoot(el);
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    await act(async () => { root.render(React.createElement(AppleVoiceHint)); await wait(60); });
    await act(async () => { root.unmount(); });
    return toast;
  }

  it('[FB-74] iOS without the preferred voices: the hint toast shows once and is persisted', async () => {
    env.voices = [SAMANTHA];
    const toast = await mountHint();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][1]).toMatchObject({ dismissible: true, closeButton: true });
    vi.resetModules();
    const again = await mountHint();
    expect(again).not.toHaveBeenCalled();
  });

  it('[FB-74] no hint on iOS when Ava / Evan is installed, and none on Android or web', async () => {
    env.voices = [SAMANTHA, EVAN];
    expect(await mountHint()).not.toHaveBeenCalled();
    vi.resetModules(); localStorage.clear();
    env.voices = [SAMANTHA]; env.platform = 'android';
    expect(await mountHint()).not.toHaveBeenCalled();
    vi.resetModules();
    env.native = false; env.platform = 'web';
    expect(await mountHint()).not.toHaveBeenCalled();
    expect(localStorage.getItem('lv_apple_voice_hint_seen')).toBeNull();
  });
});
