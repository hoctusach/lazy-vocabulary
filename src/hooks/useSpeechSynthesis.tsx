
import { useState, useCallback, useEffect, useRef } from 'react';
import { speak, stopSpeaking, isSpeechSynthesisSupported, getVoiceByRegion } from '@/utils/speech';

export const useSpeechSynthesis = () => {
  // Try to get stored state from localStorage
  const getInitialStates = () => {
    try {
      const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        return {
          initialMuted: parsedStates.isMuted === true,
          initialVoiceRegion: (parsedStates.voiceRegion === 'UK' ? 'UK' : 'US') as 'US' | 'UK'
        };
      }
    } catch (error) {
      console.error('Error reading button states from localStorage:', error);
    }
    return { initialMuted: false, initialVoiceRegion: 'US' };
  };

  const { initialMuted, initialVoiceRegion } = getInitialStates();

  const [isMuted, setIsMuted] = useState(initialMuted);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>(initialVoiceRegion);
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const speakingRef = useRef(false);
  const speechRequestIdRef = useRef(0);
  const currentVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesLoadedTimeoutRef = useRef<number | null>(null);
  const lastVoiceRegionRef = useRef<'US' | 'UK'>(initialVoiceRegion);
  const pendingSpeechRef = useRef<{text: string, forceSpeak: boolean} | null>(null);
  const currentTextRef = useRef<string | null>(null);

  // Check if speech synthesis is supported
  useEffect(() => {
    const supported = isSpeechSynthesisSupported();
    if (!supported) {
      console.warn("Your browser doesn't support speech synthesis.");
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
        
        // If there's pending speech, process it now
        if (pendingSpeechRef.current && !isMuted) {
          const { text, forceSpeak } = pendingSpeechRef.current;
          pendingSpeechRef.current = null;
          setTimeout(() => {
            speakText(text).catch(console.error);
          }, 200);
        }
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
            const retryTimes = [300, 600, 900, 1200];
            retryTimes.forEach((delay, index) => {
              voicesLoadedTimeoutRef.current = window.setTimeout(() => {
                const success = loadVoices();
                if (success) {
                  console.log(`Voices loaded on attempt ${index + 1}`);
                }
              }, delay);
            });
          }
        }, 300);
        
        return () => {
          clearTimeout(timerId);
          if (voicesLoadedTimeoutRef.current) {
            clearTimeout(voicesLoadedTimeoutRef.current);
          }
        };
      }
    }
  }, [voiceRegion, isMuted]);

  // Update voice when region changes
  useEffect(() => {
    if (isVoicesLoaded) {
      stopSpeaking(); // Cancel any ongoing speech
      currentVoiceRef.current = getVoiceByRegion(voiceRegion);
      console.log(`Voice region changed to ${voiceRegion}`);
      
      // Save the voice region to localStorage
      try {
        const storedStates = localStorage.getItem('buttonStates');
        const parsedStates = storedStates ? JSON.parse(storedStates) : {};
        parsedStates.voiceRegion = voiceRegion;
        localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
      } catch (error) {
        console.error('Error saving voice region to localStorage:', error);
      }
      
      // Update last voice region reference
      lastVoiceRegionRef.current = voiceRegion;
    }
  }, [voiceRegion, isVoicesLoaded]);

  // Update mute state in localStorage when it changes
  useEffect(() => {
    try {
      const storedStates = localStorage.getItem('buttonStates');
      const parsedStates = storedStates ? JSON.parse(storedStates) : {};
      parsedStates.isMuted = isMuted;
      localStorage.setItem('buttonStates', JSON.stringify(parsedStates));
    } catch (error) {
      console.error('Error saving mute state to localStorage:', error);
    }
  }, [isMuted]);

  // Speak function with full promise handling to ensure completion
  const speakText = useCallback(async (text: string): Promise<void> => {
    // Save the current text being spoken
    currentTextRef.current = text;
    
    if (!isVoicesLoaded) {
      console.log('Voices not loaded yet, queueing speech for later');
      pendingSpeechRef.current = { text, forceSpeak: true };
      return Promise.resolve();
    }

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
    } finally {
      // Only mark as not speaking when done with this specific request
      if (requestId === speechRequestIdRef.current) {
        speakingRef.current = false;
      }
    }
  }, [isMuted, voiceRegion, isVoicesLoaded]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      stopSpeaking();
      console.log(`Mute state changed to: ${newState}`);
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

  const getCurrentText = useCallback(() => {
    return currentTextRef.current;
  }, []);

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    speakingRef,
    getCurrentText
  };
};
