
import React, { useState, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { vocabularyService } from '@/services/vocabularyService';
import { toast } from 'sonner';

export const useReviewSession = () => {
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load due words and start a review session
  const startReviewSession = useCallback(() => {
    setIsLoading(true);
    
    try {
      // Get words due for review
      const dueWords = vocabularyService.getDueWords();
      
      if (dueWords.length === 0) {
        toast("No words due for review today!", {
          description: "Check back tomorrow or add more vocabulary.",
          duration: 3000
        });
        setIsLoading(false);
        return;
      }
      
      // Set up review queue
      setReviewQueue(dueWords);
      setIsReviewMode(true);
      
      // Log statistics
      console.log(`Starting review session with ${dueWords.length} words`);
    } catch (error) {
      console.error("Error starting review session:", error);
      toast.error("Could not start review session", {
        description: "Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // End the review session
  const endReviewSession = useCallback(() => {
    setIsReviewMode(false);
    setReviewQueue([]);
    
    // Clean up session storage
    try {
      sessionStorage.removeItem('reviewQueue');
      sessionStorage.removeItem('reviewIndex');
    } catch (error) {
      console.error("Error cleaning up review session:", error);
    }
  }, []);
  
  return {
    isReviewMode,
    reviewQueue,
    isLoading,
    startReviewSession,
    endReviewSession
  };
};
