
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { speechRecoveryController } from '@/utils/speech/recoveryController';

export const useSimpleVocabularyController = () => {
  console.log('[SIMPLE-VOCAB-CONTROLLER] === Initializing ===');
  
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  
  // Refs to track state and prevent race conditions
  const speechInProgressRef = useRef(false);
  const currentWordIdRef = useRef<string | null>(null);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // Clear any pending timeouts
  const clearTimeouts = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  // Stop speech and reset state
  const stopSpeech = useCallback(() => {
    console.log('[SIMPLE-VOCAB-CONTROLLER] Stopping speech');
    directSpeechService.stop();
    setIsSpeaking(false);
    speechInProgressRef.current = false;
    clearTimeouts();
  }, [clearTimeouts]);

  // Get current word from service
  const refreshCurrentWord = useCallback(() => {
    const word = vocabularyService.getCurrentWord();
    console.log('[SIMPLE-VOCAB-CONTROLLER] Refreshed current word:', word?.word || 'none');
    setCurrentWord(word);
    return word;
  }, []);

  // Play current word function
  const playCurrentWord = useCallback(async () => {
    const word = currentWord || refreshCurrentWord();
    
    if (!word || isMuted || isPaused || speechInProgressRef.current) {
      console.log('[SIMPLE-VOCAB-CONTROLLER] Cannot play:', {
        hasWord: !!word,
        isMuted,
        isPaused,
        speechInProgress: speechInProgressRef.current
      });
      return;
    }

    // Prevent duplicate speech for same word
    if (currentWordIdRef.current === word.word) {
      console.log('[SIMPLE-VOCAB-CONTROLLER] Same word, skipping');
      return;
    }

    console.log(`[SIMPLE-VOCAB-CONTROLLER] Starting speech for: ${word.word}`);
    speechInProgressRef.current = true;
    currentWordIdRef.current = word.word;
    setIsSpeaking(true);

    try {
      const speechText = `${word.word}. ${word.meaning}. ${word.example}`;
      
      const success = await directSpeechService.speak(speechText, {
        voiceRegion,
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        onStart: () => {
          console.log(`[SIMPLE-VOCAB-CONTROLLER] Speech started: ${word.word}`);
          speechRecoveryController.handleSpeechSuccess();
        },
        onEnd: () => {
          console.log(`[SIMPLE-VOCAB-CONTROLLER] Speech completed: ${word.word}`);
          setIsSpeaking(false);
          speechInProgressRef.current = false;
          
          // Auto-advance after successful speech
          if (!isPaused && !isMuted) {
            autoAdvanceTimeoutRef.current = window.setTimeout(() => {
              goToNext();
            }, 1000);
          }
        },
        onError: (error) => {
          console.error(`[SIMPLE-VOCAB-CONTROLLER] Speech error:`, error);
          setIsSpeaking(false);
          speechInProgressRef.current = false;
          
          // Handle error with recovery controller
          const shouldRetry = speechRecoveryController.handleSpeechError(error);
          
          if (!shouldRetry || speechRecoveryController.isInRecoveryMode()) {
            console.log('[SIMPLE-VOCAB-CONTROLLER] Advancing due to error/recovery');
            if (!isPaused && !isMuted) {
              autoAdvanceTimeoutRef.current = window.setTimeout(() => {
                goToNext();
              }, 2000);
            }
          }
        }
      });

      if (!success) {
        console.warn('[SIMPLE-VOCAB-CONTROLLER] Speech failed to start');
        setIsSpeaking(false);
        speechInProgressRef.current = false;
      }
    } catch (error) {
      console.error('[SIMPLE-VOCAB-CONTROLLER] Exception in playCurrentWord:', error);
      setIsSpeaking(false);
      speechInProgressRef.current = false;
    }
  }, [currentWord, voiceRegion, isMuted, isPaused, refreshCurrentWord]);

  // Navigation function
  const goToNext = useCallback(() => {
    console.log('[SIMPLE-VOCAB-CONTROLLER] Going to next word');
    stopSpeech();
    currentWordIdRef.current = null;
    
    // Get next word from service
    const nextWord = vocabularyService.getNextWord();
    console.log('[SIMPLE-VOCAB-CONTROLLER] Next word from service:', nextWord?.word || 'none');
    setCurrentWord(nextWord);
  }, [stopSpeech]);

  // Control functions
  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    console.log('[SIMPLE-VOCAB-CONTROLLER] Toggle pause:', newPausedState);
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      stopSpeech();
    } else {
      // Reset to allow word to play when unpaused
      currentWordIdRef.current = null;
    }
  }, [isPaused, stopSpeech]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    console.log('[SIMPLE-VOCAB-CONTROLLER] Toggle mute:', newMutedState);
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      stopSpeech();
    } else {
      // Reset to allow word to play when unmuted
      currentWordIdRef.current = null;
    }
  }, [isMuted, stopSpeech]);

  const toggleVoice = useCallback(() => {
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    console.log('[SIMPLE-VOCAB-CONTROLLER] Toggle voice to:', newRegion);
    setVoiceRegion(newRegion);
  }, [voiceRegion]);

  // Initialize and listen for vocabulary changes
  useEffect(() => {
    console.log('[SIMPLE-VOCAB-CONTROLLER] Setting up vocabulary listener');
    
    const handleVocabularyChange = () => {
      console.log('[SIMPLE-VOCAB-CONTROLLER] Vocabulary changed');
      refreshCurrentWord();
    };

    // Add listener
    vocabularyService.addVocabularyChangeListener(handleVocabularyChange);
    
    // Initialize current word
    if (!isInitializedRef.current) {
      refreshCurrentWord();
      isInitializedRef.current = true;
    }

    return () => {
      vocabularyService.removeVocabularyChangeListener(handleVocabularyChange);
    };
  }, [refreshCurrentWord]);

  // Effect to play word when conditions are right
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechInProgressRef.current) {
      console.log('[SIMPLE-VOCAB-CONTROLLER] Scheduling play for:', currentWord.word);
      
      // Small delay to ensure state is stable
      const timeoutId = setTimeout(() => {
        if (!speechInProgressRef.current) {
          playCurrentWord();
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentWord?.word, isPaused, isMuted, playCurrentWord]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[SIMPLE-VOCAB-CONTROLLER] Cleaning up');
      stopSpeech();
    };
  }, [stopSpeech]);

  return {
    currentWord,
    isSpeaking,
    isPaused,
    isMuted,
    voiceRegion,
    goToNext,
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord
  };
};
