
import React, { useEffect, useState } from 'react';
import { vocabularyService } from '@/services/vocabularyService';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export const DueCounter: React.FC = () => {
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    // Count due words on component mount
    const countDueWords = () => {
      try {
        const dueWords = vocabularyService.getDueWords();
        setDueCount(dueWords.length);
      } catch (error) {
        console.error("Error counting due words:", error);
      }
    };
    
    countDueWords();
    
    // Set up a timer to refresh due counts every hour
    const intervalId = setInterval(countDueWords, 60 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  if (dueCount === 0) return null;

  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-2">
      <Clock className="h-3 w-3 mr-1" />
      {dueCount} due
    </Badge>
  );
};
