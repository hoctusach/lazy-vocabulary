
import { useState, useEffect, useCallback, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { directSpeechService } from '@/services/speech/directSpeechService';
import { vocabularyService } from '@/services/vocabularyService';

export const useVocabularyController = (
  wordList: VocabularyWord[],
  selectedVoice: VoiceSelection,
  isPaused: boolean,
  isMuted: boolean
) => {
  console.log('[VOCAB-CONTROLLER] === State Debug ===');
  
  // Get current word directly from vocabulary service instead of managing separate index
  const currentWord = vocabularyService.getCurrentWord();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const retryTimeoutRef = useRef<number | null>(null);
  const lastPlayedWordRef = useRef<string | null>(null);

  console.log('[VOCAB-CONTROLLER] Current state:', {
    isPaused,
    isMuted,
    voiceRegion: selectedVoice.region,
    isSpeaking,
    wordListLength: wordList.length,
    currentWord: currentWord?.word || 'none'
  });

  const goToNext = useCallback(() => {
    console.log('[VOCAB-CONTROLLER] goToNext called');
    
    // Clear any retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Use vocabulary service to get next word
    const nextWord = vocabularyService.getNextWord();
    console.log('[VOCAB-CONTROLLER] Got next word from service:', nextWord?.word || 'none');
    
    // Reset last played word reference
    lastPlayedWordRef.current = null;
  }, []);

  const playCurrentWord = useCallback(async () => {
    console.log('[VOCAB-CONTROLLER] playCurrentWord called');
    
    if (!currentWord || isMuted || isPaused || isSpeaking) {
      console.log('[VOCAB-CONTROLLER] Skipping playback:', {
        hasWord: !!currentWord,
        isMuted,
        isPaused,
        isSpeaking
      });
      return;
    }

    // Prevent playing the same word multiple times
    if (lastPlayedWordRef.current === currentWord.word) {
      console.log('[VOCAB-CONTROLLER] Word already played, skipping:', currentWord.word);
      return;
    }

    console.log(`[VOCAB-CONTROLLER] Playing word: ${currentWord.word} with ${selectedVoice.region} voice settings`);
    
    setIsSpeaking(true);
    lastPlayedWordRef.current = currentWord.word;

    try {
      const success = await directSpeechService.speak(
        `${currentWord.word}. ${currentWord.meaning}. ${currentWord.example}`,
        {
          voiceRegion: selectedVoice.region,
          word: currentWord.word,
          meaning: currentWord.meaning,
          example: currentWord.example,
          onStart: () => {
            console.log(`[VOCAB-CONTROLLER] Speech started for: ${currentWord.word} (${selectedVoice.region})`);
          },
          onEnd: () => {
            console.log(`[VOCAB-CONTROLLER] Speech completed for: ${currentWord.word} (${selectedVoice.region})`);
            setIsSpeaking(false);
            
            // Auto-advance to next word if not paused or muted
            if (!isPaused && !isMuted) {
              setTimeout(() => {
                goToNext();
              }, 1500);
            }
          },
          onError: (error) => {
            console.error(`[VOCAB-CONTROLLER] Speech error for ${selectedVoice.region}:`, error);
            setIsSpeaking(false);
            
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
        console.log('[VOCAB-CONTROLLER] Speech failed to start, advancing to next word');
        setIsSpeaking(false);
        if (!isPaused && !isMuted) {
          setTimeout(() => goToNext(), 2000);
        }
      }
    } catch (error) {
      console.error('[VOCAB-CONTROLLER] Error in playCurrentWord:', error);
      setIsSpeaking(false);
      if (!isPaused && !isMuted) {
        setTimeout(() => goToNext(), 2000);
      }
    }
  }, [currentWord, selectedVoice.region, isMuted, isPaused, isSpeaking, goToNext]);

  // Effect to play word when it changes
  useEffect(() => {
    if (currentWord && !isPaused && !isMuted) {
      console.log('[VOCAB-CONTROLLER] Word changed effect');
      // Stop any current speech first
      directSpeechService.stop();
      setIsSpeaking(false);
      
      // Play new word after a short delay
      const timeoutId = setTimeout(() => {
        playCurrentWord();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentWord, isPaused, isMuted, playCurrentWord]);

  // Effect to handle pause/unpause
  useEffect(() => {
    if (isPaused || isMuted) {
      console.log('[VOCAB-CONTROLLER] Paused/muted, stopping speech');
      directSpeechService.stop();
      setIsSpeaking(false);
      lastPlayedWordRef.current = null; // Allow replay when unpaused
    }
  }, [isPaused, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      directSpeechService.stop();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentWord,
    currentIndex: 0, // No longer relevant since we use vocabulary service
    isSpeaking,
    goToNext,
    playCurrentWord
  };
};
