
import React, { useState, useEffect, useCallback } from 'react';
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
import { stopSpeaking } from '@/utils/speech';

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

  const handleToggleMuteWithSpeaking = useCallback(() => {
    stopSpeaking();
    const wasMuted = isMuted;
    handleToggleMute();
    
    if (wasMuted && currentWord) {
      setTimeout(() => {
        resetLastSpokenWord();
        speakCurrentWord(true);
      }, 500);
    } else if (!wasMuted) {
      // Just turned mute on, no need to speak
      resetLastSpokenWord();
    }
  }, [isMuted, currentWord, handleToggleMute, resetLastSpokenWord, speakCurrentWord]);
  
  const handleChangeVoiceWithSpeaking = useCallback(() => {
    stopSpeaking();
    resetLastSpokenWord();
    handleChangeVoice();
    
    if (!isMuted && currentWord) {
      setTimeout(() => {
        speakCurrentWord(true);
      }, 800);
    }
  }, [isMuted, currentWord, handleChangeVoice, resetLastSpokenWord, speakCurrentWord]);
  
  const handleSwitchCategoryWithState = useCallback(() => {
    stopSpeaking();
    resetLastSpokenWord();
    setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
    handleSwitchCategory(isMuted, voiceRegion);
    
    // Force speak the new word after category change
    setTimeout(() => {
      if (!isMuted && currentWord && !isPaused) {
        speakCurrentWord(true);
      }
    }, 1500);
  }, [isMuted, voiceRegion, isPaused, currentWord, handleSwitchCategory, resetLastSpokenWord, speakCurrentWord]);

  const handleNextWordClick = useCallback(() => {
    stopSpeaking();
    resetLastSpokenWord();
    handleManualNext();
    
    // Force speak the new word
    setTimeout(() => {
      if (!isMuted && !isPaused) {
        speakCurrentWord(true);
      }
    }, 1000);
  }, [isMuted, isPaused, handleManualNext, resetLastSpokenWord, speakCurrentWord]);

  const toggleView = useCallback(() => {
    setShowWordCard(prev => !prev);
  }, []);

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
