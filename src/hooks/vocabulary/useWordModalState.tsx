
import { useState } from "react";
import { VocabularyWord } from "@/types/vocabulary";

export const useWordModalState = () => {
  // Modal states
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [wordToEdit, setWordToEdit] = useState<VocabularyWord | null>(null);

  // Handler for opening the add word modal
  const handleOpenAddWordModal = () => {
    setIsEditMode(false);
    setWordToEdit(null);
    setIsAddWordModalOpen(true);
  };
  
  // Handler for opening the edit word modal
  const handleOpenEditWordModal = (currentWord: VocabularyWord | null) => {
    if (!currentWord) return;
    setIsEditMode(true);
    setWordToEdit(currentWord);  // Store the current word to edit
    setIsAddWordModalOpen(true);
  };
  
  // Handler for closing the modal
  const handleCloseModal = () => {
    setIsAddWordModalOpen(false);
    setWordToEdit(null);
  };

  return {
    isAddWordModalOpen,
    isEditMode,
    wordToEdit,
    handleOpenAddWordModal,
    handleOpenEditWordModal,
    handleCloseModal
  };
};
