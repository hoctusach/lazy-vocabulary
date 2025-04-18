
import React, { useState, useEffect, useCallback, useRef } from 'react';
import VocabularyCard from './VocabularyCard';
import WelcomeScreen from './WelcomeScreen';
import FileUpload from './FileUpload';
import VocabularyLayout from './VocabularyLayout';
import { useVocabularyManager } from '@/hooks/useVocabularyManager';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useWordSpeechSync } from '@/hooks/useWordSpeechSync';
import { vocabularyService } from '@/services/vocabularyService';
import { useToast } from '@/hooks/use-toast';
import { stopSpeaking } from '@/utils/speech';

const VocabularyApp: React.FC = () => {
  console.log("Rendering VocabularyApp");
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const [showWordCard, setShowWordCard] = useState(true);
  const actionInProgressRef = useRef(false);
  
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

  // Synchronize speaking state references
  useEffect(() => {
    isSpeakingRef.current = speakingRef.current;
  }, [speakingRef.current, isSpeakingRef]);

  // Notify when voice system is ready
  useEffect(() => {
    if (isVoicesLoaded) {
      console.log(`Voice system ready with ${voiceRegion} accent`);
      toast({
        title: "Voice System Ready",
        description: `Speech system with ${voiceRegion} accent is ready.`,
      });
    }
  }, [isVoicesLoaded, toast, voiceRegion]);

  // Helper to prevent multiple actions at once
  const performActionWithDelay = useCallback((action: () => void, ms = 500) => {
    if (actionInProgressRef.current) {
      console.log("Action already in progress, ignoring");
      return;
    }
    
    actionInProgressRef.current = true;
    action();
    
    setTimeout(() => {
      actionInProgressRef.current = false;
    }, ms);
  }, []);

  const handleToggleMuteWithSpeaking = useCallback(() => {
    performActionWithDelay(() => {
      console.log("Toggling mute state");
      stopSpeaking();
      const wasMuted = isMuted;
      handleToggleMute();
      
      if (wasMuted && currentWord) {
        console.log("Was muted, now unmuted - will speak current word");
        setTimeout(() => {
          resetLastSpokenWord();
          speakCurrentWord(true);
        }, 300); // Reduced delay for better responsiveness
      } else if (!wasMuted) {
        console.log("Was unmuted, now muted - stopping speech");
        resetLastSpokenWord();
      }
    });
  }, [isMuted, currentWord, handleToggleMute, resetLastSpokenWord, speakCurrentWord, performActionWithDelay]);
  
  const handleChangeVoiceWithSpeaking = useCallback(() => {
    performActionWithDelay(() => {
      console.log("Changing voice region");
      stopSpeaking();
      resetLastSpokenWord();
      handleChangeVoice();
      
      if (!isMuted && currentWord) {
        console.log("Voice changed - will speak current word with new voice");
        setTimeout(() => {
          speakCurrentWord(true);
        }, 500); // Reduced delay for better responsiveness
      }
    }, 600); // Increased action lock time for voice changes
  }, [isMuted, currentWord, handleChangeVoice, resetLastSpokenWord, speakCurrentWord, performActionWithDelay]);
  
  const handleSwitchCategoryWithState = useCallback(() => {
    performActionWithDelay(() => {
      console.log("Switching vocabulary category");
      stopSpeaking();
      resetLastSpokenWord();
      setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
      handleSwitchCategory(isMuted, voiceRegion);
      
      // Force speak the new word after category change
      setTimeout(() => {
        if (!isMuted && currentWord && !isPaused) {
          console.log("Category changed - speaking first word in new category");
          speakCurrentWord(true);
        }
      }, 1000); // Reduced delay for better responsiveness
    }, 1000); // Longer action lock time for category changes
  }, [isMuted, voiceRegion, isPaused, currentWord, handleSwitchCategory, resetLastSpokenWord, speakCurrentWord, performActionWithDelay]);

  const handleNextWordClick = useCallback(() => {
    performActionWithDelay(() => {
      console.log("Manual next word requested");
      stopSpeaking();
      resetLastSpokenWord();
      handleManualNext();
      
      // Force speak the new word
      setTimeout(() => {
        if (!isMuted && !isPaused) {
          console.log("Speaking new word after manual next");
          speakCurrentWord(true);
        }
      }, 600); // Reduced delay for better responsiveness
    }, 800); // Keep action lock time for next word
  }, [isMuted, isPaused, handleManualNext, resetLastSpokenWord, speakCurrentWord, performActionWithDelay]);

  const toggleView = useCallback(() => {
    console.log("Toggling word card view");
    setShowWordCard(prev => !prev);
  }, []);

  // Additional effect to speak word when card becomes visible
  useEffect(() => {
    if (showWordCard && currentWord && !isPaused && !isMuted && !isChangingWordRef.current) {
      console.log("Word card became visible - ensuring word is spoken");
      setTimeout(() => {
        speakCurrentWord(true);
      }, 300); // Reduced delay for better responsiveness
    }
  }, [showWordCard, currentWord, isPaused, isMuted, isChangingWordRef, speakCurrentWord]);

  // Add comprehensive logging for component props and state
  useEffect(() => {
    console.log("VocabularyApp state updated:", {
      hasData,
      isPaused,
      isMuted,
      voiceRegion,
      isVoicesLoaded,
      currentWord: currentWord?.word || "none",
      currentSheetName,
      nextSheetName,
      showWordCard,
      isSpeaking: speakingRef.current,
      wordFullySpoken
    });
  }, [
    hasData, isPaused, isMuted, voiceRegion, isVoicesLoaded,
    currentWord, currentSheetName, nextSheetName, showWordCard,
    speakingRef.current, wordFullySpoken
  ]);

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
          onNextWord={handleNextWordClick}
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
