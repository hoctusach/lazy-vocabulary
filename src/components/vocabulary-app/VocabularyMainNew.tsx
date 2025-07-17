
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyCardNew from './VocabularyCardNew';
import { useBackgroundColor } from './useBackgroundColor';
import VocabularyControlsColumn from './VocabularyControlsColumn';

interface VocabularyMainNewProps {
  currentWord: VocabularyWord;
  mute: boolean;
  isPaused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleCycleVoice: () => void;
  handleSwitchCategory: () => void;
  handleManualNext: () => void;
  currentCategory: string;
  nextCategory: string | null;
  isSoundPlaying: boolean;
  displayTime: number;
  selectedVoiceName: string;
  onOpenAddModal: () => void;
  onOpenEditModal: () => void;
  showWordCount?: boolean;
  playCurrentWord: () => void;
  onCancelSpeech: () => void;
}

const VocabularyMainNew: React.FC<VocabularyMainNewProps> = ({
  currentWord,
  mute,
  isPaused,
  toggleMute,
  handleTogglePause,
  handleCycleVoice,
  handleSwitchCategory,
  currentCategory,
  nextCategory,
  isSoundPlaying,
  handleManualNext,
  displayTime,
  selectedVoiceName,
  onOpenAddModal,
  onOpenEditModal,
  showWordCount = false,
  playCurrentWord,
  onCancelSpeech,
}) => {
  const { backgroundColor } = useBackgroundColor();

  return (
    <div className="flex flex-row items-start gap-2 sm:gap-4 w-full max-w-5xl mx-auto">
      {/* Main card - takes most of the space */}
      <div className="flex-1 min-w-0">
        <VocabularyCardNew
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor={backgroundColor}
          isMuted={mute}
          isPaused={isPaused}
          onToggleMute={toggleMute}
          onTogglePause={handleTogglePause}
          onCycleVoice={handleCycleVoice}
          onSwitchCategory={handleSwitchCategory}
          onNextWord={handleManualNext}
          currentCategory={currentCategory}
          nextCategory={nextCategory || 'Next'}
          isSpeaking={isSoundPlaying}
          category={currentWord.category || currentCategory}
          selectedVoiceName={selectedVoiceName}
          showWordCount={showWordCount}
        />
      </div>
      
      {/* Controls column - positioned on the right side */}
      <div className="flex-none flex flex-col justify-start items-end">
        <VocabularyControlsColumn
          isMuted={mute}
          isPaused={isPaused}
          onToggleMute={toggleMute}
          onTogglePause={handleTogglePause}
          onNextWord={handleManualNext}
          onSwitchCategory={handleSwitchCategory}
          onCycleVoice={handleCycleVoice}
          nextCategory={nextCategory || 'Next'}
          currentWord={currentWord}
        onOpenAddModal={onOpenAddModal}
        onOpenEditModal={onOpenEditModal}
        selectedVoiceName={selectedVoiceName}
        playCurrentWord={playCurrentWord}
        onCancelSpeech={cancelSpeech}
      />
      </div>
    </div>
  );
};

export default VocabularyMainNew;
