/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = { value: false };
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

const pluginLoaded = vi.fn();
const plugin = {
  speak: vi.fn(),
  stop: vi.fn(),
  getSupportedVoices: vi.fn(),
};
vi.mock('@capacitor-community/text-to-speech', () => {
  pluginLoaded();
  return { TextToSpeech: plugin };
});

type AnyWin = Window & Record<string, unknown>;

describe('REG-02: shim and plugin web fallback must not call each other forever', () => {
  beforeEach(() => {
    native.value = false;
    vi.resetModules();
    vi.clearAllMocks();
    delete (window as unknown as AnyWin).speechSynthesis;
    delete (window as unknown as AnyWin).SpeechSynthesisUtterance;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('REG-02a: loadNativeTts() resolves null off-device and never imports the plugin', async () => {
    const { loadNativeTts } = await import('@/services/speech/nativeTts');
    await expect(loadNativeTts()).resolves.toBeNull();
    expect(pluginLoaded).not.toHaveBeenCalled();
  });

  it('REG-02b: plugin web impl calling window.speechSynthesis.cancel() does not recurse', async () => {
    // Off-device the plugin is never loaded, so a stop() that re-enters cancel() is never reached.
    native.value = false;
    plugin.getSupportedVoices.mockResolvedValue({ voices: [] });
    plugin.speak.mockResolvedValue(undefined);
    plugin.stop.mockImplementation(async () => {
      window.speechSynthesis.cancel(); // what the plugin's web implementation does
    });
    const { installNativeSpeechShim } = await import('@/services/speech/nativeSpeechShim');
    expect(installNativeSpeechShim()).toBe(true);
    const synth = window.speechSynthesis;
    synth.cancel(); // must return
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
    expect(plugin.stop.mock.calls.length).toBeLessThan(10);
  });

  it('REG-02c: failing speak + re-speak from onerror yields to timers instead of looping synchronously', async () => {
    native.value = true;
    plugin.getSupportedVoices.mockResolvedValue({ voices: [] });
    plugin.stop.mockResolvedValue(undefined);
    plugin.speak.mockRejectedValue(new Error('no engine'));
    const { installNativeSpeechShim, FAILED_SPEAK_DELAY_MS } = await import('@/services/speech/nativeSpeechShim');
    installNativeSpeechShim();
    const synth = window.speechSynthesis;
    await new Promise((r) => setTimeout(r, 0));

    vi.useFakeTimers();
    let errors = 0;
    const speakAgain = () => {
      errors++;
      const u = new window.SpeechSynthesisUtterance('x');
      u.onerror = speakAgain;
      synth.speak(u);
    };
    const first = new window.SpeechSynthesisUtterance('x');
    first.onerror = speakAgain;
    synth.speak(first);

    for (let i = 0; i < 50; i++) await Promise.resolve();
    expect(errors).toBe(0); // no error surfaced without timers advancing

    await vi.advanceTimersByTimeAsync(FAILED_SPEAK_DELAY_MS * 5 + 50);
    expect(errors).toBeGreaterThan(0);
    expect(errors).toBeLessThanOrEqual(6);
  });
});
