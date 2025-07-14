import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyMainNew from './VocabularyMainNew';
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
  selectedVoiceName: string;
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
  selectedVoiceName,
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
        selectedVoiceName={selectedVoiceName}
      onOpenAddModal={handleOpenAddWordModal}
        onOpenEditModal={() => handleOpenEditWordModal(displayWord)}
      />

      {/* Mobile speech note statically above debug panel */}
      <div className="mobile-note text-xs italic text-gray-500 text-left my-2">
        <p>⭐ Tap any button (e.g., Next) to enable speech.</p>
        <p>⭐ On Mobile, only one voice may be available.</p>
        <p>
          ⭐ No personal login or data is stored on any server. Your progress
          (stickers, rewards) is saved locally in your browser on your device.
          Available voices depend on your browser and device—at first, try
          different browsers to find the best one for learning. Make sure you
          use the same device and browser to keep your progress.
        </p>
      </div>

      {/* Debug Panel */}
      <DebugPanel
        isMuted={muted}
        voiceRegion={selectedVoiceName}
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
