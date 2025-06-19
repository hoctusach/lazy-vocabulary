
import { useState, useEffect } from 'react';
import { validateVocabularyWord, validateMeaning, validateExample } from '@/utils/security/inputValidation';

interface UseWordFormValidationProps {
  word: string;
  meaning: string;
  example: string;
  category: string;
}

export const useWordFormValidation = ({ word, meaning, example, category }: UseWordFormValidationProps) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  // Validate form inputs
  useEffect(() => {
    const errors: string[] = [];
    
    if (word) {
      const wordValidation = validateVocabularyWord(word);
      if (!wordValidation.isValid) {
        errors.push(...wordValidation.errors.map(err => `Word: ${err}`));
      }
    }
    
    if (meaning) {
      const meaningValidation = validateMeaning(meaning);
      if (!meaningValidation.isValid) {
        errors.push(...meaningValidation.errors.map(err => `Meaning: ${err}`));
      }
    }
    
    if (example) {
      const exampleValidation = validateExample(example);
      if (!exampleValidation.isValid) {
        errors.push(...exampleValidation.errors.map(err => `Example: ${err}`));
      }
    }
    
    setValidationErrors(errors);
    setIsFormValid(!!word && !!meaning && !!example && !!category && errors.length === 0);
  }, [word, meaning, example, category]);

  return {
    validationErrors,
    isFormValid
  };
};
