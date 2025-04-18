
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

    // Prepare text for better speech quality with more pauses
    const processedText = addPausesToText(prepareTextForSpeech(text));
    
    console.log('Speaking with processed text:', processedText.substring(0, 100) + '...');

    // Store the current text being spoken for sync checking
    try {
      localStorage.setItem('currentTextBeingSpoken', processedText);
    } catch (error) {
      console.error('Error saving current text to localStorage:', error);
    }

    // Make sure we have full speech readiness before starting
    await ensureSpeechEngineReady();
    
    // A longer delay to ensure speech engine is fully ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const utterance = new SpeechSynthesisUtterance(processedText);
    let voices = window.speechSynthesis.getVoices();
    
    const setVoiceAndSpeak = async () => {
      try {
        // First cancel any previous speech to avoid overlap
        stopSpeaking();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const langCode = region === 'US' ? 'en-US' : 'en-GB';
        console.log(`Using voice region: ${region}, language code: ${langCode}`);
        
        const voice = getVoiceByRegion(region);
        
        if (voice) {
          console.log(`Found voice: ${voice.name} (${voice.lang})`);
          utterance.voice = voice;
          utterance.lang = langCode;
        } else {
          console.warn('No suitable voice found, using default');
          utterance.lang = langCode;
        }
        
        // Apply the much slower speech rate
        utterance.rate = getSpeechRate();
        utterance.pitch = getSpeechPitch();
        utterance.volume = getSpeechVolume();
        
        console.log(`Speech settings: rate=${utterance.rate}, pitch=${utterance.pitch}, volume=${utterance.volume}`);
        
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

        // More frequent keep-alive interval
        keepAliveInterval = window.setInterval(() => {
          if (window.speechSynthesis.speaking) {
            keepSpeechAlive();
          } else {
            clearInterval(keepAliveInterval as number);
            keepAliveInterval = null;
          }
        }, 50); // Extremely frequent checks 
        
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
        }, 400);

        // More robust speech attempt function
        const attemptSpeech = async (attempts = 0): Promise<void> => {
          if (attempts >= 3) {
            console.error('Failed to start speech after multiple attempts');
            clearAllTimers();
            reject(new Error('Failed to start speech'));
            return;
          }
          
          try {
            // Ensure clean speech engine state
            if (attempts > 0) {
              window.speechSynthesis.cancel();
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Speak with improved stability checks
            window.speechSynthesis.speak(utterance);
            
            // Verify speech started
            await new Promise<void>((resolveStart, rejectStart) => {
              setTimeout(() => {
                if (window.speechSynthesis.speaking) {
                  resolveStart();
                } else {
                  console.warn(`Speech failed to start, retry attempt ${attempts + 1}`);
                  rejectStart(new Error('Speech not started'));
                }
              }, 500);
            });
          } catch (error) {
            console.error('Speech start error:', error);
            await new Promise(resolve => setTimeout(resolve, 500));
            await attemptSpeech(attempts + 1);
          }
        };
        
        // Call the improved speech attempt
        await attemptSpeech();

        // Set reasonable maximum duration with proper calculation
        const estimatedDuration = calculateSpeechDuration(text, getSpeechRate());
        const maxDuration = Math.min(Math.max(estimatedDuration * 1.5, 30000), 120000);
        
        console.log(`Estimated speech duration: ${estimatedDuration}ms, Max duration: ${maxDuration}ms`);
        
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
      console.log('No voices loaded yet, waiting for voices to load...');
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded: ${voices.length} voices available`);
        setVoiceAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
      
      // Fallback if voices don't load within a timeout
      setTimeout(() => {
        if (!utterance.voice) {
          console.log('Voice loading timeout reached, trying again...');
          voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            console.log(`Found ${voices.length} voices on fallback`);
            setVoiceAndSpeak();
          } else {
            console.error('Could not load any voices, rejecting');
            reject(new Error('Could not load voices'));
          }
        }
      }, 2000); // Longer timeout for voice loading
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
