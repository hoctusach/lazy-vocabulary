
import React from "react";
import ErrorDisplay from "../ErrorDisplay";
import ContentWithData from "../ContentWithData";
import VocabularyCard from "../VocabularyCard";
import { VocabularyWord } from "@/types/vocabulary";
import { VoiceSelection } from "@/hooks/vocabulary-playback/useVoiceSelection";

interface VocabularyAppContentProps {
  hasData: boolean;
  hasAnyData: boolean;
  displayWord: VocabularyWord | null;
  jsonLoadError: boolean;
  muted: boolean;
  paused: boolean;
  isSpeaking: boolean;
  selectedVoice: VoiceSelection;
  nextVoiceLabel: string;
  currentCategory: string;
  nextCategory: string | null;
  displayTime: number;
  isAddWordModalOpen: boolean;
  isEditMode: boolean;
  wordToEdit: any;
  handleToggleMuteWithInteraction: () => void;
  handleTogglePauseWithInteraction: () => void;
  handleCycleVoiceWithInteraction: () => void;
  handleCategorySwitchDirect: () => void;
  handleManualNext: () => void;
  handleCloseModal: () => void;
  handleSaveWord: (wordData: { word: string; meaning: string; example: string; category: string }) => void;
  handleOpenAddWordModal: () => void;
  handleOpenEditWordModal: (word: VocabularyWord) => void;
}

const VocabularyAppContent: React.FC<VocabularyAppContentProps> = ({
  hasData,
  hasAnyData,
  displayWord,
  jsonLoadError,
  muted,
  paused,
  isSpeaking,
  selectedVoice,
  nextVoiceLabel,
  currentCategory,
  nextCategory,
  displayTime,
  isAddWordModalOpen,
  isEditMode,
  wordToEdit,
  handleToggleMuteWithInteraction,
  handleTogglePauseWithInteraction,
  handleCycleVoiceWithInteraction,
  handleCategorySwitchDirect,
  handleManualNext,
  handleCloseModal,
  handleSaveWord,
  handleOpenAddWordModal,
  handleOpenEditWordModal
}) => {
  return (
    <>
      {/* Error display component */}
      <ErrorDisplay jsonLoadError={!!jsonLoadError} />

      {hasData && displayWord ? (
        <ContentWithData
          displayWord={displayWord}
          muted={muted}
          paused={paused}
          toggleMute={handleToggleMuteWithInteraction}
          handleTogglePause={handleTogglePauseWithInteraction}
          handleCycleVoice={handleCycleVoiceWithInteraction}
          nextVoiceLabel={nextVoiceLabel}
          handleSwitchCategory={handleCategorySwitchDirect}
          currentCategory={currentCategory}
          nextCategory={nextCategory}
          isSpeaking={isSpeaking}
          handleManualNext={handleManualNext}
          displayTime={displayTime}
          selectedVoice={selectedVoice}
          isAddWordModalOpen={isAddWordModalOpen}
          handleCloseModal={handleCloseModal}
          handleSaveWord={handleSaveWord}
          isEditMode={isEditMode}
          wordToEdit={wordToEdit}
          handleOpenAddWordModal={handleOpenAddWordModal}
          handleOpenEditWordModal={handleOpenEditWordModal}
        />
      ) : hasAnyData ? (
        <VocabularyCard
          word="No data for this category"
          meaning=""
          example=""
          translation={undefined}
          backgroundColor="#F0F8FF"
          isMuted={muted}
          isPaused={paused}
          onToggleMute={handleToggleMuteWithInteraction}
          onTogglePause={handleTogglePauseWithInteraction}
          onCycleVoice={handleCycleVoiceWithInteraction}
          onSwitchCategory={handleCategorySwitchDirect}
          onNextWord={() => {}}
          currentCategory={currentCategory}
          nextCategory={nextCategory || 'Next'}
          isSpeaking={false}
          category={currentCategory}
          selectedVoice={selectedVoice}
          nextVoiceLabel={nextVoiceLabel}
        />
      ) : (
        <p>Loading vocabulary…</p>
      )}
    </>
  );
};

export default VocabularyAppContent;
