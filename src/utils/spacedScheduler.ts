
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Gets the start of today's date (midnight)
 */
export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Adds specified days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Gets words that are due for review today
 */
export function getDueToday(words: VocabularyWord[]): VocabularyWord[] {
  const today = startOfToday();
  
  return words.filter(word => {
    // If a word doesn't have nextDue, it's due today
    if (!word.nextDue) return true;
    
    try {
      const dueDate = new Date(word.nextDue);
      return dueDate <= today;
    } catch (e) {
      console.error(`Invalid date format for word: ${word.word}`, e);
      return true; // If the date is invalid, include it anyway
    }
  });
}

/**
 * Updates a word based on review outcome using SM-2 algorithm
 */
export function reviewOutcome(entry: VocabularyWord, wasCorrect: boolean): VocabularyWord {
  // Clone the entry to avoid mutation
  const updatedEntry = { ...entry };
  const today = startOfToday();
  
  // Initialize spaced repetition fields if missing
  if (typeof updatedEntry.interval !== 'number') updatedEntry.interval = 1;
  if (typeof updatedEntry.easeFactor !== 'number') updatedEntry.easeFactor = 2.5;
  
  // Update based on review outcome
  if (wasCorrect) {
    // If correct: increment count
    updatedEntry.count = typeof updatedEntry.count === 'number' 
      ? updatedEntry.count + 1 
      : parseInt(updatedEntry.count as string || '0', 10) + 1;
    
    // Update interval and next due date
    const nextInterval = Math.round(updatedEntry.interval * updatedEntry.easeFactor);
    updatedEntry.interval = nextInterval > 0 ? nextInterval : 1;
    updatedEntry.nextDue = addDays(today, updatedEntry.interval).toISOString();
    
    // Optional: slightly increase ease factor for consistent correct answers
    updatedEntry.easeFactor = Math.min(updatedEntry.easeFactor + 0.1, 3.0);
  } else {
    // If wrong: reset interval and decrease ease factor
    updatedEntry.interval = 1;
    updatedEntry.nextDue = addDays(today, 1).toISOString();
    updatedEntry.easeFactor = Math.max(updatedEntry.easeFactor - 0.2, 1.3);
  }
  
  return updatedEntry;
}

/**
 * Initialize spaced repetition fields for words that don't have them
 */
export function initializeSpacedRepetitionFields(word: VocabularyWord): VocabularyWord {
  return {
    ...word,
    interval: typeof word.interval === 'number' ? word.interval : 1,
    easeFactor: typeof word.easeFactor === 'number' ? word.easeFactor : 2.5,
    nextDue: word.nextDue || startOfToday().toISOString()
  };
}
