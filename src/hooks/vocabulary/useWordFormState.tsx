
import { useState, useEffect } from 'react';
import { validateVocabularyWord, validateMeaning, validateExample } from '@/utils/security/inputValidation';

interface WordFormData {
  word: string;
  meaning: string;
  example: string;
  category: string;
}

interface UseWordFormStateProps {
  editMode: boolean;
  wordToEdit?: WordFormData | null;
  isOpen: boolean;
}

export const useWordFormState = ({ editMode, wordToEdit, isOpen }: UseWordFormStateProps) => {
  const [word, setWord] = useState<string>('');
  const [meaning, setMeaning] = useState<string>('');
  const [example, setExample] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  // Pre-populate form when in edit mode
  useEffect(() => {
    if (editMode && wordToEdit) {
      // Sanitize input when loading for edit
      const wordValidation = validateVocabularyWord(wordToEdit.word);
      const meaningValidation = validateMeaning(wordToEdit.meaning);
      const exampleValidation = validateExample(wordToEdit.example);
      
      setWord(wordValidation.sanitizedValue || wordToEdit.word);
      setMeaning(meaningValidation.sanitizedValue || wordToEdit.meaning);
      setExample(exampleValidation.sanitizedValue || wordToEdit.example);
      setCategory(wordToEdit.category);
    } else if (!editMode) {
      // Reset form when not in edit mode
      setWord('');
      setMeaning('');
      setExample('');
      setCategory('');
    }
  }, [editMode, wordToEdit, isOpen]);

  const handleWordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Basic real-time sanitization
    const sanitized = value.replace(/[<>]/g, '');
    setWord(sanitized);
  };

  const handleMeaningChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Basic real-time sanitization
    const sanitized = value.replace(/[<>]/g, '');
    setMeaning(sanitized);
  };

  const handleExampleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Basic real-time sanitization
    const sanitized = value.replace(/[<>]/g, '');
    setExample(sanitized);
  };

  const resetForm = () => {
    setWord('');
    setMeaning('');
    setExample('');
    setCategory('');
  };

  return {
    word,
    meaning,
    example,
    category,
    setWord,
    setMeaning,
    setExample,
    setCategory,
    handleWordChange,
    handleMeaningChange,
    handleExampleChange,
    resetForm
  };
};
