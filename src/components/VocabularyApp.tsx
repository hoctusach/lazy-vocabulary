import React, { useState, useEffect, useCallback, useRef } from 'react';
import VocabularyCard from './VocabularyCard';
import WelcomeScreen from './WelcomeScreen';
import FileUpload from './FileUpload';
import VocabularyLayout from './VocabularyLayout';
import { useVocabularyManager } from '@/hooks/useVocabularyManager';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useWordSpeechSync } from '@/hooks/useWordSpeechSync';
import { vocabularyService } from '@/services/vocabularyService';
import { 
  stopSpeaking, 
  keepSpeechAlive, 
  validateCurrentSpeech, 
  resetSpeechEngine,
  ensureSpeechEngineReady,
  extractMainWord,
  forceResyncIfNeeded
} from '@/utils/speech';

const VocabularyApp: React.FC = () => {
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const [showWordCard, setShowWordCard] = useState(true);
  const syncCheckTimeoutRef = useRef<number | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const resyncTimeoutRef = useRef<number | null>(null);
  const resetIntervalRef = useRef<number | null>(null);
  const initialRenderRef = useRef(true);
  const stateChangeDebounceRef = useRef<number | null>(null);
  
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

  const clearAllTimeouts = useCallback(() => {
    if (syncCheckTimeoutRef.current) {
      clearTimeout(syncCheckTimeoutRef.current);
      syncCheckTimeoutRef.current = null;
    }
    if (resyncTimeoutRef.current) {
      clearTimeout(resyncTimeoutRef.current);
      resyncTimeoutRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (resetIntervalRef.current) {
      clearInterval(resetIntervalRef.current);
      resetIntervalRef.current = null;
    }
    if (stateChangeDebounceRef.current) {
      clearTimeout(stateChangeDebounceRef.current);
      stateChangeDebounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initialRenderRef.current && currentWord && !isPaused && !isMuted && isVoicesLoaded) {
      initialRenderRef.current = false;
      
      if (currentWord.word) {
        try {
          localStorage.setItem('currentDisplayedWord', currentWord.word);
        } catch (error) {
          console.error('Error storing initial word:', error);
        }
      }
      
      const timer = setTimeout(() => {
        console.log("Initial render, force speaking current word:", currentWord.word);
        resetLastSpokenWord();
        stopSpeaking();
        
        setTimeout(() => {
          speakCurrentWord(true);
        }, 1500);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentWord, isPaused, isMuted, isVoicesLoaded, resetLastSpokenWord, speakCurrentWord]);

  useEffect(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    
    keepAliveIntervalRef.current = window.setInterval(() => {
      if (speakingRef.current && !isPaused && !isMuted) {
        keepSpeechAlive();
      }
    }, 10);
    
    if (resetIntervalRef.current) {
      clearInterval(resetIntervalRef.current);
    }
    
    resetIntervalRef.current = window.setInterval(() => {
      if (!speakingRef.current && !isPaused) {
        ensureSpeechEngineReady();
      }
    }, 60000);
    
    return () => {
      clearAllTimeouts();
    };
  }, [speakingRef, isPaused, isMuted, clearAllTimeouts]);

  useEffect(() => {
    const checkSyncAndFix = () => {
      if (!currentWord || isPaused || isMuted) {
        if (syncCheckTimeoutRef.current) {
          clearTimeout(syncCheckTimeoutRef.current);
          syncCheckTimeoutRef.current = null;
        }
        return;
      }
      
      const currentTextBeingSpoken = getCurrentText();
      
      if (currentTextBeingSpoken && currentWord && speakingRef.current) {
        const mainWord = extractMainWord(currentWord.word);
        const spokenText = currentTextBeingSpoken.toLowerCase();
        
        console.log(`Sync check: Word="${mainWord}", Speaking=${speakingRef.current}, Changing=${isChangingWordRef.current}`);
        
        forceResyncIfNeeded(currentWord.word, currentTextBeingSpoken, () => {
          console.log("Resync needed, restarting speech for word:", currentWord.word);
          if (!resyncTimeoutRef.current) {
            resyncTimeoutRef.current = window.setTimeout(() => {
              resyncTimeoutRef.current = null;
              if (currentWord && !isPaused && !isMuted) {
                resetLastSpokenWord();
                speakCurrentWord(true);
              }
            }, 600);
          }
        });
      }
      
      if (syncCheckTimeoutRef.current) {
        clearTimeout(syncCheckTimeoutRef.current);
      }
      syncCheckTimeoutRef.current = window.setTimeout(checkSyncAndFix, 1000);
    };
    
    if (syncCheckTimeoutRef.current) {
      clearTimeout(syncCheckTimeoutRef.current);
    }
    syncCheckTimeoutRef.current = window.setTimeout(checkSyncAndFix, 2000);
    
    return () => {
      if (syncCheckTimeoutRef.current) {
        clearTimeout(syncCheckTimeoutRef.current);
        syncCheckTimeoutRef.current = null;
      }
    };
  }, [currentWord, isPaused, isMuted, getCurrentText, speakCurrentWord, speakingRef, isChangingWordRef, resetLastSpokenWord]);

  useEffect(() => {
    isSpeakingRef.current = speakingRef.current;
  }, [speakingRef.current, isSpeakingRef]);

  const handleToggleMuteWithSpeaking = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    const wasMuted = isMuted;
    handleToggleMute();
    
    if (wasMuted && currentWord) {
      setTimeout(() => {
        resetLastSpokenWord();
        speakCurrentWord(true);
      }, 800);
    } else if (!wasMuted) {
      resetLastSpokenWord();
    }
  }, [isMuted, currentWord, handleToggleMute, resetLastSpokenWord, speakCurrentWord, clearAllTimeouts]);
  
  const handleChangeVoiceWithSpeaking = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    resetLastSpokenWord();
    handleChangeVoice();
    
    if (!isMuted && currentWord) {
      setTimeout(() => {
        speakCurrentWord(true);
      }, 1200);
    }
  }, [isMuted, currentWord, handleChangeVoice, resetLastSpokenWord, speakCurrentWord, clearAllTimeouts]);
  
  const handleSwitchCategoryWithState = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    resetLastSpokenWord();
    
    setBackgroundColorIndex((prevIndex) => (prevIndex + 1) % backgroundColors.length);
    handleSwitchCategory(isMuted, voiceRegion);
    
    setTimeout(() => {
      if (!isMuted && !isPaused) {
        speakCurrentWord(true);
      }
    }, 1500);
  }, [isMuted, voiceRegion, isPaused, handleSwitchCategory, resetLastSpokenWord, speakCurrentWord, clearAllTimeouts]);

  const handleNextWordClick = useCallback(() => {
    clearAllTimeouts();
    stopSpeaking();
    resetLastSpokenWord();
    
    handleManualNext();
    
    setTimeout(() => {
      if (!isMuted && !isPaused) {
        speakCurrentWord(true);
      }
    }, 1200);
  }, [isMuted, isPaused, handleManualNext, resetLastSpokenWord, speakCurrentWord, clearAllTimeouts]);

  const toggleView = useCallback(() => {
    setShowWordCard(prev => !prev);
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
      stopSpeaking();
    };
  }, [clearAllTimeouts]);

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
