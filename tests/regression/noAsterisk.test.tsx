/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import VocabularyCardNew from '@/components/vocabulary-app/VocabularyCardNew';
import VocabularyCard from '@/components/vocabulary-app/VocabularyCard';
import LegacyCard from '@/components/VocabularyCard';

afterEach(cleanup);
const common = { word: 'give up', meaning: 'to stop trying', example: 'Never give up.', translation: 'từ bỏ', backgroundColor: '#fff', category: 'phrases' };
const noop = () => {};
const cardProps = { ...common, isMuted: false, isPaused: false, onToggleMute: noop, onTogglePause: noop, onCycleVoice: noop, onNextWord: noop, selectedVoice: {} as never, nextVoiceLabel: '' };

// [FB-62] The legacy "*" typography prefix is gone from meaning, example and translation.
describe('[FB-62] no decorative * before meaning / example / translation', () => {
  const check = (container: HTMLElement) => {
    expect(container.textContent).toContain('to stop trying');
    expect(container.textContent).toContain('Never give up.');
    expect(container.textContent).not.toContain('*');
    const meaning = [...container.querySelectorAll('div')].find((d) => d.textContent?.trim() === 'to stop trying');
    expect(meaning).toBeTruthy();
    expect(meaning!.textContent!.trim().startsWith('*')).toBe(false);
  };
  it('learn card (VocabularyCardNew)', () => {
    const { container } = render(<VocabularyCardNew {...common} isSpeaking={false} />);
    check(container);
  });
  it('card with controls and the search preview (VocabularyCard)', () => {
    check(render(<VocabularyCard {...cardProps} />).container);
    cleanup();
    check(render(<VocabularyCard {...cardProps} searchPreview />).container);
  });
  it('legacy card (components/VocabularyCard)', () => {
    check(render(<LegacyCard {...(cardProps as never)} />).container);
  });
  it('an asterisk that is part of the real word data is kept', () => {
    const { container } = render(<VocabularyCardNew {...common} meaning="a *starred* meaning" isSpeaking={false} />);
    expect(container.textContent).toContain('a *starred* meaning');
  });
  it('translation field does not start with *', () => {
    render(<VocabularyCardNew {...common} isSpeaking={false} />);
    expect(screen.getByTestId('translation-text').textContent!.trim().startsWith('*')).toBe(false);
  });
});
