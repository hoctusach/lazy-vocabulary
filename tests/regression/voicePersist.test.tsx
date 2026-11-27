/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const HEART = 'Kokoro Heart (US female)';
const env = { kokoro: true, native: [] as Array<Record<string, unknown>>, web: [] as Array<Record<string, unknown>>, pro: false };

vi.mock('@/services/speech/kokoro/kokoroTts', () => ({ isKokoroSupported: () => env.kokoro }));
vi.mock('@/services/speech/voiceCatalog', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadNativeSystemVoices: async () => env.native,
}));
vi.mock('@/services/billing/proFeatures', () => ({ hasFeature: () => env.pro }));
vi.mock('@/utils/speech/debug/logVoices', () => ({ logAvailableVoices: () => {} }));

import { useVoiceContext } from '@/hooks/useVoiceContext';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';
import { buildNativeQueue } from '@/services/background/buildNativeQueue';
import { bestFallbackVoice } from '@/services/speech/voiceFallback';

const nat = (voiceURI: string, name: string, lang: string, def = false) => ({ voiceURI, name, lang, localService: true, default: def });
// The device list is sorted by voice id: Australian English comes FIRST and is flagged as the engine default.
const AU = nat('en-au-x-aua-local', 'English Australia', 'en-AU', true);
const US = nat('en-us-x-sfg-local', 'English United States', 'en-US');
const GB = nat('en-gb-x-gba-local', 'English United Kingdom', 'en-GB');
const kokoroWeb = [
  { name: HEART, lang: 'en-US', voiceURI: 'kokoro:af_heart', localService: true, default: false },
  { name: 'Kokoro Michael (US male)', lang: 'en-US', voiceURI: 'kokoro:am_michael', localService: true, default: false },
];

function stubSynth() {
  const listeners = new Set<() => void>();
  (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
    getVoices: () => env.web,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    speaking: false, pending: false, cancel: () => {},
  };
  return { fire: () => listeners.forEach((cb) => cb()) };
}

beforeEach(() => {
  localStorage.clear();
  env.kokoro = true; env.pro = false; env.web = []; env.native = [AU, GB, US];
});
afterEach(cleanup);

describe('[FB-61] the last chosen voice is kept', () => {
  it('saved Heart stays selected and saved while the voice list is still loading (only Australian/system voices listed), and after Kokoro is merged in late', async () => {
    setFavoriteVoice(HEART);
    const synth = stubSynth();
    const { result } = renderHook(() => useVoiceContext());
    await waitFor(() => expect(result.current.allVoices.length).toBe(3));
    expect(result.current.selectedVoiceName).toBe(HEART); // not "English Australia" (the first, default voice)
    expect(getFavoriteVoice()).toBe(HEART);
    // late: Kokoro joins the list
    env.web = kokoroWeb;
    await act(async () => { synth.fire(); });
    await waitFor(() => expect(result.current.allVoices.some((v) => v.name === HEART)).toBe(true));
    expect(result.current.selectedVoiceName).toBe(HEART);
    expect(getFavoriteVoice()).toBe(HEART);
  });

  it('a mocked default Australian system voice cannot overwrite a saved Kokoro preference (reload too)', async () => {
    setFavoriteVoice(HEART);
    stubSynth();
    for (let i = 0; i < 2; i += 1) { // "restart" = remount
      const { result, unmount } = renderHook(() => useVoiceContext());
      await waitFor(() => expect(result.current.allVoices.length).toBeGreaterThan(0));
      await new Promise((r) => setTimeout(r, 30));
      expect(result.current.selectedVoiceName).toBe(HEART);
      expect(getFavoriteVoice()).toBe(HEART);
      unmount();
    }
  });

  it('a named system voice is restored after a reload and after a late native merge', async () => {
    setFavoriteVoice('English United States');
    const synth = stubSynth();
    env.native = []; // plugin not loaded yet
    const { result } = renderHook(() => useVoiceContext());
    await new Promise((r) => setTimeout(r, 30));
    expect(getFavoriteVoice()).toBe('English United States');
    env.native = [AU, GB, US]; // native list arrives late
    await act(async () => { synth.fire(); });
    await waitFor(() => expect(result.current.selectedVoiceName).toBe('English United States'));
    expect(getFavoriteVoice()).toBe('English United States');
  });

  it('with no saved voice the fallback prefers US English over the Australian first-in-list voice and is not persisted', async () => {
    stubSynth();
    const { result } = renderHook(() => useVoiceContext());
    await waitFor(() => expect(result.current.selectedVoiceName).toBe('English United States'));
    expect(getFavoriteVoice()).toBeNull();
    expect(bestFallbackVoice([AU, GB, US]).name).toBe('English United States');
    expect(bestFallbackVoice([AU, GB]).name).toBe('English United Kingdom');
  });

  it('a free user with saved Michael is shown Heart but the saved Michael is not rewritten', async () => {
    setFavoriteVoice('Kokoro Michael (US male)');
    env.web = kokoroWeb;
    stubSynth();
    const { result } = renderHook(() => useVoiceContext());
    await waitFor(() => expect(result.current.selectedVoiceName).toBe(HEART));
    await new Promise((r) => setTimeout(r, 30));
    expect(getFavoriteVoice()).toBe('Kokoro Michael (US male)');
  });
});

