/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import VocabularyCardNew from '@/components/vocabulary-app/VocabularyCardNew';
import VocabularyCard from '@/components/vocabulary-app/VocabularyCard';
import { setTranslationOverride } from '@/lib/translations/translationOverrides';
import { setShowDefaultVi } from '@/lib/translations/showDefaultVi';

function setLocale(l: string) {
  Object.defineProperty(navigator, 'languages', { value: [l], configurable: true });
  Object.defineProperty(navigator, 'language', { value: l, configurable: true });
}
const renderCard = (translation = 'từ bỏ') => render(
  <VocabularyCardNew word="give up" meaning="to stop" example="Never give up." translation={translation} backgroundColor="#fff" isSpeaking={false} category="phrases" />,
);
const text = () => screen.getByTestId('translation-text');

// [FB-42] (refined by [FB-64]: English devices get a "Show Vietnamese translation" toggle, default OFF) supersedes [FB-14]: the Translation field is ALWAYS shown.
describe('[FB-42] translation field is always shown (supersedes [FB-14])', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); setLocale('en-US'); });

  it('vi-VN: shows the default Vietnamese translation', () => {
    setLocale('vi-VN'); renderCard();
    expect(text().textContent).toContain('từ bỏ');
  });
  it('en-US: field present, default Vietnamese NOT shown (toggle off by default), placeholder to add one', () => {
    setLocale('en-US'); renderCard();
    expect(text().textContent).not.toContain('từ bỏ');
    expect(text().textContent).toContain('Add translation');
    expect(text().getAttribute('data-empty')).toBe('true');
  });
  it('ko-KR: field present with placeholder', () => {
    setLocale('ko-KR'); renderCard();
    expect(screen.queryByTestId('translation-text')).not.toBeNull();
    expect(text().textContent).not.toContain('từ bỏ');
  });
  it('an edited override is shown on every language, and wins over the default on vi', () => {
    setTranslationOverride({ word: 'give up', category: 'phrases' }, '放弃');
    for (const l of ['en-US', 'ko-KR', 'vi-VN']) {
      setLocale(l); const { unmount } = renderCard();
      expect(text().textContent).toContain('放弃');
      expect(text().textContent).not.toContain('từ bỏ');
      unmount();
    }
  });
  it('search preview card also shows the field (read-only), including blank placeholder on en', () => {
    setLocale('en-US');
    render(<VocabularyCard word="give up" meaning="m" example="e" translation="từ bỏ" backgroundColor="#fff" isMuted={false} isPaused={false}
      onToggleMute={() => {}} onTogglePause={() => {}} onCycleVoice={() => {}} onNextWord={() => {}} category="phrases"
      selectedVoice={{} as never} nextVoiceLabel="" searchPreview />);
    expect(text().textContent).toContain('Add translation');
    expect(screen.queryByTestId('translation-edit')).toBeNull();
  });
});

describe('[FB-64] English device: Show Vietnamese translation toggle (default OFF)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); setLocale('en-US'); });

  it('en device, no override, toggle off (default) -> default Vietnamese hidden; toggle on -> shown; off again -> hidden', () => {
    setLocale('en-US');
    const { unmount } = renderCard();
    expect(text().textContent).not.toContain('từ bỏ');
    act(() => setShowDefaultVi(true));
    expect(text().textContent).toContain('từ bỏ');
    act(() => setShowDefaultVi(false));
    expect(text().textContent).not.toContain('từ bỏ');
    unmount();
  });
  it('the preference persists (re-read on the next mount)', () => {
    setLocale('en-US');
    setShowDefaultVi(true);
    renderCard();
    expect(text().textContent).toContain('từ bỏ');
  });
  it('the user own edited translation shows with the toggle off AND on and always wins over the default', () => {
    setLocale('en-US');
    setTranslationOverride({ word: 'give up', category: 'phrases' }, '放弃');
    const { unmount } = renderCard();
    expect(text().textContent).toContain('放弃');
    act(() => setShowDefaultVi(true));
    expect(text().textContent).toContain('放弃');
    expect(text().textContent).not.toContain('từ bỏ');
    unmount();
  });
  it('vi device is unchanged: default Vietnamese shown with the toggle off', () => {
    setLocale('vi-VN');
    renderCard();
    expect(text().textContent).toContain('từ bỏ');
  });
  it('Library card: the toggle exists on an English device and not on a Vietnamese one', async () => {
    const { VocabularySetProvider } = await import('@/features/word-sets/VocabularySetContext');
    const { default: Screen } = await import('@/features/word-sets/VocabularySetsScreen');
    setLocale('en-US');
    const r1 = render(<VocabularySetProvider><Screen /></VocabularySetProvider>);
    const box = screen.getByLabelText('Show Vietnamese translation') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(localStorage.getItem('lv_show_vi_translation')).toBe('1');
    r1.unmount();
    setLocale('vi-VN');
    render(<VocabularySetProvider><Screen /></VocabularySetProvider>);
    expect(screen.queryByLabelText('Show Vietnamese translation')).toBeNull();
  });
});
