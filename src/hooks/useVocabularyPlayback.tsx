
import { useState, useEffect, useRef, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

type VoiceOption = {
  label: string;
  region: 'US' | 'UK';
  gender: 'male' | 'female';
  voice: SpeechSynthesisVoice | null;
};

const DEFAULT_VOICE_OPTION = {
  label: "US - Female",
  region: "US",
  gender: "female",
  voice: null
};

export const useVocabularyPlayback = (wordList: VocabularyWord[]) => {
  // Main state variables
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(DEFAULT_VOICE_OPTION);
  
  // Refs for managing ongoing processes
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechEndedRef = useRef(true);
  
  // Find the current word based on the index
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Load available voices when the component mounts
  useEffect(() => {
    // Try to load saved preferences
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { muted: savedMuted, voiceLabel } = JSON.parse(savedSettings);
        setMuted(!!savedMuted);
        
        // We'll set the selected voice after loading the voice list
        if (voiceLabel) {
          console.log(`Found saved voice preference: ${voiceLabel}`);
        }
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
    
    // Initialize voice loading
    const loadVoices = () => {
      const synth = window.speechSynthesis;
      const availableVoices = synth.getVoices();
      
      if (availableVoices.length) {
        const voiceOptions: VoiceOption[] = [
          {
            label: "US - Female",
            region: "US",
            gender: "female",
            voice: findVoice(availableVoices, "en-US", ["female", "woman"])
          },
          {
            label: "US - Male",
            region: "US",
            gender: "male",
            voice: findVoice(availableVoices, "en-US", ["male", "man"])
          },
          {
            label: "UK - Female",
            region: "UK",
            gender: "female",
            voice: findVoice(availableVoices, "en-GB", ["female", "woman"])
          },
          {
            label: "UK - Male",
            region: "UK",
            gender: "male",
            voice: findVoice(availableVoices, "en-GB", ["male", "man"])
          }
        ];
        
        setVoices(voiceOptions);
        
        // Try to restore saved voice preference
        try {
          const savedSettings = localStorage.getItem('vocabularySettings');
          if (savedSettings) {
            const { voiceLabel } = JSON.parse(savedSettings);
            const savedVoice = voiceOptions.find(v => v.label === voiceLabel);
            if (savedVoice) {
              setSelectedVoice(savedVoice);
            }
          }
        } catch (error) {
          console.error('Error restoring voice preference:', error);
        }
      }
    };

    // Find appropriate voice based on language and gender
    const findVoice = (availableVoices: SpeechSynthesisVoice[], lang: string, genderHints: string[]) => {
      // First try to find a voice with exact language match and gender hint in the name
      const voiceWithGender = availableVoices.find(voice => 
        voice.lang.startsWith(lang) && 
        genderHints.some(hint => voice.name.toLowerCase().includes(hint))
      );
      
      if (voiceWithGender) return voiceWithGender;
      
      // If no match with gender, just use any voice with the right language
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
      
      // Cancel any active speech on unmount
      window.speechSynthesis.cancel();
    };
  }, []);
  
  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('vocabularySettings', JSON.stringify({
        muted,
        voiceLabel: selectedVoice.label
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [muted, selectedVoice]);
  
  // Function to play the current word
  const playCurrentWord = useCallback(() => {
    if (!currentWord) return;
    
    // Don't play if muted
    if (muted) {
      speechEndedRef.current = true;
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance();
    utteranceRef.current = utterance;
    
    // Build the text to speak with proper pauses
    const wordText = currentWord.word;
    const meaningText = currentWord.meaning;
    const exampleText = currentWord.example;
    
    utterance.text = `${wordText}. ${meaningText}. ${exampleText}`;
    speechEndedRef.current = false;
    
    // Set the selected voice if available
    if (selectedVoice.voice) {
      utterance.voice = selectedVoice.voice;
      utterance.lang = selectedVoice.voice.lang;
    }
    
    // Configure speech properties
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    
    // Set up event handlers
    utterance.onend = () => {
      speechEndedRef.current = true;
      // Only auto-advance if not paused
      if (!paused && !muted) {
        advanceToNext();
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      speechEndedRef.current = true;
    };
    
    // Start speaking
    console.log(`Speaking word: ${wordText}`);
    window.speechSynthesis.speak(utterance);
  }, [currentWord, muted, paused, selectedVoice.voice]);
  
  // Function to advance to the next word
  const advanceToNext = useCallback(() => {
    if (wordList.length === 0) return;
    
    // Move to the next word, wrapping around if needed
    setCurrentIndex(prev => (prev + 1) % wordList.length);
    
    // If not paused and not muted, play the new word
    if (!paused && !muted) {
      // Small delay to ensure state is updated
      setTimeout(() => playCurrentWord(), 50);
    }
  }, [wordList.length, paused, muted, playCurrentWord]);
  
  // Handle mute toggling
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      
      if (newMuted) {
        // When muting, cancel any current speech
        window.speechSynthesis.cancel();
        speechEndedRef.current = true;
      }
      
      return newMuted;
    });
  }, []);
  
  // Handle pause toggling
  const togglePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev;
      
      if (!newPaused && speechEndedRef.current && !muted) {
        // If unpausing and the current word has finished, play the current word
        setTimeout(() => playCurrentWord(), 50);
      }
      
      return newPaused;
    });
  }, [muted, playCurrentWord]);
  
  // Handle manual next
  const goToNextWord = useCallback(() => {
    // Cancel any current speech
    window.speechSynthesis.cancel();
    speechEndedRef.current = true;
    
    // Advance to the next word
    advanceToNext();
  }, [advanceToNext]);
  
  // Handle voice selection
  const changeVoice = useCallback((voiceLabel: string) => {
    const selectedOption = voices.find(v => v.label === voiceLabel);
    if (selectedOption) {
      setSelectedVoice(selectedOption);
      
      // Cancel current speech when changing voice
      window.speechSynthesis.cancel();
      speechEndedRef.current = true;
      
      // If currently playing and not muted, restart with new voice
      if (!speechEndedRef.current && !muted && !paused) {
        setTimeout(() => playCurrentWord(), 50);
      }
    }
  }, [voices, muted, paused, playCurrentWord]);
  
  // Start playback when first mounting
  useEffect(() => {
    if (currentWord && !muted && !paused) {
      playCurrentWord();
    }
  }, [currentWord, muted, paused, playCurrentWord]);
  
  return {
    currentWord,
    currentIndex,
    muted,
    paused,
    voices,
    selectedVoice,
    playCurrentWord,
    advanceToNext,
    toggleMute,
    togglePause,
    goToNextWord,
    changeVoice
  };
};
