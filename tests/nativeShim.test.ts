/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = { value: false };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

const plugin = {
  speak: vi.fn(),
  stop: vi.fn().mockResolvedValue(undefined),
  getSupportedVoices: vi.fn(),
};
vi.mock('@capacitor-community/text-to-speech', () => ({ TextToSpeech: plugin }));

import { shouldUseNativeTts } from '@/services/speech/nativeTts';

const voices = [
  { voiceURI: 'a', name: 'US Voice', lang: 'en-US', localService: true, default: true },
  { voiceURI: 'b', name: 'UK Voice', lang: 'en-GB', localService: true, default: false },
];

type AnyWin = Window & Record<string, unknown>;

async function freshShim() {
  vi.resetModules();
  delete (window as unknown as AnyWin).speechSynthesis;
  delete (window as unknown as AnyWin).SpeechSynthesisUtterance;
  const mod = await import('@/services/speech/nativeSpeechShim');
  expect(mod.installNativeSpeechShim()).toBe(true);
  const synth = window.speechSynthesis;
  await vi.waitFor(() => expect(synth.getVoices().length).toBeGreaterThan(0));
  return synth;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('[FB-15] NATIVE-08: shim install rules', () => {
  afterEach(() => {
    native.value = false;
  });
  it('uses the shim when native, or when Web Speech is missing; leaves a browser with Web Speech alone', () => {
    native.value = true;
    expect(shouldUseNativeTts(true)).toBe(true);
    expect(shouldUseNativeTts(false)).toBe(true);
    native.value = false;
    expect(shouldUseNativeTts(false)).toBe(true);
    expect(shouldUseNativeTts(true)).toBe(false);
  });

  it('does not replace a real speechSynthesis in a plain browser', async () => {
    vi.resetModules();
    const real = { real: true, speak: vi.fn() };
    Object.defineProperty(window, 'speechSynthesis', { value: real, configurable: true, writable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: function () {}, configurable: true, writable: true });
    const mod = await import('@/services/speech/nativeSpeechShim');
    expect(mod.installNativeSpeechShim()).toBe(false);
    expect(window.speechSynthesis).toBe(real);
  });
});

describe('[FB-15] NATIVE-07: native TTS shim', () => {
  beforeEach(() => {
    native.value = true; // loadNativeTts() only returns the plugin on a native platform
    vi.clearAllMocks();
    plugin.getSupportedVoices.mockResolvedValue({ voices });
    plugin.speak.mockResolvedValue(undefined);
    plugin.stop.mockResolvedValue(undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    native.value = false;
    vi.restoreAllMocks();
  });

  const utter = (text = 'hello') => new window.SpeechSynthesisUtterance(text);

  it('exposes native voices (loaded lazily)', async () => {
    const synth = await freshShim();
    expect(synth.getVoices().map((v) => v.name)).toEqual(['US Voice', 'UK Voice']);
  });

  it('retries the voice list when the engine is not ready yet', async () => {
    vi.useFakeTimers();
    try {
      plugin.getSupportedVoices.mockResolvedValueOnce({ voices: [] }).mockResolvedValue({ voices });
      vi.resetModules();
      delete (window as unknown as AnyWin).speechSynthesis;
      const mod = await import('@/services/speech/nativeSpeechShim');
      mod.installNativeSpeechShim();
      await vi.advanceTimersByTimeAsync(1500);
      expect(plugin.getSupportedVoices).toHaveBeenCalledTimes(2);
      expect(window.speechSynthesis.getVoices()).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('speak fires start then end on success', async () => {
    const synth = await freshShim();
    const events: string[] = [];
    const u = utter();
    u.onstart = () => events.push('start');
    u.onend = () => events.push('end');
    synth.speak(u);
    await vi.waitFor(() => expect(events).toEqual(['start', 'end']));
    expect(plugin.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello' }));
    expect(synth.speaking).toBe(false);
  });

  it('cancel reports error "canceled" and stops the engine', async () => {
    const synth = await freshShim();
    plugin.speak.mockImplementation(() => new Promise(() => {}));
    const errors: string[] = [];
    const u = utter();
    u.onerror = (e) => errors.push((e as unknown as { error: string }).error);
    synth.speak(u);
    await flush();
    synth.cancel();
    expect(errors).toEqual([]); // cancel error is emitted asynchronously
    await vi.waitFor(() => expect(errors).toEqual(['canceled']));
    await vi.waitFor(() => expect(plugin.stop).toHaveBeenCalled());
    expect(synth.speaking).toBe(false);
  });

  it('pause stops the engine and resume replays the utterance', async () => {
    const synth = await freshShim();
    let resolveFirst: () => void = () => {};
    plugin.speak.mockImplementationOnce(() => new Promise<void>((r) => { resolveFirst = r; }));
    const events: string[] = [];
    const u = utter();
    u.onpause = () => events.push('pause');
    u.onresume = () => events.push('resume');
    u.onend = () => events.push('end');
    synth.speak(u);
    await flush();
    synth.pause();
    expect(synth.paused).toBe(true);
    resolveFirst();
    await flush();
    expect(events).toEqual(['pause']);
    synth.resume();
    await vi.waitFor(() => expect(events).toEqual(['pause', 'resume', 'end']));
    expect(plugin.speak).toHaveBeenCalledTimes(2);
  });

  it('maps plugin failures to synthesis-failed', async () => {
    const synth = await freshShim();
    plugin.speak.mockRejectedValue(new Error('engine crashed'));
    const errors: string[] = [];
    const u = utter();
    u.onerror = (e) => errors.push((e as unknown as { error: string }).error);
    synth.speak(u);
    await vi.waitFor(() => expect(errors).toEqual(['synthesis-failed']), { timeout: 2000 }); // after FAILED_SPEAK_DELAY_MS
    expect(synth.speaking).toBe(false);
  });

  it('EDGE-11: a throwing onerror handler never leaves the shim stuck "speaking"', async () => {
    const synth = await freshShim();
    plugin.speak.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const bad = utter('bad');
    bad.onerror = () => { throw new Error('handler blew up'); };
    const good = utter('good');
    const ended = vi.fn();
    good.onend = ended;
    synth.speak(bad);
    synth.speak(good);
    await vi.waitFor(() => expect(ended).toHaveBeenCalled(), { timeout: 2000 });
    expect(synth.speaking).toBe(false);
  });
});
