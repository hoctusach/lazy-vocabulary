
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
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const VocabularyApp: React.FC = () => {
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const [lastSpokenWordId, setLastSpokenWordId] = useState<string | null>(null);
  const [showWordCard, setShowWordCard] = useState(true);
  
  const {
    hasData,
    currentWord,
    isPaused,
    handleFileUploaded,
    handleTogglePause,
    handleManualNext,
    handleSwitchCategory,
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
    isVoicesLoaded,
    speakingRef
  } = useSpeechSynthesis();

  const { toast } = useToast();

  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex = (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) % vocabularyService.sheetOptions.length;
  const nextSheetName = vocabularyService.sheetOptions[nextSheetIndex];

  useEffect(() => {
    if (isVoicesLoaded) {
      toast({
        title: "Voice System Ready",
        description: `Speech system with ${voiceRegion} accent is ready.`,
      });
    }
  }, [isVoicesLoaded, toast, voiceRegion]);

  const speakCurrentWord = async () => {
    if (!currentWord || isMuted || !isVoicesLoaded || isChangingWordRef.current) {
      return;
    }
    
    const wordId = `${currentWord.word}-${Math.random()}`;
    
    if (wordId === lastSpokenWordId) {
      return;
    }
    
    setLastSpokenWordId(wordId);
    
    // Directly speak the content without the labels
    const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
    
    console.log("Speaking vocabulary:", currentWord.word);
    
    isSpeakingRef.current = true;
    
    try {
      // Add a small delay before speaking to ensure the UI is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      await speakText(fullText);
      console.log("Finished speaking word completely");
      // Add a small delay after speaking
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Speech error:", error);
    } finally {
      isSpeakingRef.current = false;
    }
  };

  // Speak when word changes if not muted
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && isVoicesLoaded && !isChangingWordRef.current) {
      const timer = setTimeout(() => {
        speakCurrentWord();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [currentWord, isPaused, isMuted, isVoicesLoaded]);
  
  // When unmuted, speak the current word
  useEffect(() => {
    if (!isMuted && currentWord && !isPaused && isVoicesLoaded) {
      setLastSpokenWordId(null);
      speakCurrentWord();
    }
  }, [isMuted]);

  // When unpaused, reset the last spoken word
  useEffect(() => {
    if (!isPaused && currentWord) {
      setLastSpokenWordId(null);
    }
  }, [isPaused]);

  const handleSwitchCategoryWithState = () => {
    setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
    // Reset the last spoken word ID to force a new speech
    setLastSpokenWordId(null);
    handleSwitchCategory(isMuted, voiceRegion);
  };

  const handleNotificationsEnabled = () => {
    toast({
      title: "Notifications Enabled",
      description: "You will now receive vocabulary notifications even when your browser is minimized.",
    });
  };

  const toggleView = () => {
    setShowWordCard(prev => !prev);
  };

  // Synchronize speech ref with speech synthesis ref
  useEffect(() => {
    isSpeakingRef.current = speakingRef.current;
  }, [speakingRef.current]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto p-4">
      {!showWordCard && hasData && (
        <div className="flex justify-start mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleView}
            className="flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Vocabulary
          </Button>
        </div>
      )}
      
      {currentWord && hasData && showWordCard && (
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
            onSwitchCategory={handleSwitchCategoryWithState}
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
        <>
          <FileUpload 
            onFileUploaded={handleFileUploaded} 
            onShowWordCard={toggleView} 
            showBackButton={!showWordCard}
          />
        </>
      )}
      
      <NotificationManager 
        onNotificationsEnabled={handleNotificationsEnabled} 
        currentWord={currentWord}
        voiceRegion={voiceRegion}
      />
    </div>
  );
};

const backgroundColors = [
  "#f2f2f2", "#e6f7ff", "#fff3e6", "#f9e6f6", "#f0f8ff",
  "#faebd7", "#ffefd5", "#e6e6fa", "#dcdcdc", "#fdf5e6",
  "#ffe4e1", "#fff0f5", "#f5fffa", "#f0fff0", "#f5f5dc",
  "#faf0e6", "#fffacd", "#e0ffff", "#e0f7fa", "#fce4ec"
];

export default VocabularyApp;
