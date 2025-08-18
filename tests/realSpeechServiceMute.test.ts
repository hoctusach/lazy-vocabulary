/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { realSpeechService } from '../src/services/speech/realSpeechService';

describe('realSpeechService mute control', () => {
  beforeEach(() => {
    (realSpeechService as any).currentUtterance = null;
  });

  it('adjusts volume on active utterance when muted state changes', () => {
    const fakeUtterance = { volume: 1 } as unknown as SpeechSynthesisUtterance;
    (realSpeechService as any).currentUtterance = fakeUtterance;

    realSpeechService.setMuted(true);
    expect(fakeUtterance.volume).toBe(0);

    realSpeechService.setMuted(false);
    expect(fakeUtterance.volume).toBe(1);
  });
});
