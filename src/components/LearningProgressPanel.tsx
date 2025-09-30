import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, Info } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useLearnerHours } from '@/hooks/useLearnerHours';
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
  progressStats,
  learnerId
}) => {
  const learnedPercentage = progressStats.total > 0
    ? ((progressStats.learning + progressStats.learned) / progressStats.total) * 100
    : 0;
  const [open, setOpen] = useState(false);
  const { totalHours } = useLearnerHours(learnerId);

  return (
    <TooltipProvider delayDuration={0}>
      <Collapsible open={open} onOpenChange={setOpen} className="w-full">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2">
                <CardTitle className="text-lg">Learning Progress</CardTitle>
                <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{progressStats.learned}</div>
                  <div className="text-sm text-gray-600">Learned</div>
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
                          className="h-10 w-10 text-gray-500 hover:text-gray-700"
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
                  <div className="text-sm text-gray-600">Due Review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{progressStats.learning}</div>
                  <div className="text-sm text-gray-600">Learning</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{totalHours.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Hours Learned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{progressStats.new}</div>
                  <div className="text-sm text-gray-600">New</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{progressStats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Learning Progress</span>
                  <span>{Math.round(learnedPercentage)}%</span>
                </div>
                <Progress value={learnedPercentage} className="h-2" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </TooltipProvider>
  );
};
