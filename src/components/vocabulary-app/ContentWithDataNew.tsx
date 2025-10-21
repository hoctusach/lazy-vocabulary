import React from 'react';
import type { ReadonlyWord } from '@/types/vocabulary';
import VocabularyMainNew from './VocabularyMainNew';

interface ContentWithDataNewProps {
  displayWord: ReadonlyWord | null;
  muted: boolean;
  paused: boolean;
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleCycleVoice: () => void;
  isSpeaking: boolean;
  handleManualNext: () => void;
  displayTime: number;
  selectedVoiceName: string;
  playCurrentWord: () => void;
  onMarkWordLearned?: (word: string) => void;
  onOpenSearch: (word?: string) => void;
  additionalContent?: React.ReactNode;
  emptyState?: {
    word: string;
    meaning: string;
    example?: string;
    translation?: string;
    category?: string;
  };
}

const ContentWithDataNew: React.FC<ContentWithDataNewProps> = ({
  displayWord,
  muted,
  paused,
  toggleMute,
  handleTogglePause,
  handleCycleVoice,
  isSpeaking,
  handleManualNext,
  displayTime,
  selectedVoiceName,
  playCurrentWord,
  onMarkWordLearned,
  onOpenSearch,
  additionalContent,
  emptyState
}) => {
  return (
    <>
      {/* Main vocabulary display */}
      <VocabularyMainNew
        currentWord={displayWord}
        emptyState={emptyState}
        mute={muted}
        isPaused={paused}
        toggleMute={toggleMute}
        handleTogglePause={handleTogglePause}
        handleCycleVoice={handleCycleVoice}
        isSoundPlaying={isSpeaking}
        handleManualNext={handleManualNext}
        displayTime={displayTime}
        selectedVoiceName={selectedVoiceName}
        playCurrentWord={playCurrentWord}
        onMarkWordLearned={onMarkWordLearned}
        onOpenSearch={onOpenSearch}
      />

      {additionalContent}

      {/* Mobile speech note statically above debug panel */}
      <div className="mobile-note text-xs italic text-gray-500 text-left my-1">
        <p>⭐ Speech won’t autoplay due to security. Sometimes, tap anywhere or any button (e.g. Next) to enable it.</p>
      </div>


      
    </>
  );
};

export default ContentWithDataNew;
