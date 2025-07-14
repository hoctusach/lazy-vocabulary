import React from 'react';

export interface DebugInfo {
  isMuted: boolean;
  selectedVoiceName: string;
  isPaused: boolean;
  currentWord?: {
    word: string;
    category: string;
  } | null;
}

export const DebugInfoContext = React.createContext<DebugInfo | null>(null);
