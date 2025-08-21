import React, { useEffect, useRef, useState } from 'react';
import VocabularyAppContainerNew from './vocabulary-app/VocabularyAppContainerNew';
import { LearningProgressPanel } from './LearningProgressPanel';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { vocabularyService } from '@/services/vocabularyService';
import { VocabularyWord } from '@/types/vocabulary';
import ToastProvider from './vocabulary-app/ToastProvider';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MarkAsNewDialog } from './MarkAsNewDialog';
import { useDailyUsageTracker } from '@/hooks/useDailyUsageTracker';
import WordSearchModal from './vocabulary-app/WordSearchModal';

const VocabularyAppWithLearning: React.FC = () => {
  useDailyUsageTracker('default');
  const [allWords, setAllWords] = useState<VocabularyWord[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isMarkAsNewDialogOpen, setIsMarkAsNewDialogOpen] = useState(false);
  const [wordToReset, setWordToReset] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchWord, setSearchWord] = useState('');

  const {
    dailySelection,
    progressStats,
    generateDailyWords,
    markWordAsPlayed,
    getLearnedWords,
    markWordLearned: markCurrentWordLearned,
    markWordAsNew,
    todayWords
  } = useLearningProgress(allWords);

  // Load vocabulary data
  useEffect(() => {
    const load = async () => {
      console.log("VocabularyAppWithLearning - loading vocabulary data");
      if (!vocabularyService.hasData()) {
        await vocabularyService.loadDefaultVocabulary();
      }

      // Get all words from all categories
      const allWordsFromService: VocabularyWord[] = [];
      vocabularyService.getAllSheetNames().forEach(sheetName => {
        vocabularyService.switchSheet(sheetName);
        const words = vocabularyService.getWordList();
        allWordsFromService.push(...words);
      });

      setAllWords(allWordsFromService);
    };

    load();
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

  const learnedWords = getLearnedWords();


  const handleMarkAsNew = () => {
    if (wordToReset) {
      markWordAsNew(wordToReset);
      toast.success('Word reset to new.');
    }
    setIsMarkAsNewDialogOpen(false);
    setWordToReset(null);
  };

  const openSearch = (word: string = '') => {
    setSearchWord(word);
    setIsSearchOpen(true);
  };

  const learningSection = (
    <div className="space-y-4 mt-4">
      <LearningProgressPanel
        dailySelection={dailySelection}
        progressStats={progressStats}
        onGenerateDaily={generateDailyWords}
        learnerId="default"
      />

      {dailySelection && (
        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
          <CollapsibleTrigger className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Word Summary</h3>
            <ChevronDown className={cn('h-4 w-4 transition-transform', summaryOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {dailySelection.newWords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">Today's New ({dailySelection.newWords.length})</h4>
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
                  <h4 className="font-medium text-red-600">
                    Today's Due Review ({dailySelection.reviewWords.length})
                  </h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {dailySelection.reviewWords.map((word, index) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-red-50 rounded border"
                      >
                        <div className="font-medium">{word.word}</div>
                        <div className="text-xs text-gray-600">
                          {word.category} • Review #{word.reviewCount}
                        </div>
                        <div className="text-xs text-gray-500">
                          Next review: {word.nextReviewDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-gray-600">Learned ({learnedWords.length})</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {learnedWords.length > 0 ? (
                    learnedWords.map((word, index) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-gray-50 rounded border opacity-75 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-700">{word.word}</div>
                          <div className="text-xs text-gray-500">
                            {word.category} • Learned {word.learnedDate}
                          </div>
                        </div>
                        <button
                          aria-label="Mark as New"
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setWordToReset(word.word);
                            setIsMarkAsNewDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm p-2 bg-gray-50 rounded border text-gray-500 italic">
                      No learned words
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
          onMarkWordLearned={(word) => {
            markCurrentWordLearned(word);
          }}
          additionalContent={learningSection}
          onOpenSearch={openSearch}
        />
      </div>
      <MarkAsNewDialog
        isOpen={isMarkAsNewDialogOpen}
        onClose={() => setIsMarkAsNewDialogOpen(false)}
        onConfirm={handleMarkAsNew}
        word={wordToReset || ''}
      />
      <WordSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} searchWord={searchWord} />
    </>
  );
};

export default VocabularyAppWithLearning;
