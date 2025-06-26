/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
globalThis.expect = expect;
beforeAll(async () => {
  await import('@testing-library/jest-dom');
});
vi.mock('../src/hooks/vocabulary-app/useStableVocabularyState', () => ({
  useStableVocabularyState: () => ({
    currentWord: { word: 'hello', meaning: '', example: '', category: 'c' },
    hasData: true,
    currentCategory: 'c',
    isPaused: false,
    isMuted: false,
    voiceRegion: 'US',
    isSpeaking: false,
    goToNext: vi.fn(),
    togglePause: vi.fn(),
    toggleMute: vi.fn(),
    toggleVoice: vi.fn(),
    switchCategory: vi.fn(),
    playCurrentWord: vi.fn(),
    userInteractionState: { hasInitialized: true, interactionCount: 0, isAudioUnlocked: true },
    nextVoiceLabel: 'B',
    nextCategory: 'next',
    handleInteractionUpdate: vi.fn(),
  }),
}));
import VocabularyAppContainerNew from '../src/components/vocabulary-app/VocabularyAppContainerNew';

// Basic smoke test to ensure the voice provider is wired up correctly

describe('VocabularyAppContainerNew voice provider', () => {
  it('renders variant button and cycles without errors', async () => {
    render(<VocabularyAppContainerNew />);
    const variantBtn = screen.queryByRole('button', { name: /variant/i });
    expect(variantBtn).not.toBeNull();
    if (variantBtn) {
      await userEvent.click(variantBtn);
    }
  });
});
