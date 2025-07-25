import React, { useMemo } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyMain from './VocabularyMain';
import AddWordModal from './AddWordModal';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';

interface ContentWithDataProps {
  displayWord: VocabularyWord;
  muted: boolean;
  paused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleCycleVoice: () => void;
  handleSwitchCategory: () => void;
  currentCategory: string;
  nextCategory: string | null;
  isSpeaking: boolean;
  handleManualNext: () => void;
  displayTime: number;
  selectedVoice: VoiceSelection;
  nextVoiceLabel: string;
  isAddWordModalOpen: boolean;
  handleCloseModal: () => void;
  handleSaveWord: (wordData: { word: string; meaning: string; example: string; translation: string; category: string }) => void;
  isEditMode: boolean;
  wordToEdit: any;
  handleOpenAddWordModal: () => void;
  handleOpenEditWordModal: (word: VocabularyWord) => void;
}

const ContentWithData: React.FC<ContentWithDataProps> = ({
  displayWord,
  muted,
  paused,
  toggleMute,
  handleTogglePause,
  handleCycleVoice,
  handleSwitchCategory,
  currentCategory,
  nextCategory,
  isSpeaking,
  handleManualNext,
  displayTime,
  selectedVoice,
  nextVoiceLabel,
  isAddWordModalOpen,
  handleCloseModal,
  handleSaveWord,
  isEditMode,
  wordToEdit,
  handleOpenAddWordModal,
  handleOpenEditWordModal
}) => {
  const editingWordData = useMemo(
    () => (
      isEditMode && wordToEdit
        ? {
            ...wordToEdit,
            translation: wordToEdit.translation || '',
            category: wordToEdit.category || currentCategory
          }
        : undefined
    ),
    [isEditMode, wordToEdit, currentCategory]
  );
  return (
    <>
      {/* Main vocabulary display */}
      <VocabularyMain
        currentWord={displayWord}
        mute={muted}
        isPaused={paused}
        toggleMute={toggleMute}
        handleTogglePause={handleTogglePause}
        handleCycleVoice={handleCycleVoice}
        handleSwitchCategory={handleSwitchCategory}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        isSoundPlaying={isSpeaking}
        handleManualNext={handleManualNext}
        displayTime={displayTime}
        selectedVoice={selectedVoice}
        nextVoiceLabel={nextVoiceLabel}
        onOpenAddModal={handleOpenAddWordModal}
        onOpenEditModal={() => handleOpenEditWordModal(displayWord)}
        voiceRegion={selectedVoice.region}
      />
      
      

      
      {/* Enhanced Word Modal (handles both add and edit) */}
      <AddWordModal
        isOpen={isAddWordModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveWord}
        editMode={isEditMode}
        wordToEdit={editingWordData}
      />
    </>
  );
};

export default ContentWithData;
