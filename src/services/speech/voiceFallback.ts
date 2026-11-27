/**
 * [FB-61] When no saved voice can be used, pick a sensible English system voice for this utterance only: US first, then
 * UK, then any English voice, then the first voice. The list order from the device is alphabetical by voice id, which
 * put an Australian voice first, so "first English voice" is NOT a safe default. Never written to preferences.
 */
type V = { lang?: string; name: string };

const norm = (lang: string | undefined) => (lang ?? '').toLowerCase().replace('_', '-');

export function bestFallbackVoice<T extends V>(voices: readonly T[]): T {
  const pick = (prefix: string) => voices.find((v) => norm(v.lang).startsWith(prefix));
  return pick('en-us') ?? pick('en-gb') ?? pick('en') ?? voices[0];
}

/**
 * Wait (poll) for a voice that is expected to appear shortly, e.g. the saved Kokoro voice while the model status loads.
 * Resolves with the voice or null after `ms`; never throws.
 */
export async function waitForVoiceByName(name: string, ms = 4000, step = 200): Promise<SpeechSynthesisVoice | null> {
  const find = () => {
    try { return window.speechSynthesis?.getVoices?.().find((v) => v.name === name) ?? null; } catch { return null; }
  };
  let voice = find();
  for (let waited = 0; !voice && waited < ms; waited += step) {
    await new Promise((r) => setTimeout(r, step));
    voice = find();
  }
  return voice;
}
