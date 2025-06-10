
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import AddWordButton from './AddWordButton';
import EditWordButton from './EditWordButton';
import MobileChromeNotices from './MobileChromeNotices';

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
    <div className="w-full">
      {/* Action buttons container */}
      <div className="flex justify-center gap-2 mb-2">
        <EditWordButton 
          onClick={onOpenEditModal} 
          disabled={!currentWord}
        />
        <AddWordButton onClick={onOpenAddModal} />
      </div>
      
      {/* Mobile Chrome notices */}
      <MobileChromeNotices />
    </div>
  );
};

export default WordActionButtons;
