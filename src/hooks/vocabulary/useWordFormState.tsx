import * as React from 'react';
import { useState, useCallback } from 'react';

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
}

export const useWordFormState = (props: UseWordFormStateProps = {}) => {
  const {
    initialWord = '',
    initialMeaning = '',
    initialExample = '',
    initialCategory = ''
  } = props;

  const [word, setWord] = useState(initialWord);
  const [meaning, setMeaning] = useState(initialMeaning);
  const [example, setExample] = useState(initialExample);
  const [category, setCategory] = useState(initialCategory);

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
