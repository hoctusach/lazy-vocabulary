
import { useState, useEffect, useRef, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

type VoiceOption = {
  label: string;
  region: 'US' | 'UK';
  gender: 'male' | 'female';
  voice: SpeechSynthesisUtterance['voice'];
};

const DEFAULT_VOICE_OPTION: VoiceOption = {
  label: "US",
  region: "US" as const,
  gender: "female" as const,
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
  
  // Find the current word based on the index - this is the single source of truth
  const currentWord = wordList.length > 0 ? wordList[currentIndex] : null;
  
  // Debug logs to track sync
  useEffect(() => {
    if (currentWord) {
      console.log(`Current index: ${currentIndex}, Current word: ${currentWord.word}`);
    }
  }, [currentIndex, currentWord]);
  
  // Load available voices when the component mounts
  useEffect(() => {
    // Try to load saved preferences
    try {
      const savedSettings = localStorage.getItem('vocabularySettings');
      if (savedSettings) {
        const { muted: savedMuted, voiceRegion } = JSON.parse(savedSettings);
        setMuted(!!savedMuted);
        
        // We'll set the selected voice after loading the voice list
        if (voiceRegion) {
          console.log(`Found saved voice preference: ${voiceRegion}`);
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
      
      // Cancel any active speech on unmount
      window.speechSynthesis.cancel();
    };
  }, []);
  
  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('vocabularySettings', JSON.stringify({
        muted,
        voiceRegion: selectedVoice.region
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [muted, selectedVoice.region]);
  
  // Function to play the current word - unified audio and display logic
  const playCurrentWord = useCallback(() => {
    // First ensure we have a word to play and are not muted/paused
    if (!currentWord || wordList.length === 0 || muted || paused) {
      return;
    }
    
    console.log(`Playing word: ${currentWord.word} (index ${currentIndex})`);
    
    // Cancel any ongoing speech to prevent queuing
    window.speechSynthesis.cancel();
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance();
    utteranceRef.current = utterance;
    
    // Build the text to speak with proper pauses
    const wordText = currentWord.word;
    const meaningText = currentWord.meaning;
    const exampleText = currentWord.example;
    
    utterance.text = `${wordText}. ${meaningText}. ${exampleText}`;
    
    // Set the selected voice if available
    if (selectedVoice.voice) {
      utterance.voice = selectedVoice.voice;
      utterance.lang = selectedVoice.voice.lang;
    }
    
    // Configure speech properties
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1;
    
    // Set up event handlers for auto-advancement
    utterance.onend = () => {
      console.log(`Speech ended for: ${currentWord.word}`);
      
      // Only auto-advance if not paused and not muted
      if (!paused && !muted) {
        // Advance to the next word
        setCurrentIndex(prevIndex => (prevIndex + 1) % wordList.length);
        // Note: We don't call playCurrentWord() here - the useEffect will handle that
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      
      // On error, also advance to next word to prevent getting stuck
      if (!paused && !muted) {
        setCurrentIndex(prevIndex => (prevIndex + 1) % wordList.length);
      }
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  }, [currentWord, muted, paused, selectedVoice.voice, currentIndex, wordList.length]);
  
  // This effect handles playing words whenever relevant state changes
  useEffect(() => {
    if (wordList.length > 0 && !muted && !paused && currentWord) {
      playCurrentWord();
    }
  }, [wordList, muted, paused, currentIndex, playCurrentWord, currentWord]);
  
  // Function to advance to the next word - for manual navigation
  const advanceToNext = useCallback(() => {
    // Cancel any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Move to the next word, wrapping around if needed
    setCurrentIndex(prevIndex => (prevIndex + 1) % wordList.length);
    // Note: The useEffect will handle playing the word if needed
  }, [wordList.length]);
  
  // Handle mute toggling
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      
      if (newMuted) {
        // When muting, cancel any current speech
        window.speechSynthesis.cancel();
      }
      
      return newMuted;
    });
  }, []);
  
  // Handle pause toggling
  const togglePause = useCallback(() => {
    setPaused(prev => {
      const newPaused = !prev;
      
      if (newPaused) {
        // When pausing, cancel current speech
        window.speechSynthesis.cancel();
      }
      
      return newPaused;
    });
  }, []);
  
  // Handle manual next - properly wired to advance
  const goToNextWord = useCallback(() => {
    // Cancel any current speech and advance
    advanceToNext();
  }, [advanceToNext]);
  
  // Handle voice selection
  const changeVoice = useCallback((voiceRegion: 'US' | 'UK') => {
    const selectedOption = voices.find(v => v.region === voiceRegion);
    if (selectedOption) {
      setSelectedVoice(selectedOption);
      // We DON'T cancel current speech when changing voice
      // It will apply on the next word as requested
    }
  }, [voices]);
  
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
