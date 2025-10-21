import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, Info } from 'lucide-react';
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
}

export const LearningProgressPanel: React.FC<LearningProgressPanelProps> = ({
  progressStats
}) => {
  const learnedPercentage = progressStats.total > 0
    ? ((progressStats.learning + progressStats.learned) / progressStats.total) * 100
    : 0;
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <Collapsible open={open} onOpenChange={setOpen} className="w-full">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Learning Progress</h3>
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-3 pt-1">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--lv-text-secondary)' }}>
                  {progressStats.learned}
                </div>
                <div className="text-sm" style={{ color: 'var(--lv-helper-text)' }}>
                  Learned
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <div className="text-2xl font-bold text-red-600">{progressStats.due}</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="How does due review count work?"
                        className="h-10 w-10 text-[var(--lv-helper-text)] hover:text-[var(--lv-text-primary)]"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-xs text-left">
                      <div className="space-y-1">
                        <p className="font-bold">How does due review count work?</p>
                        <p>It goes with the Spaced Repetition Principle.</p>
                        <p>
                          Each correct review pushes the next one farther out: 2 → 3 → 5 → 7 → 10 → 14 → 21 → 28 → 35 days. After that, mastered items return every 60 days.
                        </p>
                        <p>
                          Tip: Open the app DAILY and clear “Due Reviews” to keep routine and memories strong.
                        </p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-sm" style={{ color: 'var(--lv-helper-text)' }}>
                  Due Review
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{progressStats.learning}</div>
                <div className="text-sm" style={{ color: 'var(--lv-helper-text)' }}>
                  Learning
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{progressStats.new}</div>
                <div className="text-sm" style={{ color: 'var(--lv-helper-text)' }}>
                  New
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{progressStats.total}</div>
                <div className="text-sm" style={{ color: 'var(--lv-helper-text)' }}>
                  Total
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>Learning Progress</span>
                <span>{Math.round(learnedPercentage)}%</span>
              </div>
              <Progress value={learnedPercentage} className="h-2" />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </TooltipProvider>
  );
};
