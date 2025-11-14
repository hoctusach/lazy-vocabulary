/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/utils/speech/core/speechSettings', () => ({
  getSpeechRate: () => 1
}));

vi.mock('../src/utils/speech/core/speechText', () => ({
  cleanSpeechText: (text: string) => text
}));

vi.mock('../src/utils/speech/core/modules/speechInit', () => ({
  initializeSpeechSystem: vi.fn(),
  speechInitialized: true
}));

vi.mock('../src/utils/speechLogger', () => ({
  logSpeechEvent: vi.fn()
}));

vi.mock('../src/utils/speech/debug/logVoices', () => ({
  logAvailableVoices: vi.fn()
}));

vi.mock('../src/utils/userInteraction', () => ({
  hasUserInteracted: () => true,
  resetUserInteraction: vi.fn()
}));

import { realSpeechService } from '../src/services/speech/realSpeechService';
import { unifiedSpeechController } from '../src/services/speech/unifiedSpeechController';

describe('realSpeechService mute volume handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.setItem('speechUnlocked', 'true');
    (window as any).speechSynthesis = {
      speaking: false,
      pending: false,
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => [
        { name: 'Test Voice', lang: 'en-US' }
      ]),
      addEventListener: vi.fn(),
      speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
        utterance.onstart?.();
        setTimeout(() => utterance.onend?.(), 0);
      })
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem('speechUnlocked');
    unifiedSpeechController.setMuted(false);
    delete (window as any).speechSynthesis;
    delete (globalThis as any).SpeechSynthesisUtterance;
  });

  it('sets utterance volume to 0 when muted', async () => {
    const utterances: any[] = [];
    const UtteranceMock = vi.fn(function (this: any, text: string) {
      this.text = text;
      this.volume = 1;
      this.rate = 1;
      this.pitch = 1;
      this.voice = null;
      this.lang = 'en-US';
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      utterances.push(this);
    });
    (globalThis as any).SpeechSynthesisUtterance = UtteranceMock as unknown as typeof SpeechSynthesisUtterance;

    unifiedSpeechController.setMuted(true);
    const epoch = unifiedSpeechController.currentEpoch();

    const promise = realSpeechService.speak('Muted speech test', {
      voiceName: 'Test Voice',
      muted: true,
      epoch,
      onStart: vi.fn(),
      onEnd: vi.fn(),
      onError: vi.fn()
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe(true);

    expect(utterances).toHaveLength(1);
    expect(utterances[0].volume).toBe(0);
    expect((window as any).speechSynthesis.speak).toHaveBeenCalledTimes(1);
  });
});
