
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { speechRecoveryController } from '@/utils/speech/recoveryController';
import { debug } from '@/utils/logger';

export const useSimpleVocabularyController = () => {
  debug('[SIMPLE-VOCAB-CONTROLLER] === Initializing ===');
  
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK' | 'AU'>('US');
  
  // Refs to track state and prevent race conditions
  const speechInProgressRef = useRef(false);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const lastNavigationTimeRef = useRef(0);

  // Clear any pending timeouts
  const clearTimeouts = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  // Stop speech and reset state
  const stopSpeech = useCallback(() => {
    debug('[SIMPLE-VOCAB-CONTROLLER] Stopping speech');
    directSpeechService.stop();
    setIsSpeaking(false);
    speechInProgressRef.current = false;
    clearTimeouts();
  }, [clearTimeouts]);

  // Get current word from service
  const refreshCurrentWord = useCallback(() => {
    const word = vocabularyService.getCurrentWord();
    debug('[SIMPLE-VOCAB-CONTROLLER] Refreshed current word:', word?.word || 'none');
    setCurrentWord(word);
    return word;
  }, []);

  // Play current word function
  const playCurrentWord = useCallback(async () => {
    const word = currentWord || refreshCurrentWord();
    
    if (!word || isMuted || isPaused || speechInProgressRef.current) {
      debug('[SIMPLE-VOCAB-CONTROLLER] Cannot play:', {
        hasWord: !!word,
        isMuted,
        isPaused,
        speechInProgress: speechInProgressRef.current
      });
      return;
    }

    debug(`[SIMPLE-VOCAB-CONTROLLER] Starting speech for: ${word.word}`);
    speechInProgressRef.current = true;
    setIsSpeaking(true);

    try {
      const speechText = `${word.word}. ${word.meaning}. ${word.example}`;
      
      const success = await directSpeechService.speak(speechText, {
        voiceRegion,
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        onStart: () => {
          debug(`[SIMPLE-VOCAB-CONTROLLER] Speech started: ${word.word}`);
          speechRecoveryController.handleSpeechSuccess();
        },
        onEnd: () => {
          debug(`[SIMPLE-VOCAB-CONTROLLER] Speech completed: ${word.word}`);
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
            debug('[SIMPLE-VOCAB-CONTROLLER] Advancing due to error/recovery');
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

  // Navigation function - FIXED to prevent excessive processing
  const goToNext = useCallback(() => {
    const now = Date.now();
    
    // Prevent rapid navigation calls
    if (now - lastNavigationTimeRef.current < 200) {
      debug('[SIMPLE-VOCAB-CONTROLLER] Navigation throttled');
      return;
    }
    
    lastNavigationTimeRef.current = now;
    debug('[SIMPLE-VOCAB-CONTROLLER] Going to next word');
    
    stopSpeech();
    
    // Get next word from service - this should be efficient
    const nextWord = vocabularyService.getNextWord();
    debug('[SIMPLE-VOCAB-CONTROLLER] Next word from service:', nextWord?.word || 'none');
    setCurrentWord(nextWord);
  }, [stopSpeech]);

  // Control functions
  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    debug('[SIMPLE-VOCAB-CONTROLLER] Toggle pause:', newPausedState);
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      stopSpeech();
    }
  }, [isPaused, stopSpeech]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    debug('[SIMPLE-VOCAB-CONTROLLER] Toggle mute:', newMutedState);
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      stopSpeech();
    }
  }, [isMuted, stopSpeech]);

  const toggleVoice = useCallback(() => {
    const newRegion = voiceRegion === 'US' ? 'UK' : voiceRegion === 'UK' ? 'AU' : 'US';
    debug('[SIMPLE-VOCAB-CONTROLLER] Toggle voice to:', newRegion);
    setVoiceRegion(newRegion);
  }, [voiceRegion]);

  // Initialize and listen for vocabulary changes
  useEffect(() => {
    debug('[SIMPLE-VOCAB-CONTROLLER] Setting up vocabulary listener');
    
    const handleVocabularyChange = () => {
      debug('[SIMPLE-VOCAB-CONTROLLER] Vocabulary changed');
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

  // Effect to play word when conditions are right - SIMPLIFIED
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted && !speechInProgressRef.current) {
      debug('[SIMPLE-VOCAB-CONTROLLER] Scheduling play for:', currentWord.word);
      
      // Small delay to ensure state is stable
      const timeoutId = setTimeout(() => {
        if (!speechInProgressRef.current) {
          playCurrentWord();
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentWord?.word, isPaused, isMuted, playCurrentWord]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debug('[SIMPLE-VOCAB-CONTROLLER] Cleaning up');
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
