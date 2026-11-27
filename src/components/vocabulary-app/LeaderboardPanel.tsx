import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Medal, Share2, Trophy, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  getLeaderboardState,
  type LeaderboardEntry,
  type LeaderboardState,
  type LeaderboardTimeframe,
} from "@/lib/progress/leaderboard";
import {
  addFriendByNickname,
  listFriends,
  removeFriend,
  FriendsError,
  friendsErrorMessage,
  type Friend,
} from "@/lib/progress/friends";
import { getNicknameLocal } from "@/lib/nickname";
import { clearStoredAuth, getStoredSignInNickname } from "@/lib/auth";
import { dispatchNicknameChange } from "@/lib/nicknameEvents";

interface LeaderboardPanelProps {
  currentUserLearnedCount?: number;
  currentUserLearningCount?: number;
  currentUserDueCount?: number;
  className?: string;
}

const initialState: LeaderboardState = {
  timeframe: "allTime",
  entries: [],
  isLoading: true,
};

const PERIODS: Array<{ value: LeaderboardTimeframe; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "allTime", label: "All time" },
];

const LEADERBOARD_DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;

function getMillisecondsUntilNextDailyRefresh(): number {
  const now = new Date();
  const nextRefresh = new Date(now);
  nextRefresh.setDate(now.getDate() + 1);
  nextRefresh.setHours(0, 0, 0, 0);

  return Math.max(
    LEADERBOARD_DAILY_REFRESH_MS,
    nextRefresh.getTime() - now.getTime(),
  );
}

function formatTimeframeLabel(
  timeframe: LeaderboardState["timeframe"],
): string {
  switch (timeframe) {
    case "today":
      return "Today";
    case "week":
      return "This week";
    case "allTime":
    default:
      return "All time";
  }
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Math.max(0, value),
  );
}

function rankIcon(rank: number): React.ReactNode {
  if (rank === 1)
    return <Trophy className="h-4 w-4 text-yellow-500" aria-hidden="true" />;
  if (rank <= 3)
    return <Medal className="h-4 w-4 text-orange-400" aria-hidden="true" />;
  return (
    <span className="text-xs font-semibold theme-muted-text">#{rank}</span>
  );
}

