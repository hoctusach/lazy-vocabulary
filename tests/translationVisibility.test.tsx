/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import VocabularyCardNew from '@/components/vocabulary-app/VocabularyCardNew';
import VocabularyCard from '@/components/vocabulary-app/VocabularyCard';
import { setTranslationOverride } from '@/lib/translations/translationOverrides';

function setLocale(l: string) {
  Object.defineProperty(navigator, 'languages', { value: [l], configurable: true });
  Object.defineProperty(navigator, 'language', { value: l, configurable: true });
}
const renderCard = (translation = 'từ bỏ') => render(
  <VocabularyCardNew word="give up" meaning="to stop" example="Never give up." translation={translation} backgroundColor="#fff" isSpeaking={false} category="phrases" />,
);
const text = () => screen.getByTestId('translation-text');

// [FB-42] supersedes [FB-14]: the Translation field is ALWAYS shown.
describe('[FB-42] translation field is always shown (supersedes [FB-14])', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); setLocale('en-US'); });

  it('vi-VN: shows the default Vietnamese translation', () => {
    setLocale('vi-VN'); renderCard();
    expect(text().textContent).toContain('từ bỏ');
  });
  it('en-US: field present, default Vietnamese NOT shown, placeholder to add one', () => {
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
