import { useCallback } from 'react';
import { synthesizeAudio } from '@/utils/speech/synthesisUtils';
import { SpeechSynthesisVoice } from '@/types/speech';

export const useSequentialSpeech = () => {
  // Function to speak chunks sequentially
  const speakChunksSequentially = useCallback(
    (chunks: string[], voice: SpeechSynthesisVoice | null, startIndex: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (startIndex >= chunks.length) {
          console.log("All chunks completed");
          resolve('completed');
          return;
        }
        
        const chunk = chunks[startIndex];
        console.log(`Speaking chunk ${startIndex + 1}/${chunks.length}: "${chunk.substring(0, 20)}..."`);
        
        synthesizeAudio(chunk, voice)
          .then(() => {
            // Successfully spoke this chunk, move to the next
            speakChunksSequentially(chunks, voice, startIndex + 1)
              .then(resolve)
              .catch(reject);
          })
          .catch((error) => {
            console.warn(`Error speaking chunk ${startIndex + 1}, skipping to next:`, error);
            
            // If this is the last chunk and it failed, report the error
            if (startIndex === chunks.length - 1) {
              reject(error);
            } else {
              // Otherwise, try the next chunk
              speakChunksSequentially(chunks, voice, startIndex + 1)
                .then(resolve)
                .catch(reject);
            }
          });
      });
    }, []);

  return { speakChunksSequentially };
};
