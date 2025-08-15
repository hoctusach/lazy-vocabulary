
import React from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { wordSelectionService } from '@/services/vocabulary/WordSelectionService';
import { Badge } from '@/components/ui/badge';

interface WordCountDisplayProps {
  word: VocabularyWord;
  showCount?: boolean;
}

const WordCountDisplay: React.FC<WordCountDisplayProps> = ({ 
  word, 
  showCount = false 
}) => {
  if (!showCount) return null;

  const count = wordSelectionService.getWordCount(word);
  
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <Badge variant="secondary" className="text-xs">
        Shown: {count} time{count !== 1 ? 's' : ''}
      </Badge>
    </div>
  );
};

export default WordCountDisplay;
