/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { realSpeechService } from '../src/services/speech/realSpeechService';

describe('realSpeechService mute control', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (realSpeechService as any).currentUtterance = null;
    (window as any).speechSynthesis = {
      speaking: false,
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
      speak: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adjusts volume immediately and forces engine to apply change', () => {
    const fakeUtterance = { volume: 1 } as unknown as SpeechSynthesisUtterance;
    (realSpeechService as any).currentUtterance = fakeUtterance;

    // Not speaking yet - no pause/resume
    realSpeechService.setMuted(true);
    expect(fakeUtterance.volume).toBe(0);
    expect(window.speechSynthesis.pause).not.toHaveBeenCalled();
    expect(window.speechSynthesis.resume).not.toHaveBeenCalled();

    // When speaking, pause/resume with async resume
    (window.speechSynthesis as any).speaking = true;
    realSpeechService.setMuted(false);
    expect(fakeUtterance.volume).toBe(1);
    expect(window.speechSynthesis.pause).toHaveBeenCalledTimes(1);
    // Resume is scheduled on next tick
    expect(window.speechSynthesis.resume).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(window.speechSynthesis.resume).toHaveBeenCalledTimes(1);
  });

  it('cancels speech when muting mid-utterance', () => {
    const fakeUtterance = { volume: 1 } as unknown as SpeechSynthesisUtterance;
    (realSpeechService as any).currentUtterance = fakeUtterance;
    (window.speechSynthesis as any).speaking = true;

    realSpeechService.setMuted(true);

    expect(fakeUtterance.volume).toBe(0);
    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
  });
});
