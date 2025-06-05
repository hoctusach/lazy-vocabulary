
import { useState } from 'react';
import { validateVocabularyWord, validateMeaning, validateExample, RateLimiter } from '@/utils/security/inputValidation';
import { isValidUrl } from '@/utils/security/contentSecurity';

// Rate limiter for API calls
const searchRateLimiter = new RateLimiter(5, 60000); // 5 searches per minute

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
    
    // Rate limiting check
    if (!searchRateLimiter.isAllowed('dictionary-search')) {
      setSearchError('Too many search requests. Please wait a moment before trying again.');
      return;
    }
    
    // Validate word before searching
    const wordValidation = validateVocabularyWord(word.trim());
    if (!wordValidation.isValid) {
      setSearchError('Invalid word format for search');
      return;
    }
    
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      setIsSearching(true);
      setSearchError('');
      
      // URL-encode the term for multi-word phrases
      const term = encodeURIComponent(wordValidation.sanitizedValue!);
      
      // Validate URL before making request
      const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${term}`;
      if (!isValidUrl(apiUrl)) {
        throw new Error('Invalid API URL');
      }
      
      // Primary dictionary API call with timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch definition');
      }
      
      const data = await response.json();
      let definitionFound = false;
      let exampleFound = false;
      
      if (data && data[0] && data[0].meanings && data[0].meanings[0]) {
        // Get first definition
        const firstDefinition = data[0].meanings[0].definitions[0];
        
        if (firstDefinition && firstDefinition.definition) {
          // Validate and sanitize the definition
          const definitionValidation = validateMeaning(firstDefinition.definition);
          if (definitionValidation.isValid) {
            setMeaning(definitionValidation.sanitizedValue!);
            definitionFound = true;
          }
          
          // Check for example
          if (firstDefinition.example) {
            const exampleValidation = validateExample(firstDefinition.example);
            if (exampleValidation.isValid) {
              setExample(exampleValidation.sanitizedValue!);
              exampleFound = true;
            }
          }
        }
      }
      
      if (!definitionFound) {
        setMeaning('No definition found.');
        setSearchError('No definition found. Please try another word or enter manually.');
      }
      
      if (!exampleFound) {
        setExample('No example found. Please enter manually.');
      }
      
    } catch (error) {
      console.error('Dictionary API error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setSearchError('Search request timed out. Please try again.');
      } else {
        setSearchError('Search failed. Please try again or enter details manually.');
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
