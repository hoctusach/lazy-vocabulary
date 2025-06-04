
import { useCallback, useState } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { toast } from 'sonner';

/**
 * Core logic for playing words with speech synthesis
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
  
  // Track if we're currently attempting to speak to prevent overlaps
  const [isAttemptingToSpeak, setIsAttemptingToSpeak] = useState(false);
  
  // Core function to play the current word
  const playCurrentWord = useCallback(async () => {
    // Prevent overlapping speech attempts
    if (isAttemptingToSpeak) {
      console.log('Already attempting to speak, skipping');
      return;
    }
    
    // Don't try to play during word transitions
    if (wordTransitionRef.current) {
      console.log('Word transition in progress, delaying playback');
      return;
    }
    
    // Basic checks
    if (!currentWord) {
      console.log('No current word to play');
      return;
    }
    
    if (muted) {
      console.log('Speech is muted, but continuing to show words');
      // We don't return here as we want to auto-advance even when muted
      setTimeout(() => goToNextWord(), 3000);
      return;
    }
    
    if (paused) {
      console.log('Playback is paused');
      return;
    }
    
    // Set attempting flag to prevent overlaps
    setIsAttemptingToSpeak(true);
    
    try {
      // CRITICAL: Ensure voices are loaded before attempting speech
      if (!voicesLoadedRef.current) {
        console.log('Ensuring voices are loaded before speaking');
        await ensureVoicesLoaded();
      }
      
      console.log(`Attempting to play word with voice: ${selectedVoice.label}`);
      
      // CRITICAL: Stop any ongoing speech and wait for it to actually stop
      if (window.speechSynthesis.speaking) {
        console.log('Stopping ongoing speech before starting new speech');
        window.speechSynthesis.cancel();
        
        // Wait longer for the cancellation to take effect
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Ensure speech synthesis is available
      if (!checkSpeechSupport()) {
        if (!permissionErrorShownRef.current) {
          toast.error("Your browser doesn't support speech synthesis");
          permissionErrorShownRef.current = true;
        }
        // Auto-advance even if speech isn't supported
        setTimeout(() => goToNextWord(), 3000);
        return;
      }
      
      // Create utterance with all callbacks
      const utterance = createUtterance(
        currentWord,
        selectedVoice,
        findVoice,
        // onStart callback
        () => {
          console.log(`Speech started for: ${currentWord.word}`);
          speakingRef.current = true;
          setIsSpeaking(true);
        },
        // onEnd callback
        () => {
          console.log(`Speech ended for: ${currentWord.word}`);
          speakingRef.current = false;
          setIsSpeaking(false);
          setIsAttemptingToSpeak(false);
          resetRetryAttempts();
          
          // Only auto-advance if not paused or muted
          if (!paused && !muted) {
            setTimeout(() => {
              goToNextWord();
            }, 1500); // Longer delay to prevent rushing
          }
        },
        // onError callback
        (event) => {
          console.error(`Speech synthesis error:`, event);
          
          // Reset attempting flag
          setIsAttemptingToSpeak(false);
          
          // Check if we're already in a word transition
          if (wordTransitionRef.current) {
            console.log('Error occurred during word transition, not retrying');
            speakingRef.current = false;
            setIsSpeaking(false);
            return;
          }
          
          speakingRef.current = false;
          setIsSpeaking(false);
          
          // Handle permission errors specially
          if (event.error === 'not-allowed') {
            setHasSpeechPermission(false);
            if (!permissionErrorShownRef.current) {
              toast.error("Please click anywhere on the page to enable audio playback");
              permissionErrorShownRef.current = true;
            }
            // Continue to next word even without audio
            setTimeout(() => goToNextWord(), 3000);
            return;
          }
          
          // If error is "canceled" - don't retry immediately as this creates loops
          if (event.error === 'canceled') {
            console.log('Speech was canceled, advancing to next word without retry');
            setTimeout(() => goToNextWord(), 2000);
            return;
          }
          
          // Handle retry logic for other errors
          if (incrementRetryAttempts()) {
            console.log(`Retry attempt in progress`);
            
            // Wait longer then retry
            setTimeout(() => {
              if (!paused && !muted && !wordTransitionRef.current) {
                console.log('Retrying speech after error');
                setIsAttemptingToSpeak(false); // Reset flag to allow retry
                playCurrentWord();
              }
            }, 1000); // Longer delay between retries
          } else {
            console.log(`Max retries reached, advancing to next word`);
            // Move on after too many failures
            setTimeout(() => goToNextWord(), 1500);
          }
        }
      );
      
      // Store the utterance reference
      utteranceRef.current = utterance;
      
      // Start speaking with a delay to ensure everything is ready
      setTimeout(() => {
        try {
          // Double-check we're still in a valid state
          if (muted || paused || wordTransitionRef.current) {
            console.log('State changed before speaking, aborting');
            setIsAttemptingToSpeak(false);
            return;
          }
          
          window.speechSynthesis.speak(utterance);
          console.log(`Starting to speak: ${currentWord.word}`);
        } catch (e) {
          console.error('Error starting speech:', e);
          setIsSpeaking(false);
          setIsAttemptingToSpeak(false);
          speakingRef.current = false;
          
          // Still auto-advance to prevent getting stuck
          if (!paused && !muted) {
            setTimeout(() => goToNextWord(), 3000);
          }
        }
      }, 300); // Give time for cleanup to complete
      
    } catch (error) {
      console.error('Error in playCurrentWord:', error);
      setIsAttemptingToSpeak(false);
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
    userInteractionRef,
    setIsSpeaking,
    speakingRef,
    incrementRetryAttempts,
    checkSpeechSupport,
    wordTransitionRef,
    ensureVoicesLoaded,
    createUtterance,
    resetRetryAttempts,
    permissionErrorShownRef,
    voicesLoadedRef,
    isAttemptingToSpeak
  ]);
  
  return {
    currentWord,
    playCurrentWord,
    hasSpeechPermission
  };
};
