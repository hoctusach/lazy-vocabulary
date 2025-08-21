
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
  handleManualNext: () => void;
  isSoundPlaying: boolean;
  displayTime: number;
  selectedVoiceName: string;
  onOpenAddModal: () => void;
  onOpenEditModal: () => void;
  showWordCount?: boolean;
  playCurrentWord: () => void;
  onMarkWordLearned?: (word: string) => void;
  onOpenSearch?: (word?: string) => void;
}

const VocabularyMainNew: React.FC<VocabularyMainNewProps> = ({
  currentWord,
  mute,
  isPaused,
  toggleMute,
  handleTogglePause,
  handleCycleVoice,
  handleManualNext,
  isSoundPlaying,
  displayTime,
  selectedVoiceName,
  onOpenAddModal,
  onOpenEditModal,
  showWordCount = false,
  playCurrentWord,
  onMarkWordLearned,
  onOpenSearch = () => {},
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
            translation={currentWord.translation}
            backgroundColor={backgroundColor}
            isSpeaking={isSoundPlaying}
            category={currentWord.category || ''}
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
            onCycleVoice={handleCycleVoice}
            currentWord={currentWord}
            onOpenAddModal={onOpenAddModal}
            onOpenEditModal={onOpenEditModal}
            selectedVoiceName={selectedVoiceName}
            playCurrentWord={playCurrentWord}
            onMarkWordLearned={onMarkWordLearned}
            onOpenSearch={onOpenSearch}
          />
        </div>
      </div>
    );
  };

export default VocabularyMainNew;
