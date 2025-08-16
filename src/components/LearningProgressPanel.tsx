import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DailySelection, SeverityLevel } from '@/types/learning';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useLearnerHours } from '@/hooks/useLearnerHours';

interface LearningProgressPanelProps {
  dailySelection: DailySelection | null;
  progressStats: {
    total: number;
    learned: number;
    new: number;
    due: number;
    learnedCompleted: number;
  };
  onGenerateDaily: (severity: SeverityLevel) => void;
  learnerId: string;
}

export const LearningProgressPanel: React.FC<LearningProgressPanelProps> = ({
  dailySelection,
  progressStats,
  onGenerateDaily,
  learnerId
}) => {
  const learnedPercentage = progressStats.total > 0
    ? (progressStats.learned / progressStats.total) * 100
    : 0;
  const [open, setOpen] = useState(false);
  const { totalHours } = useLearnerHours(learnerId);

  return (
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
        {/* Progress Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalHours.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Hours Learned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{progressStats.total}</div>
            <div className="text-sm text-gray-600">Total Words</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{progressStats.learned}</div>
            <div className="text-sm text-gray-600">Learning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{progressStats.new}</div>
            <div className="text-sm text-gray-600">New</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{progressStats.due}</div>
            <div className="text-sm text-gray-600">Due Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{progressStats.learnedCompleted}</div>
            <div className="text-sm text-gray-600">Learned</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Learning Progress</span>
            <span>{Math.round(learnedPercentage)}%</span>
          </div>
          <Progress value={learnedPercentage} className="h-2" />
        </div>

        {/* Daily Selection Info */}
        {dailySelection && (
          <div className="space-y-3">
            <h4 className="font-semibold">Today's Selection</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="border-0">
                Total: {dailySelection.newWords.length + progressStats.due}
              </Badge>
              <Badge variant="outline" className="text-green-600 border-0">
                New: {dailySelection.newWords.length}
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-0">
                Review: {progressStats.due}
              </Badge>
              <Badge variant="outline" className="border-0">
                Level: {dailySelection.severity}
              </Badge>
            </div>
            
            {/* Category breakdown for all words in today's selection */}
            {(dailySelection.newWords.length > 0 || dailySelection.reviewWords.length > 0) && (
              <div className="text-sm">
                <div className="font-medium mb-1">By Category:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(
                    [...dailySelection.newWords, ...dailySelection.reviewWords].reduce((acc, word) => {
                      acc[word.category] = (acc[word.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([category, count]) => (
                    <Badge key={category} variant="outline" className="text-xs border-0">
                      {category}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Daily Selection */}
        <div className="space-y-3">
          <h4 className="font-semibold">Generate New Daily Selection</h4>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onGenerateDaily('light')}
            >
              Light (15-25)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onGenerateDaily('moderate')}
            >
              Moderate (30-50)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onGenerateDaily('intense')}
            >
              Intense (50-100)
            </Button>
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
