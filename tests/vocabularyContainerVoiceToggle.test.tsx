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
  voiceRegion: 'UK' as const,
};

vi.mock('../src/hooks/vocabulary-controller/useUnifiedVocabularyController', () => {
  return {
    useUnifiedVocabularyController: () => {
      const [voiceRegion, setVoiceRegion] = React.useState<'US' | 'UK' | 'AU'>(controllerState.voiceRegion);
      React.useEffect(() => {
        controllerState.voiceRegion = voiceRegion;
      }, [voiceRegion]);
      return {
        currentWord: controllerState.currentWord,
        isPaused: false,
        isMuted: false,
        isSpeaking: false,
        voiceRegion,
        togglePause: vi.fn(),
        toggleMute: vi.fn(),
        goToNext: vi.fn(),
        toggleVoice: vi.fn(() => setVoiceRegion(r => (r === 'UK' ? 'US' : r === 'US' ? 'AU' : 'US'))),
        playCurrentWord: vi.fn(),
        hasData: true,
        currentCategory: 'general',
        switchCategory: vi.fn(),
      };
    },
  };
});

vi.mock('../src/hooks/vocabulary-playback/useVoiceSelection', () => {
  return {
    useVoiceSelection: () => {
      const [selectedVoice, setSelectedVoice] = React.useState({
        label: 'UK',
        region: 'UK' as const,
        gender: 'female' as const,
        index: 1,
      });

      const cycleVoice = () => {
        const region =
          selectedVoice.region === 'UK'
            ? 'US'
            : selectedVoice.region === 'US'
            ? 'AU'
            : 'US';
        setSelectedVoice({ label: region, region, gender: 'female', index: 0 });
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
  }),
}));

vi.mock('../src/hooks/vocabulary/useCategoryNavigation', () => ({
  useCategoryNavigation: () => ({ currentCategory: 'general', nextCategory: 'next' }),
}));


describe('VocabularyContainer voice toggle', () => {
  it('keeps label and controller.voiceRegion in sync', async () => {
    render(<VocabularyContainer />);

    const toggleBtn = screen.getByRole('button', { name: 'US' });
    expect(controllerState.voiceRegion).toBe('UK');

    await userEvent.click(toggleBtn);

    expect(screen.getByRole('button', { name: 'AU' })).toBeInTheDocument();
    expect(controllerState.voiceRegion).toBe('US');
  });
});
