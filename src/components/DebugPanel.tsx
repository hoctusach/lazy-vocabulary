
import React, { useContext } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { DebugInfoContext } from '@/contexts/DebugInfoContext';

interface DebugPanelProps {
  isMuted?: boolean;
  selectedVoiceName?: string;
  isPaused?: boolean;
  currentWord?: {
    word: string;
    category: string;
  } | null;
}

const DebugPanel: React.FC<DebugPanelProps> = ({
  isMuted: mutedProp,
  selectedVoiceName: voiceProp,
  isPaused: pausedProp,
  currentWord: wordProp
}) => {
  const context = useContext(DebugInfoContext);
  const isMuted = mutedProp ?? context?.isMuted ?? false;
  const selectedVoiceName = voiceProp ?? context?.selectedVoiceName ?? '';
  const isPaused = pausedProp ?? context?.isPaused ?? false;
  const currentWord = wordProp ?? context?.currentWord ?? null;
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
Voice: ${selectedVoiceName}
State: ${isPaused ? 'PAUSED' : 'PLAYING'}
UI Category: ${currentCategory}
Word Category: ${currentWord?.category || 'N/A'}
Current Word: ${currentWord?.word || 'N/A'}`}
      </pre>
    </div>
  );
};

export default DebugPanel;
