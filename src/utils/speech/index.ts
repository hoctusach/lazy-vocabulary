
import { getVoiceByRegion, findFallbackVoice } from './voiceUtils';
import { calculateSpeechDuration } from './durationUtils';
import { 
  isSpeechSynthesisSupported, 
  stopSpeaking, 
  checkSoundDisplaySync, 
  keepSpeechAlive,
  waitForSpeechReadiness,
  resetSpeechEngine,
  validateCurrentSpeech,
  forceResyncIfNeeded,
  ensureSpeechEngineReady,
  extractMainWord
} from './synthesisUtils';

export const speak = (text: string, region: 'US' | 'UK' = 'US'): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Check for mute state in localStorage
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.isMuted === true) {
          console.log('Speech is muted in localStorage, not speaking');
          resolve();
          return;
        }
      }
    } catch (error) {
      console.error('Error checking mute state:', error);
    }

    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Store the current text being spoken for sync checking
    try {
      localStorage.setItem('currentTextBeingSpoken', text);
    } catch (error) {
      console.error('Error saving current text to localStorage:', error);
    }

    // Ensure speech engine is ready before starting
    await ensureSpeechEngineReady();
    
    const utterance = new SpeechSynthesisUtterance(text);
    let voices = window.speechSynthesis.getVoices();
    
    const setVoiceAndSpeak = async () => {
      try {
        const langCode = region === 'US' ? 'en-US' : 'en-GB';
        const voice = getVoiceByRegion(region);
        
        if (voice) {
          utterance.voice = voice;
          utterance.lang = langCode;
        } else {
          console.warn('No suitable voice found, using default');
          utterance.lang = langCode;
        }
        
        // Improved speech parameters for better clarity
        utterance.rate = 0.9;  // Slightly slower for better comprehension
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        let keepAliveInterval: number | null = null;
        let maxDurationTimeout: number | null = null;
        let syncCheckInterval: number | null = null;
        
        const clearAllTimers = () => {
          if (keepAliveInterval !== null) {
            clearInterval(keepAliveInterval);
          }
          if (maxDurationTimeout !== null) {
            clearTimeout(maxDurationTimeout);
          }
          if (syncCheckInterval !== null) {
            clearInterval(syncCheckInterval);
          }
        };

        utterance.onend = () => {
          console.log('Speech completed successfully');
          clearAllTimers();
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('Speech error:', event);
          clearAllTimers();
          resetSpeechEngine();
          if (event.error === 'canceled' || event.error === 'interrupted') {
            resolve();
          } else {
            reject(new Error(`Speech error: ${event.error}`));
          }
        };

        await waitForSpeechReadiness();
        
        // More frequent keep-alive interval
        keepAliveInterval = window.setInterval(() => {
          if (window.speechSynthesis.speaking) {
            keepSpeechAlive();
          } else {
            clearInterval(keepAliveInterval);
          }
        }, 150); // Very frequent checks for maximum stability
        
        // Regular sync checking
        syncCheckInterval = window.setInterval(() => {
          try {
            const currentWord = localStorage.getItem('currentDisplayedWord');
            if (currentWord) {
              forceResyncIfNeeded(currentWord, text, () => {
                // This will be called if resync is needed
                clearAllTimers();
                resolve(); // Resolve so caller can restart
              });
            }
          } catch (error) {
            console.error('Error in sync check:', error);
          }
        }, 800);

        // Start speaking with a retry mechanism
        const attemptSpeech = (attempts = 0) => {
          if (attempts >= 3) {
            console.error('Failed to start speech after multiple attempts');
            clearAllTimers();
            reject(new Error('Failed to start speech'));
            return;
          }
          
          try {
            window.speechSynthesis.speak(utterance);
            
            // Verify speech started successfully
            setTimeout(() => {
              if (!window.speechSynthesis.speaking) {
                console.warn(`Speech failed to start, retry attempt ${attempts + 1}`);
                resetSpeechEngine();
                attemptSpeech(attempts + 1);
              }
            }, 200);
          } catch (error) {
            console.error('Error starting speech:', error);
            setTimeout(() => attemptSpeech(attempts + 1), 300);
          }
        };
        
        attemptSpeech();

        // Set reasonable maximum duration with proper calculation
        const estimatedDuration = calculateSpeechDuration(text);
        const maxDuration = Math.min(Math.max(estimatedDuration * 1.5, 15000), 120000);
        
        maxDurationTimeout = window.setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('Maximum duration reached, stopping speech');
            window.speechSynthesis.cancel();
            clearAllTimers();
            resolve();
          }
        }, maxDuration);
      } catch (err) {
        console.error('Error in speech setup:', err);
        reject(err);
      }
    };

    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        setVoiceAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
      
      // Fallback if voices don't load within a timeout
      setTimeout(() => {
        if (!utterance.voice) {
          voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            setVoiceAndSpeak();
          } else {
            reject(new Error('Could not load voices'));
          }
        }
      }, 1000);
    }
  });
};

export {
  findFallbackVoice,
  getVoiceByRegion,
  calculateSpeechDuration,
  isSpeechSynthesisSupported,
  stopSpeaking,
  checkSoundDisplaySync,
  keepSpeechAlive,
  waitForSpeechReadiness,
  resetSpeechEngine,
  validateCurrentSpeech,
  forceResyncIfNeeded,
  ensureSpeechEngineReady,
  extractMainWord
};
