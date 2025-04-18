
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceManager } from './useVoiceManager';
import { 
  initializeSpeechSynthesis, 
  createUtterance, 
  cancelSpeech,
  resetSpeechSynthesis,
  handleVisibilityChange
} from '@/utils/speechUtils';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const speakingRef = useRef(false);
  const lastAttemptRef = useRef<string | null>(null);
  const { toast } = useToast();
  
  const { isVoicesLoaded, availableVoices, selectVoiceByRegion } = useVoiceManager();

  // Reset the speech synthesis service on visibility change (Firefox/Chrome fix)
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Periodically reset speech synthesis to prevent browser issues
  useEffect(() => {
    const resetInterval = setInterval(() => {
      if (!speakingRef.current) {
        resetSpeechSynthesis();
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(resetInterval);
  }, []);

  // Force a speech synthesis update when voice region changes
  useEffect(() => {
    if (voiceRegion && isVoicesLoaded) {
      resetSpeechSynthesis();
    }
  }, [voiceRegion, isVoicesLoaded]);

  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text) {
      return Promise.resolve();
    }

    // Avoid concurrent speech
    if (speakingRef.current) {
      cancelSpeech();
      // Allow a small delay for the cancel to complete
      return new Promise(resolve => {
        setTimeout(() => {
          speakingRef.current = false;
          resolve();
        }, 100);
      });
    }

    // Avoid speaking the same text twice in a row (prevents loops)
    const textIdentifier = text.slice(0, 50);
    if (lastAttemptRef.current === textIdentifier) {
      console.log("Avoiding speaking the same text twice");
      return Promise.resolve();
    }
    
    lastAttemptRef.current = textIdentifier;

    return new Promise((resolve, reject) => {
      try {
        const synth = initializeSpeechSynthesis();
        
        // Reset any ongoing speech
        cancelSpeech();
        
        // Allow a small delay for the cancel to complete
        setTimeout(() => {
          try {
            // Avoid concurrent speech
            speakingRef.current = true;
            
            // Get voice for the current region or a fallback
            const voice = selectVoiceByRegion(voiceRegion);
            console.log(`Selected voice for ${voiceRegion}:`, voice?.name || "No voice found");
            
            // Create an utterance with the selected voice and fallback options
            const utterance = createUtterance(text, voice, availableVoices);
            
            utterance.onend = () => {
              console.log("Speech completed successfully");
              speakingRef.current = false;
              resolve();
            };
            
            utterance.onerror = (event) => {
              console.error("Speech error:", event);
              speakingRef.current = false;
              
              // Notify user about the issue
              toast({
                title: "Speech issue",
                description: "Trying with a different voice...",
              });
              
              // Try again with a different voice region
              const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
              const fallbackVoice = selectVoiceByRegion(newRegion);
              
              if (fallbackVoice) {
                // Create a new utterance with the fallback voice
                const fallbackUtterance = createUtterance(text, fallbackVoice, availableVoices);
                
                fallbackUtterance.onend = () => {
                  console.log("Fallback speech completed");
                  speakingRef.current = false;
                  resolve();
                };
                
                fallbackUtterance.onerror = () => {
                  console.error("Fallback speech also failed");
                  speakingRef.current = false;
                  reject(new Error("Speech synthesis failed with all voices"));
                };
                
                // Try with the fallback voice
                setTimeout(() => {
                  synth.speak(fallbackUtterance);
                }, 200);
              } else {
                reject(event);
              }
            };
            
            console.log("Attempting to speak:", text.substring(0, 50) + "...");
            synth.speak(utterance);
            
            // Safety timeout in case onend/onerror don't fire
            setTimeout(() => {
              if (speakingRef.current) {
                console.log("Safety timeout reached, resetting speech state");
                speakingRef.current = false;
                resolve();
              }
            }, 15000);
          } catch (innerError) {
            console.error("Error during speech attempt:", innerError);
            speakingRef.current = false;
            reject(innerError);
          }
        }, 100);
      } catch (outerError) {
        console.error("Error setting up speech:", outerError);
        speakingRef.current = false;
        reject(outerError);
      }
    });
  }, [isMuted, voiceRegion, availableVoices, selectVoiceByRegion, toast, isVoicesLoaded]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      if (newValue) {
        cancelSpeech();
        speakingRef.current = false;
      }
      return newValue;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => {
      const newRegion = prev === 'US' ? 'UK' : 'US';
      
      // Reset the speech state
      cancelSpeech();
      speakingRef.current = false;
      
      // Reset the last attempt so we can speak again with the new voice
      lastAttemptRef.current = null;
      
      return newRegion;
    });
  }, []);

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded
  };
};
