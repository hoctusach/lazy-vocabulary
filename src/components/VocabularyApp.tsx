
import React, { useState, useEffect, useRef } from 'react';
import VocabularyCard from './VocabularyCard';
import WelcomeScreen from './WelcomeScreen';
import VocabularyControls from './VocabularyControls';
import NotificationManager from './NotificationManager';
import FileUpload from './FileUpload';
import { useVocabularyManager } from '@/hooks/useVocabularyManager';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/hooks/use-toast';

const VocabularyApp: React.FC = () => {
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const [wordSpoken, setWordSpoken] = useState<string | null>(null);
  
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    setHasData
  } = useVocabularyManager();

  const {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded
  } = useSpeechSynthesis();

  const { toast } = useToast();

  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex = (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) % vocabularyService.sheetOptions.length;
  const nextSheetName = vocabularyService.sheetOptions[nextSheetIndex];

  // Show an indicator when voices are loaded
  useEffect(() => {
    if (isVoicesLoaded) {
      toast({
        title: "Voice System Ready",
        description: `Speech system with ${voiceRegion} accent is ready.`,
      });
    }
  }, [isVoicesLoaded, toast, voiceRegion]);

  // Speak the full vocabulary entry when it changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && isVoicesLoaded) {
      // Create a unique identifier for this word to avoid speaking the same word multiple times
      const wordIdentifier = `${currentWord.word}-${currentWord.meaning}`;
      
      // Only speak if this is a new word
      if (wordSpoken !== wordIdentifier) {
        setWordSpoken(wordIdentifier);
        
        // Construct the text to speak
        const fullText = `${currentWord.word}. ${currentWord.meaning}. Example: ${currentWord.example}`;
        
        // Use a timeout to ensure everything is ready for speech
        const timerId = setTimeout(() => {
          console.log("Speaking vocabulary:", currentWord.word);
          speakText(fullText)
            .then(() => console.log("Vocabulary speech completed"))
            .catch(error => {
              console.error("Speech error:", error);
              toast({
                title: "Speech Issue",
                description: "Couldn't speak this word. Try a different voice or unmute if muted.",
                variant: "destructive"
              });
            });
        }, 300);
        
        // Clean up timeout if component updates before speech starts
        return () => clearTimeout(timerId);
      }
    }
  }, [currentWord, isPaused, isMuted, speakText, isVoicesLoaded, toast, wordSpoken]);

  // Reset word spoken when changing pause state to allow re-speaking current word
  useEffect(() => {
    if (!isPaused) {
      setWordSpoken(null);
    }
  }, [isPaused]);

  const handleSwitchCategory = () => {
    const nextCategory = vocabularyService.nextSheet();
    setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
    handleManualNext();
    setWordSpoken(null); // Reset spoken state when changing categories
  };

  const handleNotificationsEnabled = () => {
    toast({
      title: "Notifications Enabled",
      description: "You will now receive vocabulary notifications even when your browser is minimized.",
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto p-4">
      {currentWord && hasData && (
        <>
          <VocabularyCard 
            word={currentWord.word}
            meaning={currentWord.meaning}
            example={currentWord.example}
            backgroundColor={backgroundColors[backgroundColorIndex % backgroundColors.length]}
            isMuted={isMuted}
            isPaused={isPaused}
            voiceRegion={voiceRegion}
            onToggleMute={handleToggleMute}
            onTogglePause={handleTogglePause}
            onChangeVoice={handleChangeVoice}
            onSwitchCategory={handleSwitchCategory}
            currentCategory={currentSheetName}
            nextCategory={nextSheetName}
          />
          
          <VocabularyControls 
            onReset={() => setHasData(false)}
            onNext={handleManualNext}
          />
        </>
      )}
      
      {!hasData ? (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      ) : (
        <FileUpload onFileUploaded={handleFileUploaded} />
      )}
      
      <NotificationManager onNotificationsEnabled={handleNotificationsEnabled} />
    </div>
  );
};

// Background colors similar to the original app
const backgroundColors = [
  "#f2f2f2", "#e6f7ff", "#fff3e6", "#f9e6f6", "#f0f8ff",
  "#faebd7", "#ffefd5", "#e6e6fa", "#dcdcdc", "#fdf5e6",
  "#ffe4e1", "#fff0f5", "#f5fffa", "#f0fff0", "#f5f5dc",
  "#faf0e6", "#fffacd", "#e0ffff", "#e0f7fa", "#fce4ec"
];

export default VocabularyApp;
