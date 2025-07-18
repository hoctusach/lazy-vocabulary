import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Pause, Play, RefreshCw, SkipForward } from 'lucide-react';
import { getCategoryLabel } from '@/utils/categoryLabels';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import parseWordAnnotations from '@/utils/text/parseWordAnnotations';

interface VocabularyCardProps {
  word: string;
  meaning: string;
  example: string;
  translation?: string;
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
  searchPreview?: boolean;
}

const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  meaning,
  example,
  translation,
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
  nextVoiceLabel,
  searchPreview = false
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
  const { main, annotations } = parseWordAnnotations(word);

  return (
    <Card 
      className={cn(
        "w-full max-w-xl mx-auto border-0 shadow-lg"
      )}
      style={{ backgroundColor }}
    >
      <CardContent className="p-2 sm:p-4">
        <div>
          {/* Word */}
          <h2
            className="text-left font-semibold text-base md:text-sm text-gray-800 leading-tight mb-2"
            style={{ marginTop: 0 }}
          >
            {main}
            {annotations.map((t, i) => (
              <span key={i} className="ml-1 text-xs text-gray-500">{t}</span>
            ))}
          </h2>
          {/* Meaning */}
          <div
            className="text-left text-base md:text-sm text-emerald-400 italic mb-2"
            style={{ background: 'transparent', marginTop: 0 }}
          >
            <span className="italic text-emerald-400">*</span> {meaning}
          </div>
          {/* Example */}
          <div
            className="text-left text-base md:text-sm text-red-600 italic"
            style={{ background: 'transparent', marginTop: 0 }}
          >
            <span className="italic text-red-600">*</span> {example}
          </div>
          {translation && (
            <div style={{ fontStyle: 'italic', fontSize: '0.9em', textAlign: 'left' }}>
              <em>* Translation: {translation}</em>
            </div>
          )}
          {/* Mobile note below example */}
          {!searchPreview && (
            <div
              className="mobile-note text-left italic mt-2"
              style={{ color: '#6b7280', fontSize: '0.8rem' }}
            >
              <p>⭐ Tap any button (e.g., Next) to enable speech.</p>
              <p>⭐ On Mobile, only one voice may be available.</p>
              <p>
                ⭐ No personal login or data is stored on any server. Your
                progress (stickers, rewards) is saved locally in your browser on
                your device. Available voices depend on your browser and
                device—at first, try different browsers to find the best one for
                learning. Make sure you use the same device and browser to keep
                your progress.
              </p>
            </div>
          )}
        </div>
        {/* Control buttons wrapper - optimized spacing */}
        {!searchPreview && (
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
              {/* Removed dynamic category label */}
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
        )}
      </CardContent>
    </Card>
  );
};

export default VocabularyCard;
