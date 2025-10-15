import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/utils/categoryLabels';
import WordCountDisplay from './WordCountDisplay';
import parseWordAnnotations from '@/utils/text/parseWordAnnotations';

interface VocabularyCardNewProps {
  word: string;
  meaning: string;
  example: string;
  translation?: string;
  backgroundColor: string;
  isSpeaking: boolean;
  category: string;
  showWordCount?: boolean;
}

const VocabularyCardNew: React.FC<VocabularyCardNewProps> = ({
  word,
  meaning,
  example,
  translation,
  backgroundColor,
  isSpeaking,
  category,
  showWordCount = false
}) => {
  const categoryLabel = getCategoryLabel(category);

  const currentWordObj = { word, meaning, example, translation, category };
  const { main, annotations } = parseWordAnnotations(word);

  return (
    <Card
      className={cn(
        "w-full max-w-2xl mx-auto transition-all duration-500 ease-in-out border-2 theme-card-surface",
        isSpeaking && "ring-2 ring-[var(--lv-accent)]/50"
      )}
      style={{ background: backgroundColor }}
    >
      <CardContent className="p-2">
        <div className="space-y-2">
          {/* Category and Word Count */}
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-medium px-3 py-1 rounded-full theme-card-highlight theme-muted-text border theme-border"
            >
              {categoryLabel}
            </h3>
            <WordCountDisplay
              word={currentWordObj}
              showCount={showWordCount}
            />
          </div>

          {/* Word */}
          <div className="text-left">
            <h1
              className="font-bold"
              style={{ color: 'var(--lv-word-title)', fontSize: '1.25rem', textAlign: 'left' }}
            >
              {main}
              {annotations.map((t, i) => (
                <span key={i} className="ml-1 text-xs theme-muted-text">{t}</span>
              ))}
            </h1>
          </div>

          {/* Meaning - transparent background, left-aligned, smaller font */}
          <div
            style={{
              color: 'var(--lv-meaning)',
              fontSize: '1rem',
              textAlign: 'left',
              fontStyle: 'italic',
              borderRadius: '0.5rem',
              background: 'transparent',
              whiteSpace: 'pre-line'
            }}
          >
            <span style={{ color: 'var(--lv-meaning)', fontStyle: 'italic' }}>* </span>
            {meaning}
          </div>

          {/* Example - transparent background, left-aligned, smaller font */}
          <div
            style={{
              color: 'var(--lv-example)',
              fontSize: '0.9rem',
              textAlign: 'left',
              fontStyle: 'italic',
              background: 'transparent',
              whiteSpace: 'pre-line'
            }}
          >
            <span style={{ color: 'var(--lv-example)', fontStyle: 'italic' }}>* </span>
            {example}
          </div>
          {translation && (
            <div style={{ fontStyle: 'italic', fontSize: '0.9em', textAlign: 'left', whiteSpace: 'pre-line' }}>
              <em>* {translation}</em>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VocabularyCardNew;
