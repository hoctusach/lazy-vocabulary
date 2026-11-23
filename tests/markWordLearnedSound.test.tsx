/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VocabularyControlsColumn from '../src/components/vocabulary-app/VocabularyControlsColumn';
import { VocabularyWord } from '../src/types/vocabulary';

// Mock toast to avoid side effects
vi.mock('sonner', () => ({ toast: vi.fn(), warning: vi.fn() }));

// make expect available for jest-dom extensions
// eslint-disable-next-line no-undef
(globalThis as any).expect = expect;

beforeAll(async () => {
  await import('@testing-library/jest-dom');
  // minimal speechSynthesis mock for useVoiceContext
  (window as any).speechSynthesis = {
    getVoices: () => [{ name: 'Test', lang: 'en-US' }],
    addEventListener: () => {},
    removeEventListener: () => {},
    speak: () => {},
  };
});

describe('VocabularyControlsColumn mark as learned sound', () => {
  it('plays a sound when marking a word as learned', async () => {
    const word: VocabularyWord = { word: 'apple', meaning: '', example: '', category: 'test' };
    const playMock = vi.fn().mockResolvedValue(undefined);
    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(playMock);

    render(
      <VocabularyControlsColumn
        isMuted={false}
        isPaused={false}
        onToggleMute={() => {}}
        onTogglePause={() => {}}
        onNextWord={() => {}}
        onCycleVoice={() => {}}
        currentWord={word}
        onOpenAddModal={() => {}}
        onOpenEditModal={() => {}}
        selectedVoiceName="Test"
        playCurrentWord={() => {}}
        onMarkWordLearned={() => {}}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mark as Learned' }));
    const dialog = screen.getByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as Learned' }));

    expect(playMock).toHaveBeenCalled();
    playSpy.mockRestore();
  });
});

