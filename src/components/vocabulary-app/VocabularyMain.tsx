
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyCard from './VocabularyCard';
import { useBackgroundColor } from './useBackgroundColor';

interface VocabularyMainProps {
  currentWord: VocabularyWord;
  mute: boolean;
  isPaused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleChangeVoice: (region: 'US' | 'UK') => void;
  handleSwitchCategory: () => void;
  handleManualNext: () => void;
  currentCategory: string;
  nextCategory: string | null;
  isSoundPlaying: boolean;
  displayTime: number;
  voiceOptions: Array<{ label: string, region: 'US' | 'UK', gender: 'male' | 'female', voice: SpeechSynthesisVoice | null }>;
  selectedVoice: 'US' | 'UK';
}

const VocabularyMain: React.FC<VocabularyMainProps> = ({
  currentWord,
  mute,
  isPaused,
  toggleMute,
  handleTogglePause,
  handleChangeVoice,
  handleSwitchCategory,
  currentCategory,
  nextCategory,
  isSoundPlaying,
  handleManualNext,
  voiceOptions,
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
        onChangeVoice={handleChangeVoice}
        onSwitchCategory={handleSwitchCategory}
        onNextWord={handleManualNext}
        currentCategory={currentCategory}
        nextCategory={nextCategory || 'Next'}
        isSpeaking={isSoundPlaying}
        category={currentWord.category || currentCategory}
        voiceOptions={voiceOptions}
        selectedVoice={selectedVoice}
      />
    </div>
  );
};

export default VocabularyMain;
