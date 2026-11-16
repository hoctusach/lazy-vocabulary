/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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

// The success sound/confetti now plays from showCongratsEffect() once the server
// confirms the word as learned (srsSyncByUserKey), not from this component. The
// component's job is to confirm first and then report the word to its parent.
describe('VocabularyControlsColumn mark as learned', () => {
  it('asks for confirmation, then reports the word as learned', async () => {
    const word: VocabularyWord = { word: 'apple', meaning: '', example: '', category: 'test' };
    const onMarkWordLearned = vi.fn();

    render(
      <MemoryRouter>
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
        onMarkWordLearned={onMarkWordLearned}
      />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Mark as LEARNED' }));
    expect(onMarkWordLearned).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as Learned' }));

    expect(onMarkWordLearned).toHaveBeenCalledWith('apple', 'test');
  });
});

