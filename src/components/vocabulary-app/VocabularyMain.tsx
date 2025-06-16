
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyCard from './VocabularyCard';
import { useBackgroundColor } from './useBackgroundColor';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import VocabularyControlsColumn from './VocabularyControlsColumn';

interface VocabularyMainProps {
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
  selectedVoice: VoiceSelection;
  nextVoiceLabel: string;
  onOpenAddModal: () => void;
  onOpenEditModal: () => void;
}

const VocabularyMain: React.FC<VocabularyMainProps> = ({
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
  selectedVoice,
  nextVoiceLabel,
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const { backgroundColor } = useBackgroundColor();

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <VocabularyCard
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
        selectedVoice={selectedVoice}
        nextVoiceLabel={nextVoiceLabel}
      />
      <VocabularyControlsColumn
        isMuted={mute}
        isPaused={isPaused}
        onToggleMute={toggleMute}
        onTogglePause={handleTogglePause}
        onNextWord={handleManualNext}
        onSwitchCategory={handleSwitchCategory}
        onCycleVoice={handleCycleVoice}
        nextCategory={nextCategory || 'Next'}
        nextVoiceLabel={nextVoiceLabel}
        currentWord={currentWord}
        onOpenAddModal={onOpenAddModal}
        onOpenEditModal={onOpenEditModal}
      />
    </div>
  );
};

export default VocabularyMain;
