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
    getVoices: () => [
      { name: 'US1', lang: 'en-US' },
      { name: 'US2', lang: 'en-US' },
      { name: 'UK1', lang: 'en-GB' },
      { name: 'UK2', lang: 'en-GB' }
    ],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});
import VocabularyControlsColumn from '../src/components/vocabulary-app/VocabularyControlsColumn';
import { VocabularyWord } from '../src/types/vocabulary';

describe('VocabularyControlsColumn voice toggle', () => {
  it('cycles voice label and updates state', async () => {
    const word: VocabularyWord = { word: 'water', meaning: 'H2O', example: 'Drink', category: 'general' };
    const usVoices = ['US 1', 'US 2'];
    const ukVoices = ['UK 1', 'UK 2'];
    const state = { us: usVoices[0], uk: ukVoices[0] };

    const Wrapper: React.FC = () => {
      const [us, setUs] = React.useState(state.us);
      const [uk, setUk] = React.useState(state.uk);

      React.useEffect(() => { state.us = us; state.uk = uk; }, [us, uk]);

      const toggle = (region: 'US' | 'UK') => {
        if (region === 'US') setUs(v => (v === usVoices[0] ? usVoices[1] : usVoices[0]));
        else setUk(v => (v === ukVoices[0] ? ukVoices[1] : ukVoices[0]));
      };

      return (
        <>
          <VocabularyControlsColumn
            isMuted={false}
            isPaused={false}
            onToggleMute={() => {}}
            onTogglePause={() => {}}
            onNextWord={() => {}}
            onSwitchCategory={() => {}}
            onCycleVoice={() => toggle('US')}
            nextCategory="next"
            voiceRegion="US"
            nextVoiceLabel="US"
            currentWord={word}
            onOpenAddModal={() => {}}
            onOpenEditModal={() => {}}
          />
          <VocabularyControlsColumn
            isMuted={false}
            isPaused={false}
            onToggleMute={() => {}}
            onTogglePause={() => {}}
            onNextWord={() => {}}
            onSwitchCategory={() => {}}
            onCycleVoice={() => toggle('UK')}
            nextCategory="next"
            voiceRegion="UK"
            nextVoiceLabel="UK"
            currentWord={word}
            onOpenAddModal={() => {}}
            onOpenEditModal={() => {}}
          />
        </>
      );
    };

    render(<Wrapper />);

    const buttons = screen.getAllByRole('button', { name: 'Change Voice' });
    expect(state.us).toBe(usVoices[0]);
    expect(state.uk).toBe(ukVoices[0]);

    await userEvent.click(buttons[0]);
    expect(state.us).toBe(usVoices[1]);
    expect(state.uk).toBe(ukVoices[0]);

    await userEvent.click(buttons[1]);
    expect(state.uk).toBe(ukVoices[1]);
  });
});
