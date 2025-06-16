
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
  voiceRegion: 'US' | 'UK' | 'AU';
  nextVoiceLabel: string;
  onOpenAddModal: () => void;
  onOpenEditModal: () => void;
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
  voiceRegion,
  nextVoiceLabel,
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const { backgroundColor } = useBackgroundColor();

  return (
    <div className="flex flex-row flex-nowrap items-start gap-4 w-full">
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
        voiceRegion={voiceRegion}
        nextVoiceLabel={nextVoiceLabel}
        />
      </div>
      <div className="flex-none w-28">
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
    </div>
  );
};

export default VocabularyMainNew;
