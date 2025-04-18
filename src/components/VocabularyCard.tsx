
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, RefreshCw } from 'lucide-react';

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
  currentCategory: string;
  nextCategory: string;
  isSpeaking?: boolean;
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
  currentCategory,
  nextCategory,
  isSpeaking = false
}) => {
  // Save states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('buttonStates', JSON.stringify({
      isMuted,
      isPaused,
      voiceRegion,
      currentCategory
    }));
  }, [isMuted, isPaused, voiceRegion, currentCategory]);

  return (
    <Card 
      className={cn(
        "w-full max-w-xl mx-auto transition-colors duration-300",
        "border-0 shadow-lg",
        isSpeaking ? "ring-2 ring-blue-400" : ""
      )}
      style={{ backgroundColor }}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-blue-900 break-words">{word}</h2>
          
          <div className="text-lg text-green-800 break-words">
            <span className="font-medium">* </span>
            {meaning}
          </div>
          
          <div className="text-lg italic text-red-800 break-words">
            <span className="font-medium">* </span>
            {example}
          </div>
          
          <div className="flex flex-wrap gap-2 pt-4 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleMute}
              className={cn(
                "min-w-[80px]",
                isMuted ? "text-purple-700 border-purple-300" : "text-gray-700"
              )}
            >
              {isMuted ? <VolumeX size={18} className="mr-1" /> : <Volume2 size={18} className="mr-1" />}
              {isMuted ? "UNMUTE" : "MUTE"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onChangeVoice}
              className="min-w-[100px] text-blue-700"
            >
              {voiceRegion === 'US' ? 'UK' : 'US'} Accent
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePause}
              className={cn(
                "min-w-[160px]",
                isPaused ? "text-orange-500 border-orange-300" : "text-gray-700"
              )}
            >
              {isPaused ? <Play size={18} className="mr-1" /> : <Pause size={18} className="mr-1" />}
              {isPaused ? "Play next word" : "Pause & read out loud"}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onSwitchCategory}
              className="min-w-[140px] text-green-700"
            >
              <RefreshCw size={16} className="mr-1" />
              {nextCategory.charAt(0).toUpperCase() + nextCategory.slice(1)}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCard;