describe('[FB-61] background / native playback uses the same voice', () => {
  const list = [{ word: 'a', meaning: 'm', example: '', category: 'idioms', count: 0 }, { word: 'b', meaning: 'm', example: '', category: 'idioms', count: 0 }];
  it('Heart -> engine kokoro + af_heart; Michael for a Pro user -> am_michael', () => {
    expect(buildNativeQueue(list, list[0], { voiceName: HEART, rate: 1, muted: false })).toMatchObject({ engine: 'kokoro', voice: 'af_heart' });
    env.pro = true;
    expect(buildNativeQueue(list, list[0], { voiceName: 'Kokoro Michael (US male)', rate: 1, muted: false })).toMatchObject({ engine: 'kokoro', voice: 'am_michael' });
  });
  it('a free user queue with saved Michael carries Heart, like the foreground', () => {
    expect(buildNativeQueue(list, list[0], { voiceName: 'Kokoro Michael (US male)', rate: 1, muted: false })).toMatchObject({ engine: 'kokoro', voice: 'af_heart' });
  });
  it('a system voice goes to native BY NAME (not the engine default / en-US)', () => {
    env.web = [AU, GB, US].map((v) => ({ ...v }));
    const q = buildNativeQueue(list, list[0], { voiceName: 'English United Kingdom', rate: 1, muted: false })!;
    expect(q.engine).toBe('system');
    expect(q.voiceName).toBe('en-gb-x-gba-local');
    expect(buildNativeQueue(list, list[0], { voiceName: 'English United Kingdom', voiceUri: 'explicit', rate: 1, muted: false })!.voiceName).toBe('explicit');
  });
  it('native service source: selects the saved voice by name and never swaps the engine default in for Kokoro', () => {
    const dir = path.join(process.cwd(), 'android/app/src/main/java/com/lazy/vocabulary');
    const svc = fs.readFileSync(path.join(dir, 'PlaybackService.java'), 'utf8');
    const plugin = fs.readFileSync(path.join(dir, 'PlaybackServicePlugin.java'), 'utf8');
    expect(plugin).toMatch(/getString\("voiceName"/);
    expect(svc).toMatch(/systemTts\.setVoice\(v\)/);
    expect(svc).toMatch(/want\.equals\(v\.getName\(\)\)/);
    // kokoro chosen but not ready: silent timing, no speakSystem fallthrough
    expect(svc).toMatch(/if \("kokoro"\.equals\(queue\.engine\)\) \{\s*if \(speakKokoro\(speech, myToken, done\)\) return;[\s\S]*?return;\s*\}\s*speakSystem/);
  });
});
