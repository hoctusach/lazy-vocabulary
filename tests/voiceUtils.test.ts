import { describe, it, expect, beforeEach } from 'vitest';
import { hasAvailableVoices } from '../src/utils/speech/voiceUtils';

// Mock speechSynthesis
interface MockWindow {
  speechSynthesis: {
    getVoices: () => Array<{ lang: string; name: string }>;
  };
}

beforeEach(() => {
  (global as { window: MockWindow }).window = {
    speechSynthesis: {
      getVoices: () => []
    }
  };
});

describe('hasAvailableVoices', () => {
  it('returns false when no voices are available', () => {
    (window as MockWindow).speechSynthesis.getVoices = () => [];
    expect(hasAvailableVoices()).toBe(false);
  });

  it('returns true when voices are available', () => {
    (window as MockWindow).speechSynthesis.getVoices = () => [
      { lang: 'en-US', name: 'A' }
    ];
    expect(hasAvailableVoices()).toBe(true);
  });
});
