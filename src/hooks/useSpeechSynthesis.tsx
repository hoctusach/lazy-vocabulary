
import { useState, useCallback, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';

export const useSpeechSynthesis = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceRegion, setVoiceRegion] = useState<'US' | 'UK'>('US');

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (isMuted || !text) return;
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter(voice => voice.lang.includes('en'));
      const regionVoices = englishVoices.filter(voice => 
        voiceRegion === 'US' 
          ? voice.lang.includes('US') 
          : voice.lang.includes('GB') || voice.lang.includes('UK')
      );
      
      if (regionVoices.length > 0) {
        utterance.voice = regionVoices[0];
      } else if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      
      return new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
      });
    } catch (error) {
      console.error('Speech synthesis error:', error);
      return Promise.resolve();
    }
  }, [isMuted, voiceRegion]);

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
    window.speechSynthesis.cancel();
  };

  const handleChangeVoice = () => {
    setVoiceRegion(prev => prev === 'US' ? 'UK' : 'US');
    window.speechSynthesis.cancel();
  };

  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice
  };
};
