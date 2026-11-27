// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const callRpc = vi.fn();
vi.mock('@/lib/progress/friends', () => ({ callFriendsRpc: (...a: unknown[]) => callRpc(...a) }));
vi.mock('@/lib/auth', () => ({ hasStoredSignIn: () => true }));

// [FB-43] World-language Translation: save/display/sync keeps every character.
const FIXTURES: Record<string, string> = {
  arabic: 'مرحبا بالعالم',
  hebrew: 'שלום עולם',
  chinese: '你好，世界',
  thai: 'สวัสดีชาวโลก',
  french: 'Élève à Noël : où est ça ? çà et là — garçon',
  emoji: 'Giữ 👍🏽 và 👨‍👩‍👧‍👦 🎉',
  combining: 'é (NFD) and é (NFC)',
  multiline: 'dòng 1\n\ndòng 3\nline 4',
};
const W = { word: 'give up', category: 'phrases' };
const ID = 'default::phrases::give up';

describe('[FB-43] translation: world languages', () => {
  beforeEach(() => { vi.resetModules(); localStorage.clear(); callRpc.mockReset(); callRpc.mockResolvedValue(undefined); });
  afterEach(cleanup);

  for (const [name, text] of Object.entries(FIXTURES)) {
    it(`local round trip keeps the exact string: ${name}`, async () => {
      const store = await import('@/lib/translations/translationOverrides');
      expect(store.setTranslationOverride(W, text, 'u')).toBe(true);
      expect(store.getTranslationOverride(W, 'u')).toBe(text); // no NFC/NFD change, nothing stripped
      // survives a JSON round trip through storage
      const raw = JSON.parse(localStorage.getItem('lv.translationOverrides.v1:u') || '{}');
      expect(raw[ID]).toBe(text);
    });

    it(`sync payload preserves the string: ${name}`, async () => {
      const store = await import('@/lib/translations/translationOverrides');
      const sync = await import('@/lib/translations/translationOverridesSync');
      sync.startTranslationOverridesSync();
      await Promise.resolve();
      callRpc.mockClear();
      callRpc.mockImplementation(async (fn: string) => (fn === 'list_translation_overrides' ? [] : undefined));
      store.setTranslationOverride(W, text, 'userX');
      await vi.waitFor(() => expect(callRpc).toHaveBeenCalledWith('set_translation_override', { p_word_id: ID, p_translation: text }));
    });
  }

  it('CRLF becomes LF and surrounding whitespace is trimmed, nothing else', async () => {
    const store = await import('@/lib/translations/translationOverrides');
    expect(store.normalizeTranslationText('  a\r\nb\rc  ')).toBe('a\nb\nc');
  });

  it('limit is 4000 code points (same as the SQL check) and never splits an emoji', async () => {
    const store = await import('@/lib/translations/translationOverrides');
    expect(store.MAX_TRANSLATION_CHARS).toBe(4000);
    const long = '👍'.repeat(4005);
    const out = store.normalizeTranslationText(long);
    expect(Array.from(out)).toHaveLength(4000);
    expect(out.endsWith('👍')).toBe(true);
    expect(store.normalizeTranslationText('x'.repeat(4000))).toHaveLength(4000);
  });

  it('displays with dir="auto" and a lang when the script is unambiguous', async () => {
    const store = await import('@/lib/translations/translationOverrides');
    const { default: EditableTranslation } = await import('@/components/vocabulary-app/EditableTranslation');
    const cases: [string, string | null][] = [['arabic', 'ar'], ['hebrew', 'he'], ['chinese', 'zh'], ['thai', 'th'], ['french', null]];
    for (const [k, lang] of cases) {
      store.setTranslationOverride(W, FIXTURES[k]);
      const { unmount } = render(<EditableTranslation word={W.word} category={W.category} translation="x" editable={false} />);
      const el = screen.getByTestId('translation-text');
      expect(el.getAttribute('dir')).toBe('auto');
      expect(el.getAttribute('lang')).toBe(lang);
      expect(el.textContent).toContain(FIXTURES[k]);
      unmount();
    }
  });

  it('multi-line text keeps its line breaks in the display', async () => {
    const store = await import('@/lib/translations/translationOverrides');
    const { default: EditableTranslation } = await import('@/components/vocabulary-app/EditableTranslation');
    store.setTranslationOverride(W, FIXTURES.multiline);
    render(<EditableTranslation word={W.word} category={W.category} editable={false} />);
    expect(screen.getByTestId('translation-text').textContent).toContain('dòng 1\n\ndòng 3\nline 4');
    expect((screen.getByTestId('translation-text').parentElement as HTMLElement).style.whiteSpace).toBe('pre-line');
  });
});
