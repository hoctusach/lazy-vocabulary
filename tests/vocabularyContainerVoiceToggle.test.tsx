/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import VocabularyContainer from '../src/components/vocabulary-container/VocabularyContainer';

const controllerState = {
  currentWord: { word: 'water', meaning: 'H2O', example: 'Drink water', category: 'general' },
  isPaused: false,
  isMuted: false,
  isSpeaking: false,
  voiceRegion: 'UK' as const,
  togglePause: vi.fn(),
  toggleMute: vi.fn(),
  goToNext: vi.fn(),
  toggleVoice: vi.fn(() => {
    controllerState.voiceRegion = controllerState.voiceRegion === 'US' ? 'UK' : controllerState.voiceRegion === 'UK' ? 'AU' : 'US';
  }),
  playCurrentWord: vi.fn(),
};

vi.mock('../src/hooks/vocabulary-controller/useSimpleVocabularyController', () => ({
  useSimpleVocabularyController: () => controllerState,
}));

vi.mock('../src/hooks/vocabulary-playback/useVoiceSelection', () => {
  const React = require('react');
  return {
    useVoiceSelection: () => {
      const [selectedVoice, setSelectedVoice] = React.useState({
        label: 'UK',
        region: 'UK' as const,
        gender: 'female' as const,
        index: 1,
      });

      const cycleVoice = () => {
        const options = [
          { label: 'US', region: 'US' as const },
          { label: 'UK', region: 'UK' as const },
          { label: 'AU', region: 'AU' as const }
        ];
        const next =
          options[(selectedVoice.index + 1) % options.length];
        setSelectedVoice({ ...next, gender: 'female', index: (selectedVoice.index + 1) % options.length });
      };

      return { selectedVoice, cycleVoice };
    },
  };
});

vi.mock('../src/hooks/vocabulary/useVocabularyContainerState', () => ({
  useVocabularyContainerState: () => ({
    hasData: true,
    hasAnyData: true,
    handleFileUploaded: vi.fn(),
    jsonLoadError: null,
    handleSwitchCategory: vi.fn(),
    currentCategory: 'general',
    nextCategory: 'next',
    displayTime: 5000,
    wordList: [controllerState.currentWord],
  }),
}));

vi.mock('../src/hooks/vocabulary/useCategoryNavigation', () => ({
  useCategoryNavigation: () => ({ currentCategory: 'general', nextCategory: 'next' }),
}));


describe('VocabularyContainer voice toggle', () => {
  it('keeps label and controller.voiceRegion in sync', async () => {
    render(<VocabularyContainer />);

    const toggleBtn = screen.getByRole('button', { name: 'UK' });
    expect(controllerState.voiceRegion).toBe('UK');

    await userEvent.click(toggleBtn);

    expect(screen.getByRole('button', { name: 'AU' })).toBeInTheDocument();
    expect(controllerState.voiceRegion).toBe('AU');
  });
});
