
import { SpeechSynthesisVoice } from '@/types/speech';
import { getSpeechRate, getSpeechPitch, getSpeechVolume } from './speechSettings';

type ChunkResult = { success: boolean, error?: string };

interface SequenceOptions {
  langCode: string;
  voice: SpeechSynthesisVoice | null;
  onChunkComplete?: (index: number, totalChunks: number) => void;
  onSequenceComplete?: () => void;
  onError?: (error: Error, index: number) => void;
}

/**
 * Speaks an array of text chunks sequentially, handling errors for each chunk
 */
export async function speakChunksInSequence(
  chunks: string[], 
  options: SequenceOptions
): Promise<ChunkResult[]> {
  const { langCode, voice, onChunkComplete, onSequenceComplete, onError } = options;
  const results: ChunkResult[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[SEQUENCE] Speaking chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 20)}..."`);
    
    try {
      // Create and configure a new utterance for this chunk
      const chunkUtterance = new SpeechSynthesisUtterance(chunk);
      
      if (voice) {
        chunkUtterance.voice = voice;
        chunkUtterance.lang = langCode;
      } else {
        chunkUtterance.lang = langCode;
      }
      
      chunkUtterance.rate = getSpeechRate();
      chunkUtterance.pitch = getSpeechPitch();
      chunkUtterance.volume = getSpeechVolume();
      
      // Speak this chunk and await its completion
      await new Promise<void>((resolve, reject) => {
        chunkUtterance.onend = () => {
          console.log(`[SEQUENCE] Chunk ${i + 1}/${chunks.length} completed`);
          resolve();
        };
        
        chunkUtterance.onerror = (event) => {
          console.error(`[SEQUENCE] Error in chunk ${i + 1}/${chunks.length}:`, event.error);
          
          // For network errors or timeouts, we'll continue to the next chunk
          if (event.error === 'network' || event.error === 'interrupted') {
            resolve(); // Continue despite error
          } else if (event.error === 'canceled') {
            // Cancellation is often intentional
            resolve();
          } else {
            reject(new Error(`Speech error in chunk ${i + 1}: ${event.error}`));
          }
        };
        
        // Start speaking this chunk
        try {
          window.speechSynthesis.speak(chunkUtterance);
        } catch (error) {
          console.error(`[SEQUENCE] Error starting chunk ${i + 1}/${chunks.length}:`, error);
          reject(error);
        }
      });
      
      // Mark this chunk as successful
      results.push({ success: true });
      if (onChunkComplete) onChunkComplete(i, chunks.length);
      
    } catch (error) {
      console.error(`[SEQUENCE] Failed at chunk ${i + 1}:`, error);
      results.push({ success: false, error: String(error) });
      if (onError) onError(error as Error, i);
      
      // Continue with the next chunk despite the error
      continue;
    }
  }
  
  // Sequence is complete
  if (onSequenceComplete) onSequenceComplete();
  return results;
}
