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
          <div className="text-left">
            <h1 className="font-bold" style={{ color: '#1F305E', fontSize: '1.25rem', textAlign: 'left' }}>
              {word}
            </h1>
          </div>

          {/* Meaning - transparent background, left-aligned, smaller font */}
          <div style={{ color: '#2E7D32', fontSize: '1rem', textAlign: 'left', fontStyle: 'italic', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', background: 'transparent' }}>
            <span style={{ color: '#2E7D32', fontStyle: 'italic' }}>* </span>{meaning}
          </div>

          {/* Example - transparent background, left-aligned, smaller font */}
          <div style={{ color: '#B71C1C', fontSize: '0.9rem', textAlign: 'left', fontStyle: 'italic', background: 'transparent' }}>
            <span style={{ color: '#B71C1C', fontStyle: 'italic' }}>* </span>{example}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCardNew;
