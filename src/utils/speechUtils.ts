
export const speak = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    
    if (englishVoice) {
      utterance.voice = englishVoice;
      console.log('Using voice:', englishVoice.name);
    }

    utterance.onend = () => {
      console.log('Speech completed');
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      reject(event);
    };

    // Clear any ongoing speech
    window.speechSynthesis.cancel();

    // Speak the text
    window.speechSynthesis.speak(utterance);
  });
};

export const stopSpeaking = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};
