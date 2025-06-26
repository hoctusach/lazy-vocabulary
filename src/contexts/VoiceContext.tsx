import React, { createContext, useContext, useState, useEffect, useRef, PropsWithChildren } from 'react';
import { VOICE_SETTINGS_KEY } from '@/utils/storageKeys';

export type VoiceRegion = 'US' | 'UK' | 'AU';

interface VoiceContextValue {
  voiceRegion: VoiceRegion;
  setVoiceRegion: (region: VoiceRegion) => void;
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export const VoiceProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [voiceRegion, setVoiceRegionState] = useState<VoiceRegion>('UK');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const didPreloadRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { voiceRegion?: VoiceRegion };
        if (saved.voiceRegion) {
          setVoiceRegionState(saved.voiceRegion);
        }
      }
    } catch (err) {
      console.error('Failed to load voice settings', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify({ voiceRegion }));
    } catch (err) {
      console.error('Failed to save voice settings', err);
    }
  }, [voiceRegion]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (didPreloadRef.current) return;
      didPreloadRef.current = true;

      try {
        window.speechSynthesis.getVoices();
      } catch (err) {
        console.warn('Voice preload failed', err);
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
      }

      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });
    return () => document.removeEventListener('click', handleFirstInteraction);
  }, []);

  const setVoiceRegion = (region: VoiceRegion) => {
    setVoiceRegionState(region);
  };

  return (
    <VoiceContext.Provider value={{ voiceRegion, setVoiceRegion }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoiceContext = (): VoiceContextValue => {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error('useVoiceContext must be used within VoiceProvider');
  }
  return ctx;
};
