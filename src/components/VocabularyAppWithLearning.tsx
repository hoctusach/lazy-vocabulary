import React, { useEffect, useMemo, useRef, useState } from 'react';
import VocabularyAppContainerNew from './vocabulary-app/VocabularyAppContainerNew';
import { LearningProgressPanel } from './LearningProgressPanel';
import QuickQuizPanel from './vocabulary-app/QuickQuizPanel';
import StreakPanel from './vocabulary-app/StreakPanel';
import LeaderboardPanel from './vocabulary-app/LeaderboardPanel';
import { useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import { findSetWord } from '@/features/word-sets/vocabularySetStore';
import {
  buildMixedQueue,
  filterByBuiltinGroups,
  interleaveBuiltinGroups,
  sumStats,
  type SourcedWord,
} from '@/features/word-sets/mixQueue';
import { BUILTIN_GROUPS } from '@/features/word-sets/vocabularySetStore';
import { DEFAULT_SET_ID } from '@/features/word-sets/types';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { hasCachedTodaySelection } from '@/services/learningProgressService';
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';
import { ChevronDown, Eye } from 'lucide-react';
import { normalizeQuery } from '@/utils/text/normalizeQuery';
import WordSearchModal from './vocabulary-app/WordSearchModal';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MarkAsNewDialog } from './MarkAsNewDialog';
import { useDailyUsageTracker } from '@/hooks/useDailyUsageTracker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { VocabularyWord } from '@/types/vocabulary';
import type { LearnedWordSummary } from '@/lib/progress/learnedWordStats';
import SrsPrincipleLine from '@/features/srs-principle/SrsPrincipleLine';
import { trackUiInteraction } from '@/services/analyticsService';

interface VocabularyAppWithLearningProps {
  /** `all` keeps the original stacked page. Mobile tabs pass `learn` or `progress`. */
  view?: 'all' | 'learn' | 'progress';
}

