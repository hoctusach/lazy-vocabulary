// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const speak = vi.fn();
const stop = vi.fn(async () => {});
const getSupportedVoices = vi.fn(async () => ({
  voices: [
    { voiceURI: 'a', name: 'US Voice', lang: 'en-US', localService: true, default: true },
    { voiceURI: 'b', name: 'UK Voice', lang: 'en-GB', localService: true, default: false },
  ],
}));

const native = { value: false };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

vi.mock('@capacitor-community/text-to-speech', () => ({
  TextToSpeech: { speak: (o: unknown) => speak(o), stop: () => stop(), getSupportedVoices: () => getSupportedVoices() },
}));

import { buildSpeakOptions, pickVoiceIndex, shouldUseNativeTts } from '../nativeTts';
import { getSynth, hasWebSpeech, onVoicesChanged } from '../webSpeech';

const voices = [
  { voiceURI: 'a', name: 'US Voice', lang: 'en-US', localService: true, default: true },
  { voiceURI: 'b', name: 'UK Voice', lang: 'en_GB', localService: true, default: false },
];

describe('pickVoiceIndex', () => {
  it('matches by name, exact lang, then primary language', () => {
    expect(pickVoiceIndex(voices, 'en-GB')).toBe(1);
    expect(pickVoiceIndex(voices, 'en-AU')).toBe(0);
    expect(pickVoiceIndex(voices, 'en-US', 'UK Voice')).toBe(1);
    expect(pickVoiceIndex(voices, 'fr-FR')).toBeUndefined();
  });
});

describe('buildSpeakOptions', () => {
  it('passes through and clamps settings', () => {
    expect(buildSpeakOptions({ text: 'hi', lang: 'en-GB', rate: 0.8, pitch: 5, volume: 2 }, 1)).toEqual({
      text: 'hi', lang: 'en-GB', rate: 0.8, pitch: 2, volume: 1, voice: 1,
    });
    expect(buildSpeakOptions({ text: 'x' })).toMatchObject({ lang: 'en-US', rate: 1, pitch: 1, volume: 1 });
  });
});

describe('[FB-15] shouldUseNativeTts', () => {
  it('uses native when Web Speech is absent', () => {
    expect(shouldUseNativeTts(false)).toBe(true);
    expect(shouldUseNativeTts(true)).toBe(false); // jsdom is not native
  });
});

describe('[FB-15] webSpeech helpers when speechSynthesis is missing', () => {
  it('never throws', () => {
    const w = window as unknown as Record<string, unknown>;
    const saved = Object.getOwnPropertyDescriptor(w, 'speechSynthesis');
    Object.defineProperty(w, 'speechSynthesis', { value: undefined, configurable: true, writable: true });
    expect(getSynth()).toBeNull();
    expect(hasWebSpeech()).toBe(false);
    expect(() => onVoicesChanged(() => {})()).not.toThrow();
    if (saved) Object.defineProperty(w, 'speechSynthesis', saved); else delete w.speechSynthesis;
  });
});

describe('[FB-15] native speech shim', () => {
  afterEach(() => { native.value = false; });
  beforeEach(() => { native.value = true; speak.mockReset(); stop.mockClear(); vi.resetModules(); });

  async function install() {
    const w = window as unknown as Record<string, unknown>;
    delete w.speechSynthesis; delete w.SpeechSynthesisUtterance;
    const { installNativeSpeechShim } = await import('../nativeSpeechShim');
    expect(installNativeSpeechShim()).toBe(true);
    await new Promise((r) => setTimeout(r, 10));
    return window.speechSynthesis;
  }

  it('exposes native voices and fires voiceschanged', async () => {
    const synth = await install();
    expect(synth.getVoices()).toHaveLength(2);
    expect(onVoicesChanged).toBeTypeOf('function');
  });

  it('speaks via the plugin with mapped voice, then fires start/end', async () => {
    speak.mockResolvedValue(undefined);
    const synth = await install();
    const u = new window.SpeechSynthesisUtterance('hello');
    u.voice = synth.getVoices()[1]; u.lang = 'en-GB'; u.rate = 0.9;
    const events: string[] = [];
    u.onstart = () => events.push('start');
    u.onend = () => events.push('end');
    synth.speak(u);
    await new Promise((r) => setTimeout(r, 20));
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'hello', lang: 'en-GB', rate: 0.9, voice: 1 }));
    expect(events).toEqual(['start', 'end']);
    expect(synth.speaking).toBe(false);
  });

  it('cancel stops native speech and emits canceled error', async () => {
    speak.mockImplementation(() => new Promise(() => {}));
    const synth = await install();
    const u = new window.SpeechSynthesisUtterance('long');
    const errors: string[] = [];
    u.onerror = (e) => errors.push((e as unknown as { error: string }).error);
    synth.speak(u);
    await new Promise((r) => setTimeout(r, 10));
    expect(synth.speaking).toBe(true);
    synth.cancel();
    await new Promise((r) => setTimeout(r, 20));
    expect(stop).toHaveBeenCalled();
    expect(errors).toEqual(['canceled']);
    expect(synth.speaking).toBe(false);
  });
});
