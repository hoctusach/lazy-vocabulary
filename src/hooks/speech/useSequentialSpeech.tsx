import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import { VocabularyWord } from '@/types/vocabulary';
import { VoiceSelection } from '@/hooks/vocabulary-playback/useVoiceSelection';
import { speak } from '@/utils/speech';

export const useSequentialSpeech = () => {
  const speakChunksSequentially = useCallback(
    async (
      chunks: string[], 
      voice: SpeechSynthesisVoice | null, 
      startIndex: number = 0,
      pauseRequestedRef?: React.MutableRefObject<boolean>
    ): Promise<string> => {
      if (chunks.length === 0) {
        return 'completed';
      }

      let result = 'completed';
      
      try {
        for (let i = startIndex; i < chunks.length; i++) {
          // Check if pause is requested before each chunk
          if (pauseRequestedRef?.current && i > startIndex) {
            console.log("Pause requested, stopping sequential speech");
            return 'paused';
          }
          
          const chunk = chunks[i];
          if (!chunk.trim()) continue;
          
          console.log(`Speaking chunk ${i + 1}/${chunks.length}`);
          
          try {
            // We use speak + enqueue now to avoid initial delay
            await speak(chunk, voice?.lang.includes('en-GB') ? 'UK' : 'US', pauseRequestedRef);
            
          } catch (error) {
            console.warn(`Error in chunk ${i + 1}, continuing:`, error);
          }
          
          // Check again for pause after each chunk
          if (pauseRequestedRef?.current && i < chunks.length - 1) {
            console.log("Pause requested, stopping after current chunk");
            return 'paused';
          }
        }
      } catch (error) {
        console.error("Error in sequential speech:", error);
        result = 'error';
      }
      
      return result;
    },
    []
  );

  return { speakChunksSequentially };
};
