
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');
  const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();
  const speakingRef = useRef(false);

  // Initialize speech synthesis and load voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        console.log("Speech voices loaded:", voices.length);
        setAvailableVoices(voices);
        setIsVoicesLoaded(true);
        
        toast({
          title: "Speech Ready",
          description: "Using browser's text-to-speech",
        });
      }
    };

    // Initial load attempt
    loadVoices();
    
    // Chrome loads voices asynchronously
    if ('onvoiceschanged' in synth) {
      synth.addEventListener('voiceschanged', loadVoices);
    }
    
    // Periodic voice loading check (some browsers need this)
    const voiceCheckInterval = setInterval(() => {
      if (!isVoicesLoaded) {
        const voices = synth.getVoices();
        if (voices.length > 0) {
          loadVoices();
        }
      }
    }, 1000);
    
    return () => {
      synth.cancel();
      if ('onvoiceschanged' in synth) {
        synth.removeEventListener('voiceschanged', loadVoices);
      }
      clearInterval(voiceCheckInterval);
    };
  }, [toast, isVoicesLoaded]);

  // Firefox needs this workaround to ensure speech works
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Main function to speak text
  const speakText = useCallback((text: string): Promise<void> => {
    if (isMuted || !text || speakingRef.current) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      
      // Reset any ongoing speech
      synth.cancel();
      
      // Avoid concurrent speech
      speakingRef.current = true;
      
      // Split text into chunks to avoid browser limitations
      const chunks = splitTextIntoChunks(text);
      let currentChunk = 0;
      
      const speakNextChunk = () => {
        if (currentChunk >= chunks.length) {
          speakingRef.current = false;
          resolve();
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(chunks[currentChunk]);
        
        // Select voice based on region preference
        const preferredVoice = findPreferredVoice(availableVoices, voiceRegion);
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          utterance.rate = 0.9; // Slightly slower for better clarity
          utterance.pitch = 1.0;
        }
        
        utterance.onend = () => {
          console.log(`Chunk ${currentChunk + 1}/${chunks.length} completed`);
          currentChunk++;
          speakNextChunk();
        };
        
        utterance.onerror = (event) => {
          console.error("Speech error:", event);
          
          // Try a fallback voice if available
          if (currentChunk === 0 && preferredVoice && availableVoices.length > 1) {
            const fallbackVoice = availableVoices.find(v => v !== preferredVoice);
            if (fallbackVoice) {
              console.log("Trying fallback voice:", fallbackVoice.name);
              utterance.voice = fallbackVoice;
              synth.speak(utterance);
              return;
            }
          }
          
          toast({
            title: "Speech Error",
            description: "There was an issue with the text-to-speech. Please try again.",
            variant: "destructive"
          });
          
          speakingRef.current = false;
          reject(event);
        };
        
        console.log(`Speaking chunk ${currentChunk + 1}/${chunks.length} with ${preferredVoice?.name || 'default voice'}`);
        synth.speak(utterance);
      };
      
      speakNextChunk();
    });
  }, [isMuted, voiceRegion, toast, availableVoices]);

  // Helper function to find the best voice based on user preference
  const findPreferredVoice = (voices: SpeechSynthesisVoice[], region: 'US' | 'UK'): SpeechSynthesisVoice | undefined => {
    // Try to find a voice that matches the requested region
    const regionCode = region === 'US' ? 'en-US' : 'en-GB';
    
    // Look for voices with exact language match
    let match = voices.find(voice => 
      voice.lang.toLowerCase().startsWith(regionCode.toLowerCase()) && !voice.localService
    );
    
    // If no match, try any voice with the right language base
    if (!match) {
      match = voices.find(voice => 
        voice.lang.toLowerCase().startsWith('en') && !voice.localService
      );
    }
    
    // Last resort: use any available voice
    if (!match && voices.length > 0) {
      match = voices[0];
    }
    
    return match;
  };

  // Helper function to split text into manageable chunks
  // (WebSpeech API has limitations on text length)
  const splitTextIntoChunks = (text: string): string[] => {
    const MAX_CHUNK_LENGTH = 150;
    if (text.length <= MAX_CHUNK_LENGTH) return [text];
    
    const chunks: string[] = [];
    let currentChunk = "";
    
    // Split by sentences if possible
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= MAX_CHUNK_LENGTH) {
        currentChunk += (currentChunk ? " " : "") + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        
        // If a single sentence is too long, split it further
        if (sentence.length > MAX_CHUNK_LENGTH) {
          const words = sentence.split(" ");
          currentChunk = "";
          
          for (const word of words) {
            if (currentChunk.length + word.length + 1 <= MAX_CHUNK_LENGTH) {
              currentChunk += (currentChunk ? " " : "") + word;
            } else {
              chunks.push(currentChunk);
              currentChunk = word;
            }
          }
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  };

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newValue = !prev;
      console.log("Mute toggled:", newValue);
      if (newValue) {
        window.speechSynthesis.cancel();
        speakingRef.current = false;
      }
      return newValue;
    });
  }, []);

  const handleChangeVoice = useCallback(() => {
    setVoiceRegion(prev => {
      const newValue = prev === 'US' ? 'UK' : 'US';
      console.log("Voice region changed to:", newValue);
      return newValue;
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
