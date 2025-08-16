import React, { useEffect, useRef, useState } from 'react';
import VocabularyAppContainerNew from './vocabulary-app/VocabularyAppContainerNew';
import { LearningProgressPanel } from './LearningProgressPanel';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import ToastProvider from './vocabulary-app/ToastProvider';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const VocabularyAppWithLearning: React.FC = () => {
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const {
    dailySelection,
    progressStats,
    generateDailyWords,
    markWordAsPlayed,
    getDueReviewWords,
    getRetiredWords,
    retireCurrentWord,
    todayWords
  } = useLearningProgress(allWords);

  // Load vocabulary data
  useEffect(() => {
    console.log("VocabularyAppWithLearning - loading vocabulary data");
    vocabularyService.loadDefaultVocabulary();
    
    // Get all words from all categories
    const allWordsFromService: VocabularyWord[] = [];
    vocabularyService.getAllSheetNames().forEach(sheetName => {
      vocabularyService.switchSheet(sheetName);
      const words = vocabularyService.getWordList();
      allWordsFromService.push(...words);
    });
    
    setAllWords(allWordsFromService);
  }, []);

  // Track when words are played (integrate with existing word navigation)
  const previousWordRef = useRef<VocabularyWord | null>(null);
  useEffect(() => {
    previousWordRef.current = vocabularyService.getCurrentWord();

    const handleWordChange = () => {
      if (previousWordRef.current) {
        markWordAsPlayed(previousWordRef.current.word);
      }
      previousWordRef.current = vocabularyService.getCurrentWord();
    };

    vocabularyService.addVocabularyChangeListener(handleWordChange);
    return () => {
      vocabularyService.removeVocabularyChangeListener(handleWordChange);
    };
  }, [markWordAsPlayed]);

  const learningSection = (
    <div className="space-y-4 mt-4">
      <LearningProgressPanel
        dailySelection={dailySelection}
        progressStats={progressStats}
        onGenerateDaily={generateDailyWords}
      />

      {dailySelection && (
        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
          <CollapsibleTrigger className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Word Summary</h3>
            <ChevronDown className={cn('h-4 w-4 transition-transform', summaryOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {dailySelection.newWords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">New Words ({dailySelection.newWords.length})</h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {dailySelection.newWords.map((word, index) => (
                      <div key={index} className="text-sm p-2 bg-green-50 rounded border">
                        <div className="font-medium">{word.word}</div>
                        <div className="text-xs text-gray-600">{word.category}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dailySelection.reviewWords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-600">Review Words ({dailySelection.reviewWords.length})</h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {dailySelection.reviewWords.map((word, index) => (
                      <div key={index} className="text-sm p-2 bg-blue-50 rounded border">
                        <div className="font-medium">{word.word}</div>
                        <div className="text-xs text-gray-600">
                          {word.category} • Review #{word.reviewCount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {progressStats.due > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Due Review Words ({progressStats.due})</h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {getDueReviewWords().map((word, index) => (
                      <div key={index} className="text-sm p-2 bg-red-50 rounded border">
                        <div className="font-medium">{word.word}</div>
                        <div className="text-xs text-gray-600">
                          {word.category} • Review #{word.reviewCount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-gray-600">Retired ({progressStats.retired})</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {progressStats.retired > 0 ? (
                    getRetiredWords().map((word, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded border opacity-75">
                        <div className="font-medium text-gray-700">{word.word}</div>
                        <div className="text-xs text-gray-500">
                          {word.category} • Retired {word.retiredDate}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm p-2 bg-gray-50 rounded border text-gray-500 italic">
                      No retired words
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  return (
    <>
      <ToastProvider />
      <div className="w-full max-w-6xl mx-auto p-4">
        <VocabularyAppContainerNew
          initialWords={todayWords}
          onRetireWord={() => {
            const currentWord = vocabularyService.getCurrentWord();
            if (currentWord) {
              retireCurrentWord(currentWord.word);
            }
          }}
          additionalContent={learningSection}
        />
      </div>
    </>
  );
};

export default VocabularyAppWithLearning;
