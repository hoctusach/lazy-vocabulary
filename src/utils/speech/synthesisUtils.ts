
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
