
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, RefreshCw, SkipForward } from 'lucide-react';

interface VocabularyCardProps {
  word: string;
  meaning: string;
  example: string;
  backgroundColor: string;
  isMuted: boolean;
  isPaused: boolean;
  voiceRegion: 'US' | 'UK';
  onToggleMute: () => void;
  onTogglePause: () => void;
  onChangeVoice: () => void;
  onSwitchCategory: () => void;
  onNextWord: () => void;
  currentCategory: string;
  nextCategory: string;
  isSpeaking?: boolean;
  displayTime?: number;
  category?: string;
}

const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  meaning,
  example,
  backgroundColor,
  isMuted,
  isPaused,
  voiceRegion,
  onToggleMute,
  onTogglePause,
  onChangeVoice,
  onSwitchCategory,
  onNextWord,
  currentCategory,
  nextCategory,
  isSpeaking = false,
  displayTime,
  category
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

  // Save button states to localStorage
  useEffect(() => {
    localStorage.setItem('buttonStates', JSON.stringify({
      isMuted,
      isPaused,
      voiceRegion,
      currentCategory
    }));
  }, [isMuted, isPaused, voiceRegion, currentCategory]);

  const wordParts = word.split(/\s*\(([^)]+)\)/);
  const mainWord = wordParts[0].trim();
  const wordType = wordParts.length > 1 ? `(${wordParts[1]})` : '';
  const phoneticPart = wordParts.length > 2 ? wordParts.slice(2).join(' ').trim() : '';

  return (
    <Card 
      className={cn(
        "w-full max-w-xl mx-auto transition-colors duration-300",
        "border-0 shadow-lg",
        isSpeaking ? "ring-2 ring-blue-400" : ""
      )}
      style={{ backgroundColor }}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-blue-900 break-words">{mainWord}</h2>
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
          
          <div className="text-base text-green-800 break-words">
            <span className="font-medium">* </span>
            {meaning}
          </div>
          
          <div className="text-base italic text-red-800 break-words">
            <span className="font-medium">* </span>
            {example}
          </div>
          
          <div className="flex flex-wrap gap-1 pt-2 justify-between">
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleMute}
                className={cn(
                  "h-7 text-xs px-2",
                  isMuted ? "text-purple-700 border-purple-300 bg-purple-50" : "text-gray-700"
                )}
              >
                {isMuted ? <VolumeX size={14} className="mr-1" /> : <Volume2 size={14} className="mr-1" />}
                {isMuted ? "UNMUTE" : "MUTE"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeVoice}
                className="h-7 text-xs px-2 text-blue-700"
              >
                {voiceRegion === 'US' ? 'UK' : 'US'} Accent
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onTogglePause}
                className={cn(
                  "h-7 text-xs px-2",
                  isPaused ? "text-orange-500 border-orange-300 bg-orange-50" : "text-gray-700"
                )}
              >
                {isPaused ? <Play size={14} className="mr-1" /> : <Pause size={14} className="mr-1" />}
                {isPaused ? "Play" : "Pause"}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onNextWord}
                className="h-7 text-xs px-2 text-indigo-700 bg-indigo-50"
              >
                <SkipForward size={14} className="mr-1" />
                Next Word
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchCategory}
                className="h-7 text-xs px-2 text-green-700"
              >
                <RefreshCw size={12} className="mr-1" />
                {nextCategory.charAt(0).toUpperCase() + nextCategory.slice(1)}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCard;
