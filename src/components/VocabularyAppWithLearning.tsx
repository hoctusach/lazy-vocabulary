import React, { useEffect, useMemo, useRef, useState } from 'react';
import VocabularyAppContainerNew from './vocabulary-app/VocabularyAppContainerNew';
import { LearningProgressPanel } from './LearningProgressPanel';
import QuickQuizPanel from './vocabulary-app/QuickQuizPanel';
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
import type { DailySelection } from '@/types/learning';
import type { LearnedWordSummary } from '@/lib/progress/learnedWordStats';
import { trackUiInteraction } from '@/services/analyticsService';
import { useAppTab } from '@/components/mobile/appTabContext';
import StreakPanel from './vocabulary-app/StreakPanel';
import LeaderboardPanel from './vocabulary-app/LeaderboardPanel';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SET_ID,
  WORD_SETS_CHANGED_EVENT,
  buildStudyList,
  getActiveSetId,
  listStoredSets,
  recordWordEvent,
  wordsForSet,
} from '@/lib/wordSets';
import { useImportedStudyWords } from '@/components/word-sets/useImportedStudyWords';

const VocabularyAppWithLearning: React.FC = () => {
  useDailyUsageTracker();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [isMarkAsNewDialogOpen, setIsMarkAsNewDialogOpen] = useState(false);
  const [wordToReset, setWordToReset] = useState<LearnedWordSummary | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchWord, setSearchWord] = useState('');
  const [setRevision, setSetRevision] = useState(0);
  const { tab, inShell } = useAppTab();
  const imported = useImportedStudyWords(setRevision);

  useEffect(() => {
    const refresh = () => setSetRevision((value) => value + 1);
    window.addEventListener(WORD_SETS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(WORD_SETS_CHANGED_EVENT, refresh);
  }, []);

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
    progressError,
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
        recordWordEvent(getActiveSetId(), previousWordRef.current.word, 'seen', { silent: true });
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

  const openSearch = (word?: string) => {
    const nextQuery = word ?? '';
    if (word && !word.trim()) {
      toast.warning('Please enter a valid search query.');
      return;
    }
    trackUiInteraction('search_modal_requested', {
      label: nextQuery,
      context: { via: word ? 'prefilled' : 'empty' },
    });
    setSearchWord(nextQuery);
    setIsSearchOpen(true);
  };

  const handleMarkAsNew = async () => {
    if (wordToReset) {
      const category = (wordToReset.category ?? '').trim();
      const wordId = category ? `${wordToReset.word}::${category}` : wordToReset.word;
      trackUiInteraction('mark_as_new_confirm', { label: wordToReset.word });
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
        <QuickQuizPanel targetWords={todayWords} />

        <LearningProgressPanel
          progressStats={progressStats}
          learnerId="default"
          progressError={progressError}
        />

        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <CollapsibleTrigger className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Word Summary</h3>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Tap to show or hide details
              </span>
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', summaryOpen && 'rotate-180')}
              />
            </CollapsibleTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Click to expand or collapse the word summary.</TooltipContent>
        </Tooltip>
        <CollapsibleContent className="space-y-3">
          {progressError ? (
            <div className="rounded-md border border-yellow-500 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-200">
              {progressError}
            </div>
          ) : (
            <>
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
                          className="text-sm p-2 rounded border border-green-200 bg-green-50 flex items-start justify-between gap-2 dark:border-green-800 dark:bg-green-900/40"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-green-900 dark:text-green-100">{word.word}</div>
                            <div className="text-xs text-green-700 dark:text-green-200">
                              Review #{formatReviewCount(word.reviewCount)}
                            </div>
                            <div className="text-xs text-green-700 dark:text-green-200">
                              Next review: {formatDateOnly(word.nextReviewAt)}
                            </div>
                          </div>
                          <div className="flex items-center pt-1">
                            <button
                              aria-label={`View ${word.word}`}
                              className="text-green-700 hover:text-green-900 dark:text-green-200 dark:hover:text-green-50"
                              onClick={() => openSearch(word.word)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
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
                          className="text-sm p-2 rounded border border-red-200 bg-red-50 flex items-start justify-between gap-2 dark:border-red-800 dark:bg-red-900/40"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-red-900 dark:text-red-100">{word.word}</div>
                            <div className="text-xs text-red-700 dark:text-red-200">
                              Review #{formatReviewCount(word.reviewCount)}
                            </div>
                            <div className="text-xs text-red-700 dark:text-red-200">
                              Next review: {formatDateOnly(word.nextReviewAt)}
                            </div>
                          </div>
                          <div className="flex items-center pt-1">
                            <button
                              aria-label={`View ${word.word}`}
                              className="text-red-700 hover:text-red-900 dark:text-red-200 dark:hover:text-red-50"
                              onClick={() => openSearch(word.word)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
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
            </>
          )}
        </CollapsibleContent>
        </Collapsible>
      </div>
    </TooltipProvider>
  );

  const learnHidden = inShell && tab !== 'learn' && tab !== 'all';
  const progressHidden = inShell && tab !== 'progress' && tab !== 'all';
  const importedSelection: DailySelection | null = imported.usingImported
    ? {
        newWords: [],
        reviewWords: [],
        totalCount: imported.study.length,
        severity: 'light',
        date: new Date().toISOString().slice(0, 10),
        mode: 'Light',
        count: imported.study.length,
        category: null,
      }
    : null;
  const offlineDefaultWords = useMemo(() => {
    if (imported.usingImported || todayWords.length > 0) return null;
    const builtin = listStoredSets().find((set) => set.id === DEFAULT_SET_ID);
    if (!builtin) return null;
    return buildStudyList(DEFAULT_SET_ID, wordsForSet(builtin));
  }, [imported.revision, imported.usingImported, todayWords.length]);
  const studyWords = imported.usingImported ? imported.study : offlineDefaultWords ?? todayWords;

  return (
    <>
      <ToastProvider />
      <div className={cn('mx-auto w-full max-w-6xl p-1 sm:p-4', learnHidden && 'max-md:hidden')}>
        {imported.usingImported && (
          <p className="mb-2 rounded-2xl bg-[var(--lv-accent-soft)] px-3 py-2 text-sm font-medium text-[var(--lv-heading)]">
            Studying “{imported.name}”
            {imported.study.length === 0 ? ' · every word in this set is learned for now' : ''}
          </p>
        )}
        <VocabularyAppContainerNew
          initialWords={studyWords}
          dailySelection={imported.usingImported ? importedSelection : offlineDefaultWords ? {
            newWords: [],
            reviewWords: [],
            totalCount: offlineDefaultWords.length,
            severity: 'light',
            mode: 'Light',
            count: offlineDefaultWords.length,
            category: null,
          } : dailySelection}
          isLoadingSelection={!imported.usingImported && !offlineDefaultWords?.length && isDailySelectionLoading}
          showInsights={!inShell}
          onMarkWordLearned={(word) => {
            recordWordEvent(getActiveSetId(), word, 'learned');
            if (!imported.usingImported) {
              markCurrentWordLearned(word);
            }
          }}
          additionalContent={inShell ? undefined : learningSection}
          onOpenSearch={openSearch}
          currentUserLearnedCount={progressStats.learned}
          currentUserLearningCount={progressStats.learning}
          currentUserDueCount={progressStats.due}
        />
      </div>
      {inShell && (
        <div className={cn('mx-auto w-full max-w-6xl space-y-3 px-1 sm:px-4', progressHidden && 'max-md:hidden')}>
          <StreakPanel refreshKey={progressStats.learned} />
          <LeaderboardPanel
            currentUserLearnedCount={progressStats.learned}
            currentUserLearningCount={progressStats.learning}
            currentUserDueCount={progressStats.due}
          />
          {learningSection}
        </div>
      )}
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
