
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
  forceResyncIfNeeded
} from './synthesisUtils';

export const speak = (text: string, region: 'US' | 'UK' = 'US'): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
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

    window.speechSynthesis.cancel();
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
        
        // Slow down speech rate for better clarity
        utterance.rate = 0.85;
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
            clearAllTimers();
          }
        }, 200); // Increased frequency for stability
        
        // Add regular sync checking
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
        }, 1000);

        window.speechSynthesis.speak(utterance);

        // Set reasonable maximum duration
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
  forceResyncIfNeeded
};
