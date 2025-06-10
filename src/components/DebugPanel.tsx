
import React from 'react';
import { vocabularyService } from '@/services/vocabularyService';

interface DebugPanelProps {
  isMuted: boolean;
  voiceRegion: 'US' | 'UK' | 'AU';
  isPaused: boolean;
  currentWord?: {
    word: string;
    category: string;
  } | null;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  isMuted,
  voiceRegion,
  isPaused,
  currentWord
}) => {
  const currentCategory = vocabularyService.getCurrentSheetName();
  
  return (
    <div 
      className="w-full max-w-xl mx-auto mt-2 p-2 rounded"
      style={{ 
        color: '#ffffff', // White text that matches common white backgrounds
        userSelect: 'text', // Makes text selectable
        cursor: 'text',
        fontSize: '12px',
        lineHeight: '1.5',
        fontFamily: 'monospace'
      }}
    >
      <pre>
        {`DEBUG:
Audio: ${isMuted ? 'MUTED' : 'UNMUTED'}
Accent: ${voiceRegion}
State: ${isPaused ? 'PAUSED' : 'PLAYING'}
UI Category: ${currentCategory}
Word Category: ${currentWord?.category || 'N/A'}
Current Word: ${currentWord?.word || 'N/A'}`}
      </pre>
    </div>
  );
};

export default DebugPanel;
