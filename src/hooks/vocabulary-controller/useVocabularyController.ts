
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { vocabularyService } from '@/services/vocabularyService';

export const useVocabularyController = (wordList: VocabularyWord[]) => {
  console.log('[VOCAB-CONTROLLER] === State Debug ===');
  
  // Get current word directly from vocabulary service instead of managing separate index
  const currentWord = vocabularyService.getCurrentWord();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const retryTimeoutRef = useRef<number | null>(null);
  const lastPlayedWordRef = useRef<string | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const playbackTimeoutRef = useRef<number | null>(null);
  const effectCleanupRef = useRef<(() => void) | null>(null);

  console.log('[VOCAB-CONTROLLER] Current state:', {
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    wordListLength: wordList.length,
    currentWord: currentWord?.word || 'none',
    lastPlayedWord: lastPlayedWordRef.current,
    isPlaying: isPlayingRef.current
  });

  const clearAllTimeouts = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (effectCleanupRef.current) {
      effectCleanupRef.current();
      effectCleanupRef.current = null;
    }
  }, []);

  const stopSpeechAndReset = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] Stopping speech and resetting state');
    directSpeechService.stop();
    setIsSpeaking(false);
    isPlayingRef.current = false;
    clearAllTimeouts();
  }, [clearAllTimeouts]);

  const goToNext = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToNext called');
    
    // Stop everything cleanly
    stopSpeechAndReset();
    
    // Use vocabulary service to get next word
    const nextWord = vocabularyService.getNextWord();
    console.log('[VOCAB-CONTROLLER] Got next word from service:', nextWord?.word || 'none');
    
    // Reset last played word reference to allow new word to play
    lastPlayedWordRef.current = null;
  }, [stopSpeechAndReset]);

  const goToPrevious = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToPrevious called');
    // For now, just go to next since we don't have a previous method
    goToNext();
  }, [goToNext]);

  const togglePause = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] togglePause called, current isPaused:', isPaused);
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      // Pausing - stop current speech
      stopSpeechAndReset();
    } else {
      // Unpausing - reset to allow replay
      lastPlayedWordRef.current = null;
    }
  }, [isPaused, stopSpeechAndReset]);

  const toggleMute = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleMute called, current isMuted:', isMuted);
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState) {
      // Muting - stop current speech
      stopSpeechAndReset();
    } else {
      // Unmuting - reset to allow replay
      lastPlayedWordRef.current = null;
    }
  }, [isMuted, stopSpeechAndReset]);

  const toggleVoice = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] toggleVoice called, current region:', voiceRegion);
    setVoiceRegion(prev => prev === 'US' ? 'UK' : 'US');
  }, [voiceRegion]);

  const playCurrentWord = useCallback(async () => {
    console.log('[VOCAB-CONTROLLER] playCurrentWord called - detailed state:', {
      hasWord: !!currentWord,
      wordText: currentWord?.word,
      isMuted,
      isPaused,
      isSpeaking,
      isPlaying: isPlayingRef.current,
      lastPlayedWord: lastPlayedWordRef.current,
      voiceRegion
    });
    
    if (!currentWord || isMuted || isPaused) {
      console.log('[VOCAB-CONTROLLER] Skipping playback - basic conditions not met:', {
        hasWord: !!currentWord,
        isMuted,
        isPaused
      });
      return;
    }

    // Check if we're already playing speech
    if (isPlayingRef.current || isSpeaking) {
      console.log('[VOCAB-CONTROLLER] Skipping playback - already playing:', {
        isPlaying: isPlayingRef.current,
        isSpeaking
      });
      return;
    }

    // Only prevent replay if we're actively speaking the same word
    if (lastPlayedWordRef.current === currentWord.word && (isSpeaking || isPlayingRef.current)) {
      console.log('[VOCAB-CONTROLLER] Skipping playback - same word already being spoken');
      return;
    }

    console.log(`[VOCAB-CONTROLLER] ✓ Starting playback for: ${currentWord.word} with ${voiceRegion} voice`);
    
    // Set playing flags immediately
    setIsSpeaking(true);
    isPlayingRef.current = true;
    lastPlayedWordRef.current = currentWord.word;

    try {
      const success = await directSpeechService.speak(
        `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`,
        {
          voiceRegion: voiceRegion,
          word: currentWord.word,
          meaning: currentWord.meaning,
          example: currentWord.example,
          onStart: () => {
            console.log(`[VOCAB-CONTROLLER] ✓ Speech started for: ${currentWord.word} (${voiceRegion})`);
          },
          onEnd: () => {
            console.log(`[VOCAB-CONTROLLER] ✓ Speech completed for: ${currentWord.word} (${voiceRegion})`);
            setIsSpeaking(false);
            isPlayingRef.current = false;
            
            // Auto-advance to next word if not paused or muted
            if (!isPaused && !isMuted) {
              console.log('[VOCAB-CONTROLLER] Auto-advancing to next word');
              retryTimeoutRef.current = window.setTimeout(() => {
                goToNext();
              }, 1500);
            }
          },
          onError: (error) => {
            console.error(`[VOCAB-CONTROLLER] ✗ Speech error for ${voiceRegion}:`, error);
            setIsSpeaking(false);
            isPlayingRef.current = false;
            
            // Retry after error if not paused or muted
            if (!isPaused && !isMuted) {
              console.log('[VOCAB-CONTROLLER] Retrying in 3000ms after error');
              retryTimeoutRef.current = window.setTimeout(() => {
                goToNext();
              }, 3000);
            }
          }
        }
      );

      if (!success) {
        console.log('[VOCAB-CONTROLLER] ✗ Speech failed to start, advancing to next word');
        setIsSpeaking(false);
        isPlayingRef.current = false;
        if (!isPaused && !isMuted) {
          retryTimeoutRef.current = window.setTimeout(() => goToNext(), 2000);
        }
      }
    } catch (error) {
      console.error('[VOCAB-CONTROLLER] ✗ Exception in playCurrentWord:', error);
      setIsSpeaking(false);
      isPlayingRef.current = false;
      if (!isPaused && !isMuted) {
        retryTimeoutRef.current = window.setTimeout(() => goToNext(), 2000);
      }
    }
  }, [currentWord, voiceRegion, isMuted, isPaused, isSpeaking, goToNext]);

  // Stabilized effect to play word when it changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted) {
      console.log('[VOCAB-CONTROLLER] ✓ Word changed effect triggered for:', currentWord.word);
      
      // Clean up any previous effect
      if (effectCleanupRef.current) {
        effectCleanupRef.current();
      }
      
      // Stop any current speech first
      stopSpeechAndReset();
      
      // Reset last played word to ensure this new word can play
      lastPlayedWordRef.current = null;
      
      // Play new word after a short delay
      playbackTimeoutRef.current = window.setTimeout(() => {
        console.log('[VOCAB-CONTROLLER] ✓ Executing delayed playback for:', currentWord.word);
        playCurrentWord();
      }, 500);
      
      // Store cleanup function
      effectCleanupRef.current = () => {
        if (playbackTimeoutRef.current) {
          console.log('[VOCAB-CONTROLLER] Cleaning up timeout for word change');
          clearTimeout(playbackTimeoutRef.current);
          playbackTimeoutRef.current = null;
        }
      };
      
      return effectCleanupRef.current;
    } else {
      console.log('[VOCAB-CONTROLLER] Word change effect skipped:', {
        hasWord: !!currentWord,
        isPaused,
        isMuted
      });
    }
  }, [currentWord?.word, isPaused, isMuted, playCurrentWord, stopSpeechAndReset]);

  // Effect to handle pause/unpause
  useEffect(() => {
    if (isPaused || isMuted) {
      console.log('[VOCAB-CONTROLLER] Paused/muted state changed - stopping speech');
      stopSpeechAndReset();
    }
  }, [isPaused, isMuted, stopSpeechAndReset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[VOCAB-CONTROLLER] Component unmounting - cleaning up');
      directSpeechService.stop();
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    currentWord,
    currentIndex: 0, // No longer relevant since we use vocabulary service
    isPaused,
    isMuted,
    voiceRegion,
    isSpeaking,
    goToNext,
    goToPrevious,
    togglePause,
    toggleMute,
    toggleVoice,
    playCurrentWord,
    wordCount: wordList.length
  };
};
