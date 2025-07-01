/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
globalThis.expect = expect;
beforeAll(async () => {
  await import('@testing-library/jest-dom');
  (window as any).speechSynthesis = {
    getVoices: () => [{ name: 'Test', lang: 'en-GB' }],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});
import VocabularyControlsColumn from '../src/components/vocabulary-app/VocabularyControlsColumn';
import { VocabularyWord } from '../src/types/vocabulary';

type Region = 'US' | 'UK' | 'AU';

describe('VocabularyControlsColumn voice toggle', () => {
  it('cycles voice label and updates state', async () => {
    const word: VocabularyWord = { word: 'water', meaning: 'H2O', example: 'Drink', category: 'general' };
    const controllerState = { voiceRegion: 'UK' as Region };
    const Wrapper: React.FC = () => {
      const [voiceRegion, setVoiceRegion] = React.useState<Region>(controllerState.voiceRegion);
      React.useEffect(() => {
        controllerState.voiceRegion = voiceRegion;
      }, [voiceRegion]);
      const nextVoiceLabel = voiceRegion === 'UK' ? 'US' : voiceRegion === 'US' ? 'AU' : 'UK';
      const toggleVoice = () => setVoiceRegion(r => (r === 'UK' ? 'US' : r === 'US' ? 'AU' : 'UK'));
      return (
          <VocabularyControlsColumn
            isMuted={false}
            isPaused={false}
            onToggleMute={() => {}}
            onTogglePause={() => {}}
            onNextWord={() => {}}
            onSwitchCategory={() => {}}
          onCycleVoice={toggleVoice}
          nextCategory="next"
          nextVoiceLabel={nextVoiceLabel}
          currentWord={word}
          onOpenAddModal={() => {}}
          onOpenEditModal={() => {}}
          voiceRegion={voiceRegion}
        />
      );
    };

    render(<Wrapper />);

    const toggleBtn = screen.getByRole('button', { name: 'US' });
    expect(controllerState.voiceRegion).toBe('UK');

    await userEvent.click(toggleBtn);

    expect(screen.getByRole('button', { name: 'AU' })).toBeInTheDocument();
    expect(controllerState.voiceRegion).toBe('US');
  });
});
