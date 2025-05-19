
import { toast } from 'sonner';

/**
 * Sets up and plays a speech utterance for the current word
 */
export const useUtteranceSetup = ({
  currentWord,
  selectedVoice,
  findVoice,
  cancelSpeech,
  utteranceRef,
  wordTransitionRef,
  speakingRef,
  setIsSpeaking,
  setHasSpeechPermission,
  permissionErrorShownRef,
  goToNextWord,
  muted,
  paused,
  incrementRetryAttempts
}) => {
  // Add a small delay before playing to ensure cancellation has completed
  setTimeout(() => {
    try {
      // Create a fresh utterance for this word
      const utterance = new SpeechSynthesisUtterance();
      utteranceRef.current = utterance;
      
      // Set up the text with proper structure
      const wordText = currentWord.word;
      const meaningText = currentWord.meaning || '';
      const exampleText = currentWord.example || '';
      
      utterance.text = `${wordText}. ${meaningText}. ${exampleText}`.trim();
      
      // Set language based on selected voice
      utterance.lang = selectedVoice.region === 'UK' ? 'en-GB' : 'en-US';
      
      // Find and apply the voice
      const voice = findVoice(selectedVoice.region);
      if (voice) {
        utterance.voice = voice;
        console.log(`Using voice: ${voice.name}`);
      } else {
        console.log('No matching voice found, using system default');
      }
      
      // Set speech parameters for better clarity
      utterance.rate = 0.95; // Slightly slower for better comprehension
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Set up event handlers BEFORE calling speak()
      utterance.onstart = () => {
        console.log(`Speech started for: ${currentWord.word}`);
        speakingRef.current = true;
        setIsSpeaking(true);
        setHasSpeechPermission(true);
        permissionErrorShownRef.current = false;
      };
      
      utterance.onend = () => {
        console.log(`Speech ended successfully for: ${currentWord.word}`);
        speakingRef.current = false;
        setIsSpeaking(false);
        
        // Auto-advance to next word after speech completes
        setTimeout(() => goToNextWord(), 500);
      };
      
      utterance.onerror = (event) => {
        console.error(`Speech synthesis error:`, event);
        
        // Check if we're already in a word transition - if so, don't retry
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
          setTimeout(() => goToNextWord(), 2000);
          return;
        }
        
        // If error is "canceled" but it was intentional (during muting/pausing), don't retry
        if (event.error === 'canceled' && (muted || paused)) {
          console.log('Speech canceled due to muting or pausing, not retrying');
          // Still auto-advance after a short delay
          setTimeout(() => goToNextWord(), 2000);
          return;
        }
        
        // Handle retry logic
        if (incrementRetryAttempts()) {
          console.log(`Retry attempt in progress`);
          
          // Wait briefly then retry
          setTimeout(() => {
            if (!paused && !wordTransitionRef.current) {
              console.log('Retrying speech after error');
              // Create a new utterance and try again
              useUtteranceSetup({
                currentWord,
                selectedVoice,
                findVoice,
                cancelSpeech,
                utteranceRef,
                wordTransitionRef,
                speakingRef,
                setIsSpeaking,
                setHasSpeechPermission,
                permissionErrorShownRef,
                goToNextWord,
                muted,
                paused,
                incrementRetryAttempts
              });
            }
          }, 500);
        } else {
          console.log(`Max retries reached, advancing to next word`);
          // Move on after too many failures
          setTimeout(() => goToNextWord(), 1000);
        }
      };
      
      // Attempt to wait for any potential race conditions to resolve
      setTimeout(() => {
        // Cancel any existing speech just before speaking
        window.speechSynthesis.cancel();
        
        // Actually start speaking
        window.speechSynthesis.speak(utterance);
        console.log('Speaking with voice:', utterance.voice ? utterance.voice.name : 'default system voice');
        
        // Verify speech is working after a short delay
        setTimeout(() => {
          if (!window.speechSynthesis.speaking && !paused && !muted && !wordTransitionRef.current) {
            console.warn("Speech synthesis not speaking after 200ms - potential silent failure");
            
            // If we haven't exceeded retry attempts, try again
            if (incrementRetryAttempts()) {
              console.log(`Silent failure detected, retrying`);
              useUtteranceSetup({
                currentWord,
                selectedVoice,
                findVoice,
                cancelSpeech,
                utteranceRef,
                wordTransitionRef,
                speakingRef,
                setIsSpeaking,
                setHasSpeechPermission,
                permissionErrorShownRef,
                goToNextWord,
                muted,
                paused,
                incrementRetryAttempts
              });
            } else {
              // If we've tried enough times, move on
              console.log("Moving to next word after silent failures");
              goToNextWord();
            }
          }
        }, 200);
      }, 150);
      
    } catch (error) {
      console.error('Error in speech playback:', error);
      setIsSpeaking(false);
      // Still try to advance to prevent getting stuck
      setTimeout(() => goToNextWord(), 1000);
    }
  }, 100);
};
