import { LearningProgress } from '@/types/learning';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Build the union of today's new and review words, de-duplicated and
 * optionally filtered by category. The original lists are not mutated.
 */
export function buildTodaysWords(
  reviewWords: LearningProgress[],
  newWords: LearningProgress[],
  allWords: VocabularyWord[],
  category: string
): VocabularyWord[] {
  const map = new Map<string, VocabularyWord>();
  // Combine review words before new words to prioritize due items
  const combined = [...reviewWords, ...newWords];

  combined.forEach(p => {
    const word = allWords.find(w => w.word === p.word && w.category === p.category);
    if (word) {
      map.set(`${word.word}__${word.category}`, word);
    }
  });

  const result = Array.from(map.values());
  if (category === 'ALL') {
    return result;
  }
  return result.filter(w => w.category === category);
}
