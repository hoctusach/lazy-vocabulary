
import { useState } from 'react';
import { validateVocabularyWord, validateMeaning, validateExample } from '@/utils/security/inputValidation';

// Simple offline dictionary for basic definitions/examples
const OFFLINE_DICTIONARY: Record<string, { meaning: string; example: string }> = {
  hello: {
    meaning: 'used as a greeting when meeting someone',
    example: 'She said hello and waved.',
  },
  world: {
    meaning: 'the earth, together with all of its countries and peoples',
    example: 'The world is round.',
  },
};

interface UseWordSearchProps {
  word: string;
  setMeaning: (meaning: string) => void;
  setExample: (example: string) => void;
}

export const useWordSearch = ({ word, setMeaning, setExample }: UseWordSearchProps) => {
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');

  const handleSearch = async () => {
    if (!word.trim()) {
      setSearchError('Please enter a word to search');
      return;
    }
    
    // Validate word before searching
    const wordValidation = validateVocabularyWord(word.trim());
    if (!wordValidation.isValid) {
      setSearchError('Invalid word format for search');
      return;
    }

    try {
      setIsSearching(true);
      setSearchError('');

      const term = wordValidation.sanitizedValue!.toLowerCase();
      const entry = OFFLINE_DICTIONARY[term];

      if (entry) {
        const definitionValidation = validateMeaning(entry.meaning);
        if (definitionValidation.isValid) {
          setMeaning(definitionValidation.sanitizedValue!);
        } else {
          setMeaning(entry.meaning);
        }

        const exampleValidation = validateExample(entry.example);
        if (exampleValidation.isValid) {
          setExample(exampleValidation.sanitizedValue!);
        } else {
          setExample(entry.example);
        }
      } else {
        setMeaning('No definition found.');
        setExample('No example found. Please enter manually.');
        setSearchError('Word not found in offline dictionary. Please enter details manually.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  return {
    isSearching,
    searchError,
    handleSearch,
    setSearchError
  };
};
