import { describe, it, expect } from 'vitest';
import { extractSpeechableContent } from '../src/utils/text/contentFilters';

describe('extractSpeechableContent', () => {
  it('preserves IPA and annotations', () => {
    const input = 'quick (adj) [kwiːk]';
    const result = extractSpeechableContent(input);
    expect(result).toBe('quick (adj) [kwiːk]');
  });

  it('preserves IPA characters when preserveSpecial is true', () => {
    const input = 'ʃʊd';
    const result = extractSpeechableContent(input, true);
    expect(result).toBe('ʃʊd');
  });
});