const VocabularyAppWithLearning: React.FC<VocabularyAppWithLearningProps> = ({ view = 'all' }) => {
  useDailyUsageTracker();
  const wordSets = useVocabularySets();
  const [summaryOpen, setSummaryOpen] = useState(false);
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
    progressError,
  } = useLearningProgress({ builtinGroups: wordSets.selectedBuiltinGroups });
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

  // Built-in part of the mix. With only some groups selected the server lists still cover the whole
  // built-in set, so they are narrowed to the selected groups here.
  const groups = wordSets.selectedBuiltinGroups;
  const partialBuiltin = groups.length > 0 && groups.length < BUILTIN_GROUPS.length;
  const scopeBuiltin = <T extends { category?: string | null }>(list: T[]): T[] =>
    !wordSets.hasBuiltin ? [] : partialBuiltin ? filterByBuiltinGroups(list, groups) : list;

  const importedLearnedDisplay = wordSets.importedLearned.map((entry) => ({
    word: entry.word,
    category: entry.category,
    reviewCount: entry.reviewCount,
    nextReviewAt: entry.nextReviewAt as string | undefined,
    learnedDate: entry.learnedAt as string | undefined,
    sourceId: entry.sourceId,
  }));
  const importedDueDisplay = wordSets.importedDue.map((entry) => ({
    word: entry.word,
    category: entry.category,
    reviewCount: entry.reviewCount,
    nextReviewAt: entry.nextReviewAt as string | undefined,
    learnedDate: entry.learnedAt as string | undefined,
    sourceId: entry.sourceId,
  }));
  const importedNewDisplay = wordSets.importedQueues.flatMap((queue) => {
    const learnedKeys = new Set(
      wordSets.importedLearned
        .filter((entry) => entry.sourceId === queue.sourceId)
        .map((entry) => `${entry.category}::${entry.word}`)
    );
    return queue.words
      .filter((word) => !learnedKeys.has(`${word.category ?? ''}::${word.word}`))
      .map((word) => ({
        word: word.word,
        category: word.category,
        reviewCount: 0,
        nextReviewAt: undefined as string | undefined,
        learnedDate: undefined as string | undefined,
        sourceId: queue.sourceId,
      }));
  });

  const builtinLearnedList = scopeBuiltin(Array.isArray(learnedWords) ? learnedWords : []);
  const builtinNewList = scopeBuiltin(Array.isArray(newTodayLearnedWords) ? newTodayLearnedWords : []);
  const builtinDueList = scopeBuiltin(Array.isArray(dueTodayLearnedWords) ? dueTodayLearnedWords : []);
  const learnedWordsList = [...builtinLearnedList, ...importedLearnedDisplay];
  const newTodayList = [...builtinNewList, ...importedNewDisplay];
  const dueTodayList = [...builtinDueList, ...importedDueDisplay];
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
    const nextQuery = normalizeQuery(word ?? '');
    if (word && !nextQuery) {
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
      const resetSource = (wordToReset as { sourceId?: string }).sourceId;
      if (resetSource && resetSource !== DEFAULT_SET_ID) {
        wordSets.markNew(wordToReset.word, category, resetSource);
        toast.success('Moved back to Learning!');
        setIsMarkAsNewDialogOpen(false);
        setWordToReset(null);
        return;
      }
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

  // The built-in daily list is account-backed. With no user key (fresh install, signed out) or a
  // failed fetch it stays empty, so fall back to the local built-in groups instead of an empty card.
  const builtinToday = useMemo(
    () => (wordSets.hasBuiltin ? scopeBuiltin(todayWords) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayWords, wordSets.hasBuiltin, groups.join('|')]
  );
  const needsLocalFallback =
    wordSets.hasBuiltin && builtinToday.length === 0 && !isDailySelectionLoading;
  const localFallbackWords = useMemo(
    () => (needsLocalFallback ? interleaveBuiltinGroups(DEFAULT_VOCABULARY_DATA, groups) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needsLocalFallback, groups.join('|')]
  );
  const builtinPlayback: VocabularyWord[] = builtinToday.length > 0 ? builtinToday : localFallbackWords;

  // Union of the selected sources: the built-in part plus each imported set, round-robin.
  const playbackWords = useMemo<SourcedWord[]>(
    () =>
      buildMixedQueue<VocabularyWord>([
        { sourceId: DEFAULT_SET_ID, words: builtinPlayback },
        ...wordSets.importedQueues.map((queue) => ({ sourceId: queue.sourceId, words: queue.words })),
      ]),
    [builtinPlayback, wordSets.importedQueues]
  );
  const quizWords = useMemo(
    () =>
      buildMixedQueue<VocabularyWord>([
        { sourceId: DEFAULT_SET_ID, words: builtinToday },
        ...wordSets.importedQueues.map((queue) => ({ sourceId: queue.sourceId, words: queue.words })),
      ]),
    [builtinToday, wordSets.importedQueues]
  );

  const builtinStats = wordSets.hasBuiltin ? progressStats : null;
  const playbackStats = sumStats([
    ...(builtinStats ? [builtinStats] : []),
    ...(wordSets.importedQueues.length > 0 ? [wordSets.stats] : []),
  ]);

  const handleMarkWordLearned = (word: string, category?: string, sourceId?: string) => {
    const routed =
      sourceId ??
      playbackWords.find((item) => item.word === word && (category === undefined || item.category === category))
        ?.sourceId;
    if (routed && routed !== DEFAULT_SET_ID) {
      const queue = wordSets.importedQueues.find((item) => item.sourceId === routed);
      const match =
        (queue ? findSetWord(queue.words, word, category) : undefined) ??
        findSetWord(
          wordSets.words.filter((item) => item.sourceId === routed),
          word,
          category
        );
      wordSets.markLearned({
        ...(match ?? { word, meaning: '', example: '', count: 0, category: category ?? '' }),
        sourceId: routed,
      });
      return;
    }
    markCurrentWordLearned(word);
  };
  const learningSection = (
    <TooltipProvider>
      <div className="space-y-3 mt-3">
        <QuickQuizPanel targetWords={quizWords} />

        <LearningProgressPanel
          progressStats={playbackStats}
          learnerId={wordSets.activeSet.id}
          progressError={wordSets.hasBuiltin ? progressError : null}
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
          {wordSets.hasBuiltin && progressError && wordSets.importedQueues.length === 0 ? (
            <div className="rounded-md border border-yellow-500 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-200">
              {progressError}
            </div>
          ) : (
            <>
              {!hasSelectionWords && (
                <div className="text-sm text-[var(--lv-text-secondary)] italic">No daily selection available yet.</div>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <h4 className="font-medium text-[var(--lv-success)]">NEW TODAY ({newTodayList.length})</h4>
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
                  <h4 className="font-medium text-[var(--lv-error)]">DUE TODAY ({dueTodayList.length})</h4>
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
                  <h4 className="font-medium text-[var(--lv-text-secondary)]">LEARNED ({learnedWordsList.length})</h4>
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

  const showCard = view !== 'progress';
  const showProgress = view !== 'learn';

  return (
    <>
      <ToastProvider />
      {showCard && (
      <div className={view === 'all' ? 'w-full max-w-6xl mx-auto p-4' : 'w-full'}>
        <VocabularyAppContainerNew
          initialWords={playbackWords}
          dailySelection={wordSets.hasBuiltin ? dailySelection : null}
          isLoadingSelection={wordSets.hasBuiltin && isDailySelectionLoading && playbackWords.length === 0}
          onMarkWordLearned={handleMarkWordLearned}
          additionalContent={view === 'all' ? learningSection : undefined}
          onOpenSearch={openSearch}
          currentUserLearnedCount={playbackStats.learned}
          currentUserLearningCount={playbackStats.learning}
          currentUserDueCount={playbackStats.due}
          variant={view === 'learn' ? 'card' : 'full'}
        />
        <SrsPrincipleLine fixed={view === 'learn'} />
      </div>
      )}
      {showProgress && view !== 'all' && (
        <div className="space-y-3">
          <StreakPanel refreshKey={playbackStats.learned} />
          <LeaderboardPanel
            currentUserLearnedCount={playbackStats.learned}
            currentUserLearningCount={playbackStats.learning}
            currentUserDueCount={playbackStats.due}
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
