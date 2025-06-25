import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, RefreshCw, SkipForward } from 'lucide-react';
import { getCategoryLabel } from '@/utils/categoryLabels';
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
  const nextCategoryLabel = getCategoryLabel(safeNextCategory);

  return (
    <Card 
      className={cn(
        "w-full max-w-xl mx-auto transition-colors duration-300",
        "border-0 shadow-lg",
        isSpeaking ? "ring-2 ring-blue-400" : ""
      )}
      style={{ backgroundColor }}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-blue-900 break-words">{mainWord}</h2>
            </div>
            {isPaused && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                Paused
              </span>
            )}
          </div>
          
          <div className="text-sm text-green-800 break-words">
            <span className="font-medium">* </span>
            {meaning}
          </div>
          
          <div className="text-sm italic text-red-800 break-words">
            <span className="font-medium">* </span>
            {example}
          </div>
          
          {/* Control buttons wrapper - optimized spacing */}
          <div className="flex flex-wrap gap-1 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleMute}
              className={cn(
                "h-6 text-xs px-1.5",
                isMuted ? "text-purple-700 border-purple-300 bg-purple-50" : "text-gray-700"
              )}
            >
              {isMuted ? <VolumeX size={12} className="mr-1" /> : <Volume2 size={12} className="mr-1" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePause}
              className={cn(
                "h-6 text-xs px-1.5",
                isPaused ? "text-orange-500 border-orange-300 bg-orange-50" : "text-gray-700"
              )}
            >
              {isPaused ? <Play size={12} className="mr-1" /> : <Pause size={12} className="mr-1" />}
              {isPaused ? "Play" : "Pause"}
            </Button>
          
            <Button
              variant="outline"
              size="sm"
              onClick={onNextWord}
              className="h-6 text-xs px-1.5 text-indigo-700 bg-indigo-50"
            >
              <SkipForward size={12} className="mr-1" />
              Next
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchCategory}
              className="h-6 text-xs px-1.5 text-green-700"
            >
              <RefreshCw size={10} className="mr-1" />
              {nextCategoryLabel}
            </Button>
            
            {/* Single voice toggle button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onCycleVoice}
              className="h-6 text-xs px-1.5 text-blue-700 border-blue-300 bg-blue-50"
            >
              {nextVoiceLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCard;
