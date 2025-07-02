
import { useState, useEffect } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { PREFERRED_VOICE_KEY } from '@/utils/storageKeys';
import {
  US_VOICE_NAME,
  UK_VOICE_NAME,
  AU_VOICE_NAMES
} from '@/utils/speech/voiceNames';


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

const DEFAULT_VOICE_OPTION: VoiceSelection = VOICE_OPTIONS[1];

export const useVoiceSelection = () => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceSelection>(DEFAULT_VOICE_OPTION);
  const [voiceIndex, setVoiceIndex] = useState<number>(1);
  
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
      logAvailableVoices(availableVoices);
      
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

        try {
          const storedName = localStorage.getItem(PREFERRED_VOICE_KEY);
          const matched = storedName
            ? voiceOptions.find(v => v.voice?.name === storedName)
            : null;

          if (matched) {
            setVoiceIndex(matched.index);
            setSelectedVoice({
              label: matched.label,
              region: matched.region,
              gender: matched.gender,
              index: matched.index
            });
            console.log(`Restored voice from localStorage: ${matched.voice?.name}`);
          } else {
            const savedSettings = localStorage.getItem('vocabularySettings');
            if (savedSettings) {
              const { voiceIndex } = JSON.parse(savedSettings);
              if (
                typeof voiceIndex === 'number' &&
                voiceIndex >= 0 &&
                voiceIndex < VOICE_OPTIONS.length
              ) {
                setVoiceIndex(voiceIndex);
                setSelectedVoice(VOICE_OPTIONS[voiceIndex]);
                console.log(`Restoring saved voice: ${VOICE_OPTIONS[voiceIndex].label}`);
              }
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

  // Persist selected voice name whenever it changes
  useEffect(() => {
    const voiceName = voices[voiceIndex]?.voice?.name;
    if (voiceName) {
      localStorage.setItem(PREFERRED_VOICE_KEY, voiceName);
    }
  }, [voiceIndex, voices]);
  
  // Function to cycle through available voices in the desired order
  const cycleVoice = () => {
    const currentRegion = selectedVoice.region;
    const nextRegion =
      currentRegion === 'UK' ? 'US' : currentRegion === 'US' ? 'AU' : 'US';
    const nextVoice = VOICE_OPTIONS.find(v => v.region === nextRegion)!;

    console.log(
      `Cycling voice from ${selectedVoice.label} to ${nextVoice.label}`
    );
    setVoiceIndex(nextVoice.index);
    setSelectedVoice(nextVoice);

    // Save the preference
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      localStorage.setItem('vocabularySettings', JSON.stringify({
        ...settings,
        voiceIndex: nextVoice.index
      }));
      const voiceName = voices[nextVoice.index]?.voice?.name;
      if (voiceName) {
        localStorage.setItem(PREFERRED_VOICE_KEY, voiceName);
      }
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
