import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronDown, Info } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface LearningProgressPanelProps {
  progressStats: {
    total: number;
    learning: number;
    new: number;
    due: number;
    learned: number;
  };
  learnerId: string;
  progressError?: string | null;
}

export const LearningProgressPanel: React.FC<LearningProgressPanelProps> = ({
  progressStats,
  progressError
}) => {
  const learnedPercentage = progressStats.total > 0
    ? ((progressStats.learning + progressStats.learned) / progressStats.total) * 100
    : 0;
  const [open, setOpen] = useState(true) // [FB-39] open by default;

  useEffect(() => {
    if (progressError) {
      setOpen(true);
    }
  }, [progressError]);

  const tile = (tone: string, value: number, label: string, extra?: React.ReactNode) => (
    <div className="lv-tile" data-tone={tone}>
      <div className="flex items-center justify-center gap-1">
        <div className="lv-tile-num">{value}</div>
        {extra}
      </div>
      <div className="lv-tile-label">{label}</div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      {progressError && (
        <div className="mb-2 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--lv-warning)', color: 'var(--lv-text-primary)' }}>
          {progressError}
        </div>
      )}
      <Collapsible open={open} onOpenChange={setOpen} className="lv-section mt-3 w-full" data-testid="learning-progress-section">
        <CollapsibleTrigger className="lv-section-head" data-state={open ? 'open' : 'closed'}>
          <span className="lv-section-icon"><BarChart3 className="h-4 w-4" aria-hidden="true" /></span>
          <h3 className="lv-section-title flex-1">Learning Progress</h3>
          <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="lv-section-body space-y-4">
            {!progressError && (
              <>
                <div className="lv-tiles">
                  {tile('muted', progressStats.learned, 'Learned')}
                  {tile(
                    'due',
                    progressStats.due,
                    'Due Review',
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="How does due review count work?"
                          className="h-9 w-9 text-[var(--lv-helper-text)] hover:text-[var(--lv-text-primary)]"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="max-w-xs text-left">
                        <div className="space-y-1">
                          <p className="font-bold">How does due review count work?</p>
                          <p>A word comes back when its review is due.</p>
                          <p>
                            Each correct review pushes the next one farther out: 2 → 3 → 5 → 7 → 10 → 14 → 21 → 28 → 35 days. After that, words you know come back every 60 days.
                          </p>
                          <p>Tip: open the app every day and clear your due reviews.</p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  {tile('success', progressStats.learning, 'Learning')}
                  {tile('warning', progressStats.new, 'New')}
                  {tile('accent', progressStats.total, 'Total')}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Learning Progress</span>
                    <span>{Math.round(learnedPercentage)}%</span>
                  </div>
                  <div className="lv-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(learnedPercentage)} aria-label="Learning Progress">
                    <span style={{ width: `${learnedPercentage}%` }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
};