const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  onRemove?: (entry: LeaderboardEntry) => void;
}> = ({ entry, onRemove }) => {
  return (
    <div
      data-testid="leaderboard-row"
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-2 rounded-lg border px-3 py-2 text-sm transition-colors sm:flex",
        entry.isCurrentUser
          ? "border-[var(--lv-accent)]/60 bg-[var(--lv-accent)]/10"
          : "theme-border theme-card-highlight",
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full theme-card-surface">
        {rankIcon(entry.rank)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className="truncate font-medium"
            style={{ color: "var(--lv-text)" }}
          >
            {entry.nickname}
          </span>
          {entry.isCurrentUser && (
            <span className="shrink-0 rounded-full bg-[var(--lv-accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--lv-accent)]">
              You
            </span>
          )}
        </div>
      </div>
      {onRemove && !entry.isCurrentUser ? (
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full theme-muted-text hover:bg-[var(--lv-card-highlight)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lv-accent)] sm:order-last"
          aria-label={`Remove ${entry.nickname}`}
          onClick={() => onRemove(entry)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <span className="h-7 w-7 shrink-0 sm:order-last" aria-hidden="true" />
      )}
      <div className="col-span-3 grid grid-cols-3 gap-2 text-right sm:col-span-1 sm:shrink-0">
        <div>
          <div className="font-semibold" style={{ color: "var(--lv-heading)" }}>
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

async function shareNickname(nickname: string): Promise<"shared" | "copied" | "failed"> {
  const text = `Add me on Lazy Vocabulary! My nickname is: ${nickname}`;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: "Lazy Vocabulary", text });
      return "shared";
    }
  } catch {
    // Fall through to Web Share / clipboard.
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Lazy Vocabulary", text });
      return "shared";
    } catch {
      // Cancelled or unsupported — fall through to clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(nickname);
    return "copied";
  } catch {
    return "failed";
  }
}

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  currentUserLearnedCount,
  className,
}) => {
  const [state, setState] = useState<LeaderboardState>(initialState);
  const [period, setPeriod] = useState<LeaderboardTimeframe>("allTime");
  const [friends, setFriends] = useState<Friend[]>([]);
  // null = follow the default (open, except an empty friends list collapses to one "Add a friend" button).
  // Once the user opens/closes the panel their choice sticks across period changes and reloads.
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  // Decided once per finished load (never while loading) so reloads don't flash the board open.
  const [noFriendsDefault, setNoFriendsDefault] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const focusNicknameRef = useRef(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<LeaderboardEntry | null>(
    null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);

  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let isMounted = true;
    let dailyRefreshTimeout: ReturnType<typeof window.setTimeout> | undefined;
    const requestId = ++requestRef.current;
    const isCurrent = () => isMounted && requestRef.current === requestId;

    const load = async () => {
      setState((current) => ({
        ...current,
        timeframe: period,
        isLoading: true,
        error: undefined,
        signedOut: false,
        sessionExpired: false,
      }));
      try {
        const nextState = await getLeaderboardState({ period });
        if (!isCurrent()) return;
        setState(nextState);
        if (nextState.signedOut || nextState.sessionExpired) {
          setFriends([]);
          setNoFriendsDefault(false);
          return;
        }
        try {
          const list = await listFriends();
          if (isCurrent()) {
            setFriends(list);
            setNoFriendsDefault(
              !nextState.error &&
                list.length === 0 &&
                nextState.entries.every((e) => e.isCurrentUser),
            );
          }
        } catch (error) {
          console.warn("leaderboard:listFriends", error);
          if (isCurrent()) setNoFriendsDefault(false);
        }
      } catch (error) {
        console.warn("leaderboard:load", error);
        if (isCurrent()) {
          setState({
            timeframe: period,
            entries: [],
            isLoading: false,
            error: friendsErrorMessage("unavailable"),
          });
          setNoFriendsDefault(false); // keep the board (error + add form) reachable
        }
      }
    };

    const scheduleDailyRefresh = () => {
      if (!isMounted || typeof window === "undefined") return;

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
  }, [period, reloadKey, currentUserLearnedCount]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isAdding) return;
    const value = nicknameInput.trim();
    if (!value) {
      setFormError(friendsErrorMessage("invalid"));
      return;
    }
    setIsAdding(true);
    setFormError(null);
    try {
      const friend = await addFriendByNickname(value);
      setNicknameInput("");
      toast.success(`${friend.nickname} added.`);
      reload();
    } catch (error) {
      setFormError(
        error instanceof FriendsError
          ? error.message
          : friendsErrorMessage("unavailable"),
      );
      if (
        error instanceof FriendsError &&
        (error.kind === "signed_out" || error.kind === "session_expired")
      )
        reload();
    } finally {
      setIsAdding(false);
    }
  };

  const confirmRemove = async () => {
    const target = pendingRemove;
    setPendingRemove(null);
    if (!target) return;
    const friend = friends.find((f) => f.friendKey === target.userKey);
    try {
      await removeFriend(friend?.nickname ?? target.nickname);
      toast.success(`${target.nickname} removed.`);
      reload();
    } catch (error) {
      toast.error(
        error instanceof FriendsError
          ? error.message
          : friendsErrorMessage("unavailable"),
      );
    }
  };

  const handleShare = async () => {
    const nickname =
      state.currentUserEntry?.nickname ?? getNicknameLocal()?.trim() ?? "";
    if (!nickname) return;
    const result = await shareNickname(nickname);
    if (result === "copied") toast.success("Nickname copied — send it to a friend.");
    else if (result === "failed") toast.error("Could not copy your nickname.");
  };

  const entries = state.entries;
  const onlyMe = entries.length > 0 && entries.every((e) => e.isCurrentUser);
  const signedOut = state.signedOut === true;
  const sessionExpired = state.sessionExpired === true;

  // Signed-in with nobody to compete against: collapse to a single "Add a friend" CTA.
  const isOpen = userOpen ?? !noFriendsDefault;
  const showAddCta = noFriendsDefault && !isOpen;

  useEffect(() => {
    if (isOpen && focusNicknameRef.current) {
      focusNicknameRef.current = false;
      nicknameInputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSignInAgain = () => {
    const nickname = getStoredSignInNickname() ?? undefined;
    clearStoredAuth();
    dispatchNicknameChange(null, nickname);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setUserOpen} asChild>
      <Card
        className={cn(
          "lv-section mt-3 w-full",
          className,
        )}
      >
        <CardContent className="p-3 pl-5">
          <CollapsibleTrigger asChild>
            {showAddCta ? (
              <button
                type="button"
                data-testid="leaderboard-add-friend-cta"
                onClick={() => {
                  focusNicknameRef.current = true;
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border theme-border bg-[var(--lv-button-primary-bg)] px-3 py-2 text-left text-[var(--lv-button-primary-text)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lv-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lv-card-surface)]"
                aria-label="Add a friend"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <UserPlus className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Add a friend</span>
                    <span className="block text-xs opacity-80">Compete on the leaderboard</span>
                  </span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg text-left transition-colors hover:bg-[var(--lv-card-highlight)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lv-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lv-card-surface)]"
                aria-label={`${isOpen ? "Collapse" : "Expand"} leaderboard`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="lv-section-icon">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="lv-section-title block">
                      Leaderboard
                    </span>
                    <span className="block text-xs theme-muted-text">
                      You and your friends
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full theme-card-highlight px-2.5 py-1 text-xs font-medium theme-muted-text border theme-border">
                    {formatTimeframeLabel(period)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 theme-muted-text transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </span>
              </button>
            )}
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-2">
            {signedOut || sessionExpired ? (
              <div
                data-testid={sessionExpired ? "leaderboard-session-expired" : "leaderboard-signed-out"}
                className="flex flex-col items-start gap-2 rounded-lg theme-card-highlight px-3 py-3 text-sm theme-muted-text border theme-border"
              >
                <span>
                  {friendsErrorMessage(sessionExpired ? "session_expired" : "signed_out")}
                </span>
                <Button type="button" size="sm" onClick={handleSignInAgain}>
                  {sessionExpired ? "Sign in again" : "Sign in"}
                </Button>
              </div>
            ) : (
              <>
                <div
                  role="group"
                  aria-label="Leaderboard period"
                  className="mb-2 grid grid-cols-3 gap-1 rounded-lg border p-1 theme-border"
                >
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      aria-pressed={period === p.value}
                      onClick={() => setPeriod(p.value)}
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lv-accent)]",
                        period === p.value
                          ? "bg-[var(--lv-button-primary-bg)] text-[var(--lv-button-primary-text)]"
                          : "theme-muted-text hover:bg-[var(--lv-card-highlight)]",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {state.isLoading ? (
                  <div className="space-y-2" aria-label="Loading leaderboard">
                    {[0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="h-11 animate-pulse rounded-lg theme-card-highlight"
                      />
                    ))}
                  </div>
                ) : state.error ? (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-100">
                    {state.error}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {entries.map((entry) => (
                      <LeaderboardRow
                        key={entry.userKey}
                        entry={entry}
                        onRemove={setPendingRemove}
                      />
                    ))}
                    {onlyMe && friends.length === 0 && (
                      <p className="px-1 pt-1 text-xs theme-muted-text">
                        No friends yet. Add a friend by nickname to compete,
                        or share your nickname so they can add you.
                      </p>
                    )}
                  </div>
                )}

                <form
                  onSubmit={handleAdd}
                  className="mt-3 flex items-center gap-2"
                >
                  <input
                    ref={nicknameInputRef}
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => {
                      setNicknameInput(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="Add a friend by nickname"
                    aria-label="Friend's nickname"
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={64}
                    className="h-9 min-w-0 flex-1 rounded-md border px-3 text-sm theme-border theme-card-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lv-accent)]"
                    style={{ color: "var(--lv-text)" }}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 gap-1.5"
                    disabled={isAdding}
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    {isAdding ? "Adding…" : "Add"}
                  </Button>
                </form>
                {formError && (
                  <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-300">
                    {formError}
                  </p>
                )}
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2 text-xs theme-muted-text"
                    onClick={handleShare}
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Share my nickname
                  </Button>
                </div>
              </>
            )}
          </CollapsibleContent>
        <AlertDialog
          open={pendingRemove !== null}
          onOpenChange={(open) => {
            if (!open) setPendingRemove(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove friend?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingRemove?.nickname} will no longer appear on your
                leaderboard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmRemove()}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </CardContent>
      </Card>
    </Collapsible>
  );
};

export default LeaderboardPanel;
