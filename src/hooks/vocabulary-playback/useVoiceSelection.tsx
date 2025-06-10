
import { useState, useEffect } from 'react';

// Hard-coded voice names from previously working version
const US_VOICE_NAME = "Samantha";
const UK_VOICE_NAME = "Google UK English Female";
const AU_VOICE_NAMES = [
  "Google AU English Female",
  "Google AU English Male",
  "Karen"
];

export type VoiceOption = {
  label: string;
  region: 'US' | 'UK' | 'AU';
  gender: 'male' | 'female';
  voice: SpeechSynthesisVoice | null;
};

// Define voice types with consistent structure
export interface VoiceSelection {
  label: string;
  region: 'US' | 'UK' | 'AU';
  gender: 'male' | 'female';
  index: number;
}

// Simplified voice options - only using female voices since those are the ones we've identified
const VOICE_OPTIONS: VoiceSelection[] = [
  { label: "US", region: "US", gender: "female", index: 0 },
  { label: "UK", region: "UK", gender: "female", index: 1 },
  { label: "AU", region: "AU", gender: "female", index: 2 },
];

const DEFAULT_VOICE_OPTION: VoiceSelection = VOICE_OPTIONS[0];

export const useVoiceSelection = () => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceSelection>(DEFAULT_VOICE_OPTION);
  const [voiceIndex, setVoiceIndex] = useState<number>(0);
  
  // Load available voices when the component mounts
  useEffect(() => {
    // Try to load saved preferences for voice
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { voiceIndex } = JSON.parse(savedSettings);
        
        if (typeof voiceIndex === 'number' && voiceIndex >= 0 && voiceIndex < VOICE_OPTIONS.length) {
          setVoiceIndex(voiceIndex);
          setSelectedVoice(VOICE_OPTIONS[voiceIndex]);
          console.log(`Found saved voice preference: ${VOICE_OPTIONS[voiceIndex].label}`);
        }
      }
    } catch (error) {
      console.error('Error loading saved voice settings:', error);
    }
    
    // Initialize voice loading
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      const availableVoices = synth.getVoices();
      
      console.log(`Loading ${availableVoices.length} voices`);
      
      if (availableVoices.length) {
        // Look specifically for our hardcoded voices
        const usVoice = availableVoices.find(v => v.name === US_VOICE_NAME) || 
                       availableVoices.find(v => v.name.includes(US_VOICE_NAME)) ||
                       availableVoices.find(v => v.lang === 'en-US');
                       
        const ukVoice = availableVoices.find(v => v.name === UK_VOICE_NAME) ||
                       availableVoices.find(v => v.name.includes(UK_VOICE_NAME)) ||
                       availableVoices.find(v => v.lang === 'en-GB');

        let auVoice: SpeechSynthesisVoice | undefined;
        for (const auName of AU_VOICE_NAMES) {
          auVoice =
            availableVoices.find(v => v.name === auName) ||
            availableVoices.find(v => v.name.includes(auName));
          if (auVoice) break;
        }
        if (!auVoice) {
          auVoice = availableVoices.find(v => v.lang === 'en-AU');
        }
        
        // Create simplified voice options
        const voiceOptions: VoiceOption[] = [
          {
            label: "US",
            region: "US" as const,
            gender: "female" as const,
            voice: usVoice || null
          },
          {
            label: "UK",
            region: "UK" as const,
            gender: "female" as const,
            voice: ukVoice || null
          },
          {
            label: "AU",
            region: "AU" as const,
            gender: "female" as const,
            voice: auVoice || null
          }
        ];
        
        console.log('Voice options created:');
        console.log(`US voice: ${voiceOptions[0].voice?.name || 'not found'}`);
        console.log(`UK voice: ${voiceOptions[1].voice?.name || 'not found'}`);
        console.log(`AU voice: ${voiceOptions[2].voice?.name || 'not found'}`);
        
        setVoices(voiceOptions);
        
        // Try to restore saved voice preference
        try {
          const savedSettings = localStorage.getItem('vocabularySettings');
          if (savedSettings) {
            const { voiceIndex } = JSON.parse(savedSettings);
            if (typeof voiceIndex === 'number' && voiceIndex >= 0 && voiceIndex < VOICE_OPTIONS.length) {
              console.log(`Restoring saved voice: ${VOICE_OPTIONS[voiceIndex].label}`);
              setVoiceIndex(voiceIndex);
              setSelectedVoice(VOICE_OPTIONS[voiceIndex]);
            }
          }
        } catch (error) {
          console.error('Error restoring voice preference:', error);
        }
      }
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
  
  // Function to cycle through available voices
  const cycleVoice = () => {
    const nextIndex = (voiceIndex + 1) % VOICE_OPTIONS.length;
    const nextVoice = VOICE_OPTIONS[nextIndex];
    
    console.log(`Cycling voice from ${selectedVoice.label} to ${nextVoice.label}`);
    setVoiceIndex(nextIndex);
    setSelectedVoice(nextVoice);
    
    // Save the preference
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      localStorage.setItem('vocabularySettings', JSON.stringify({
        ...settings,
        voiceIndex: nextIndex
      }));
    } catch (error) {
      console.error('Error saving voice preference:', error);
    }
  };
  
  return {
    voices,
    selectedVoice,
    cycleVoice,
    voiceIndex,
    allVoiceOptions: VOICE_OPTIONS
  };
};
