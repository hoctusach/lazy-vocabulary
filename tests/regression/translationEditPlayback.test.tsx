// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';

const speech = vi.hoisted(() => ({ stop: vi.fn(), speak: vi.fn() }));
vi.mock('@/services/speech/unifiedSpeechController', () => ({ unifiedSpeechController: { stop: speech.stop, speak: speech.speak } }));
vi.mock('@/utils/deviceLanguage', () => ({ useIsVietnameseDevice: () => true, isVietnameseDevice: () => true }));
vi.mock('@/components/ThemeMascot', () => ({ default: () => null }));
vi.mock('@/components/vocabulary-app/WordCountDisplay', () => ({ default: () => null }));
vi.mock('@/components/vocabulary-app/VocabularyControlsColumn', () => ({ default: () => null }));
vi.mock('@/components/practice/PracticeDialog', () => ({ default: () => null }));
vi.mock('@/components/vocabulary-app/useBackgroundColor', () => ({ useBackgroundColor: () => ({ backgroundColor: '#fff' }) }));

const WORDS = [
  { word: 'give up', meaning: 'stop', example: 'x', translation: 'bỏ cuộc', category: 'Phrasal Verb' },
  { word: 'look after', meaning: 'care', example: 'y', translation: 'chăm sóc', category: 'Phrasal Verb' },
];

describe('[FB-33] translation edit pauses the Learn player, then Saved -> next word -> resume', () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.stubEnv('VITE_ENABLE_PRO', 'true'); localStorage.clear(); speech.stop.mockClear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllEnvs(); });

  // Stand-in for the unified controller: the same props VocabularyAppContainerNew passes to the real Learn path.
  const mountPlayer = async (startPaused = false) => {
    const { default: Main } = await import('@/components/vocabulary-app/VocabularyMainNew');
    (await import('@/services/billing/entitlement')).setProEntitlement();
    const log = { toggles: 0, nexts: 0 };
    const Player: React.FC = () => {
      const [paused, setPaused] = React.useState(startPaused);
      const [i, setI] = React.useState(0);
      return (
        <>
          <div data-testid="state">{paused ? 'paused' : 'playing'}</div>
          <Main
            currentWord={WORDS[i]} mute={false} isPaused={paused}
            toggleMute={() => {}} handleCycleVoice={() => {}} isSoundPlaying={false} displayTime={5000}
            selectedVoiceName="v" playCurrentWord={() => {}} onOpenSearch={() => {}}
            handleTogglePause={() => { log.toggles++; setPaused((p) => !p); }}
            handleManualNext={() => { log.nexts++; setI((n) => (n + 1) % WORDS.length); }}
          />
        </>
      );
    };
    render(<Player />);
    return log;
  };
  const flush = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it('edit start pauses and stops speech; no auto-advance while editing; save shows Saved, advances, resumes', async () => {
    const log = await mountPlayer();
    expect(screen.getByTestId('state').textContent).toBe('playing');
    fireEvent.click(screen.getByTestId('translation-edit'));
    expect(screen.getByTestId('state').textContent).toBe('paused');
    expect(speech.stop).toHaveBeenCalled();
    await flush(10_000); // long edit: nothing advances
    expect(log.nexts).toBe(0);
    expect(screen.getByTestId('translation-editor')).toBeTruthy();

    fireEvent.change(screen.getByTestId('translation-editor'), { target: { value: 'từ bỏ' } });
    fireEvent.click(screen.getByTestId('translation-save'));
    expect(screen.getByTestId('translation-saved').textContent).toBe('Saved');
    expect(screen.getByTestId('translation-text').textContent).toContain('từ bỏ');
    expect(log.nexts).toBe(0); // confirmation first
    await flush(1500);
    expect(log.nexts).toBe(1);
    expect(screen.getByTestId('state').textContent).toBe('playing');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('look after');
    expect(screen.getByTestId('translation-text').textContent).toContain('chăm sóc');
    const m = await import('@/lib/translations/translationOverrides');
    expect(m.getTranslationOverride({ word: 'give up', category: 'Phrasal Verb' })).toBe('từ bỏ');
  });

  it('cancel un-pauses and stays on the same word', async () => {
    const log = await mountPlayer();
    fireEvent.click(screen.getByTestId('translation-edit'));
    expect(screen.getByTestId('state').textContent).toBe('paused');
    fireEvent.click(screen.getByText('Cancel'));
    await flush(3000);
    expect(screen.getByTestId('state').textContent).toBe('playing');
    expect(log.nexts).toBe(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('give up');
  });

  it('if the user had already paused, edit + save advances but leaves it paused', async () => {
    const log = await mountPlayer(true);
    fireEvent.click(screen.getByTestId('translation-edit'));
    expect(log.toggles).toBe(0);
    fireEvent.click(screen.getByTestId('translation-save'));
    await flush(1500);
    expect(log.nexts).toBe(1);
    expect(screen.getByTestId('state').textContent).toBe('paused');
  });

  it('is wired through the real Learn card path (VocabularyMainNew -> VocabularyCardNew -> EditableTranslation)', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/components/vocabulary-app/VocabularyCardNew.tsx', 'utf8')).toContain("import EditableTranslation");
    expect(readFileSync('src/components/vocabulary-app/VocabularyMainNew.tsx', 'utf8')).toContain('onTranslationEdit');
    expect(readFileSync('src/components/vocabulary-app/ContentWithDataNew.tsx', 'utf8')).toContain('VocabularyMainNew');
  });
});
