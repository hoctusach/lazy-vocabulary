import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Medal, Trophy, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  getLeaderboardState,
  type LeaderboardEntry,
  type LeaderboardState,
} from '@/lib/progress/leaderboard';

interface LeaderboardPanelProps {
  currentUserLearnedCount?: number;
  currentUserLearningCount?: number;
  currentUserDueCount?: number;
  className?: string;
}

const initialState: LeaderboardState = {
  timeframe: 'allTime',
  entries: [],
  isLoading: true,
};

const LEADERBOARD_DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;

function getMillisecondsUntilNextDailyRefresh(): number {
  const now = new Date();
  const nextRefresh = new Date(now);
  nextRefresh.setDate(now.getDate() + 1);
  nextRefresh.setHours(0, 0, 0, 0);

  return Math.max(LEADERBOARD_DAILY_REFRESH_MS, nextRefresh.getTime() - now.getTime());
}

function formatTimeframeLabel(timeframe: LeaderboardState['timeframe']): string {
  switch (timeframe) {
    case 'today':
      return 'Today';
    case 'week':
      return 'This week';
    case 'allTime':
    default:
      return 'All time';
  }
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.max(0, value));
}

function formatMinutes(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value < 60) {
    return `${formatNumber(value)} min`;
  }

  const hours = Math.round((value / 60) * 10) / 10;
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 1 })} hr`;
}

function rankIcon(rank: number): React.ReactNode {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
  if (rank <= 3) return <Medal className="h-4 w-4 text-orange-400" aria-hidden="true" />;
  return <span className="text-xs font-semibold theme-muted-text">#{rank}</span>;
}

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; isStandaloneCurrentUser?: boolean }> = ({
  entry,
  isStandaloneCurrentUser = false,
}) => {
  const minutes = formatMinutes(entry.learningMinutes);

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
        entry.isCurrentUser
          ? 'border-[var(--lv-accent)]/60 bg-[var(--lv-accent)]/10'
          : 'theme-border theme-card-highlight',
        isStandaloneCurrentUser && 'border-dashed'
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full theme-card-surface">
        {rankIcon(entry.rank)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium" style={{ color: 'var(--lv-text)' }}>
            {entry.nickname}
          </span>
          {entry.isCurrentUser && isStandaloneCurrentUser && (
            <span className="shrink-0 rounded-full bg-[var(--lv-accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--lv-accent)]">
              You
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs theme-muted-text">
          {typeof entry.streakDays === 'number' && entry.streakDays > 0 && (
            <span>{formatNumber(entry.streakDays)} day streak</span>
          )}
          {minutes && <span>{minutes}</span>}
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-2 text-right">
        <div>
          <div className="font-semibold" style={{ color: 'var(--lv-heading)' }}>
            {formatNumber(entry.learnedWords)}
          </div>
          <div className="text-[11px] theme-muted-text">learned</div>
        </div>
        <div>
          <div className="font-semibold text-blue-600 dark:text-blue-300">
            {formatNumber(entry.learningWords)}
          </div>
          <div className="text-[11px] theme-muted-text">learning</div>
        </div>
        <div>
          <div className="font-semibold text-red-600 dark:text-red-300">
            {formatNumber(entry.dueWords)}
          </div>
          <div className="text-[11px] theme-muted-text">due</div>
        </div>
      </div>
    </div>
  );
};

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  currentUserLearnedCount,
  currentUserLearningCount,
  currentUserDueCount,
  className,
}) => {
  const [state, setState] = useState<LeaderboardState>(initialState);
  const [isOpen, setIsOpen] = useState(true);
  const currentUserCountsRef = useRef({
    currentUserLearnedCount,
    currentUserLearningCount,
    currentUserDueCount,
  });

  useEffect(() => {
    currentUserCountsRef.current = {
      currentUserLearnedCount,
      currentUserLearningCount,
      currentUserDueCount,
    };
  }, [currentUserDueCount, currentUserLearnedCount, currentUserLearningCount]);

  useEffect(() => {
    let isMounted = true;
    let dailyRefreshTimeout: ReturnType<typeof window.setTimeout> | undefined;

    const load = async () => {
      setState((current) => ({ ...current, isLoading: true, error: undefined }));
      try {
        const nextState = await getLeaderboardState(currentUserCountsRef.current);
        if (isMounted) {
          setState(nextState);
        }
      } catch (error) {
        console.warn('leaderboard:load', error);
        if (isMounted) {
          setState({
            timeframe: 'allTime',
            entries: [],
            isLoading: false,
            error: 'Leaderboard is unavailable right now.',
          });
        }
      }
    };

    const scheduleDailyRefresh = () => {
      if (!isMounted || typeof window === 'undefined') return;

      dailyRefreshTimeout = window.setTimeout(() => {
        void load().finally(scheduleDailyRefresh);
      }, getMillisecondsUntilNextDailyRefresh());
    };

    void load().finally(scheduleDailyRefresh);

    return () => {
      isMounted = false;
      if (dailyRefreshTimeout) {
        window.clearTimeout(dailyRefreshTimeout);
      }
    };
  }, []);

  const entries = state.entries;
  const currentUserOutsideTop = useMemo(() => {
    if (!state.currentUserEntry) return null;
    const isAlreadyVisible = entries.some((entry) => entry.userKey === state.currentUserEntry?.userKey);
    return isAlreadyVisible ? null : state.currentUserEntry;
  }, [entries, state.currentUserEntry]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <Card className={cn('mx-auto mt-3 w-full max-w-2xl border-2 theme-card-surface theme-border', className)}>
        <CardContent className="p-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg text-left transition-colors hover:bg-[var(--lv-card-highlight)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lv-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lv-card-surface)]"
              aria-label={`${isOpen ? 'Collapse' : 'Expand'} leaderboard`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lv-accent)]/10 text-[var(--lv-accent)]">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: 'var(--lv-heading)' }}>
                    Leaderboard
                  </span>
                  <span className="block text-xs theme-muted-text">Top 5 by learned words</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full theme-card-highlight px-2.5 py-1 text-xs font-medium theme-muted-text border theme-border">
                  {formatTimeframeLabel(state.timeframe)}
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 theme-muted-text transition-transform', isOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </span>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-2">
            {state.isLoading ? (
              <div className="space-y-2" aria-label="Loading leaderboard">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-11 animate-pulse rounded-lg theme-card-highlight" />
                ))}
              </div>
            ) : state.error ? (
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-100">
                {state.error}
              </div>
            ) : entries.length > 0 ? (
              <div className="space-y-1.5">
                {entries.map((entry) => (
                  <LeaderboardRow key={entry.userKey} entry={entry} />
                ))}
                {currentUserOutsideTop && (
                  <>
                    <div className="px-2 text-center text-xs theme-muted-text">...</div>
                    <LeaderboardRow entry={currentUserOutsideTop} isStandaloneCurrentUser />
                  </>
                )}
              </div>
            ) : state.currentUserEntry ? (
              <div className="space-y-2">
                <LeaderboardRow entry={state.currentUserEntry} isStandaloneCurrentUser />
                <p className="text-xs theme-muted-text">
                  Sign in or sync progress to compare your score with other learners.
                </p>
              </div>
            ) : (
              <div className="rounded-lg theme-card-highlight px-3 py-3 text-sm theme-muted-text border theme-border">
                Start learning words to appear on the leaderboard.
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
};

export default LeaderboardPanel;
