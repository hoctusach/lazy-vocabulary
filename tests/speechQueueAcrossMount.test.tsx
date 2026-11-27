/**
 * @vitest-environment jsdom
 *
 * The native speech queue (system TTS and Kokoro) keeps advancing while a tab component
 * mounts and unmounts; nothing stops the engine.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
const system = vi.hoisted(() => ({
  speak: vi.fn(),
  stop: vi.fn().mockResolvedValue(undefined),
  getSupportedVoices: vi.fn(),
}));
vi.mock('@capacitor-community/text-to-speech', () => ({ TextToSpeech: system }));
const kokoro = vi.hoisted(() => ({ speak: vi.fn(), stop: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/services/speech/kokoro/kokoroTts', () => ({
  getKokoro: () => ({ plugin: kokoro }),
  getKokoroState: () => ({ downloaded: true }),
  isKokoroSupported: () => true,
  refreshKokoroStatus: vi.fn().mockResolvedValue(undefined),
  subscribeKokoro: vi.fn(),
}));

import { KOKORO_VOICES } from '@/services/speech/kokoro/kokoroVoices';

const sysVoices = [{ voiceURI: 'a', name: 'US Voice', lang: 'en-US', localService: true, default: true }];

async function freshShim() {
  vi.resetModules();
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
  delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
  const mod = await import('@/services/speech/nativeSpeechShim');
  mod.installNativeSpeechShim();
  const synth = window.speechSynthesis;
  await vi.waitFor(() => expect(synth.getVoices().length).toBeGreaterThan(0));
  return synth;
}

const Tab: React.FC = () => <div>tab</div>; // a tab view: mounts/unmounts, owns no speech

beforeEach(() => {
  vi.clearAllMocks();
  system.getSupportedVoices.mockResolvedValue({ voices: sysVoices });
  system.stop.mockResolvedValue(undefined);
  kokoro.stop.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

describe.each([
  ['system TTS', system, () => undefined as unknown],
  ['Kokoro', kokoro, () => ({ name: KOKORO_VOICES[0].name })],
])('%s queue', (_name, engine, voice) => {
  it('advances to the next utterance across a tab mount/unmount without stopping the engine', async () => {
    const synth = await freshShim();
    let release: () => void = () => {};
    engine.speak.mockImplementationOnce(() => new Promise<void>((r) => { release = r; }));
    engine.speak.mockResolvedValue(undefined);

    const make = (t: string) => {
      const u = new window.SpeechSynthesisUtterance(t);
      const v = voice();
      if (v) u.voice = v as SpeechSynthesisVoice;
      return u;
    };
    const ended: string[] = [];
    const a = make('one');
    a.onend = () => ended.push('one');
    const b = make('two');
    b.onend = () => ended.push('two');
    synth.speak(a);
    synth.speak(b);

    // user switches tabs while "one" is speaking
    const view = render(<Tab />);
    view.unmount();
    render(<Tab />).unmount();

    await vi.waitFor(() => expect(engine.speak).toHaveBeenCalledTimes(1));
    release();
    await vi.waitFor(() => expect(ended).toEqual(['one', 'two']));
    expect(engine.speak).toHaveBeenCalledTimes(2);
    expect(system.stop).not.toHaveBeenCalled();
    expect(kokoro.stop).not.toHaveBeenCalled();
  });
});
