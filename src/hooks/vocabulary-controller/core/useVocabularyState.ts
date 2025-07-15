
import { useState, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceContext } from '@/hooks/useVoiceContext';
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

/**
 * Core vocabulary state management
 */
export const useVocabularyState = () => {
  // Core vocabulary state - initialize with safe defaults
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasData, setHasData] = useState(false);
  
  // Control state with persistence
  const getInitialFlag = (key: 'isPaused' | 'isMuted'): boolean => {
    try {
      const stored = localStorage.getItem(BUTTON_STATES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed[key] === true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const [isPaused, setIsPaused] = useState<boolean>(() => getInitialFlag('isPaused'));
  const [isMuted, setIsMuted] = useState<boolean>(() => getInitialFlag('isMuted'));
  const {
    allVoices,
    selectedVoiceNames,
    setSelectedVoiceName
  } = useVoiceContext();

  // Derived state - calculate currentWord safely
  const currentWord = wordList[currentIndex] ?? null;

  // Prevent race conditions and manage transitions
  const isTransitioningRef = useRef(false);
  const lastWordChangeRef = useRef(Date.now());

  // Persist control flags when they change
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BUTTON_STATES_KEY);
      const states = stored ? JSON.parse(stored) : {};
      states.isPaused = isPaused;
      states.isMuted = isMuted;
      localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify(states));
    } catch {
      // ignore
    }
  }, [isPaused, isMuted]);

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
    selectedVoiceNames,
    setSelectedVoiceName,
    allVoices,
    currentWord,
    
    // Refs
    isTransitioningRef,
    lastWordChangeRef
  };
};
