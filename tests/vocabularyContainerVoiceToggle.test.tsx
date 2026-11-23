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

describe('VocabularyControlsColumn voice toggle', () => {
  it('cycles voice label and updates state', async () => {
    const word: VocabularyWord = { word: 'water', meaning: 'H2O', example: 'Drink', category: 'general' };
    const voices = ['Voice 1', 'Voice 2'];
    const controllerState = { voiceName: voices[0] };
    const Wrapper: React.FC = () => {
      const [voiceName, setVoiceName] = React.useState(controllerState.voiceName);
      React.useEffect(() => {
        controllerState.voiceName = voiceName;
      }, [voiceName]);
      const toggleVoice = () => setVoiceName(v => (v === voices[0] ? voices[1] : voices[0]));
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
            selectedVoiceName={voiceName}
            currentWord={word}
            onOpenAddModal={() => {}}
            onOpenEditModal={() => {}}
            playCurrentWord={() => {}}
          />
      );
    };

    render(<Wrapper />);

    const toggleBtn = screen.getByRole('button', { name: 'Change Voice' });
    expect(controllerState.voiceName).toBe(voices[0]);

    await userEvent.click(toggleBtn);
    expect(controllerState.voiceName).toBe(voices[1]);
  });
});
