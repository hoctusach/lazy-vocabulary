
import { useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useWordModalState = () => {
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [wordToEdit, setWordToEdit] = useState<VocabularyWord | null>(null);

  const handleOpenAddWordModal = useCallback(() => {
    setIsEditMode(false);
    setWordToEdit(null);
    setIsAddWordModalOpen(true);
  }, []);

  const handleOpenEditWordModal = useCallback((word: VocabularyWord) => {
    setIsEditMode(true);
    setWordToEdit(word);
    setIsAddWordModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddWordModalOpen(false);
    setIsEditMode(false);
    setWordToEdit(null);
  }, []);

  return {
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  };
};
