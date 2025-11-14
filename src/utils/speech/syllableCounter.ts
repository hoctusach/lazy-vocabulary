import { VocabularyWord } from '@/types/vocabulary';

const WORD_PATTERN = /[a-zA-Z]+(?:'[a-z]+)?/g;

function normalizeWord(input: string): string {
  return input.toLowerCase().replace(/[^a-z']/g, '');
}

function countSyllablesInNormalizedWord(word: string): number {
  if (!word) {
    return 0;
  }

  if (word.length <= 3) {
    return 1;
  }

  const processed = word
    // Remove common silent endings
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '')
    // Remove leading y which behaves like a consonant
    .replace(/^y/, '');

  const vowelGroups = processed.match(/[aeiouy]{1,2}/g);
  return vowelGroups ? vowelGroups.length : 1;
}

export function countSyllables(text: string | undefined | null): number {
  if (!text) {
    return 0;
  }

  const matches = text.match(WORD_PATTERN);
  if (!matches) {
    return 0;
  }

  return matches.reduce((total, rawWord) => {
    const normalized = normalizeWord(rawWord);
    const syllables = countSyllablesInNormalizedWord(normalized);
    return total + syllables;
  }, 0);
}

export function countVocabularyWordSyllables(word: Pick<VocabularyWord, 'word' | 'meaning' | 'example'>): number {
  const wordSyllables = countSyllables(word.word);
  const meaningSyllables = countSyllables(word.meaning);
  const exampleSyllables = countSyllables(word.example);

  const total = wordSyllables + meaningSyllables + exampleSyllables;
  return total > 0 ? total : 1;
}
