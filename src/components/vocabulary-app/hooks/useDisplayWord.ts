
import { VocabularyWord } from "@/types/vocabulary";

/**
 * Determines which word to display with fallback logic
 */
export const useDisplayWord = (
  playbackCurrentWord: VocabularyWord | null,
  wordList: VocabularyWord[],
  hasData: boolean
) => {
  const displayWord = (() => {
    console.log('[VOCAB-CONTAINER] Determining display word:', {
      playbackCurrentWord: playbackCurrentWord?.word,
      hasData,
      wordListLength: wordList?.length || 0
    });
    
    if (playbackCurrentWord) {
      console.log('[VOCAB-CONTAINER] Using playback current word:', playbackCurrentWord.word);
      return playbackCurrentWord;
    }
    
    // Final fallback - use first word from list if available
    if (wordList && wordList.length > 0) {
      console.log('[VOCAB-CONTAINER] Using first word from list as fallback:', wordList[0].word);
      return wordList[0];
    }
    
    console.log('[VOCAB-CONTAINER] No display word available');
    return null;
  })();

  console.log('[VOCAB-CONTAINER] Final display word:', displayWord?.word);

  // Derive debug data from the word currently displayed
  const debugData = displayWord
    ? { word: displayWord.word, category: displayWord.category || '' }
    : null;

  return { displayWord, debugData };
};
