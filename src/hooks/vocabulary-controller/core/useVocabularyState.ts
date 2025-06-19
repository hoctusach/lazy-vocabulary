
import { useState, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { getVoiceRegionFromStorage } from '@/utils/speech/core/speechSettings';

/**
 * Core vocabulary state management
 */
export const useVocabularyState = () => {
  // Core vocabulary state - initialize with safe defaults
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasData, setHasData] = useState(false);
  
  // Control state
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const initialRegion = getVoiceRegionFromStorage();
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK' | 'AU'>(initialRegion);

  // Derived state - calculate currentWord safely
  const currentWord = wordList[currentIndex] ?? null;

  // Prevent race conditions and manage transitions
  const isTransitioningRef = useRef(false);
  const lastWordChangeRef = useRef(Date.now());

  return {
    // State
    wordList,
    setWordList,
    currentIndex,
    setCurrentIndex,
    hasData,
    setHasData,
    isPaused,
    setIsPaused,
    isMuted,
    setIsMuted,
    voiceRegion,
    setVoiceRegion,
    currentWord,
    
    // Refs
    isTransitioningRef,
    lastWordChangeRef
  };
};
