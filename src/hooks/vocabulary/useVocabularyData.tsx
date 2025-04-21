import { useState, useCallback, useEffect, useRef } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import { stopSpeaking } from '@/utils/speech';

export const useVocabularyData = () => {
  const [hasData, setHasData] = useState(false);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const initialLoadDoneRef = useRef(false);
  const lastManualActionTimeRef = useRef<number>(Date.now());
  const currentWordRef = useRef<VocabularyWord | null>(null);

  // Force reload default vocabulary when component mounts
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      console.log("Forcing reload of default vocabulary data");
      vocabularyService.loadDefaultVocabulary();
      setTimeout(() => {
        setHasData(vocabularyService.hasData());
      }, 300);
    }
  }, []);

  // Keep currentWordRef updated
  useEffect(() => {
    currentWordRef.current = currentWord;
  }, [currentWord]);

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
