
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
  // Track retry attempts and prevent overlapping speech
  const retryAttemptsRef = useRef(0);
  const maxRetryAttempts = 2; // Reduced retry attempts
  const voicesLoadedRef = useRef(false);
  const speakingFailedRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const networkErrorRef = useRef(false);
  const isPlayingRef = useRef(false); // Prevent overlapping speech

  // Function to handle network connectivity issues
  const checkNetworkConnectivity = useCallback(() => {
    if (!navigator.onLine) {
      if (!networkErrorRef.current) {
        toast.error("Network connection lost. Speech playback may be affected.");
        networkErrorRef.current = true;
      }
      return false;
    }
    
    if (networkErrorRef.current && navigator.onLine) {
      toast.success("Network connection restored.");
      networkErrorRef.current = false;
    }
    
    return true;
  }, []);

  // Function to play the current word
  const playWord = useCallback(async (wordToPlay: VocabularyWord | null) => {
    // Prevent overlapping speech
    if (isPlayingRef.current) {
      console.log('Speech already in progress, skipping');
      return;
    }

    // Basic checks
    if (!wordToPlay || muted || paused) {
      console.log(`Cannot play word: ${!wordToPlay ? 'No word' : muted ? 'Muted' : 'Paused'}`);
      return;
    }
    
    // Check network connectivity
    checkNetworkConnectivity();
    
    console.log(`Playing word: ${wordToPlay.word}`);
    isPlayingRef.current = true;
    retryAttemptsRef.current = 0;
    speakingFailedRef.current = false;
    
    // Cancel any ongoing speech completely
    window.speechSynthesis.cancel();
    
    // Wait for cancellation to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
      // Unlock audio first
      try {
        await unlockAudio();
      } catch (e) {
        console.warn("Audio unlock failed but continuing:", e);
      }
      
      // Wait for voices to load
      console.log("Loading voices before speaking...");
      const voices = await ensureVoicesLoaded();
      console.log(`Loaded ${voices.length} voices, proceeding with speech...`);
      
      // Clear any previous utterance references
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current.onstart = null;
      }
      
      // Set up the utterance with slower speech
      const utterance = createUtterance(
        wordToPlay,
        selectedVoice,
        voices,
        // onEnd callback
        () => {
          console.log(`Speech ended successfully for: ${wordToPlay.word}`);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          retryAttemptsRef.current = 0;
          
          // Auto-advance with longer delay for slower speech
          if (!paused && !muted) {
            console.log("Auto-advancing to next word after successful speech");
            setTimeout(() => advanceToNext(), 1500); // Longer delay
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
          isPlayingRef.current = false;
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
          } else {
            retryAttemptsRef.current++;
            
            // Reduced retry attempts and longer delays
            if (retryAttemptsRef.current <= maxRetryAttempts) {
              console.log(`Attempting retry ${retryAttemptsRef.current}/${maxRetryAttempts} after error`);
              setTimeout(() => {
                if (!paused && !muted) {
                  isPlayingRef.current = false; // Allow retry
                  playWord(wordToPlay);
                }
              }, 1000); // Longer delay between retries
            } else {
              console.log("Too many retries, advancing to next word");
              if (!paused && !muted) {
                setTimeout(() => advanceToNext(), 1000);
              }
            }
          }
        }
      );
      
      utteranceRef.current = utterance;
      
      // Start speaking with longer delay to ensure setup is complete
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
          console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
          
          // Check if speech is working after delay
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
          }, 500); // Longer check delay
        } catch (error) {
          console.error('Error starting speech:', error);
          setIsSpeaking(false);
          isPlayingRef.current = false;
          if (!paused && !muted) {
            setTimeout(advanceToNext, 1500);
          }
        }
      }, 300); // Longer initial delay
    } catch (error) {
      console.error("Error in playWord function:", error);
      setIsSpeaking(false);
      isPlayingRef.current = false;
      if (!paused && !muted) {
        setTimeout(advanceToNext, 1500);
      }
    }
  }, [utteranceRef, selectedVoice, advanceToNext, muted, paused, maxRetryAttempts, checkNetworkConnectivity]);
  
  // Listen for online/offline events
  useState(() => {
    const handleOnline = () => {
      console.log("Network connection restored");
      networkErrorRef.current = false;
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
