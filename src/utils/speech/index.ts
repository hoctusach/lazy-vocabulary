
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
  extractMainWord,
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume,
  prepareTextForSpeech,
  addPausesToText
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

    // Prepare text for better speech quality
    const processedText = addPausesToText(prepareTextForSpeech(text));

    // Store the current text being spoken for sync checking
    try {
      localStorage.setItem('currentTextBeingSpoken', processedText);
    } catch (error) {
      console.error('Error saving current text to localStorage:', error);
    }

    // Make sure we have full speech readiness before starting
    await ensureSpeechEngineReady();
    
    // A small delay to ensure speech engine is fully ready
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const utterance = new SpeechSynthesisUtterance(processedText);
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
        
        // Apply the slower speech rate
        utterance.rate = getSpeechRate();
        utterance.pitch = getSpeechPitch();
        utterance.volume = getSpeechVolume();
        
        let keepAliveInterval: number | null = null;
        let maxDurationTimeout: number | null = null;
        let syncCheckInterval: number | null = null;
        
        const clearAllTimers = () => {
          if (keepAliveInterval !== null) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          if (maxDurationTimeout !== null) {
            clearTimeout(maxDurationTimeout);
            maxDurationTimeout = null;
          }
          if (syncCheckInterval !== null) {
            clearInterval(syncCheckInterval);
            syncCheckInterval = null;
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

        // Make sure speech system is ready before we begin
        await waitForSpeechReadiness();
        
        // More frequent keep-alive interval
        keepAliveInterval = window.setInterval(() => {
          if (window.speechSynthesis.speaking) {
            keepSpeechAlive();
          } else {
            clearInterval(keepAliveInterval as number);
            keepAliveInterval = null;
          }
        }, 100); // Very frequent checks for maximum stability
        
        // More frequent sync checking
        syncCheckInterval = window.setInterval(() => {
          try {
            const currentWord = localStorage.getItem('currentDisplayedWord');
            if (currentWord) {
              forceResyncIfNeeded(currentWord, processedText, () => {
                // This will be called if resync is needed
                clearAllTimers();
                resolve(); // Resolve so caller can restart
              });
            }
          } catch (error) {
            console.error('Error in sync check:', error);
          }
        }, 600);

        // Start speaking with a robust retry mechanism
        // Made this function async to fix the await error
        const attemptSpeech = async (attempts = 0) => {
          if (attempts >= 4) { // Increased retry attempts
            console.error('Failed to start speech after multiple attempts');
            clearAllTimers();
            reject(new Error('Failed to start speech'));
            return;
          }
          
          try {
            // Ensure engine is in a clean state before starting
            if (attempts > 0) {
              window.speechSynthesis.cancel();
              // Longer delay between retries for stability
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            window.speechSynthesis.speak(utterance);
            
            // Verify speech started successfully with longer verification time
            setTimeout(() => {
              if (!window.speechSynthesis.speaking) {
                console.warn(`Speech failed to start, retry attempt ${attempts + 1}`);
                resetSpeechEngine();
                attemptSpeech(attempts + 1);
              }
            }, 400); // Longer verification window
          } catch (error) {
            console.error('Error starting speech:', error);
            setTimeout(() => attemptSpeech(attempts + 1), 500);
          }
        };
        
        // Call the async function without await since we handle completion via the utterance events
        attemptSpeech();

        // Set reasonable maximum duration with proper calculation
        const estimatedDuration = calculateSpeechDuration(text, getSpeechRate());
        const maxDuration = Math.min(Math.max(estimatedDuration * 2.0, 20000), 180000);
        
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
      }, 1500); // Longer timeout for voice loading
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
  extractMainWord,
  getSpeechRate,
  getSpeechPitch,
  getSpeechVolume,
  prepareTextForSpeech,
  addPausesToText
};
