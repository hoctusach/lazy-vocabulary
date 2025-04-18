import React, { useState, useEffect, useCallback, useRef } from 'react';
import VocabularyCard from './VocabularyCard';
import WelcomeScreen from './WelcomeScreen';
import FileUpload from './FileUpload';
import VocabularyLayout from './VocabularyLayout';
import { useVocabularyManager } from '@/hooks/useVocabularyManager';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useWordSpeechSync } from '@/hooks/useWordSpeechSync';
import { vocabularyService } from '@/services/vocabularyService';
import { stopSpeaking, checkSoundDisplaySync, keepSpeechAlive } from '@/utils/speech';

const VocabularyApp: React.FC = () => {
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const [showWordCard, setShowWordCard] = useState(true);
  const syncCheckTimeoutRef = useRef<number | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  
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
    speakingRef,
    getCurrentText
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

  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex = (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) % vocabularyService.sheetOptions.length;
  const nextSheetName = vocabularyService.sheetOptions[nextSheetIndex];

  useEffect(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (speakingRef.current && !isPaused && !isMuted) {
        keepSpeechAlive();
      }
    }, 500);
    
    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
    };
  }, [speakingRef, isPaused, isMuted]);

  useEffect(() => {
    const checkSyncAndFix = () => {
      if (!currentWord || isPaused || isMuted) return;
      
      const currentTextBeingSpoken = getCurrentText();
      const isInSync = checkSoundDisplaySync(currentWord.word, currentTextBeingSpoken);
      
      if (!isInSync && speakingRef.current && !isChangingWordRef.current) {
        console.log("Detected sound/display mismatch. Fixing synchronization...");
        stopSpeaking();
        
        setTimeout(() => {
          if (currentWord && !isPaused && !isMuted) {
            console.log("Re-speaking current word to maintain sync:", currentWord.word);
            speakCurrentWord(true);
          }
        }, 300);
      }
      
      if (syncCheckTimeoutRef.current) {
        clearTimeout(syncCheckTimeoutRef.current);
      }
      
      syncCheckTimeoutRef.current = window.setTimeout(checkSyncAndFix, 3000);
    };
    
    syncCheckTimeoutRef.current = window.setTimeout(checkSyncAndFix, 1000);
    
    return () => {
      if (syncCheckTimeoutRef.current) {
        clearTimeout(syncCheckTimeoutRef.current);
        syncCheckTimeoutRef.current = null;
      }
    };
  }, [currentWord, isPaused, isMuted, getCurrentText, speakCurrentWord, speakingRef, isChangingWordRef]);

  useEffect(() => {
    isSpeakingRef.current = speakingRef.current;
  }, [speakingRef.current, isSpeakingRef]);

  const handleToggleMuteWithSpeaking = useCallback(() => {
    stopSpeaking();
    const wasMuted = isMuted;
    handleToggleMute();
    
    if (wasMuted && currentWord) {
      setTimeout(() => {
        resetLastSpokenWord();
        speakCurrentWord(true);
      }, 300);
    } else if (!wasMuted) {
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
      }, 500);
    }
  }, [isMuted, currentWord, handleChangeVoice, resetLastSpokenWord, speakCurrentWord]);
  
  const handleSwitchCategoryWithState = useCallback(() => {
    stopSpeaking();
    resetLastSpokenWord();
    setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
    handleSwitchCategory(isMuted, voiceRegion);
    
    setTimeout(() => {
      if (!isMuted && currentWord && !isPaused) {
        speakCurrentWord(true);
      }
    }, 800);
  }, [isMuted, voiceRegion, isPaused, currentWord, handleSwitchCategory, resetLastSpokenWord, speakCurrentWord]);

  const handleNextWordClick = useCallback(() => {
    stopSpeaking();
    resetLastSpokenWord();
    handleManualNext();
    
    setTimeout(() => {
      if (!isMuted && !isPaused) {
        speakCurrentWord(true);
      }
    }, 600);
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
