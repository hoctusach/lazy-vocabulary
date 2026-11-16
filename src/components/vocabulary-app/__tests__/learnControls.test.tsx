// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VocabularyControlsColumn from '../VocabularyControlsColumn';

vi.mock('@/hooks/useSpeechRate', () => ({ useSpeechRate: () => ({ speechRate: 1, setSpeechRate: vi.fn() }) }));
vi.mock('@/hooks/useVoiceContext', () => ({ useVoiceContext: () => ({ allVoices: [] }) }));
vi.mock('@/services/analyticsService', () => ({ trackUiInteraction: vi.fn() }));

const word = { word: 'give up', meaning: 'stop', example: 'x', category: 'Phrasal Verb' } as never;
const noop = () => {};

describe('Learn controls', () => {
  it('has no Details/Practice buttons and a 2-column Mark as LEARNED button', () => {
    render(
      <VocabularyControlsColumn isMuted={false} isPaused={false} onToggleMute={noop} onTogglePause={noop}
        onNextWord={noop} onCycleVoice={noop} currentWord={word} selectedVoiceName="v" playCurrentWord={noop}
        onMarkWordLearned={noop} onOpenSearch={noop} />
    );
    expect(screen.queryByLabelText('Vocabulary Detail')).toBeNull();
    expect(screen.queryByLabelText('Practice')).toBeNull();
    expect(screen.queryByLabelText('Mark as Learned')).toBeNull();
    const b = screen.getByLabelText('Mark as LEARNED');
    expect(b.className).toContain('col-span-2');
    expect(b.textContent).toContain('Mark as LEARNED');
  });
});

describe('speech hint lines', () => {
  const hint = async (native: boolean) => {
    vi.resetModules();
    vi.doMock('@/services/speech/nativeTts', () => ({ isNativePlatform: () => native }));
    vi.doMock('@/utils/deviceLanguage', () => ({ useIsVietnameseDevice: () => false }));
    const { default: Card } = await import('../VocabularyCard');
    const { container } = render(
      <Card word="w" meaning="m" example="e" backgroundColor="#fff" isMuted={false} isPaused={false}
        onToggleMute={noop} onTogglePause={noop} onNextWord={noop} onSwitchCategory={noop}
        currentCategory="c" nextCategory="n" isSpeaking={false} category="c"
        selectedVoice={{} as never} {...({} as object)} />
    );
    return container.textContent ?? '';
  };
  it('shows on web, hidden when native', async () => {
    expect(await hint(false)).toContain('autoplay due to security');
    document.body.innerHTML = '';
    expect(await hint(true)).not.toContain('autoplay due to security');
  });
});
