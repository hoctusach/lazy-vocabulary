
import React, { useState, useEffect } from 'react';
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
  const [lastSpokenWordId, setLastSpokenWordId] = useState<string | null>(null);
  
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    setHasData,
    isSpeakingRef,
    isChangingWordRef
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

  // Function to speak the current word - fully awaits completion
  const speakCurrentWord = async () => {
    if (!currentWord || isMuted || !isVoicesLoaded || isChangingWordRef.current) {
      return;
    }
    
    // Create unique ID for this word including its actual content to prevent repeats
    const wordId = `${currentWord.word}-${Math.random()}`;
    
    // Skip if we just spoke this exact word
    if (wordId === lastSpokenWordId) {
      return;
    }
    
    setLastSpokenWordId(wordId);
    
    // Construct the text to speak with pauses between sections
    // Adding periods and commas to create natural pauses
    const fullText = `${currentWord.word}. . ${currentWord.meaning}. . Example: ${currentWord.example}`;
    
    console.log("Speaking vocabulary:", currentWord.word);
    
    // Set speaking state to true to prevent next word from being triggered
    isSpeakingRef.current = true;
    
    try {
      // Add a small delay before speaking to ensure UI is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // This will now properly wait until speech is complete before continuing
      await speakText(fullText);
      
      console.log("Finished speaking word completely");
      
      // Add a delay after speaking before allowing next word
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error("Speech error:", error);
    } finally {
      // Always mark as not speaking when done, allowing next word to be triggered
      isSpeakingRef.current = false;
    }
  };

  // Speak word when it changes or is displayed initially
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && isVoicesLoaded && !isChangingWordRef.current) {
      // Small delay to ensure UI is fully updated
      const timer = setTimeout(() => {
        speakCurrentWord();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);
  
  // Try to speak again when unmuted
  useEffect(() => {
    if (!isMuted && currentWord && !isPaused && isVoicesLoaded) {
      // Reset the last spoken word ID to force speaking
      setLastSpokenWordId(null);
      speakCurrentWord();
    }
  }, [isMuted]);

  // Reset spoken status when unpausing
  useEffect(() => {
    if (!isPaused && currentWord) {
      setLastSpokenWordId(null);
    }
  }, [isPaused]);

  const handleSwitchCategory = () => {
    // Only switch if not currently speaking or changing word
    if (!isSpeakingRef.current && !isChangingWordRef.current) {
      const nextCategory = vocabularyService.nextSheet();
      setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
      handleManualNext();
      setLastSpokenWordId(null); // Reset spoken state when changing categories
    } else {
      toast({
        title: "Please wait",
        description: "Currently processing a word. Please wait until it completes.",
      });
    }
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
