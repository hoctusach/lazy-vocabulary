import { describe, it, expect } from 'vitest';
import { extractSpeechableContent } from '../src/utils/text/contentFilters';

describe('extractSpeechableContent', () => {
  it('removes IPA and word type annotations', () => {
    const input = 'quick (adj) [kwiːk]';
    const result = extractSpeechableContent(input);
    expect(result).toBe('quick');
  });
});
