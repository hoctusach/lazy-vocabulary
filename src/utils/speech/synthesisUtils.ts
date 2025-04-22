// This file contains utility functions for speech synthesis

// Synthesize speech and return an audio data URL
export const synthesizeAudio = (text: string, voice: SpeechSynthesisVoice | null): string => {
  try {
    // Create a unique identifier for the audio based on text and voice
    const audioId = `speech_${encodeURIComponent(text.substring(0, 20))}_${voice?.name || 'default'}_${Date.now()}`;
    
    // Create a data URL with the audio ID embedded (this is a placeholder approach)
    // In a real implementation, this would generate an actual audio file or data URL
    const dataUrl = `data:audio/mp3;base64,${btoa(audioId)}`;
    
    // Attempt to create actual speech using the Web Speech API in browsers that support it
    if (window.speechSynthesis && voice) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.rate = 0.9; // Slightly slower than normal
      utterance.pitch = 1.0; // Normal pitch
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
    }
    
    return dataUrl;
  } catch (error) {
    console.error("Error synthesizing audio:", error);
    return ''; // Return empty string on error
  }
};

// Estimate the duration of speech in milliseconds
export const estimateSpeechDuration = (text: string): number => {
  // Average reading speed is about 150 words per minute, or 2.5 words per second
  // Estimate based on character count for better accuracy with varying word lengths
  const characterCount = text.length;
  
  // Assuming average of 5 characters per word and 2.5 words per second
  // That's about 12.5 characters per second
  const estimatedDurationMs = (characterCount / 12.5) * 1000;
  
  // Add a minimum duration and a buffer
  return Math.max(1500, estimatedDurationMs) + 500;
};

// Check if speech synthesis is supported
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Stop any current speech
export const stopSpeaking = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Check if sound and display are in sync
export const checkSoundDisplaySync = (displayedWord: string, spokenText: string): boolean => {
  return spokenText.toLowerCase().includes(displayedWord.toLowerCase());
};

// Keep speech synthesis alive (Chrome has a bug where it stops after ~15 seconds)
export const keepSpeechAlive = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }
};

// Wait for speech synthesis to be ready
export const waitForSpeechReadiness = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve(false);
      return;
    }
    setTimeout(() => resolve(true), 100);
  });
};

// Reset the speech engine
export const resetSpeechEngine = (): void => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

// Validate current speech status
export const validateCurrentSpeech = (): boolean => {
  return window.speechSynthesis ? window.speechSynthesis.speaking : false;
};

// Force resync if needed based on current word
export const forceResyncIfNeeded = (
  currentWord: string, 
  processedText: string, 
  resyncCallback: () => void
): void => {
  if (!processedText.toLowerCase().includes(currentWord.toLowerCase())) {
    console.log(`Speech-display sync issue detected. Resyncing...`);
    resyncCallback();
  }
};

// Ensure speech engine is ready for use
export const ensureSpeechEngineReady = async (): Promise<void> => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

// Extract the main word from a word that might contain parenthetical info
export const extractMainWord = (word: string): string => {
  return word.split(/\s*\(/)[0].trim();
};

// Get speech rate (configurable)
export const getSpeechRate = (): number => {
  return 0.9; // Slightly slower than normal
};

// Get speech pitch (configurable)
export const getSpeechPitch = (): number => {
  return 1.0; // Normal pitch
};

// Get speech volume (configurable)
export const getSpeechVolume = (): number => {
  return 1.0; // Full volume
};

// Prepare text for better speech quality
export const prepareTextForSpeech = (text: string): string => {
  return text.replace(/\s+/g, ' ').trim();
};

// Add pauses to improve speech quality
export const addPausesToText = (text: string): string => {
  return text.replace(/\./g, '. <break time="500ms"/> ');
};
