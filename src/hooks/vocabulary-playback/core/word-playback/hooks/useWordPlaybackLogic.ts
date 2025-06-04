
import { useCallback, useState, useRef } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { speechController } from '@/utils/speech/core/speechController';
import { toast } from 'sonner';

/**
 * Core logic for playing words with centralized speech controller
 * Updated with improved debugging and state management
 */
export const useWordPlaybackLogic = (
  wordList: VocabularyWord[],
  currentIndex: number,
  muted: boolean,
  paused: boolean,
  cancelSpeech: () => void,
  findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
  selectedVoice: VoiceSelection,
  userInteractionRef: React.MutableRefObject<boolean>,
  setIsSpeaking: (isSpeaking: boolean) => void,
  speakingRef: React.MutableRefObject<boolean>,
  resetRetryAttempts: () => void,
  incrementRetryAttempts: () => boolean,
  checkSpeechSupport: () => boolean,
  wordTransitionRef: React.MutableRefObject<boolean>,
  goToNextWord: () => void,
  voicesLoadedRef: React.MutableRefObject<boolean>,
  ensureVoicesLoaded: () => Promise<boolean>,
  permissionErrorShownRef: React.MutableRefObject<boolean>,
  utteranceRef: React.MutableRefObject<SpeechSynthesisUtterance | null>,
  createUtterance: (
    word: VocabularyWord, 
    selectedVoice: VoiceSelection,
    findVoice: (region: 'US' | 'UK') => SpeechSynthesisVoice | null,
    onStart: () => void,
    onEnd: () => void,
    onError: (e: SpeechSynthesisErrorEvent) => void
  ) => SpeechSynthesisUtterance
) => {
  // Get the current word based on the index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // State for speech permission
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
  
  // Prevent multiple simultaneous play attempts
  const playInProgressRef = useRef(false);
  
  // Core function to play the current word using the improved controller
  const playCurrentWord = useCallback(async () => {
    console.log('[PLAYBACK] === Starting playCurrentWord ===');
    console.log('[PLAYBACK] Current conditions:', {
      hasCurrentWord: !!currentWord,
      wordText: currentWord?.word,
      muted,
      paused,
      playInProgress: playInProgressRef.current,
      wordTransition: wordTransitionRef.current,
      controllerActive: speechController.isActive(),
      browserSpeaking: window.speechSynthesis?.speaking,
      browserPaused: window.speechSynthesis?.paused
    });

    // Prevent overlapping play attempts
    if (playInProgressRef.current) {
      console.log('[PLAYBACK] Play already in progress, skipping');
      return;
    }

    // Check controller state with improved logic
    const controllerActive = speechController.isActive();
    console.log('[PLAYBACK] Speech controller state check:', {
      controllerActive,
      shouldBlock: controllerActive
    });

    if (controllerActive) {
      console.log('[PLAYBACK] Speech controller active, checking if we should force reset...');
      
      // If muted or paused, force reset the controller to allow new operations
      if (muted || paused) {
        console.log('[PLAYBACK] Forcing controller reset due to mute/pause state');
        speechController.forceReset();
      } else {
        console.log('[PLAYBACK] Controller legitimately active, skipping');
        return;
      }
    }
    
    // Don't try to play during word transitions
    if (wordTransitionRef.current) {
      console.log('[PLAYBACK] Word transition in progress, delaying playback');
      return;
    }
    
    // Basic checks
    if (!currentWord) {
      console.log('[PLAYBACK] No current word to play');
      return;
    }
    
    if (muted) {
      console.log('[PLAYBACK] Speech is muted, auto-advancing after delay');
      setTimeout(() => goToNextWord(), 3000);
      return;
    }
    
    if (paused) {
      console.log('[PLAYBACK] Playback is paused');
      return;
    }

    // Set play in progress flag
    playInProgressRef.current = true;
    console.log('[PLAYBACK] Starting speech process for:', currentWord.word);
    
    try {
      // Ensure voices are loaded
      if (!voicesLoadedRef.current) {
        console.log('[PLAYBACK] Ensuring voices are loaded');
        await ensureVoicesLoaded();
      }
      
      // Ensure speech synthesis is available
      if (!checkSpeechSupport()) {
        if (!permissionErrorShownRef.current) {
          toast.error("Your browser doesn't support speech synthesis");
          permissionErrorShownRef.current = true;
        }
        setTimeout(() => goToNextWord(), 3000);
        playInProgressRef.current = false;
        return;
      }

      console.log(`[PLAYBACK] Playing word: ${currentWord.word}`);

      // Find appropriate voice
      const voice = findVoice(selectedVoice.region);
      console.log('[PLAYBACK] Selected voice:', voice?.name || 'default');
      
      // Construct text to speak
      let textToSpeak = currentWord.word;
      if (currentWord.meaning) {
        textToSpeak += `. ${currentWord.meaning}`;
      }
      if (currentWord.example) {
        textToSpeak += `. ${currentWord.example}`;
      }

      console.log('[PLAYBACK] Text to speak:', textToSpeak.substring(0, 100) + '...');

      // Use the improved centralized speech controller
      const success = await speechController.speak(textToSpeak, {
        voice,
        rate: 0.8,
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          console.log(`[PLAYBACK] Speech started for: ${currentWord.word}`);
          speakingRef.current = true;
          setIsSpeaking(true);
        },
        onEnd: () => {
          console.log(`[PLAYBACK] Speech ended for: ${currentWord.word}`);
          speakingRef.current = false;
          setIsSpeaking(false);
          playInProgressRef.current = false;
          resetRetryAttempts();
          
          // Auto-advance if not paused or muted
          if (!paused && !muted) {
            console.log('[PLAYBACK] Auto-advancing to next word');
            setTimeout(() => {
              goToNextWord();
            }, 1500);
          } else {
            console.log('[PLAYBACK] Not auto-advancing due to pause/mute state');
          }
        },
        onError: (event) => {
          console.error(`[PLAYBACK] Speech error:`, event);
          
          speakingRef.current = false;
          setIsSpeaking(false);
          playInProgressRef.current = false;
          
          // Handle permission errors
          if (event.error === 'not-allowed') {
            setHasSpeechPermission(false);
            if (!permissionErrorShownRef.current) {
              toast.error("Please click anywhere on the page to enable audio playback");
              permissionErrorShownRef.current = true;
            }
          }
          
          // Don't retry on cancel errors to prevent loops
          if (event.error === 'canceled') {
            console.log('[PLAYBACK] Speech was canceled, advancing without retry');
            setTimeout(() => goToNextWord(), 1000);
            return;
          }
          
          // Handle retry logic for other errors
          if (incrementRetryAttempts()) {
            console.log('[PLAYBACK] Retrying after error');
            setTimeout(() => {
              if (!paused && !muted && !wordTransitionRef.current) {
                playInProgressRef.current = false; // Reset flag to allow retry
                playCurrentWord();
              }
            }, 1000);
          } else {
            console.log('[PLAYBACK] Max retries reached, advancing');
            setTimeout(() => goToNextWord(), 1500);
          }
        }
      });

      if (!success) {
        console.warn('[PLAYBACK] Speech failed to start');
        playInProgressRef.current = false;
        // Still auto-advance to prevent getting stuck
        if (!paused && !muted) {
          setTimeout(() => goToNextWord(), 3000);
        }
      }
      
    } catch (error) {
      console.error('[PLAYBACK] Error in playCurrentWord:', error);
      playInProgressRef.current = false;
      setIsSpeaking(false);
      speakingRef.current = false;
      
      // Still auto-advance to prevent getting stuck
      if (!paused && !muted) {
        setTimeout(() => goToNextWord(), 3000);
      }
    }
    
  }, [
    currentWord, 
    muted, 
    paused, 
    findVoice, 
    goToNextWord, 
    selectedVoice,
    setIsSpeaking,
    speakingRef,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    ensureVoicesLoaded,
    resetRetryAttempts,
    permissionErrorShownRef,
    voicesLoadedRef
  ]);
  
  return {
    currentWord,
    playCurrentWord,
    hasSpeechPermission
  };
};
