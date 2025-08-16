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

describe('VocabularyControlsColumn mark as learned', () => {
  it('uses word captured when dialog opened', async () => {
    const firstWord: VocabularyWord = { word: 'apple', meaning: '', example: '', category: 'test' };
    const secondWord: VocabularyWord = { word: 'banana', meaning: '', example: '', category: 'test' };
    const onMark = vi.fn();

    const { rerender } = render(
      <VocabularyControlsColumn
        isMuted={false}
        isPaused={false}
        onToggleMute={() => {}}
        onTogglePause={() => {}}
        onNextWord={() => {}}
        onCycleVoice={() => {}}
        currentWord={firstWord}
        onOpenAddModal={() => {}}
        onOpenEditModal={() => {}}
        selectedVoiceName="Test"
        playCurrentWord={() => {}}
        onMarkWordLearned={onMark}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mark as Learned' }));

    // Simulate service advancing to a new word while dialog is open
    rerender(
      <VocabularyControlsColumn
        isMuted={false}
        isPaused={false}
        onToggleMute={() => {}}
        onTogglePause={() => {}}
        onNextWord={() => {}}
        onCycleVoice={() => {}}
        currentWord={secondWord}
        onOpenAddModal={() => {}}
        onOpenEditModal={() => {}}
        selectedVoiceName="Test"
        playCurrentWord={() => {}}
        onMarkWordLearned={onMark}
      />
    );

    // Confirm dialog displays original word
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/apple/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as Learned' }));
    expect(onMark).toHaveBeenCalledWith('apple');
  });
});

