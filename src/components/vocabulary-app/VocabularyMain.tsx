
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
  toggleMute: () => void;
  handleTogglePause: () => void;
  handleChangeVoice: (voiceLabel: string) => void;
  handleSwitchCategory: (categoryName?: string) => void;
  currentCategory: string;
  nextCategory: string;
  isSoundPlaying: boolean;
  handleManualNext: () => void;
  displayTime: number;
  speechError?: string | null;
  hasSpeechPermission?: boolean;
  handleSpeechRetry?: () => void;
  voiceOptions: Array<{
    label: string;
    region: 'US' | 'UK';
    gender: 'male' | 'female';
    voice: SpeechSynthesisVoice | null;
  }>;
  selectedVoice: string;
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
  displayTime,
  speechError,
  hasSpeechPermission,
  handleSpeechRetry,
  voiceOptions,
  selectedVoice
}) => {
  // Handler to prevent rapid clicks on the category button
  const handleCategorySwitch = () => {
    console.log(`Switching to ${nextCategory} category`);
    handleSwitchCategory(nextCategory);
  };

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
            {handleSpeechRetry && (
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
        onToggleMute={toggleMute}
        onTogglePause={handleTogglePause}
        onChangeVoice={(selectedOption) => handleChangeVoice(selectedOption)}
        onSwitchCategory={handleCategorySwitch}
        currentCategory={currentCategory}
        nextCategory={nextCategory}
        isSpeaking={isSoundPlaying}
        onNextWord={handleManualNext}
        displayTime={displayTime}
        category={currentWord.category || currentCategory}
        voiceOptions={voiceOptions}
        selectedVoice={selectedVoice}
      />
    </>
  );
};

export default VocabularyMain;
