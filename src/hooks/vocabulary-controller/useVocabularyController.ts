
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { vocabularyService } from '@/services/vocabularyService';
import { debug } from '@/utils/logger';

export const useVocabularyController = (wordList: VocabularyWord[]) => {
  debug('[VOCAB-CONTROLLER] === State Debug ===');
  
  // Get current word directly from vocabulary service
  const currentWord = vocabularyService.getCurrentWord();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  
  // Refs to prevent unnecessary effects and manage state
  const lastWordRef = useRef<string | null>(null);
  const speechInProgressRef = useRef(false);
  const autoAdvanceTimeoutRef = useRef<number | null>(null);

  debug('[VOCAB-CONTROLLER] Current state:', {
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    wordListLength: wordList.length,
    currentWord: currentWord?.word || 'none',
    lastWord: lastWordRef.current,
    speechInProgress: speechInProgressRef.current
  });

  // Clear any pending timeouts
  const clearTimeouts = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  // Stop speech and reset state
  const stopSpeech = useCallback(() => {
    debug('[VOCAB-CONTROLLER] Stopping speech');
    directSpeechService.stop();
    setIsSpeaking(false);
    speechInProgressRef.current = false;
    clearTimeouts();
  }, [clearTimeouts]);

  // Play current word function
  const playCurrentWord = useCallback(async () => {
    // Prevent multiple simultaneous speech attempts
    if (speechInProgressRef.current || !currentWord || isMuted || isPaused) {
      debug('[VOCAB-CONTROLLER] Skipping speech:', {
        speechInProgress: speechInProgressRef.current,
        hasWord: !!currentWord,
        isMuted,
        isPaused
      });
      return;
    }

    // Don't replay the same word
    if (lastWordRef.current === currentWord.word) {
      debug('[VOCAB-CONTROLLER] Same word, skipping replay');
      return;
    }

    debug(`[VOCAB-CONTROLLER] Starting speech for: ${currentWord.word}`);
    speechInProgressRef.current = true;
    lastWordRef.current = currentWord.word;
    setIsSpeaking(true);

    try {
      const success = await directSpeechService.speak(
        `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`,
        {
          voiceRegion: voiceRegion,
          word: currentWord.word,
          meaning: currentWord.meaning,
          example: currentWord.example,
          onStart: () => {
            debug(`[VOCAB-CONTROLLER] Speech started for: ${currentWord.word}`);
          },
          onEnd: () => {
            debug(`[VOCAB-CONTROLLER] Speech ended for: ${currentWord.word}`);
            setIsSpeaking(false);
            speechInProgressRef.current = false;
            
            // Auto-advance if not paused or muted
            if (!isPaused && !isMuted) {
              autoAdvanceTimeoutRef.current = window.setTimeout(() => {
                goToNext();
              }, 1500);
            }
          },
          onError: (error) => {
            console.error(`[VOCAB-CONTROLLER] Speech error:`, error);
            setIsSpeaking(false);
            speechInProgressRef.current = false;
            
            // Still advance on error to prevent getting stuck
            if (!isPaused && !isMuted) {
              autoAdvanceTimeoutRef.current = window.setTimeout(() => {
                goToNext();
              }, 2000);
            }
          }
        }
      );

      if (!success) {
        debug('[VOCAB-CONTROLLER] Speech failed to start');
        setIsSpeaking(false);
        speechInProgressRef.current = false;
      }
    } catch (error) {
      console.error('[VOCAB-CONTROLLER] Exception in playCurrentWord:', error);
      setIsSpeaking(false);
      speechInProgressRef.current = false;
    }
  }, [currentWord, voiceRegion, isMuted, isPaused]);

  // Navigation functions
  const goToNext = useCallback(() => {
    debug('[VOCAB-CONTROLLER] Going to next word');
    stopSpeech();
    lastWordRef.current = null; // Reset to allow new word to play
    vocabularyService.getNextWord();
  }, [stopSpeech]);

  const togglePause = useCallback(() => {
    const newPausedState = !isPaused;
    debug('[VOCAB-CONTROLLER] Toggle pause:', newPausedState);
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      stopSpeech();
    } else {
      // Reset to allow word to play when unpaused
      lastWordRef.current = null;
    }
  }, [isPaused, stopSpeech]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    debug('[VOCAB-CONTROLLER] Toggle mute:', newMutedState);
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      stopSpeech();
    } else {
      // Reset to allow word to play when unmuted
      lastWordRef.current = null;
    }
  }, [isMuted, stopSpeech]);

  const toggleVoice = useCallback(() => {
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    debug('[VOCAB-CONTROLLER] Toggle voice to:', newRegion);
    setVoiceRegion(newRegion);
  }, [voiceRegion]);

  // Effect to play word when it changes (simplified and stable)
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted) {
      debug('[VOCAB-CONTROLLER] Word effect triggered for:', currentWord.word);
      
      // Small delay to ensure state is stable
      const timeoutId = setTimeout(() => {
        playCurrentWord();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentWord?.word, isPaused, isMuted, playCurrentWord]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debug('[VOCAB-CONTROLLER] Cleaning up');
      stopSpeech();
    };
  }, [stopSpeech]);

  return {
    currentWord,
    currentIndex: 0,
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    goToNext,
    goToPrevious: goToNext, // For now, just go to next
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    wordCount: wordList.length
  };
};
