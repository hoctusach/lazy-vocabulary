
import { useCallback, useRef, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '../useVoiceSelection';
import { ensureVoicesLoaded } from './ensureVoices';
import { findVoice } from './findVoice';
import { createUtterance } from './utteranceSetup';
import { handleSpeechError, handleNotAllowedError, handleSilentFailure } from './errorHandling';
import { unlockAudio } from '@/utils/speech/core/speechEngine';
import { toast } from 'sonner';

export const useSpeechPlaybackCore = (
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  selectedVoice: VoiceSelection,
  advanceToNext: () => void,
  muted: boolean,
  paused: boolean
) => {
  // Track retry attempts
  const retryAttemptsRef = useRef(0);
  const maxRetryAttempts = 3;
  const voicesLoadedRef = useRef(false);
  const speakingFailedRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const networkErrorRef = useRef(false);

  // Function to handle network connectivity issues
  const checkNetworkConnectivity = useCallback(() => {
    // Simple check if we're online
    if (!navigator.onLine) {
      if (!networkErrorRef.current) {
        toast.error("Network connection lost. Speech playback may be affected.");
        networkErrorRef.current = true;
      }
      return false;
    }
    
    // Reset network error flag if we're back online
    if (networkErrorRef.current && navigator.onLine) {
      toast.success("Network connection restored.");
      networkErrorRef.current = false;
    }
    
    return true;
  }, []);

  // Function to play the current word
  const playWord = useCallback(async (wordToPlay: VocabularyWord | null) => {
    // First ensure we have a word to play and are not muted/paused
    if (!wordToPlay || muted || paused) {
      console.log(`Cannot play word: ${!wordToPlay ? 'No word' : muted ? 'Muted' : 'Paused'}`);
      return;
    }
    
    // Check network connectivity (for Firebase errors)
    checkNetworkConnectivity();
    
    console.log(`Playing word: ${wordToPlay.word}`);
    retryAttemptsRef.current = 0;
    speakingFailedRef.current = false;
    
    // Unlock audio first to ensure browser permissions
    try {
      await unlockAudio();
    } catch (e) {
      console.warn("Audio unlock failed but continuing:", e);
      // Continue anyway - unlockAudio has fallbacks
    }
    
    // Cancel any ongoing speech to prevent queuing
    window.speechSynthesis.cancel();
    
    try {
      // Wait for voices to load before attempting to speak
      console.log("Loading voices before speaking...");
      const voices = await ensureVoicesLoaded();
      console.log(`Loaded ${voices.length} voices, proceeding with speech...`);
      
      // Clear any previous utterance references to prevent memory leaks
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onstart = null;
      }
      
      // Set up the utterance with all its event handlers
      const utterance = createUtterance(
        wordToPlay,
        selectedVoice,
        voices,
        // onEnd callback
        () => {
          console.log(`Speech ended successfully for: ${wordToPlay.word}`);
          setIsSpeaking(false);
          retryAttemptsRef.current = 0;
          
          // Only auto-advance if not paused and not muted
          if (!paused && !muted) {
            console.log("Auto-advancing to next word after successful speech");
            advanceToNext();
          }
        },
        // onStart callback
        () => {
          console.log(`Speech started for: ${wordToPlay.word}`);
          setIsSpeaking(true);
        },
        // onError callback
        (event) => {
          console.error(`Speech synthesis error: ${event.error} for word ${wordToPlay.word}`);
          setIsSpeaking(false);
          
          // Mark that we had a failure
          speakingFailedRef.current = true;
          
          // For not-allowed errors, try to recover
          if (event.error === 'not-allowed') {
            handleNotAllowedError(
              event,
              retryAttemptsRef,
              maxRetryAttempts,
              utterance,
              setIsSpeaking,
              advanceToNext,
              muted,
              paused
            );
          } 
          // For other error types
          else {
            retryAttemptsRef.current++;
            
            // If we haven't tried too many times already, retry
            if (retryAttemptsRef.current <= maxRetryAttempts) {
              console.log(`Attempting retry ${retryAttemptsRef.current}/${maxRetryAttempts} after error`);
              setTimeout(() => {
                if (!paused && !muted) {
                  try {
                    // Try to unlock audio again before retrying
                    unlockAudio().then(() => {
                      window.speechSynthesis.speak(utterance);
                      setIsSpeaking(true);
                    }).catch(() => {
                      // If unlock fails, try anyway
                      window.speechSynthesis.speak(utterance);
                      setIsSpeaking(true);
                    });
                  } catch (e) {
                    console.error("Retry failed:", e);
                    setIsSpeaking(false);
                    // Move on if retry fails
                    advanceToNext();
                  }
                }
              }, 300);
            } else {
              // Too many retries, just move on
              console.log("Too many retries, advancing to next word");
              if (!paused && !muted) {
                advanceToNext();
              }
            }
          }
        }
      );
      
      utteranceRef.current = utterance;
      
      // Start speaking with a small delay to ensure setup is complete
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
          console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
          
          // Verify speech is working after a short delay
          setTimeout(() => {
            if (!window.speechSynthesis.speaking && !speakingFailedRef.current) {
              handleSilentFailure(
                retryAttemptsRef,
                maxRetryAttempts,
                utterance,
                speakingFailedRef,
                setIsSpeaking,
                advanceToNext,
                muted,
                paused
              );
            }
          }, 200);
        } catch (error) {
          console.error('Error starting speech:', error);
          setIsSpeaking(false);
          // Still advance to next word after a delay to prevent getting stuck
          if (!paused && !muted) {
            setTimeout(advanceToNext, 1000);
          }
        }
      }, 100);
    } catch (error) {
      console.error("Error in playWord function:", error);
      setIsSpeaking(false);
      // Always advance to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(advanceToNext, 1000);
      }
    }
  }, [utteranceRef, selectedVoice, advanceToNext, muted, paused, maxRetryAttempts, checkNetworkConnectivity]);
  
  // Listen for online/offline events
  useState(() => {
    const handleOnline = () => {
      console.log("Network connection restored");
      networkErrorRef.current = false;
      // Could potentially retry speech here
    };
    
    const handleOffline = () => {
      console.log("Network connection lost");
      networkErrorRef.current = true;
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });
  
  return {
    playWord,
    isSpeaking
  };
};
