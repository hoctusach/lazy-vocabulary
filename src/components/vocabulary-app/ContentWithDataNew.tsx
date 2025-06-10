
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyMainNew from './VocabularyMainNew';
import WordActionButtons from './WordActionButtons';
import DebugPanel from '@/components/DebugPanel';
import AddWordModal from './AddWordModal';

interface ContentWithDataNewProps {
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
  voiceRegion: 'US' | 'UK' | 'AU';
  debugPanelData: any;
  isAddWordModalOpen: boolean;
  handleCloseModal: () => void;
  handleSaveWord: (wordData: { word: string; meaning: string; example: string; category: string }) => void;
  isEditMode: boolean;
  wordToEdit: any;
  handleOpenAddWordModal: () => void;
  handleOpenEditWordModal: (word: VocabularyWord) => void;
}

const ContentWithDataNew: React.FC<ContentWithDataNewProps> = ({
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
  voiceRegion,
  debugPanelData,
  isAddWordModalOpen,
  handleCloseModal,
  handleSaveWord,
  isEditMode,
  wordToEdit,
  handleOpenAddWordModal,
  handleOpenEditWordModal
}) => {
  return (
    <>
      {/* Main vocabulary display */}
      <VocabularyMainNew
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
        voiceRegion={voiceRegion}
      />
      
      {/* Action buttons container */}
      <WordActionButtons 
        currentWord={displayWord}
        onOpenAddModal={handleOpenAddWordModal}
        onOpenEditModal={() => handleOpenEditWordModal(displayWord)}
      />
      
      {/* Debug Panel */}
      <DebugPanel 
        isMuted={muted}
        voiceRegion={voiceRegion}
        isPaused={paused}
        currentWord={debugPanelData}
      />
      
      {/* Enhanced Word Modal (handles both add and edit) */}
      <AddWordModal 
        isOpen={isAddWordModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSaveWord}
        editMode={isEditMode}
        wordToEdit={isEditMode && wordToEdit ? {
          word: wordToEdit.word,
          meaning: wordToEdit.meaning,
          example: wordToEdit.example,
          category: wordToEdit.category || currentCategory
        } : undefined}
      />
    </>
  );
};

export default ContentWithDataNew;
