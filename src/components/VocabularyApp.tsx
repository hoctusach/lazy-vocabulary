
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import VocabularyCard from './VocabularyCard';
import FileUpload from './FileUpload';
import NotificationManager from './NotificationManager';
import { vocabularyService, VocabularyWord } from '@/services/vocabularyService';
import { notificationService } from '@/services/notificationService';
import { ArrowRight } from 'lucide-react';

// Background colors similar to the original app
const backgroundColors = [
  "#f2f2f2", "#e6f7ff", "#fff3e6", "#f9e6f6", "#f0f8ff",
  "#faebd7", "#ffefd5", "#e6e6fa", "#dcdcdc", "#fdf5e6",
  "#ffe4e1", "#fff0f5", "#f5fffa", "#f0fff0", "#f5f5dc",
  "#faf0e6", "#fffacd", "#e0ffff", "#e0f7fa", "#fce4ec"
];

const VocabularyApp: React.FC = () => {
  const [hasData, setHasData] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [backgroundColorIndex, setBackgroundColorIndex] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  const currentBackgroundColor = backgroundColors[backgroundColorIndex % backgroundColors.length];
  const currentSheetName = vocabularyService.getCurrentSheetName();
  const nextSheetIndex = (vocabularyService.sheetOptions.indexOf(currentSheetName) + 1) % vocabularyService.sheetOptions.length;
  const nextSheetName = vocabularyService.sheetOptions[nextSheetIndex];
  
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  const speakText = useCallback((text: string) => {
    if (isMuted || !text) return;
    
    try {
      // Create speech synthesis utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice based on region preference
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(voice => voice.lang.includes('en'));
      const regionVoices = englishVoices.filter(voice => 
        voiceRegion === 'US' 
          ? voice.lang.includes('US') 
          : voice.lang.includes('GB') || voice.lang.includes('UK')
      );
      
      if (regionVoices.length > 0) {
        utterance.voice = regionVoices[0];
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
      
      // Set speech rate and pitch
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      // Speak the text
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
      
      return new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
      return Promise.resolve();
    }
  }, [isMuted, voiceRegion]);
  
  const displayNextWord = useCallback(async () => {
    clearTimer();
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    
    if (isPaused) {
      return;
    }
    
    const nextWord = vocabularyService.getNextWord();
    
    if (nextWord) {
      setCurrentWord(nextWord);
      setBackgroundColorIndex(prev => prev + 1);
      
      // Schedule notification if enabled
      if (notificationsEnabled) {
        await notificationService.scheduleVocabularyNotification(
          nextWord.word, 
          nextWord.meaning
        );
      }
      
      // Speak the word if not muted
      if (!isMuted) {
        const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
        await speakText(fullText);
      }
      
      // Schedule next word after delay
      timerRef.current = window.setTimeout(displayNextWord, 10000);
    } else {
      toast({
        title: "No vocabulary data",
        description: "Please upload an Excel file with vocabulary data.",
      });
    }
  }, [isPaused, notificationsEnabled, isMuted, speakText, clearTimer, toast]);
  
  useEffect(() => {
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      // Load voices (needed for Chrome)
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    
    // Check if we have data
    const hasExistingData = vocabularyService.hasData();
    setHasData(hasExistingData);
    
    // Load current word if we have data
    if (hasExistingData) {
      const word = vocabularyService.getCurrentWord() || vocabularyService.getNextWord();
      setCurrentWord(word);
      
      // Start displaying words if we're not paused
      if (!isPaused) {
        timerRef.current = window.setTimeout(displayNextWord, 2000);
      }
    }
    
    return () => {
      clearTimer();
      window.speechSynthesis.cancel();
    };
  }, [displayNextWord, isPaused, clearTimer]);
  
  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
    window.speechSynthesis.cancel();
    
    if (currentWord && !isMuted && !isPaused) {
      // If we're unmuting and not paused, speak the current word
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      speakText(fullText);
    }
  };
  
  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
    window.speechSynthesis.cancel();
    
    if (isPaused) {
      // If we're resuming, display the next word
      displayNextWord();
    } else {
      // If we're pausing, clear the timer
      clearTimer();
    }
  };
  
  const handleChangeVoice = () => {
    setVoiceRegion(prev => prev === 'US' ? 'UK' : 'US');
    window.speechSynthesis.cancel();
    
    if (currentWord && !isMuted && !isPaused) {
      // If we're changing voice and not muted or paused, speak the current word
      const fullText = `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`;
      speakText(fullText);
    }
  };
  
  const handleSwitchCategory = () => {
    window.speechSynthesis.cancel();
    clearTimer();
    
    const newSheetName = vocabularyService.nextSheet();
    const nextWord = vocabularyService.getNextWord();
    
    if (nextWord) {
      setCurrentWord(nextWord);
      setBackgroundColorIndex(prev => prev + 1);
      
      toast({
        title: "Category Changed",
        description: `Switched to "${newSheetName}"`,
      });
      
      if (!isMuted && !isPaused) {
        // If we're not muted or paused, speak the new word
        const fullText = `${nextWord.word}. ${nextWord.meaning}. ${nextWord.example}`;
        speakText(fullText);
      }
      
      if (!isPaused) {
        // If we're not paused, schedule the next word
        timerRef.current = window.setTimeout(displayNextWord, 10000);
      }
    }
  };
  
  const handleFileUploaded = () => {
    setHasData(true);
    const word = vocabularyService.getNextWord();
    setCurrentWord(word);
    
    if (!isPaused) {
      clearTimer();
      timerRef.current = window.setTimeout(displayNextWord, 1000);
    }
  };
  
  const handleNotificationsEnabled = () => {
    setNotificationsEnabled(true);
    toast({
      title: "Notifications Enabled",
      description: "You will now receive vocabulary notifications even when your browser is minimized.",
    });
  };
  
  const handleManualNext = () => {
    clearTimer();
    displayNextWord();
  };
  
  return (
    <div className="flex flex-col gap-6 w-full max-w-xl mx-auto p-4">
      {!hasData ? (
        <>
          <h1 className="text-3xl font-bold text-center">Lazy Vocabulary</h1>
          <p className="text-center text-muted-foreground">
            Upload your Excel file to get started with vocabulary learning
          </p>
          <FileUpload onFileUploaded={handleFileUploaded} />
        </>
      ) : (
        <>
          {currentWord ? (
            <VocabularyCard 
              word={currentWord.word}
              meaning={currentWord.meaning}
              example={currentWord.example}
              backgroundColor={currentBackgroundColor}
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
          ) : (
            <div className="text-center p-6 bg-gray-100 rounded-lg">
              <p className="text-lg text-muted-foreground">No vocabulary data available</p>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setHasData(false)}
              className="flex-1 mr-2"
            >
              Upload New File
            </Button>
            
            <Button 
              onClick={handleManualNext}
              className="flex-1 ml-2"
            >
              Next Word <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </>
      )}
      
      <NotificationManager onNotificationsEnabled={handleNotificationsEnabled} />
    </div>
  );
};

export default VocabularyApp;
