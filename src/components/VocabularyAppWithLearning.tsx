import React, { useEffect, useMemo, useRef, useState } from 'react';
import VocabularyAppContainerNew from './vocabulary-app/VocabularyAppContainerNew';
import { LearningProgressPanel } from './LearningProgressPanel';
import WordSummaryPanel from './WordSummaryPanel';
import QuickQuizPanel from './vocabulary-app/QuickQuizPanel';
import StreakPanel from './vocabulary-app/StreakPanel';
import LeaderboardPanel from './vocabulary-app/LeaderboardPanel';
import { useVocabularySets } from '@/features/word-sets/VocabularySetContext';
import { findSetWord } from '@/features/word-sets/vocabularySetStore';
import { allocateQuotas, takeByQuota } from '@/features/word-sets/dailyMix';
import { DAILY_TARGET, MAX_TOTAL } from '@/lib/progress/dailyTarget';
import {
  buildMixedQueue,
  filterByBuiltinGroups,
  interleaveBuiltinGroups,
  activeProgressStats,
  type SourcedWord,
} from '@/features/word-sets/mixQueue';
import { BUILTIN_GROUPS, builtinSelectedWordCount } from '@/features/word-sets/vocabularySetStore';
import { DEFAULT_SET_ID } from '@/features/word-sets/types';
import { DEFAULT_VOCABULARY_DATA } from '@/data/defaultVocabulary';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { todayKey } from '@/lib/progress/streak';
import { localDayOf } from '@/lib/progress/learnedWordStats';
import { hasCachedTodaySelection } from '@/services/learningProgressService';
import { vocabularyService } from '@/services/vocabularyService';
import ToastProvider from './vocabulary-app/ToastProvider';
import { normalizeQuery } from '@/utils/text/normalizeQuery';
import WordSearchModal from './vocabulary-app/WordSearchModal';
import { toast } from 'sonner';
import { MarkAsNewDialog } from './MarkAsNewDialog';
import { useDailyUsageTracker } from '@/hooks/useDailyUsageTracker';
import type { VocabularyWord } from '@/types/vocabulary';
import type { LearnedWordSummary } from '@/lib/progress/learnedWordStats';
import SrsPrincipleLine from '@/features/srs-principle/SrsPrincipleLine';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';
import { tickStudyToday } from '@/lib/progress/studyTick';
import { trackUiInteraction } from '@/services/analyticsService';

interface VocabularyAppWithLearningProps {
  /** `all` keeps the original stacked page. Mobile tabs pass `learn` or `progress`. */
  view?: 'all' | 'learn' | 'progress';
}

