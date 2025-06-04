import { describe, it, expect, beforeEach } from 'vitest';
import { hasAvailableVoices } from '../src/utils/speech/voiceUtils';

// Mock speechSynthesis
beforeEach(() => {
  (global as any).window = {
    speechSynthesis: {
      getVoices: () => []
    }
  };
});

describe('hasAvailableVoices', () => {
  it('returns false when no voices are available', () => {
    (window as any).speechSynthesis.getVoices = () => [];
    expect(hasAvailableVoices()).toBe(false);
  });

  it('returns true when voices are available', () => {
    (window as any).speechSynthesis.getVoices = () => [{ lang: 'en-US', name: 'A' }];
    expect(hasAvailableVoices()).toBe(true);
  });
});
