
import { useState, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Core vocabulary state management
 */
export const useVocabularyState = () => {
  // Core state - single source of truth
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasData, setHasData] = useState(false);

  // Refs for immediate state tracking - using MutableRefObject for refs that need to be assigned
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const autoPlayTimeoutRef = useRef<number | null>(null);

  // Update current word reference
  const currentWord = wordList[currentIndex] || null;
  currentWordRef.current = currentWord;

  console.log('[VOCAB-STATE] Current state:', {
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    wordListLength: wordList.length,
    hasData,
    currentWord: wordList[currentIndex]?.word
  });

  return {
    // State
    wordList,
    setWordList,
    currentIndex,
    setCurrentIndex,
    isPaused,
    setIsPaused,
    isMuted,
    setIsMuted,
    voiceRegion,
    setVoiceRegion,
    isSpeaking,
    setIsSpeaking,
    hasData,
    setHasData,
    currentWord,
    
    // Refs
    pausedRef,
    mutedRef,
    currentWordRef,
    autoPlayTimeoutRef,
    
    // Utils
    wordCount: wordList.length
  };
};
