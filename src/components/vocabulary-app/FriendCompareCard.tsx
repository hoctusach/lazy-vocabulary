import React, { useEffect, useState } from "react";
import { Swords, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ensureUserKey } from "@/lib/progress/srsSyncByUserKey";
import { getProgressSummary } from "@/lib/progress/progressSummary";
import { calculateCurrentStreak } from "@/lib/progress/streak";
import { getFriendProgress, readFriendKeyFromLocation, type FriendProgress } from "@/lib/progress/friendCompare";

type OwnProgress = {
  learnedCount: number;
  streakDays: number;
};

function removeFriendParamFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("friend");
  window.history.replaceState({}, "", url.toString());
}

const StatColumn: React.FC<{ label: string; nickname: string; learnedCount: number; streakDays: number; highlight?: boolean }> = ({
  label,
  nickname,
  learnedCount,
  streakDays,
  highlight,
}) => (
  <div className="flex-1 text-center">
    <div className="text-[10px] font-semibold uppercase tracking-wide theme-muted-text">{label}</div>
    <div
      className="mt-0.5 truncate text-sm font-semibold"
      style={{ color: highlight ? "var(--lv-accent)" : "var(--lv-heading)" }}
      title={nickname}
    >
      {nickname}
    </div>
    <div className="mt-1.5 text-2xl font-bold" style={{ color: "var(--lv-heading)" }}>
      {learnedCount}
    </div>
    <div className="text-[11px] theme-muted-text">learned</div>
    {streakDays > 0 && (
      <div className="mt-1 text-xs theme-muted-text">🔥 {streakDays}-day streak</div>
    )}
  </div>
);

const FriendCompareCard: React.FC<{ className?: string }> = ({ className }) => {
  const [friendKey, setFriendKey] = useState<string | null>(null);
  const [own, setOwn] = useState<OwnProgress | null>(null);
  const [friend, setFriend] = useState<FriendProgress | null | undefined>(undefined);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setFriendKey(readFriendKeyFromLocation());
  }, []);

  useEffect(() => {
    if (!friendKey) return;
    let cancelled = false;

    void (async () => {
      const [ownUserKey, friendProgress] = await Promise.all([
        ensureUserKey(),
        getFriendProgress(friendKey),
      ]);

      if (cancelled) return;
      setFriend(friendProgress);

      if (ownUserKey && ownUserKey !== friendKey) {
        const summary = await getProgressSummary(ownUserKey);
        if (cancelled) return;
        setOwn({
          learnedCount: summary?.learned_count ?? 0,
          streakDays: calculateCurrentStreak(summary?.learned_days ?? []),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [friendKey]);

  const handleDismiss = () => {
    setDismissed(true);
    removeFriendParamFromUrl();
  };

  if (!friendKey || dismissed || friend === undefined) return null;

  if (friend === null) {
    return (
      <Card className={cn("mt-3 w-full border-2 theme-card-surface theme-border", className)}>
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <p className="text-sm theme-muted-text">That share link isn't valid anymore.</p>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleDismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("mt-3 w-full border-2 theme-card-surface theme-border", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--lv-accent-soft)", color: "var(--lv-accent)" }}
            >
              <Swords className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--lv-heading)" }}>
              Friend compare
            </span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleDismiss} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mt-3 flex items-stretch gap-3">
          <StatColumn label="You" nickname={own ? "You" : "Start today"} learnedCount={own?.learnedCount ?? 0} streakDays={own?.streakDays ?? 0} highlight />
          <div className="flex items-center text-sm font-semibold theme-muted-text">vs</div>
          <StatColumn label="Friend" nickname={friend.nickname} learnedCount={friend.learnedCount} streakDays={friend.streakDays} />
        </div>

        {!own && (
          <p className="mt-3 text-center text-xs theme-muted-text">
            Sign in and learn a word to put your own score on the board.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FriendCompareCard;
