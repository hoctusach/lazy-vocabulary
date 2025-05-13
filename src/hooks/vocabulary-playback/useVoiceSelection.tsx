
import { useState, useEffect } from 'react';

export type VoiceOption = {
  label: string;
  region: 'US' | 'UK';
  gender: 'male' | 'female';
  voice: SpeechSynthesisVoice | null;
};

const DEFAULT_VOICE_OPTION: VoiceOption = {
  label: "US",
  region: "US" as const,
  gender: "female" as const,
  voice: null
};

export const useVoiceSelection = () => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(DEFAULT_VOICE_OPTION);
  
  // Load available voices when the component mounts
  useEffect(() => {
    // Try to load saved preferences for voice
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { voiceRegion } = JSON.parse(savedSettings);
        
        // We'll set the selected voice after loading the voice list
        if (voiceRegion) {
          console.log(`Found saved voice preference: ${voiceRegion}`);
        }
      }
    } catch (error) {
      console.error('Error loading saved voice settings:', error);
    }
    
    // Initialize voice loading
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      const availableVoices = synth.getVoices();
      
      if (availableVoices.length) {
        const voiceOptions: VoiceOption[] = [
          {
            label: "US",
            region: "US" as const,
            gender: "female" as const,
            voice: findVoice(availableVoices, "en-US")
          },
          {
            label: "UK",
            region: "UK" as const,
            gender: "female" as const,
            voice: findVoice(availableVoices, "en-GB")
          }
        ];
        
        setVoices(voiceOptions);
        
        // Try to restore saved voice preference
        try {
          const savedSettings = localStorage.getItem('vocabularySettings');
          if (savedSettings) {
            const { voiceRegion } = JSON.parse(savedSettings);
            const savedVoice = voiceOptions.find(v => v.region === voiceRegion);
            if (savedVoice) {
              setSelectedVoice(savedVoice);
            }
          }
        } catch (error) {
          console.error('Error restoring voice preference:', error);
        }
      }
    };

    // Find appropriate voice based on language
    const findVoice = (availableVoices: SpeechSynthesisVoice[], lang: string) => {
      // First try to find a voice with exact language match
      const voiceWithLang = availableVoices.find(voice => voice.lang.startsWith(lang));
      if (voiceWithLang) return voiceWithLang;
      
      // If all else fails, use any english voice
      return availableVoices.find(voice => voice.lang.startsWith('en')) || null;
    };

    // Try to load voices immediately
    loadVoices();
    
    // For browsers that load voices asynchronously
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    } else {
      // Fallback for browsers without onvoiceschanged event
      setTimeout(loadVoices, 500);
    }
    
    return () => {
      // Clean up
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);
  
  // Function to change voice selection
  const changeVoice = (voiceRegion: 'US' | 'UK') => {
    const selectedOption = voices.find(v => v.region === voiceRegion);
    if (selectedOption) {
      setSelectedVoice(selectedOption);
      // We DON'T cancel current speech when changing voice
      // It will apply on the next word as requested
    }
  };
  
  return {
    voices,
    selectedVoice,
    changeVoice
  };
};
