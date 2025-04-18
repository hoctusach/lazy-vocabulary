
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { speak, stopSpeaking, isSpeechSynthesisSupported, getVoiceByRegion } from '@/utils/speechUtils';

export const useSpeechSynthesis = () => {
  // Try to get the initial mute state from localStorage
  const initialMuted = localStorage.getItem('isMuted') === 'true';
  const initialVoiceRegion = (localStorage.getItem('voiceRegion') as 'US' | 'UK') || 'US';

  const [isMuted, setIsMuted] = useState(initialMuted);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>(initialVoiceRegion);
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const { toast } = useToast();
  const speakingRef = useRef(false);
  const speechRequestIdRef = useRef(0);
  const currentVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesLoadedTimeoutRef = useRef<number | null>(null);
  const lastVoiceRegionRef = useRef<'US' | 'UK'>(initialVoiceRegion);

  // Save mute state to localStorage
  useEffect(() => {
    localStorage.setItem('isMuted', isMuted.toString());
  }, [isMuted]);

  // Save voice region preferences
  useEffect(() => {
    localStorage.setItem('voiceRegion', voiceRegion);
    lastVoiceRegionRef.current = voiceRegion;
  }, [voiceRegion]);

  // Check if speech synthesis is supported
  useEffect(() => {
    const supported = isSpeechSynthesisSupported();
    if (!supported) {
      toast({
        title: "Speech Not Supported",
        description: "Your browser doesn't support speech synthesis.",
        variant: "destructive"
      });
      return;
    }

    // Initialize voice loading
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('Voices loaded successfully:', voices.length);
        setIsVoicesLoaded(true);
        // Initialize current voice
        currentVoiceRef.current = getVoiceByRegion(voiceRegion);
        return true;
      }
      return false;
    };

    // First attempt to load voices
    const voicesLoaded = loadVoices();
    
    if (!voicesLoaded) {
      // Set up event listener for Chrome
      if ('onvoiceschanged' in window.speechSynthesis) {
        const voicesChangedHandler = () => {
          const success = loadVoices();
          if (success) {
            window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
          }
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
        
        // Clean up
        return () => {
          window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
        };
      } else {
        // For browsers without the event, try loading after a delay
        const timerId = setTimeout(() => {
          loadVoices();
          // If still no voices, make multiple attempts with increasing delays
          if (!isVoicesLoaded) {
            if (voicesLoadedTimeoutRef.current) {
              clearTimeout(voicesLoadedTimeoutRef.current);
            }
            
            // Try multiple times with different delays
            const retryTimes = [500, 1000, 2000, 3000];
            retryTimes.forEach((delay, index) => {
              voicesLoadedTimeoutRef.current = window.setTimeout(() => {
                const success = loadVoices();
                if (success) {
                  console.log(`Voices loaded on attempt ${index + 1}`);
                }
              }, delay);
            });
          }
        }, 500);
        
        return () => {
          clearTimeout(timerId);
          if (voicesLoadedTimeoutRef.current) {
            clearTimeout(voicesLoadedTimeoutRef.current);
          }
        };
      }
    }
  }, [toast, voiceRegion]);

  // Update voice when region changes
  useEffect(() => {
    if (isVoicesLoaded) {
      stopSpeaking(); // Cancel any ongoing speech
      currentVoiceRef.current = getVoiceByRegion(voiceRegion);
      console.log(`Voice region changed to ${voiceRegion}`);
      
      // Only announce change if not muted and if it's not the initial load
      if (!isMuted && lastVoiceRegionRef.current !== voiceRegion) {
        const testText = voiceRegion === 'US' ? 'American accent selected' : 'British accent selected';
        speak(testText, voiceRegion)
          .then(() => console.log('Voice region change announced'))
          .catch(err => console.warn('Could not announce voice region change:', err));
      }
      
      // Update last voice region reference
      lastVoiceRegionRef.current = voiceRegion;
    }
  }, [voiceRegion, isVoicesLoaded, isMuted]);

  // Speak function with full promise handling to ensure completion
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (isMuted || !text) {
      console.log(isMuted ? 'Speech is muted' : 'No text provided');
      return Promise.resolve(); // Resolve immediately if muted
    }

    // Only allow one speech at a time
    if (speakingRef.current) {
      console.log('Already speaking, canceling previous speech');
      stopSpeaking();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure cancellation completes
    }

    // Generate a unique ID for this speech request
    const requestId = ++speechRequestIdRef.current;
    
    speakingRef.current = true;
    console.log('Attempting to speak:', text.substring(0, 30) + '...', 'with voice region:', voiceRegion);
    
    try {
      // This will now properly wait until speech is complete
      await speak(text, voiceRegion);
      
      // Only mark as completed if this is still the current request
      if (requestId === speechRequestIdRef.current) {
        console.log('Speech completed successfully');
      }
    } catch (error) {
      console.error('Failed to speak text:', error);
      // Only show error for significant errors, not for cancellations
      if (error instanceof Error && 
          !error.message.includes('canceled') && 
          !error.message.includes('interrupted') &&
          !error.message.includes('muted')) {
        console.warn("Speech error but not showing toast:", error);
      }
    } finally {
      // Always mark as not speaking when done
      if (requestId === speechRequestIdRef.current) {
        speakingRef.current = false;
      }
    }
  }, [isMuted, voiceRegion]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      console.log(`Mute state changed to: ${newState}`);
      if (newState) {
        stopSpeaking();
      }
      return newState;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    stopSpeaking();
    setVoiceRegion(prev => {
      const newRegion = prev === 'US' ? 'UK' : 'US';
      console.log(`Changing voice region from ${prev} to ${newRegion}`);
      return newRegion;
    });
  }, []);

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    speakingRef
  };
};
