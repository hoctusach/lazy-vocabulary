
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyCard from './VocabularyCard';
import { useBackgroundColor } from './useBackgroundColor';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';

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
}) => {
  const { backgroundColor } = useBackgroundColor();

  return (
    <div className="space-y-6">
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
      />
    </div>
  );
};

export default VocabularyMain;
