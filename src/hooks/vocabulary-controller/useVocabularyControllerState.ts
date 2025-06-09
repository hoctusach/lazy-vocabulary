
import { useState, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

/**
 * Manages core state for the vocabulary controller
 */
export const useVocabularyControllerState = (wordList: VocabularyWord[]) => {
  // Core state - single source of truth
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs for immediate state tracking
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const currentWordRef = useRef<VocabularyWord | null>(null);
  const autoPlayTimeoutRef = useRef<number | null>(null);

  // Update current word reference
  const currentWord = wordList[currentIndex] || null;
  currentWordRef.current = currentWord;

  console.log('[VOCAB-CONTROLLER-STATE] === State Debug ===');
  console.log('[VOCAB-CONTROLLER-STATE] Current state:', {
    currentIndex,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    wordListLength: wordList.length,
    currentWord: currentWord?.word
  });

  return {
    // State
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
    
    // Refs
    pausedRef,
    mutedRef,
    currentWordRef,
    autoPlayTimeoutRef,
    
    // Computed
    currentWord
  };
};
