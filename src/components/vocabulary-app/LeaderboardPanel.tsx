import React, { useEffect, useMemo, useState } from 'react';
import { Medal, Trophy, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NICKNAME_EVENT_NAME } from '@/lib/nicknameEvents';
import { USER_KEY_EVENT_NAME } from '@/lib/userKeyEvents';
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
          {entry.isCurrentUser && (
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

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setState((current) => ({ ...current, isLoading: true, error: undefined }));
      try {
        const nextState = await getLeaderboardState({
          currentUserLearnedCount,
          currentUserLearningCount,
          currentUserDueCount,
        });
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

    void load();

    const handleRefresh = () => {
      void load();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleRefresh);
      window.addEventListener('storage', handleRefresh);
      window.addEventListener(NICKNAME_EVENT_NAME, handleRefresh);
      window.addEventListener(USER_KEY_EVENT_NAME, handleRefresh);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleRefresh);
        window.removeEventListener('storage', handleRefresh);
        window.removeEventListener(NICKNAME_EVENT_NAME, handleRefresh);
        window.removeEventListener(USER_KEY_EVENT_NAME, handleRefresh);
      }
    };
  }, [currentUserDueCount, currentUserLearnedCount, currentUserLearningCount]);

  const entries = state.entries;
  const currentUserOutsideTop = useMemo(() => {
    if (!state.currentUserEntry) return null;
    const isAlreadyVisible = entries.some((entry) => entry.userKey === state.currentUserEntry?.userKey);
    return isAlreadyVisible ? null : state.currentUserEntry;
  }, [entries, state.currentUserEntry]);

  return (
    <Card className={cn('mx-auto mt-3 w-full max-w-2xl border-2 theme-card-surface theme-border', className)}>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--lv-accent)]/10 text-[var(--lv-accent)]">
              <Users className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--lv-heading)' }}>
                Leaderboard
              </h2>
              <p className="text-xs theme-muted-text">Top 5 by learned words</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full theme-card-highlight px-2.5 py-1 text-xs font-medium theme-muted-text border theme-border">
            {formatTimeframeLabel(state.timeframe)}
          </span>
        </div>

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
                <div className="px-2 text-center text-xs theme-muted-text">•••</div>
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
      </CardContent>
    </Card>
  );
};

export default LeaderboardPanel;
