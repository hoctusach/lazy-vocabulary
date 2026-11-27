/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect } from 'vitest';
globalThis.expect = expect;
beforeAll(async () => {
  await import('@testing-library/jest-dom');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).speechSynthesis = {
    getVoices: () => [
      { name: 'Test 1', lang: 'en-US' },
      { name: 'Test 2', lang: 'en-GB' }
    ],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});
import VocabularyControlsColumn from '../src/components/vocabulary-app/VocabularyControlsColumn';
import { VocabularyWord } from '../src/types/vocabulary';

describe('VocabularyControlsColumn voice picker', () => {
  it('[FB-48] the Audio sheet offers a voice dropdown (no one-by-one cycle button)', async () => {
    const word: VocabularyWord = { word: 'water', meaning: 'H2O', example: 'Drink', category: 'general' };
    render(
      <MemoryRouter>
        <VocabularyControlsColumn
          isMuted={false}
          isPaused={false}
          onToggleMute={() => {}}
          onTogglePause={() => {}}
          onNextWord={() => {}}
          onSwitchCategory={() => {}}
          onCycleVoice={() => {}}
          nextCategory="next"
          selectedVoiceName="Test 1"
          currentWord={word}
          onOpenAddModal={() => {}}
          onOpenEditModal={() => {}}
          playCurrentWord={() => {}}
        />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Audio' }));
    const select = await screen.findByTestId('voice-select');
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(expect.arrayContaining(['Test 1', 'Test 2']));
    expect(screen.queryByRole('button', { name: 'Change Voice' })).toBeNull();
  });
});
