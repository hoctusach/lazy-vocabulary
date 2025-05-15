
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyCard from './VocabularyCard';
import VocabularyControls from '@/components/VocabularyControls';
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
  handlePlay?: () => void; // Added new play handler
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
  handlePlay,
  displayTime,
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
        displayTime={displayTime}
        category={currentWord.category || currentCategory}
        voiceOptions={voiceOptions}
        selectedVoice={selectedVoice}
      />

      <VocabularyControls
        mute={mute}
        isPaused={isPaused}
        onToggleMute={toggleMute}
        onTogglePause={handleTogglePause}
        onNext={handleManualNext}
        onPlay={handlePlay}
        onChangeVoice={() => handleChangeVoice(selectedVoice === 'US' ? 'UK' : 'US')}
        onSwitchCategory={handleSwitchCategory}
        currentCategory={currentCategory}
        nextCategory={nextCategory || ''}
        voiceOption={selectedVoice}
        isSoundPlaying={isSoundPlaying}
        displayTime={displayTime}
      />
    </div>
  );
};

export default VocabularyMain;
