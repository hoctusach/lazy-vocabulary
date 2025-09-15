import React, { useMemo } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import VocabularyMainNew from './VocabularyMainNew';

interface ContentWithDataNewProps {
  displayWord: ReadonlyWord;
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
  additionalContent
}) => {
  return (
    <>
      {/* Main vocabulary display */}
      <VocabularyMainNew
        currentWord={displayWord}
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
      <div className="mobile-note text-xs italic text-gray-500 text-left my-2">
        <p>⭐ Speech won’t autoplay due to security. Sometimes, tap anywhere or any button (e.g. Next) to enable it.</p>
        <p>
          ⭐ No personal login or data is stored on any server. Your progress is saved locally in your browser on your device.
          Available voices depend on your browser and device—at first, try
          different browsers to find the best one for learning. Make sure you
          use the same device and browser to keep your progress.
        </p>
      </div>


      
    </>
  );
};

export default ContentWithDataNew;
