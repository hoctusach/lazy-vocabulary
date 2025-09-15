
import { useState, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceContext } from '@/hooks/useVoiceContext';
import { getPreferences, savePreferences } from '@/lib/db/preferences';

/**
 * Core vocabulary state management
 */
export const useVocabularyState = () => {
  // Core vocabulary state - initialize with safe defaults
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasData, setHasData] = useState(false);
  
  // Control state with persistence
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    getPreferences()
      .then(p => {
        setIsPaused(!p.is_playing);
        setIsMuted(!!p.is_muted);
      })
      .catch(() => {});
  }, []);
  const {
    allVoices,
    selectedVoiceName,
    setSelectedVoiceName
  } = useVoiceContext();

  // Derived state - calculate currentWord safely
  const currentWord = wordList[currentIndex] ?? null;

  // Prevent race conditions and manage transitions
  const isTransitioningRef = useRef(false);
  const lastWordChangeRef = useRef(Date.now());

  // Persist control flags when they change
  useEffect(() => {
    savePreferences({ is_playing: !isPaused, is_muted: isMuted }).catch(() => {});
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
    selectedVoiceName,
    setSelectedVoiceName,
    allVoices,
    currentWord,
    
    // Refs
    isTransitioningRef,
    lastWordChangeRef
  };
};
