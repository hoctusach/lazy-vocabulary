import React, { useEffect, useRef, useState } from 'react';
import VocabularyAppContainerNew from './vocabulary-app/VocabularyAppContainerNew';
import { LearningProgressPanel } from './LearningProgressPanel';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { hasCachedTodaySelection } from '@/services/learningProgressService';
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';
import { ChevronDown, Eye } from 'lucide-react';
import WordSearchModal from './vocabulary-app/WordSearchModal';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { MarkAsNewDialog } from './MarkAsNewDialog';
import { useDailyUsageTracker } from '@/hooks/useDailyUsageTracker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { VocabularyWord } from '@/types/vocabulary';
import type { LearnedWordSummary } from '@/lib/progress/learnedWordStats';

const VocabularyAppWithLearning: React.FC = () => {
  useDailyUsageTracker();
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [isMarkAsNewDialogOpen, setIsMarkAsNewDialogOpen] = useState(false);
  const [wordToReset, setWordToReset] = useState<LearnedWordSummary | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchWord, setSearchWord] = useState('');

  const {
    dailySelection,
    progressStats,
    generateDailyWords,
    markWordAsPlayed,
    markWordLearned: markCurrentWordLearned,
    markWordAsNew,
    todayWords,
    learnedWords,
    newTodayLearnedWords,
    dueTodayLearnedWords,
    isDailySelectionLoading,
  } = useLearningProgress();
  const [didTriggerFirstTimeLoad, setDidTriggerFirstTimeLoad] = useState(false);

  useEffect(() => {
    if (didTriggerFirstTimeLoad) return;
    if (isDailySelectionLoading) return;

    const hasWords = todayWords.length > 0 || Boolean(dailySelection?.totalCount);
    if (hasWords) return;
    if (hasCachedTodaySelection()) return;

    const storedUserKey =
      typeof window !== 'undefined' ? window.localStorage?.getItem('lazyVoca.userKey') : null;
    if (!storedUserKey) return;

    setDidTriggerFirstTimeLoad(true);
    void generateDailyWords('light');
  }, [
    dailySelection?.totalCount,
    didTriggerFirstTimeLoad,
    generateDailyWords,
    isDailySelectionLoading,
    todayWords.length,
  ]);

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

  const learnedWordsList = Array.isArray(learnedWords) ? learnedWords : [];
  const newTodayList = Array.isArray(newTodayLearnedWords) ? newTodayLearnedWords : [];
  const dueTodayList = Array.isArray(dueTodayLearnedWords) ? dueTodayLearnedWords : [];
  const hasSelectionWords =
    newTodayList.length > 0 || dueTodayList.length > 0 || learnedWordsList.length > 0;

  const formatReviewCount = (count?: number) => {
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      return '—';
    }
    const safeCount = Math.max(0, Math.trunc(count));
    return `${safeCount}`;
  };

  const formatDateOnly = (value?: string) => {
    if (!value) {
      return '—';
    }
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
      return '—';
    }
    if (trimmed.length >= 10) {
      return trimmed.slice(0, 10);
    }
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
      return trimmed;
    }
    return new Date(parsed).toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (dailySelection) {
      setSummaryOpen(true);
    }
  }, [dailySelection]);

  const openSearch = (word?: string) => {
    const nextQuery = word ?? '';
    if (word && !word.trim()) {
      toast.warning('Please enter a valid search query.');
      return;
    }
    setSearchWord(nextQuery);
    setIsSearchOpen(true);
  };

  const handleMarkAsNew = async () => {
    if (wordToReset) {
      const category = (wordToReset.category ?? '').trim();
      const wordId = category ? `${wordToReset.word}::${category}` : wordToReset.word;
      const didReset = await markWordAsNew(wordId);
      if (didReset) {
        toast.success('Moved back to Learning!');
      } else {
        toast.error('Unable to move word back to learning. Please try again.');
      }
    }
    setIsMarkAsNewDialogOpen(false);
    setWordToReset(null);
  };

  const learningSection = (
    <TooltipProvider>
      <div className="space-y-3 mt-3">
      <LearningProgressPanel
        progressStats={progressStats}
        learnerId="default"
      />

      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <CollapsibleTrigger className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Word Summary</h3>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Tap to show or hide details
              </span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Click to expand or collapse the word summary.</TooltipContent>
        </Tooltip>
        <CollapsibleContent className="space-y-3">
          {!hasSelectionWords && (
            <div className="text-sm text-gray-500 italic">No daily selection available yet.</div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <h4 className="font-medium text-green-600">NEW TODAY ({newTodayList.length})</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {newTodayList.length > 0 ? (
                  newTodayList.map((word, index) => (
                    <div
                      key={`${word.word}-${index}`}
                      className="text-sm p-2 rounded border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/40"
                    >
                      <div className="font-semibold text-green-900 dark:text-green-100">{word.word}</div>
                      <div className="space-y-0.5">
                        <div className="text-xs text-green-700 dark:text-green-200">
                          Review #{formatReviewCount(word.reviewCount)}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-200">
                          Next review: {formatDateOnly(word.nextReviewAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm p-2 rounded border border-green-200 bg-green-50 text-green-800 italic dark:border-green-800 dark:bg-green-900/40 dark:text-green-100">
                    No new words assigned today
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-medium text-red-600">DUE TODAY ({dueTodayList.length})</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {dueTodayList.length > 0 ? (
                  dueTodayList.map((word, index) => (
                    <div
                      key={`${word.word}-${index}`}
                      className="text-sm p-2 rounded border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/40"
                    >
                      <div className="font-semibold text-red-900 dark:text-red-100">{word.word}</div>
                      <div className="space-y-0.5">
                        <div className="text-xs text-red-700 dark:text-red-200">
                          Review #{formatReviewCount(word.reviewCount)}
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-200">
                          Next review: {formatDateOnly(word.nextReviewAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm p-2 rounded border border-red-200 bg-red-50 text-red-800 italic dark:border-red-800 dark:bg-red-900/40 dark:text-red-100">
                    No due reviews today
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-medium text-gray-600">LEARNED ({learnedWordsList.length})</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {learnedWordsList.length > 0 ? (
                  learnedWordsList.map((word, index) => (
                    <div
                      key={index}
                      className="text-sm p-2 rounded border border-slate-200 bg-slate-100 flex items-center justify-between dark:border-slate-700 dark:bg-slate-900/40"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{word.word}</div>
                        <div className="space-y-0.5">
                          <div className="text-xs text-slate-700 dark:text-slate-200">
                            Learned {formatDateOnly(word.learnedDate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <button
                          aria-label="View Word"
                          className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                          onClick={() => openSearch(word.word)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm p-2 rounded border border-slate-200 bg-slate-100 text-slate-800 italic dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100">
                    No learned words
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      <ToastProvider />
      <div className="w-full max-w-6xl mx-auto p-4">
        <VocabularyAppContainerNew
          initialWords={todayWords}
          dailySelection={dailySelection}
          isLoadingSelection={isDailySelectionLoading}
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
        word={wordToReset?.word ?? ''}
      />
      <WordSearchModal
        isOpen={isSearchOpen}
        initialQuery={searchWord}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
};

export default VocabularyAppWithLearning;