const DAILY_SELECTION_TIMEOUT_MS = 8000;

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
    learnedTodayWords,
    newTodayLearnedWords,
    dueTodayLearnedWords,
    isDailySelectionLoading: dailySelectionPending,
    progressError,
  } = useLearningProgress({ builtinGroups: wordSets.planBuiltinGroups });
  // [FB-83] A backend that never answers must not keep Learn on the loading card: after the timeout the
  // bundled vocabulary takes over (the late response, if any, still replaces it).
  const selectionTimedOut = useLoadingTimeout(dailySelectionPending, DAILY_SELECTION_TIMEOUT_MS);
  const isDailySelectionLoading = dailySelectionPending && !selectionTimedOut;
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
      tickStudyToday(); // [FB-40] studying started: tick today's local date now
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
  const groups = wordSets.planBuiltinGroups; // [FB-63] today's plan, not the live Library selection
  const partialBuiltin = groups.length > 0 && groups.length < BUILTIN_GROUPS.length;
  const scopeBuiltin = <T extends { category?: string | null }>(list: T[]): T[] =>
    !wordSets.planHasBuiltin ? [] : partialBuiltin ? filterByBuiltinGroups(list, groups) : list;

  // The built-in daily list is account-backed. With no user key (fresh install, signed out) or a
  // failed fetch it stays empty, so fall back to the local built-in groups instead of an empty card.
  const builtinToday = useMemo(
    () => (wordSets.planHasBuiltin ? scopeBuiltin(todayWords) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayWords, wordSets.planHasBuiltin, groups.join('|')]
  );
  const needsLocalFallback =
    wordSets.planHasBuiltin && builtinToday.length === 0 && !isDailySelectionLoading;
  const localFallbackWords = useMemo(
    () => (needsLocalFallback ? interleaveBuiltinGroups(DEFAULT_VOCABULARY_DATA, groups) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needsLocalFallback, groups.join('|')]
  );
  const builtinPlayback: VocabularyWord[] = builtinToday.length > 0 ? builtinToday : localFallbackWords;

  // [FB-63] With a built-in part AND imported sets (or several imported sets) a day is ~20 words split in proportion to
  // the sources' sizes (Due first, then New inside each source). A single source keeps all of the day.
  const dueByImported = (sourceId: string) => wordSets.importedDue.filter((entry) => entry.sourceId === sourceId).length;
  const mixSlices = useMemo(() => {
    const importedCount = wordSets.importedQueues.length;
    const families = (builtinPlayback.length > 0 && wordSets.planHasBuiltin ? 1 : 0) + importedCount;
    if (importedCount === 0 || families < 2 || needsLocalFallback) return null;
    const sources = [
      ...(wordSets.planHasBuiltin
        ? [{ id: DEFAULT_SET_ID, size: builtinSelectedWordCount(groups), due: dueTodayLearnedWords.length }]
        : []),
      ...wordSets.importedQueues.map((q) => ({
        id: q.sourceId,
        size: wordSets.sets.find((set) => set.id === q.sourceId)?.wordCount ?? q.words.length,
        due: dueByImported(q.sourceId),
      })),
    ];
    const quotas = allocateQuotas(sources, DAILY_TARGET + learnedTodayWords.length > MAX_TOTAL ? MAX_TOTAL : DAILY_TARGET);
    return takeByQuota(
      [
        ...(wordSets.planHasBuiltin ? [{ id: DEFAULT_SET_ID, words: builtinPlayback as readonly VocabularyWord[] }] : []),
        ...wordSets.importedQueues.map((q) => ({ id: q.sourceId, words: q.words as readonly VocabularyWord[] })),
      ],
      quotas,
      DAILY_TARGET
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builtinPlayback, wordSets.importedQueues, wordSets.importedDue, wordSets.planHasBuiltin, needsLocalFallback, groups.join('|')]);
  const sliceOf = (sourceId: string, words: VocabularyWord[]): VocabularyWord[] => mixSlices?.[sourceId] ?? words;
  const builtinMix = sliceOf(DEFAULT_SET_ID, builtinPlayback);
  const builtinQuizMix = sliceOf(DEFAULT_SET_ID, builtinToday);
  const importedMix = wordSets.importedQueues.map((queue) => ({ sourceId: queue.sourceId, words: sliceOf(queue.sourceId, queue.words) }));

  // Union of today's sources: the built-in part plus each imported set, round-robin.
  const playbackWords = useMemo<SourcedWord[]>(
    () =>
      buildMixedQueue<VocabularyWord>([
        { sourceId: DEFAULT_SET_ID, words: builtinMix },
        ...importedMix,
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixSlices, builtinPlayback, wordSets.importedQueues]
  );
  const quizWords = useMemo(
    () =>
      buildMixedQueue<VocabularyWord>([
        { sourceId: DEFAULT_SET_ID, words: builtinQuizMix },
        ...importedMix,
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mixSlices, builtinToday, wordSets.importedQueues]
  );
  // [FB-51] LEARNED lists only words marked learned TODAY (device-local date). All-time counts live in Learning Progress.
  const todayLocal = todayKey();
  const importedLearnedDisplay = wordSets.importedLearned
    .filter((entry) => localDayOf(entry.lastReviewAt ?? entry.learnedAt) === todayLocal)
    .map((entry) => ({
    word: entry.word,
    category: entry.category,
    reviewCount: entry.reviewCount,
    nextReviewAt: entry.nextReviewAt as string | undefined,
    learnedDate: entry.learnedAt as string | undefined,
    sourceId: entry.sourceId,
  }));
  const inSlice = (sourceId: string, word: string) =>
    !mixSlices || (mixSlices[sourceId] ?? []).some((w) => w.word === word);
  const importedDueDisplay = wordSets.importedDue.filter((entry) => inSlice(entry.sourceId, entry.word)).map((entry) => ({
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
    return sliceOf(queue.sourceId, queue.words)
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

  const builtinLearnedList = scopeBuiltin(Array.isArray(learnedTodayWords) ? learnedTodayWords : []);
  const inBuiltinMix = (word: string) => !mixSlices || builtinMix.some((w) => w.word === word);
  const builtinNewList = scopeBuiltin(Array.isArray(newTodayLearnedWords) ? newTodayLearnedWords : []).filter((w) => inBuiltinMix(w.word));
  const builtinDueList = scopeBuiltin(Array.isArray(dueTodayLearnedWords) ? dueTodayLearnedWords : []).filter((w) => inBuiltinMix(w.word));
  const learnedWordsList = [...builtinLearnedList, ...importedLearnedDisplay];
  const newTodayList = [...builtinNewList, ...importedNewDisplay];
  const dueTodayList = [...builtinDueList, ...importedDueDisplay];
  const hasSelectionWords =
    newTodayList.length > 0 || dueTodayList.length > 0 || learnedWordsList.length > 0;

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
        toast.error('Could not move the word back to learning. Please try again.');
      }
    }
    setIsMarkAsNewDialogOpen(false);
    setWordToReset(null);
  };

  // [FB-38] Total/New come from the active selection (same count as the Word Set card), never from
  // the server's 4000-row table or remaining_count.
  const playbackStats = activeProgressStats(
    wordSets.planHasBuiltin ? builtinSelectedWordCount(groups) : 0,
    wordSets.planHasBuiltin ? progressStats : null,
    wordSets.importedQueues.length > 0 ? wordSets.stats : null
  );

  const handleMarkWordLearned = (word: string, category?: string, sourceId?: string) => {
    tickStudyToday(); // [FB-40]
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
  const learningProgressPanel = (
    <LearningProgressPanel
      progressStats={playbackStats}
      learnerId={wordSets.activeSet.id}
      progressError={wordSets.planHasBuiltin ? progressError : null}
    />
  );
  // [FB-50] Word Summary lives on the Learn tab, directly under the card player. [FB-58] New look in WordSummaryPanel.
  const wordSummarySection = (
    <WordSummaryPanel
      open={summaryOpen}
      onOpenChange={setSummaryOpen}
      error={wordSets.planHasBuiltin && wordSets.importedQueues.length === 0 ? progressError : null}
      newList={newTodayList}
      dueList={dueTodayList}
      learnedList={learnedWordsList}
      onView={openSearch}
    />
  );

  const quizSection = <QuickQuizPanel targetWords={quizWords} />;

  const showCard = view !== 'progress';
  const showProgress = view !== 'learn';

  return (
    <>
      <ToastProvider />
      {showCard && (
      <div className={view === 'all' ? 'w-full max-w-6xl mx-auto p-4' : 'w-full'}>
        <VocabularyAppContainerNew
          initialWords={playbackWords}
          dailySelection={wordSets.planHasBuiltin ? dailySelection : null}
          isLoadingSelection={wordSets.planHasBuiltin && isDailySelectionLoading && playbackWords.length === 0}
          onMarkWordLearned={handleMarkWordLearned}
          underPlayerContent={wordSummarySection}
          additionalContent={
            view === 'all' ? (
              <div className="space-y-3 mt-3">
                {quizSection}
                {learningProgressPanel}
              </div>
            ) : undefined
          }
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
          {/* [FB-39] Learning Progress sits directly under Streak, open by default. */}
          {learningProgressPanel}
          <LeaderboardPanel
            currentUserLearnedCount={playbackStats.learned}
            currentUserLearningCount={playbackStats.learning}
            currentUserDueCount={playbackStats.due}
          />
          {quizSection}
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
