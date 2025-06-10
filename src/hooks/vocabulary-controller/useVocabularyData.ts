
import { useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { toast } from 'sonner';

/**
 * Hook for handling vocabulary data loading and file uploads
 */
export const useVocabularyData = (
  setWordList: (words: VocabularyWord[]) => void,
  setCurrentIndex: (index: number) => void,
  setHasData: (hasData: boolean) => void
) => {
  const loadVocabularyData = useCallback(async (category?: string) => {
    try {
      console.log('[VOCAB-DATA] Loading vocabulary data');
      
      // This would typically load from your data source
      // For now, we'll use a placeholder implementation
      const mockData: VocabularyWord[] = [
        {
          word: "acknowledge",
          meaning: "accept or admit the existence or truth of",
          example: "She acknowledged that she had made a mistake.",
          count: 0,
          category: "academic"
        },
        {
          word: "tip off /tɪp ɒf/",
          meaning: "inform secretly or warn: báo tin.",
          example: "The police were tipped off about the robbery.",
          count: 0,
          category: "phrasal verbs"
        }
      ];
      
      setWordList(mockData);
      setCurrentIndex(0);
      setHasData(true);
      
      toast.success(`Loaded ${mockData.length} vocabulary words`);
    } catch (error) {
      console.error('[VOCAB-DATA] Error loading vocabulary data:', error);
      toast.error('Failed to load vocabulary data');
    }
  }, [setWordList, setCurrentIndex, setHasData]);

  const handleFileUploaded = useCallback(async (file: File) => {
    try {
      console.log('[VOCAB-DATA] Processing uploaded file:', file.name);
      
      const text = await file.text();
      
      // Parse the file content (assuming JSON format)
      const data = JSON.parse(text);
      
      if (Array.isArray(data)) {
        setWordList(data);
        setCurrentIndex(0);
        setHasData(true);
        toast.success(`Loaded ${data.length} words from file`);
      } else {
        throw new Error('Invalid file format');
      }
    } catch (error) {
      console.error('[VOCAB-DATA] Error processing file:', error);
      toast.error('Failed to process uploaded file');
    }
  }, [setWordList, setCurrentIndex, setHasData]);

  return {
    loadVocabularyData,
    handleFileUploaded
  };
};
