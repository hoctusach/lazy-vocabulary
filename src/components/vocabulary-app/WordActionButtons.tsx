
import React from 'react';
import AddWordButton from "./AddWordButton";
import EditWordButton from "./EditWordButton";
import { VocabularyWord } from '@/types/vocabulary';

interface WordActionButtonsProps {
  currentWord: VocabularyWord | null;
  onOpenAddModal: () => void;
  onOpenEditModal: () => void;
}

const WordActionButtons: React.FC<WordActionButtonsProps> = ({
  currentWord,
  onOpenAddModal,
  onOpenEditModal
}) => {
  return (
    <>
      <div className="flex items-center justify-center gap-2 my-2">
        <EditWordButton
          onClick={onOpenEditModal}
          disabled={!currentWord}
        />
        <AddWordButton onClick={onOpenAddModal} />
      </div>
    </>
  );
};

export default WordActionButtons;
