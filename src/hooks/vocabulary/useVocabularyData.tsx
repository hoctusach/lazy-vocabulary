
import { useState, useCallback, useEffect, useRef } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';

export const useVocabularyData = () => {
  const [hasData, setHasData] = useState(() => vocabularyService.hasData());
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const initialLoadDoneRef = useRef(false);
  const lastManualActionTimeRef = useRef<number>(Date.now());
  const currentWordRef = useRef<VocabularyWord | null>(null);

  // Keep currentWordRef updated
  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);

  // Convert this to return a Promise for proper error handling
  const handleFileUploaded = useCallback(() => {
    console.log("File uploaded callback triggered");
    setHasData(true);
    lastManualActionTimeRef.current = Date.now();
    stopSpeaking();
    initialLoadDoneRef.current = true;
    
    // Force a refresh of the current word
    const word = vocabularyService.getNextWord();
    console.log("New word after file upload:", word);
    setCurrentWord(word);
    
    // Return resolved promise to allow proper chaining
    return Promise.resolve();
  }, []);

  return {
    hasData,
    setHasData,
    currentWord,
    setCurrentWord,
    handleFileUploaded,
    lastManualActionTimeRef,
    currentWordRef,
    initialLoadDoneRef
  };
};
