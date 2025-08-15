
import { useState, useEffect, useCallback } from 'react';
import { logAvailableVoices } from '@/utils/speech/debug/logVoices';
import { VoiceSelection } from '../useVoiceSelection';
import { toast } from 'sonner';

/**
 * Hook for managing voice selection and finding appropriate voices
 */
export const useVoiceManagement = () => {
  // Define voice options with consistent structure
  const allVoiceOptions: VoiceSelection[] = [
    { label: "US", region: "US", gender: "female", index: 0 },
    { label: "UK", region: "UK", gender: "female", index: 1 },
    { label: "AU", region: "AU", gender: "female", index: 2 }
  ];
  
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  // Create voice options array for UI - compatibility format
  const voices = [
    { label: "US", region: "US" as const, gender: "female" as const, voice: null },
    { label: "UK", region: "UK" as const, gender: "female" as const, voice: null },
    { label: "AU", region: "AU" as const, gender: "female" as const, voice: null }
  ];
  
  // Load initial voice settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { voiceIndex: savedVoiceIndex } = JSON.parse(savedSettings);
        
        // Set voice index if valid
        if (typeof savedVoiceIndex === 'number' && savedVoiceIndex >= 0 && 
            savedVoiceIndex < allVoiceOptions.length) {
          setVoiceIndex(savedVoiceIndex);
        }
      }
    } catch (error) {
      console.error('Error loading saved voice settings:', error);
    }
    
    // Also try to preload voices
    const loadVoicesAndNotify = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      logAvailableVoices(availableVoices);
      if (availableVoices.length > 0) {
        console.log(`Voices loaded: found ${availableVoices.length} voices`);
        setVoicesLoaded(true);
        
        // Warn if no US or UK voices are available
        const hasUSVoice = availableVoices.some(v => v.lang && v.lang.toLowerCase().startsWith('en-us'));
        const hasUKVoice = availableVoices.some(v => v.lang && v.lang.toLowerCase().startsWith('en-gb'));

        if (!hasUSVoice || !hasUKVoice) {
          toast.warning('Some English voices may not be available. Speech quality might be affected.');
        }
      }
    };
    
    // Try to load voices right away
    loadVoicesAndNotify();
    
    // Set up event listener for async voice loading
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoicesAndNotify);
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoicesAndNotify);
      };
    }
  }, [allVoiceOptions]);
  
  // Function to find the appropriate voice with hardcoded names
  const findVoice = useCallback((region: 'US' | 'UK' | 'AU'): SpeechSynthesisVoice | null => {
    console.log(`Looking for ${region} voice`);
    
    // Always get fresh voices
    const allVoices = window.speechSynthesis.getVoices();
    logAvailableVoices(allVoices);
    console.log(`Finding voice among ${allVoices.length} voices`);
    
    if (allVoices.length === 0) {
      console.warn('No voices available');
      return null;
    }
    
    // Strategy 1: Match by language code
    const langCode = region === 'US' ? 'en-US' : region === 'UK' ? 'en-GB' : 'en-AU';
    let voice = allVoices.find(
      v => v.lang && v.lang.toLowerCase().startsWith(langCode.toLowerCase())
    );

    if (voice) {
      console.log(`Selected ${region} voice by language code: ${voice.name} (${voice.lang})`);
      return voice;
    }

    // Strategy 2: Any English voice
    voice = allVoices.find(v => v.lang && v.lang.startsWith('en'));
    
    if (voice) {
      console.log(`Selected any English voice for ${region}: ${voice.name} (${voice.lang})`);
      return voice;
    }
    
    // Strategy 5: First voice in the list
    if (allVoices.length > 0) {
      console.log('No suitable English voice found, using first available voice');
      return allVoices[0];
    }
    
    console.warn('No suitable voice found');
    return null;
  }, []);
  
  // Function to cycle through voices in the desired order
  const cycleVoice = useCallback(() => {
    setVoiceIndex(prevIndex => {
      const currentRegion = allVoiceOptions[prevIndex].region;
      const nextRegion =
        currentRegion === 'UK' ? 'US' : currentRegion === 'US' ? 'AU' : 'US';
      const nextIndex = allVoiceOptions.findIndex(v => v.region === nextRegion);

      console.log(
        `Cycling voice from ${allVoiceOptions[prevIndex].label} to ${allVoiceOptions[nextIndex].label}`
      );
      
      // Save to localStorage
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
      
      // Notify the user
      toast.success(`Voice changed to ${allVoiceOptions[nextIndex].label}`);
      
      return nextIndex;
    });
  }, [allVoiceOptions]);
  
  // Get the current selected voice
  const selectedVoice = allVoiceOptions[voiceIndex % allVoiceOptions.length];
  
  return {
    voices,
    voiceIndex,
    selectedVoice,
    allVoiceOptions,
    findVoice,
    cycleVoice,
    voicesLoaded
  };
};
