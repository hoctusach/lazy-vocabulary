
import React, { useState, useEffect } from 'react';
import VocabularyCard from './VocabularyCard';
import WelcomeScreen from './WelcomeScreen';
import VocabularyControls from './VocabularyControls';
import FileUpload from './FileUpload';
import VocabularyLayout from './VocabularyLayout';
import { useVocabularyManager } from '@/hooks/useVocabularyManager';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useWordSpeechSync } from '@/hooks/useWordSpeechSync';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/hooks/use-toast';
import { stopSpeaking } from '@/utils/speechUtils';

const VocabularyApp: React.FC = () => {
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
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

  const { speakCurrentWord, resetLastSpokenWord, wordFullySpoken } = useWordSpeechSync(
    currentWord,
    isPaused,
    isMuted,
    isVoicesLoaded,
    speakText,
    isSpeakingRef,
    isChangingWordRef
  );

  const { toast } = useToast();

  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex = (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) % vocabularyService.sheetOptions.length;
  const nextSheetName = vocabularyService.sheetOptions[nextSheetIndex];

  // Sync speaking refs
  useEffect(() => {
    isSpeakingRef.current = speakingRef.current;
  }, [speakingRef.current, isSpeakingRef]);

  useEffect(() => {
    if (isVoicesLoaded) {
      toast({
        title: "Voice System Ready",
        description: `Speech system with ${voiceRegion} accent is ready.`,
      });
    }
  }, [isVoicesLoaded, toast, voiceRegion]);

  const handleToggleMuteWithSpeaking = () => {
    // Immediately stop any ongoing speech
    stopSpeaking();
    
    // Toggle mute state
    const wasMuted = isMuted;
    handleToggleMute();
    
    // Wait a short moment for the mute state to update
    setTimeout(() => {
      if (wasMuted && currentWord && !isPaused) {
        // Only speak if we were previously muted and now we're unmuted
        resetLastSpokenWord();
        speakCurrentWord(true); // Force speak the current word
      } else if (!wasMuted) {
        // If we're muting, move to next word without speaking
        handleManualNext();
      }
    }, 100);
  };
  
  const handleChangeVoiceWithSpeaking = () => {
    // Stop any ongoing speech
    stopSpeaking();
    resetLastSpokenWord();
    
    // Change voice
    handleChangeVoice();
    
    // Wait for voice to change before speaking
    setTimeout(() => {
      if (!isMuted && currentWord && !isPaused) {
        speakCurrentWord(true); // Force speak the current word with new voice
      }
    }, 300);
  };
  
  const handleSwitchCategoryWithState = () => {
    // Cancel any ongoing speech and reset state
    stopSpeaking();
    resetLastSpokenWord();
    
    // Change background color
    setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
    
    // Switch category
    handleSwitchCategory(isMuted, voiceRegion);
    
    // Wait for the new word to be loaded, then speak it
    setTimeout(() => {
      if (!isMuted && !isPaused) {
        speakCurrentWord(true); // Force speak the new word
      }
    }, 500);
  };

  const handleNextWordClick = () => {
    stopSpeaking();
    resetLastSpokenWord();
    handleManualNext();
  };

  const toggleView = () => {
    setShowWordCard(prev => !prev);
  };

  return (
    <VocabularyLayout
      showWordCard={showWordCard}
      hasData={hasData}
      onToggleView={toggleView}
    >
      {currentWord && hasData && showWordCard && (
        <VocabularyCard 
          word={currentWord.word}
          meaning={currentWord.meaning}
          example={currentWord.example}
          backgroundColor={backgroundColors[backgroundColorIndex % backgroundColors.length]}
          isMuted={isMuted}
          isPaused={isPaused}
          voiceRegion={voiceRegion}
          onToggleMute={handleToggleMuteWithSpeaking}
          onTogglePause={handleTogglePause}
          onChangeVoice={handleChangeVoiceWithSpeaking}
          onSwitchCategory={handleSwitchCategoryWithState}
          currentCategory={currentSheetName}
          nextCategory={nextSheetName}
          isSpeaking={isSpeakingRef.current}
        />
      )}
      
      {!hasData ? (
        <WelcomeScreen onFileUploaded={handleFileUploaded} />
      ) : (
        <FileUpload 
          onFileUploaded={handleFileUploaded} 
          onShowWordCard={toggleView} 
          showBackButton={!showWordCard}
        />
      )}
      
      {/* Notifications section is hidden per user request */}
    </VocabularyLayout>
  );
};

const backgroundColors = [
  "#f2f2f2", "#e6f7ff", "#fff3e6", "#f9e6f6", "#f0f8ff",
  "#faebd7", "#ffefd5", "#e6e6fa", "#dcdcdc", "#fdf5e6",
  "#ffe4e1", "#fff0f5", "#f5fffa", "#f0fff0", "#f5f5dc",
  "#faf0e6", "#fffacd", "#e0ffff", "#e0f7fa", "#fce4ec"
];

export default VocabularyApp;
