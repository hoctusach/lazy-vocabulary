import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';

interface UseWordChangeEffectDeps {
  currentWord: VocabularyWord | null;
  isChangingWordRef: React.MutableRefObject<boolean>;
  wordChangeInProgressRef: React.MutableRefObject<boolean>;
  currentWordRef: React.MutableRefObject<VocabularyWord | null>;
  setWordFullySpoken: (v: boolean) => void;
  lastWordIdRef: React.MutableRefObject<string | null>;
  clearAllTimeouts: () => void;
  isPaused: boolean;
  isMuted: boolean;
  initialSpeakTimeoutRef: React.MutableRefObject<number | null>;
  wordProcessingTimeoutRef: React.MutableRefObject<number | null>;
  speakCurrentWord: (forceSpeak?: boolean) => Promise<void>;
}

export function useWordChangeEffect({
  currentWord,
  isChangingWordRef,
  wordChangeInProgressRef,
  currentWordRef,
  setWordFullySpoken,
  lastWordIdRef,
  clearAllTimeouts,
  isPaused,
  isMuted,
  initialSpeakTimeoutRef,
  wordProcessingTimeoutRef,
  speakCurrentWord
}: UseWordChangeEffectDeps) {
  useEffect(() => {
    if (isChangingWordRef.current) {
      console.log("Word changing flag active, delaying word update");
      return;
    }
    
    if (wordChangeInProgressRef.current) {
      console.log("Word change in progress, skipping");
      return;
    }
    
    currentWordRef.current = currentWord;
    
    if (currentWord && lastWordIdRef.current !== currentWord.word) {
      wordChangeInProgressRef.current = true;
      
      console.log("Word changed in speech sync:", currentWord.word);
      setWordFullySpoken(false);
      lastWordIdRef.current = currentWord.word;
      
      stopSpeaking();
      clearAllTimeouts();
      
      if (initialSpeakTimeoutRef.current) {
        clearTimeout(initialSpeakTimeoutRef.current);
      }
      
      try {
        localStorage.setItem('currentDisplayedWord', currentWord.word);
      } catch (error) {
        console.error('Error storing current displayed word:', error);
      }
      
      initialSpeakTimeoutRef.current = window.setTimeout(() => {
        initialSpeakTimeoutRef.current = null;
        
        if (wordProcessingTimeoutRef.current) {
          clearTimeout(wordProcessingTimeoutRef.current);
        }
        
        wordProcessingTimeoutRef.current = window.setTimeout(() => {
          wordProcessingTimeoutRef.current = null;
          wordChangeInProgressRef.current = false;
          
          if (!isPaused && !isMuted && !isChangingWordRef.current) {
            console.log("Speaking new word after change:", currentWord.word);
            speakCurrentWord(true);
          }
        }, 400);
        
      }, 800);
    }
  // run when currentWord changes, keep deps in sync
  }, [currentWord, isChangingWordRef, clearAllTimeouts, isPaused, isMuted, speakCurrentWord,
      currentWordRef, setWordFullySpoken, lastWordIdRef, wordChangeInProgressRef,
      initialSpeakTimeoutRef, wordProcessingTimeoutRef]);
}
