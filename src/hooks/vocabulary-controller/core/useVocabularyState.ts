
import { useState, useRef, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { useVoiceContext } from '@/hooks/useVoiceContext';
import {
  getLocalPreferences,
  readPreferencesFromStorage,
  saveLocalPreferences,
} from '@/lib/preferences/localPreferences';

/**
 * Core vocabulary state management
 */
export const useVocabularyState = () => {
  // Core vocabulary state - initialize with safe defaults
  const [wordList, setWordList] = useState<VocabularyWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasData, setHasData] = useState(false);
  
  // Control state with persistence
  const initialPrefsRef = useRef(readPreferencesFromStorage());
  const [isPaused, setIsPaused] = useState<boolean>(() => !initialPrefsRef.current.is_playing);
  const [isMuted, setIsMuted] = useState<boolean>(() => !!initialPrefsRef.current.is_muted);

  useEffect(() => {
    let isActive = true;
    getLocalPreferences()
      .then(p => {
        if (!isActive) return;
        setIsPaused(prev => (prev === !p.is_playing ? prev : !p.is_playing));
        setIsMuted(prev => (prev === !!p.is_muted ? prev : !!p.is_muted));
      })
      .catch(() => {});

    return () => {
      isActive = false;
    };
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
    saveLocalPreferences({ is_playing: !isPaused, is_muted: isMuted }).catch(
      () => {},
    );
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
