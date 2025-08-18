/**
 * @vitest-environment jsdom
 */
 import { describe, it, expect, beforeEach, vi } from 'vitest';
import { realSpeechService } from '../src/services/speech/realSpeechService';

describe('realSpeechService mute control', () => {
  beforeEach(() => {
    (realSpeechService as any).currentUtterance = null;
    (window as any).speechSynthesis = {
      speaking: false,
      pause: vi.fn(),
      resume: vi.fn(),
    };
  });

  it('adjusts volume and applies changes when muted state changes', () => {
    const fakeUtterance = { volume: 1 } as unknown as SpeechSynthesisUtterance;
    (realSpeechService as any).currentUtterance = fakeUtterance;

    // Not speaking yet - no pause/resume
    realSpeechService.setMuted(true);
    expect(fakeUtterance.volume).toBe(0);
    expect(window.speechSynthesis.pause).not.toHaveBeenCalled();
    expect(window.speechSynthesis.resume).not.toHaveBeenCalled();

    // When speaking, pause/resume should be triggered
    (window.speechSynthesis as any).speaking = true;
    realSpeechService.setMuted(false);
    expect(fakeUtterance.volume).toBe(1);
    expect(window.speechSynthesis.pause).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.resume).toHaveBeenCalledTimes(1);
  });
});
