import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, RefreshCw, SkipForward } from 'lucide-react';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';

interface VocabularyCardProps {
  word: string;
  meaning: string;
  example: string;
  backgroundColor: string;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onCycleVoice: () => void;
  onSwitchCategory: () => void;
  onNextWord: () => void;
  currentCategory: string;
  nextCategory: string;
  isSpeaking?: boolean;
  displayTime?: number;
  category?: string;
  selectedVoice: VoiceSelection;
  nextVoiceLabel: string;
}

const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  meaning,
  example,
  backgroundColor,
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onCycleVoice,
  onSwitchCategory,
  onNextWord,
  currentCategory,
  nextCategory,
  isSpeaking = false,
  displayTime,
  category,
  selectedVoice,
  nextVoiceLabel
}) => {
  // Store current word in localStorage to help track sync issues
  useEffect(() => {
    if (word) {
      localStorage.setItem('currentDisplayedWord', word);
    }
    
    return () => {
      localStorage.removeItem('currentDisplayedWord');
    };
  }, [word]);

  // Parse word to separate types and phonetics
  const wordParts = word.split(/\s*\(([^)]+)\)/);
  const mainWord = wordParts[0].trim();
  const wordType = wordParts.length > 1 ? `(${wordParts[1]})` : '';
  const phoneticPart = wordParts.length > 2 ? wordParts.slice(2).join(' ').trim() : '';

  // Safety check for nextCategory - ensure it's a string
  const safeNextCategory = nextCategory || 'Next';

  return (
    <Card 
      className={cn(
        "w-full max-w-xl mx-auto transition-colors duration-300",
        "border-0 shadow-lg",
        isSpeaking ? "ring-2 ring-blue-400" : ""
      )}
      style={{ backgroundColor }}
    >
      <CardContent className="p-2">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold" style={{ color: '#1F305E', fontSize: '2rem', textAlign: 'left' }}>{mainWord}</h2>
              {wordType && (
                <p className="text-sm text-purple-700 font-medium -mt-1">{wordType} {phoneticPart}</p>
              )}
            </div>
            {isPaused && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                Paused
              </span>
            )}
          </div>
          
          <div className="italic" style={{ color: '#2E7D32', fontSize: '1.25rem', textAlign: 'left' }}>
            <span style={{ color: '#2E7D32', fontStyle: 'italic' }}>* </span>{meaning}
          </div>
          
          <div className="italic" style={{ color: '#B71C1C', fontSize: '1rem', textAlign: 'left' }}>
            <span style={{ color: '#B71C1C', fontStyle: 'italic' }}>* </span>{example}
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCard;
