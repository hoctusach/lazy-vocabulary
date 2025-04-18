
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceManager } from './useVoiceManager';
import { 
  initializeSpeechSynthesis, 
  createUtterance, 
  cancelSpeech,
  resetSpeechSynthesis
} from '@/utils/speechUtils';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const speakingRef = useRef(false);
  const lastAttemptRef = useRef<string | null>(null);
  const { toast } = useToast();
  
  const { isVoicesLoaded, availableVoices, selectVoiceByRegion } = useVoiceManager();

  // Reset the speech synthesis service on visibility change (Firefox fix)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetSpeechSynthesis();
      }
    };

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

  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text || speakingRef.current) {
      return Promise.resolve();
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
              
              // Try with a fallback
              toast({
                title: "Speech system issue",
                description: "Trying a different voice...",
              });
              
              // Clear speaking flag to allow a retry with different voice
              reject(event);
            };
            
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
  }, [isMuted, voiceRegion, availableVoices, selectVoiceByRegion, toast]);

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
