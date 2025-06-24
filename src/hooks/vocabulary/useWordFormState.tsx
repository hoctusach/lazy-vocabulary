
import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';

interface WordFormState {
  word: string;
  meaning: string;
  example: string;
  category: string;
}

interface UseWordFormStateProps {
  initialWord?: string;
  initialMeaning?: string;
  initialExample?: string;
  initialCategory?: string;
  editMode?: boolean;
  wordToEdit?: { word: string; meaning: string; example: string; category: string };
  isOpen?: boolean;
}

export const useWordFormState = (props: UseWordFormStateProps = {}) => {
  const {
    initialWord = '',
    initialMeaning = '',
    initialExample = '',
    initialCategory = '',
    editMode = false,
    wordToEdit,
    isOpen = false
  } = props;

  const [word, setWord] = useState(editMode && wordToEdit ? wordToEdit.word : initialWord);
  const [meaning, setMeaning] = useState(editMode && wordToEdit ? wordToEdit.meaning : initialMeaning);
  const [example, setExample] = useState(editMode && wordToEdit ? wordToEdit.example : initialExample);
  const [category, setCategory] = useState(editMode && wordToEdit ? wordToEdit.category : initialCategory);

  // Reset form when modal opens/closes or when switching between edit/add modes
  useEffect(() => {
    if (isOpen) {
      if (editMode && wordToEdit) {
        setWord(wordToEdit.word);
        setMeaning(wordToEdit.meaning);
        setExample(wordToEdit.example);
        setCategory(wordToEdit.category);
      } else {
        setWord(initialWord);
        setMeaning(initialMeaning);
        setExample(initialExample);
        setCategory(initialCategory);
      }
    }
  }, [isOpen, editMode, wordToEdit, initialWord, initialMeaning, initialExample, initialCategory]);

  const handleWordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWord(e.target.value);
  }, []);

  const handleMeaningChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMeaning(e.target.value);
  }, []);

  const handleExampleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setExample(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCategory(e.target.value);
  }, []);

  const resetForm = useCallback(() => {
    setWord(initialWord);
    setMeaning(initialMeaning);
    setExample(initialExample);
    setCategory(initialCategory);
  }, [initialWord, initialMeaning, initialExample, initialCategory]);

  return {
    word,
    meaning,
    example,
    category,
    handleWordChange,
    handleMeaningChange,
    handleExampleChange,
    handleCategoryChange,
    resetForm,
    setWord,
    setMeaning,
    setExample,
    setCategory
  };
};
