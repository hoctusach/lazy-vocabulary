
import { getVoiceByRegion, findFallbackVoice } from './voiceUtils';
import { calculateSpeechDuration } from './durationUtils';
import { isSpeechSynthesisSupported, stopSpeaking } from './synthesisUtils';

export const speak = (text: string, region: 'US' | 'UK' = 'US'): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Cancel any ongoing speech immediately
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    let voices = window.speechSynthesis.getVoices();
    console.log(`Speaking with ${region} accent, available voices: ${voices.length}`);
    
    // Function to set voice
    const setVoiceAndSpeak = () => {
      try {
        const langCode = region === 'US' ? 'en-US' : 'en-GB';
        const voice = getVoiceByRegion(region);
        
        if (voice) {
          console.log(`Using voice: ${voice.name} (${voice.lang}) for region ${region}`);
          utterance.voice = voice;
          utterance.lang = langCode;
        } else {
          console.warn('No suitable voice found, using default browser voice');
        }
        
        // Configure speech parameters - reduced rate for better reliability
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        let keepAliveInterval: number | null = null;
        let maxDurationTimeout: number | null = null;
        
        const clearAllTimers = () => {
          if (keepAliveInterval !== null) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          if (maxDurationTimeout !== null) {
            clearTimeout(maxDurationTimeout);
            maxDurationTimeout = null;
          }
        };
        
        utterance.onend = () => {
          console.log('Speech completed successfully');
          clearAllTimers();
          resolve();
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          clearAllTimers();
          if (event.error === 'canceled' || event.error === 'interrupted') {
            console.log('Speech was canceled or interrupted, resolving anyway');
            resolve();
          } else {
            reject(new Error(`Speech error: ${event.error}`));
          }
        };
        
        console.log('Starting speech with', region, 'accent:', text.substring(0, 30) + '...');
        
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        
        window.speechSynthesis.speak(utterance);
        
        // Keep speech synthesis alive for long text - more frequent checks
        keepAliveInterval = window.setInterval(() => {
          if (window.speechSynthesis.speaking) {
            console.log("Keeping speech synthesis alive...");
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearAllTimers();
          }
        }, 2000); // More frequent interval for better reliability
        
        // Set maximum speech duration to prevent blocking
        const estimatedDuration = calculateSpeechDuration(text);
        const maxDuration = Math.min(Math.max(estimatedDuration * 1.5, 20000), 90000);
        
        maxDurationTimeout = window.setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log(`Maximum speech duration reached (${maxDuration}ms), stopping speech`);
            window.speechSynthesis.cancel();
            clearAllTimers();
            resolve();
          }
        }, maxDuration);
      } catch (err) {
        console.error('Error while setting up speech:', err);
        reject(err);
      }
    };
    
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        console.log(`Voices loaded asynchronously: ${voices.length}`);
        setVoiceAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
      
      // Shorter timeout for faster voice loading
      setTimeout(() => {
        if (!utterance.voice) {
          voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            console.log('Using fallback voice loading method');
            setVoiceAndSpeak();
          } else {
            reject(new Error('Could not load voices'));
          }
        }
      }, 800); 
    }
  });
};

export {
  findFallbackVoice,
  getVoiceByRegion,
  calculateSpeechDuration,
  isSpeechSynthesisSupported,
  stopSpeaking,
};
