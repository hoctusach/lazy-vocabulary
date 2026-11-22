/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import VocabularyCardNew from '@/components/vocabulary-app/VocabularyCardNew';

function setLocale(l: string) {
  Object.defineProperty(navigator, 'languages', { value: [l], configurable: true });
  Object.defineProperty(navigator, 'language', { value: l, configurable: true });
}
const renderCard = () => render(
  <VocabularyCardNew word="give up" meaning="to stop" example="Never give up." translation="từ bỏ" backgroundColor="#fff" isSpeaking={false} category="phrases" />,
);

describe('[FB-14] translation line visibility', () => {
  afterEach(() => { cleanup(); setLocale('en-US'); });
  it('shows on vi-VN', () => { setLocale('vi-VN'); renderCard(); expect(screen.queryByText('* từ bỏ')).not.toBeNull(); });
  it('hidden on en-US', () => { setLocale('en-US'); renderCard(); expect(screen.queryByText('* từ bỏ')).toBeNull(); });
  it('hidden on ko-KR', () => { setLocale('ko-KR'); renderCard(); expect(screen.queryByText('* từ bỏ')).toBeNull(); });
});
