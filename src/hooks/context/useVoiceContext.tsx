import React, { createContext, useContext, useState, useCallback } from 'react';

interface VoiceContextValue {
  variant: string;
  cycleVariant: () => void;
  playCurrentWord: () => void;
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined);

export const useVoiceContext = () => {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error('useVoiceContext must be used within VoiceProvider');
  }
  return ctx;
};

interface VoiceProviderProps {
  playCurrentWord: () => void;
  children: React.ReactNode;
}

const VARIANTS = ['A', 'B', 'C'];

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ playCurrentWord, children }) => {
  const [index, setIndex] = useState(0);

  const cycleVariant = useCallback(() => {
    setIndex(i => (i + 1) % VARIANTS.length);
    // restart playback after variant change
    playCurrentWord();
  }, [playCurrentWord]);

  const value = {
    variant: VARIANTS[index],
    cycleVariant,
    playCurrentWord,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};
