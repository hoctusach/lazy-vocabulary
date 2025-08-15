import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DailySelection, SeverityLevel } from '@/types/learning';

interface LearningProgressPanelProps {
  dailySelection: DailySelection | null;
  progressStats: {
    total: number;
    learned: number;
    new: number;
    due: number;
    retired: number;
  };
  onGenerateDaily: (severity: SeverityLevel) => Promise<void>;
  onRefresh: () => void;
}

export const LearningProgressPanel: React.FC<LearningProgressPanelProps> = ({
  dailySelection,
  progressStats,
  onGenerateDaily,
  onRefresh
}) => {
  const learnedPercentage = progressStats.total > 0 
    ? (progressStats.learned / progressStats.total) * 100 
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Daily Learning Progress
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <div className="text-2xl font-bold text-gray-600">{progressStats.retired}</div>
            <div className="text-sm text-gray-600">Retired</div>
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
                Total: {dailySelection.totalCount}
              </Badge>
              <Badge variant="outline" className="text-green-600 border-0">
                New: {dailySelection.newWords.length}
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-0">
                Review: {dailySelection.reviewWords.length}
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
              onClick={async () => await onGenerateDaily('light')}
            >
              Light (15-25)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => await onGenerateDaily('moderate')}
            >
              Moderate (30-50)
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => await onGenerateDaily('intense')}
            >
              Intense (50-100)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
