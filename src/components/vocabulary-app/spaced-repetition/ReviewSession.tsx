
import React, { useState, useEffect } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import { reviewOutcome } from '@/utils/spacedScheduler';
import { vocabularyService } from '@/services/vocabularyService';
import { toast } from 'sonner';

interface ReviewSessionProps {
  initialQueue: VocabularyWord[];
  onComplete: () => void;
  onCancel: () => void;
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ 
  initialQueue, 
  onComplete, 
  onCancel 
}) => {
  const [queue, setQueue] = useState<VocabularyWord[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  
  // Current word being reviewed
  const currentWord = queue[currentIndex];
  
  // Store session state in sessionStorage
  useEffect(() => {
    try {
      if (queue.length > 0) {
        sessionStorage.setItem('reviewQueue', JSON.stringify(queue));
        sessionStorage.setItem('reviewIndex', String(currentIndex));
      }
    } catch (error) {
      console.error("Error saving review state:", error);
    }
  }, [queue, currentIndex]);
  
  // Load session state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedQueue = sessionStorage.getItem('reviewQueue');
      const savedIndex = sessionStorage.getItem('reviewIndex');
      
      if (savedQueue && savedIndex && initialQueue.length === 0) {
        setQueue(JSON.parse(savedQueue));
        setCurrentIndex(Number(savedIndex));
      }
    } catch (error) {
      console.error("Error loading review state:", error);
    }
  }, [initialQueue.length]);
  
  // Handle review outcome (correct or incorrect)
  const handleReview = (wasCorrect: boolean) => {
    if (!currentWord) return;
    
    // Update the word with new spaced repetition data
    const updatedWord = reviewOutcome(currentWord, wasCorrect);
    
    // Save to localStorage
    vocabularyService.updateWord(updatedWord);
    
    // Show feedback
    toast(wasCorrect ? "Great job! 👏" : "You'll get it next time", {
      duration: 1500
    });
    
    // Update queue based on outcome
    const newQueue = [...queue];
    
    // If incorrect, move the word to the end of the queue
    if (!wasCorrect) {
      newQueue.push(newQueue.splice(currentIndex, 1)[0]);
      setQueue(newQueue);
    } else {
      // If correct, remove from queue
      newQueue.splice(currentIndex, 1);
      setQueue(newQueue);
      
      // If removing the last word in the queue, don't increment index
      if (currentIndex >= newQueue.length) {
        setCurrentIndex(Math.max(0, newQueue.length - 1));
      }
    }
    
    // Reset answer visibility
    setShowAnswer(false);
    
    // Check if we're done
    if (newQueue.length === 0) {
      setIsCompleted(true);
      sessionStorage.removeItem('reviewQueue');
      sessionStorage.removeItem('reviewIndex');
    }
  };
  
  // Format progress display
  const progressText = `${initialQueue.length - queue.length}/${initialQueue.length}`;
  
  if (isCompleted || queue.length === 0) {
    return (
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Review Complete! 🎉</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p>You've completed all your due words for today.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Words will reappear for review based on your performance.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={onComplete}>Return to Dashboard</Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (!currentWord) return null;
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center">
          <CardTitle className="text-xl">Review Session</CardTitle>
          <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
            {progressText}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Word display */}
        <div className="text-center pt-4">
          <h2 className="text-2xl font-bold mb-1">{currentWord.word}</h2>
          {currentWord.category && (
            <Badge variant="outline" className="text-xs">
              {currentWord.category}
            </Badge>
          )}
        </div>
        
        {/* Reveal answer toggle */}
        <div className="flex justify-center my-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Hide Answer
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Show Answer
              </>
            )}
          </Button>
        </div>
        
        {/* Answer content */}
        {showAnswer && (
          <div className="bg-gray-50 p-3 rounded-md border">
            <div className="text-green-800 mb-3">
              <span className="font-medium">Meaning: </span>
              {currentWord.meaning}
            </div>
            
            <div className="text-red-800 italic">
              <span className="font-medium">Example: </span>
              {currentWord.example}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          className="flex-1 mr-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          onClick={() => handleReview(false)}
        >
          <X className="h-4 w-4 mr-1" />
          Got it Wrong
        </Button>
        
        <Button 
          variant="outline"
          className="flex-1 ml-2 border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
          onClick={() => handleReview(true)}
        >
          <Check className="h-4 w-4 mr-1" />
          I Know It
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReviewSession;
