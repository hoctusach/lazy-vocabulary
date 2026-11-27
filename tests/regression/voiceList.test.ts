// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeSystemVoices, groupVoices } from '@/services/speech/voiceCatalog';

const HEART = 'Kokoro Heart (US female)';
const MICHAEL = 'Kokoro Michael (US male)';
const native = [
  { name: 'en-us-x-sfg-local', lang: 'en-US', voiceURI: 'sfg', localService: true, default: true },
  { name: 'en-gb-x-rjs-local (male)', lang: 'en_GB', voiceURI: 'rjs', localService: true, default: false },
  { name: 'vi-vn-x-gft-local', lang: 'vi-VN', voiceURI: 'vi', localService: true, default: false },
];

describe('[FB-41] device/system voices stay selectable (Android WebView speechSynthesis empty)', () => {
  it('native voices are listed even when the WebView list is empty; non-English dropped when English exists', () => {
    const merged = mergeSystemVoices([], native);
    expect(merged.map((v) => v.name)).toEqual(['en-us-x-sfg-local', 'en-gb-x-rjs-local (male)']);
    expect((merged[1] as unknown as { index: number }).index).toBe(1); // native index kept for speaking
  });

  it('merges with web voices without duplicating by name; Kokoro stays', () => {
    const web = [{ name: HEART, lang: 'en-US', voiceURI: 'kokoro:af_heart', localService: true, default: false }, { name: native[0].name, lang: 'en-US', voiceURI: 'x', localService: true, default: false }];
    const merged = mergeSystemVoices(web, native);
    expect(merged.filter((v) => v.name === native[0].name)).toHaveLength(1);
    expect(merged.map((v) => v.name)).toContain(HEART);
  });

  it('a device with no English voice still shows its system voices (never an empty list)', () => {
    expect(mergeSystemVoices([], [native[2]]).map((v) => v.name)).toEqual(['vi-vn-x-gft-local']);
  });

  it('only Michael is locked for free users; native male-sounding names are free', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_ENABLE_PRO', 'true');
    localStorage.clear();
    const { isVoiceLocked } = await import('@/services/speech/voiceAccess');
    expect(isVoiceLocked('en-gb-x-rjs-local (male)')).toBe(false);
    expect(isVoiceLocked('en-us-x-sfg-local')).toBe(false);
    expect(isVoiceLocked(HEART)).toBe(false);
    expect(isVoiceLocked(MICHAEL)).toBe(true);
  });
});

describe('[FB-41] useVoiceContext with an empty WebView speechSynthesis', () => {
  it('still exposes the device voices from the native plugin', async () => {
    vi.resetModules();
    vi.doMock('@/services/speech/voiceCatalog', async (orig) => ({
      ...(await orig<typeof import('@/services/speech/voiceCatalog')>()),
      loadNativeSystemVoices: async () => native,
    }));
    (window as unknown as { speechSynthesis: unknown }).speechSynthesis = { getVoices: () => [], addEventListener() {}, removeEventListener() {} };
    const { renderHook, waitFor } = await import('@testing-library/react');
    const { useVoiceContext } = await import('@/hooks/useVoiceContext');
    const { result } = renderHook(() => useVoiceContext());
    await waitFor(() => expect(result.current.allVoices.map((v) => v.name)).toContain('en-us-x-sfg-local'));
    vi.doUnmock('@/services/speech/voiceCatalog');
  });
});

describe('[FB-48] dropdown groups', () => {
  it('lists both natural voices (even when the engine omits them) and system voices separately', () => {
    const g = groupVoices(mergeSystemVoices([], native), true);
    expect(g.natural.map((v) => v.name)).toEqual([HEART, MICHAEL]);
    expect(g.system.map((v) => v.name)).toEqual(['en-us-x-sfg-local', 'en-gb-x-rjs-local (male)']);
  });
  it('without Kokoro support only listed natural voices appear', () => {
    expect(groupVoices(mergeSystemVoices([], native), false).natural).toEqual([]);
  });
});
