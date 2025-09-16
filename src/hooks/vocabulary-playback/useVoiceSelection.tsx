import { useState, useEffect } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { getFavoriteVoice, setFavoriteVoice } from '@/lib/preferences/localPreferences';

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
    // Initialize voice loading
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      const availableVoices = synth.getVoices();
      logAvailableVoices(availableVoices);
      
      console.log(`Loading ${availableVoices.length} voices`);
      
      if (availableVoices.length) {
        // Only keep voices with en-US, en-GB, en-AU language codes
        const filteredVoices = availableVoices.filter(v =>
          v.lang && (
            v.lang.toLowerCase().startsWith('en-us') ||
            v.lang.toLowerCase().startsWith('en-gb') ||
            v.lang.toLowerCase().startsWith('en-au')
          )
        );

        const usVoice = filteredVoices.find(v => v.lang.toLowerCase().startsWith('en-us')) || null;
        const ukVoice = filteredVoices.find(v => v.lang.toLowerCase().startsWith('en-gb')) || null;
        const auVoice = filteredVoices.find(v => v.lang.toLowerCase().startsWith('en-au')) || null;
        
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

        const storedName = getFavoriteVoice();
        const matched = storedName
          ? voiceOptions.find(v => v.voice?.name === storedName)
          : null;
        if (matched) {
          setVoiceIndex(matched.index);
          setSelectedVoice({
            label: matched.label,
            region: matched.region,
            gender: matched.gender,
            index: matched.index,
          });
          console.log(`Restored voice preference: ${matched.voice?.name}`);
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
      setFavoriteVoice(voiceName);
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

    const voiceName = voices[nextVoice.index]?.voice?.name;
    if (voiceName) {
      setFavoriteVoice(voiceName);
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
