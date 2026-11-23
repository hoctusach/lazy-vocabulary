import { describe, it, expect } from 'vitest';
import { LearningProgressService } from '@/services/learningProgressService';
import { VocabularyWord } from '@/types/vocabulary';

// This test verifies that each category with available words yields at least
// one entry when selecting new words by category and that the overall count
// does not exceed the target.
describe('selectNewWordsByCategory', () => {
  it('ensures each category contributes at least one word', () => {
    const service = new LearningProgressService();
    const categories = ['phrasal verbs', 'idioms', 'topic vocab'];
    const newWords = [] as any[];

    categories.forEach(category => {
      for (let i = 0; i < 2; i++) {
        const word: VocabularyWord = {
          word: `${category}-${i}`,
          meaning: 'm',
          example: 'e',
          category,
          count: 1
        };
        newWords.push(service.initializeWord(word));
      }
    });

    const result = (service as any).selectNewWordsByCategory(newWords, 5);

    expect(result.length).toBeLessThanOrEqual(5);
    categories.forEach(category => {
      expect(result.some(w => w.category === category)).toBe(true);
    });
  });
});
