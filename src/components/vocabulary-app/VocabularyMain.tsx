
import React from "react";
import { VocabularyWord } from "@/types/vocabulary";
import VocabularyCard from "@/components/VocabularyCard";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VocabularyMainProps {
  currentWord: VocabularyWord;
  mute: boolean;
  isPaused: boolean;
  voiceRegion: "US" | "UK";
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleChangeVoice: () => void;
  handleSwitchCategory: () => void;
  currentCategory: string;
  nextCategory: string;
  isSoundPlaying: boolean;
  handleManualNext: () => void;
  displayTime: number;
  speechError: string | null;
  hasSpeechPermission: boolean;
  handleSpeechRetry: () => void;
}

const VocabularyMain: React.FC<VocabularyMainProps> = ({
  currentWord,
  mute,
  isPaused,
  voiceRegion,
  toggleMute,
  handleTogglePause,
  handleChangeVoice,
  handleSwitchCategory,
  currentCategory,
  nextCategory,
  isSoundPlaying,
  handleManualNext,
  displayTime,
  speechError,
  hasSpeechPermission,
  handleSpeechRetry,
}) => {
  return (
    <>
      {/* Speech Error Alert */}
      {speechError && (
        <Alert 
          className="mb-4 bg-yellow-50 border-yellow-200 text-yellow-800"
          aria-live="polite"
        >
          <AlertDescription className="flex items-center justify-between">
            <span>{speechError}</span>
            {!hasSpeechPermission && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSpeechRetry} 
                className="ml-4" 
                aria-label="Retry speech"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry Speech
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <VocabularyCard
        word={currentWord.word}
        meaning={currentWord.meaning}
        example={currentWord.example}
        backgroundColor="#ffffff"
        isMuted={mute}
        isPaused={isPaused}
        voiceRegion={voiceRegion}
        onToggleMute={toggleMute}
        onTogglePause={handleTogglePause}
        onChangeVoice={handleChangeVoice}
        onSwitchCategory={handleSwitchCategory}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        isSpeaking={isSoundPlaying}
        onNextWord={handleManualNext}
        displayTime={displayTime}
        category={currentWord.category || currentCategory}
      />
    </>
  );
};

export default VocabularyMain;
