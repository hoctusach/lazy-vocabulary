import React, { useEffect, useState } from "react";
import { Flame } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ensureUserKey } from "@/lib/progress/srsSyncByUserKey";
import { getProgressSummary } from "@/lib/progress/progressSummary";
import { calculateCurrentStreak, getRecentDays } from "@/lib/progress/streak";

interface StreakPanelProps {
  className?: string;
  /** Bump this to force a refresh after a word is marked learned. */
  refreshKey?: number;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const StreakPanel: React.FC<StreakPanelProps> = ({ className, refreshKey }) => {
  const [streakDays, setStreakDays] = useState(0);
  const [recentDays, setRecentDays] = useState<ReturnType<typeof getRecentDays>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const userKey = await ensureUserKey();
        const summary = userKey ? await getProgressSummary(userKey) : null;
        const learnedDays = summary?.learned_days ?? [];
        if (!isMounted) return;
        setStreakDays(calculateCurrentStreak(learnedDays));
        setRecentDays(getRecentDays(learnedDays, 7));
      } catch (error) {
        console.warn("StreakPanel:load", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  if (!isLoading && streakDays === 0 && recentDays.every((day) => !day.learned)) {
    // Nothing learned yet — avoid showing an empty "0-day streak" before the first session.
    return null;
  }

  return (
    <Card
      className={cn(
        "mt-3 w-full border-2 theme-card-surface theme-border",
        className,
      )}
    >
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--lv-accent-soft)", color: "var(--lv-accent)" }}
          >
            <Flame className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--lv-heading)" }}>
              {isLoading ? "…" : `${streakDays}-day streak`}
            </div>
            <div className="text-xs theme-muted-text">
              {streakDays > 0 ? "Keep it going today" : "Start today to begin a streak"}
            </div>
          </div>
        </div>

        <div className="flex items-end gap-1.5" aria-hidden={isLoading}>
          {recentDays.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full border",
                  day.learned
                    ? "border-transparent"
                    : "border-[var(--lv-border-color)] bg-transparent",
                  day.isToday && !day.learned && "border-2",
                )}
                style={day.learned ? { background: "var(--lv-accent)" } : undefined}
              />
              <span className="text-[10px] theme-muted-text">
                {WEEKDAY_LABELS[new Date(`${day.date}T00:00:00`).getDay()]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakPanel;
