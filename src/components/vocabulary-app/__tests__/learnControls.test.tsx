// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import VocabularyControlsColumn from '../VocabularyControlsColumn';

vi.mock('@/hooks/useSpeechRate', () => ({ useSpeechRate: () => ({ speechRate: 1, setSpeechRate: vi.fn() }) }));
vi.mock('@/hooks/useVoiceContext', () => ({ useVoiceContext: () => ({ allVoices: [{ name: 'a' }, { name: 'b' }] }) }));
afterEach(cleanup);
vi.mock('@/services/analyticsService', () => ({ trackUiInteraction: vi.fn() }));
const selectVoiceByName = vi.fn(() => 'applied');
vi.mock('@/services/speech/voiceSelection', () => ({ selectVoiceByName: (n: string) => selectVoiceByName(n) }));

const word = { word: 'give up', meaning: 'stop', example: 'x', category: 'Phrasal Verb' } as never;
const noop = () => {};

const renderControls = (props: Record<string, unknown> = {}) =>
  render(
    <VocabularyControlsColumn isMuted={false} isPaused={false} onToggleMute={noop} onTogglePause={noop}
      onNextWord={noop} onCycleVoice={noop} currentWord={word} selectedVoiceName="v" playCurrentWord={noop}
      onMarkWordLearned={noop} onOpenSearch={noop} {...props} />
  );

describe('Learn controls', () => {
  it('[FB-09] has no Details/Practice buttons and a quiet, sentence-case Mark as learned button', () => {
    renderControls();
    expect(screen.queryByLabelText('Vocabulary Detail')).toBeNull();
    expect(screen.queryByLabelText('Practice')).toBeNull();
    expect(screen.queryByLabelText('Mark as LEARNED')).toBeNull();
    expect(screen.queryByLabelText('Mark as Learned')).toBeNull();
    const b = screen.getByLabelText('Mark as learned');
    expect(b.textContent).toContain('Mark as learned');
    expect(b.getAttribute('title')).toBe('Mark as learned');
    // secondary: not a filled success hero, not bold, not a 2-column tile
    expect(b.className).not.toContain('col-span-2');
    expect(b.className).not.toContain('font-bold');
    expect(b.className).not.toContain('bg-[var(--lv-success)]');
    expect(b.className).toContain('lv-ctl-mark');
  });

  it('[FB-10] top level is Audio, Pause, Next, Search, Mark as learned; no Mute/Voice/Rate until Audio opens', async () => {
    renderControls();
    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Audio', 'Pause', 'Next Word', 'Quick Search', 'Mark as learned']);
    for (const l of ['Mute', 'Unmute', 'Change Voice', 'Speech Rate']) expect(screen.queryByLabelText(l)).toBeNull();
    expect(screen.getByLabelText('Pause').className).toContain('lv-ctl-pause');

    await userEvent.click(screen.getByLabelText('Audio'));
    expect(await screen.findByLabelText('Mute')).toBeTruthy();
    expect(screen.getByTestId('voice-select')).toBeTruthy(); // [FB-48] dropdown, not a cycle button
    expect(screen.getByLabelText('Speech Rate')).toBeTruthy();
  });

  it('[FB-10] Audio sheet: mute toggles, voice dropdown, rate offers 7 options and closes after choosing', async () => {
    const onToggleMute = vi.fn(); const onCycleVoice = vi.fn();
    renderControls({ onToggleMute, onCycleVoice });
    await userEvent.click(screen.getByLabelText('Audio'));
    await userEvent.click(await screen.findByLabelText('Mute'));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
    await userEvent.selectOptions(screen.getByTestId('voice-select'), 'b');
    expect(selectVoiceByName).toHaveBeenCalledWith('b');
    expect(onCycleVoice).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText('Speech Rate'));
    const opts = screen.getByTestId('speech-rate-options').querySelectorAll('button');
    expect([...opts].map((o) => o.textContent)).toEqual(['0.5x', '0.75x', '1x', '1.25x', '1.5x', '1.75x', '2x']);
    await userEvent.click(opts[4]);
    expect(screen.queryByTestId('speech-rate-options')).toBeNull();
    expect(screen.queryByLabelText('Mute')).toBeNull();
  });
});

describe('speech hint lines', () => {
  const render_ = async (native: boolean) => {
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
  it('are absent on web and native', async () => {
    for (const native of [false, true]) {
      document.body.innerHTML = '';
      const t = await render_(native);
      expect(t).not.toContain('autoplay due to security');
      expect(t).not.toContain('free voices by device and browser');
    }
  });
});
