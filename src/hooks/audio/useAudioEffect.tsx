
import * as React from 'react';
import { useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { speak, formatSpeechText } from '@/utils/speech';
import { unifiedSpeechController } from '@/services/speech/unifiedSpeechController';

export const useAudioEffect = (
  currentWord: VocabularyWord | null,
  isPaused: boolean,
  mute: boolean,
  voiceRegion: 'US' | 'UK' | 'AU',
  handleManualNext: () => void,
  isSoundPlaying: boolean,
  setIsSoundPlaying: (playing: boolean) => void,
  clearAutoAdvanceTimer: () => void,
  autoAdvanceTimerRef: React.MutableRefObject<number | null>,
  lastSpokenWordRef: React.MutableRefObject<string | null>,
  wordChangeProcessingRef: React.MutableRefObject<boolean>,
  speechAttemptsRef: React.MutableRefObject<number>,
  stopSpeaking: () => void,
  displayTime: number,
  pauseRequestedRef?: React.MutableRefObject<boolean>
) => {
  // Handle playing audio when the current word changes - with debouncing
  useEffect(() => {
    if (!currentWord) {
      console.log('[APP] No current word, nothing to speak');
      return;
    }
    
    // Skip playback when paused
    if (isPaused) {
      console.log('[APP] App is paused, not speaking');
      return;
    }
    
    // Debounce rapid word changes
    if (wordChangeProcessingRef.current) {
      console.log('[APP] Word change in progress, delaying');
      return;
    }

    if (!unifiedSpeechController.canSpeak()) {
      return;
    }
    
    // Check if we're already speaking this word
    if (lastSpokenWordRef.current === currentWord.word && isSoundPlaying) {
      console.log('[APP] Already speaking this word, skipping:', currentWord.word);
      return;
    }
    
    // Set processing flag to prevent overlaps
    wordChangeProcessingRef.current = true;
    speechAttemptsRef.current = 0;
    
    // Clear any existing timers to prevent overlapping
    clearAutoAdvanceTimer();
    
    // Save this word as the last one we processed
    lastSpokenWordRef.current = currentWord.word;
    
    // Record speech start time for debugging
    const startTime = Date.now();
    console.log(`[APP] Starting speech for ${currentWord.word} at ${new Date().toISOString()}`);
    
    // Small delay before speaking to ensure clean state
    const speechDelayTimeout = window.setTimeout(() => {
      const playWordAudio = async () => {
        try {
          // Set playing state even when muted so timers continue
          setIsSoundPlaying(true);
          
          // First, ensure previous speech is stopped
          stopSpeaking();
          
          console.log('[APP] ⚡ Speaking word:', currentWord.word);
          
          // Create the text to speak with explicit pauses
          const fullText = formatSpeechText({
            word: currentWord.word,
            meaning: currentWord.meaning,
            example: currentWord.example
          });
          
          try {
            if (!unifiedSpeechController.canSpeak()) {
              return;
            }
            await speak(fullText, voiceRegion, pauseRequestedRef, { muted: mute });
            
            console.log('[APP] ✅ Speech completed for:', currentWord.word);
            
            // Only auto-advance if not paused
            if (!isPaused && !(pauseRequestedRef?.current) && unifiedSpeechController.canSpeak()) {
              clearAutoAdvanceTimer();
              const speechDuration = Date.now() - startTime;
              const pauseBeforeNextWord = Math.max(1500, Math.min(2500, speechDuration * 0.3));
              console.log(`[APP] Setting auto-advance timer for ${pauseBeforeNextWord}ms`);
              autoAdvanceTimerRef.current = window.setTimeout(() => {
                unifiedSpeechController.unregisterTimer(autoAdvanceTimerRef.current!);
                if (!isPaused && !(pauseRequestedRef?.current) && unifiedSpeechController.canSpeak()) {
                  handleManualNext();
                } else {
                  console.log('[APP] Auto-advance canceled due to state change');
                }
              }, pauseBeforeNextWord);
              unifiedSpeechController.registerTimer(autoAdvanceTimerRef.current);
            }
          } catch (error) {
            console.error("[APP] Error in speech:", error);
            // Reset processing state to allow retry
            wordChangeProcessingRef.current = false;
            // Don't attempt to auto-advance on error
          }
        } finally {
          // Always reset the sound playing state
          setIsSoundPlaying(false);
          // Allow processing new words again
          wordChangeProcessingRef.current = false;
        }
      };
      
      // Start audio playback
      playWordAudio();
    }, 150); // Short delay to ensure state is ready
    unifiedSpeechController.registerTimer(speechDelayTimeout);
    
    // Cleanup function
    return () => {
      clearTimeout(speechDelayTimeout);
      unifiedSpeechController.unregisterTimer(speechDelayTimeout);
    };
  }, [
    currentWord, 
    isPaused,
    mute,
    voiceRegion,
    clearAutoAdvanceTimer,
    stopSpeaking,
    setIsSoundPlaying,
    autoAdvanceTimerRef,
    lastSpokenWordRef,
    wordChangeProcessingRef,
    speechAttemptsRef,
    handleManualNext,
    pauseRequestedRef,
    isSoundPlaying
  ]);
};
