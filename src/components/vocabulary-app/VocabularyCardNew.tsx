
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface VocabularyCardNewProps {
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
  voiceRegion: 'US' | 'UK' | 'AU';
  nextVoiceLabel: string;
}

const VocabularyCardNew: React.FC<VocabularyCardNewProps> = ({
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
  voiceRegion,
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

  return (
    <Card 
      className={cn(
        "w-full max-w-2xl mx-auto transition-colors duration-300",
        "border-0 shadow-lg",
        isSpeaking ? "ring-2 ring-blue-400" : ""
      )}
      style={{ backgroundColor }}
    >
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 break-words">{mainWord}</h2>
              {wordType && (
                <p className="text-sm sm:text-base lg:text-lg text-purple-700 font-medium -mt-1">{wordType} {phoneticPart}</p>
              )}
            </div>
            {isPaused && (
              <span className="text-xs sm:text-sm bg-amber-100 text-amber-800 px-2 sm:px-3 py-1 rounded-full font-medium ml-2 flex-none">
                Paused
              </span>
            )}
          </div>
          
          <div className="text-base sm:text-lg lg:text-xl text-green-800 break-words">
            <span className="font-medium">* </span>
            {meaning}
          </div>
          
          <div className="text-base sm:text-lg lg:text-xl italic text-red-800 break-words">
            <span className="font-medium">* </span>
            {example}
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCardNew;
