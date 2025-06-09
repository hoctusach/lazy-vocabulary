
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyCardNew from './VocabularyCardNew';
import { useBackgroundColor } from './useBackgroundColor';

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
  voiceRegion: 'US' | 'UK';
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
}) => {
  const { backgroundColor } = useBackgroundColor();

  return (
    <div className="space-y-6">
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
      />
    </div>
  );
};

export default VocabularyMainNew;
