
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Volume2, VolumeX, Pause, Play, RefreshCw, SkipForward, Speaker } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/utils/categoryLabels';
import WordCountDisplay from './WordCountDisplay';

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
  isSpeaking: boolean;
  category: string;
  voiceRegion: 'US' | 'UK' | 'AU';
  nextVoiceLabel: string;
  showWordCount?: boolean;
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
  isSpeaking,
  category,
  voiceRegion,
  nextVoiceLabel,
  showWordCount = false
}) => {
  const categoryLabel = getCategoryLabel(category);
  const nextCategoryLabel = getCategoryLabel(nextCategory);

  const currentWordObj = { word, meaning, example, category };

  return (
    <Card 
      className={cn(
        "w-full max-w-2xl mx-auto transition-all duration-500 ease-in-out shadow-lg border-2",
        isSpeaking && "ring-2 ring-blue-400 ring-opacity-50"
      )}
      style={{ backgroundColor }}
    >
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-6">
          {/* Category and Word Count */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600 bg-white/80 px-3 py-1 rounded-full">
              {categoryLabel}
            </div>
            <WordCountDisplay 
              word={currentWordObj} 
              showCount={showWordCount}
            />
          </div>

          {/* Word */}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-2 tracking-wide">
              {word}
            </h1>
          </div>

          {/* Meaning */}
          <div className="bg-white/90 p-4 rounded-lg">
            <h2 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              Meaning
            </h2>
            <p className="text-lg text-gray-800 leading-relaxed">
              {meaning}
            </p>
          </div>

          {/* Example */}
          <div className="bg-white/90 p-4 rounded-lg">
            <h2 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wider">
              Example
            </h2>
            <p className="text-lg text-gray-800 leading-relaxed italic">
              "{example}"
            </p>
          </div>

          {/* Voice Region Indicator */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white/60 px-3 py-1 rounded-full">
              <Speaker size={12} />
              <span>{voiceRegion} Voice</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCardNew;
