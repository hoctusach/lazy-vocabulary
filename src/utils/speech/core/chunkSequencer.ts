import * as React from 'react';
import { calculateSpeechDuration } from '../durationUtils';
import { getSpeechRate, getSpeechPitch, getSpeechVolume } from './speechSettings';

type ChunkResult = { success: boolean, error?: string };

interface SequenceOptions {
  langCode: string;
  voice: SpeechSynthesisVoice | null;
  onChunkComplete?: (index: number, totalChunks: number) => void;
  onSequenceComplete?: () => void;
  onError?: (error: Error, index: number) => void;
  pauseRequestedRef?: React.MutableRefObject<boolean>;
  muted?: boolean;
}

/**
 * Speaks an array of text chunks sequentially, handling errors for each chunk
 */
export async function speakChunksInSequence(
  chunks: string[],
  options: SequenceOptions
): Promise<ChunkResult[]> {
  const { langCode, voice, onChunkComplete, onSequenceComplete, onError, pauseRequestedRef, muted } = options;
  const results: ChunkResult[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    // If a pause was requested, stop processing further chunks
    // but mark the chunks we've already processed as successful
    if (pauseRequestedRef?.current && i > 0) {
      console.log(`[SEQUENCE] Pause requested, stopping after chunk ${i}`);
      break;
    }
    
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
      chunkUtterance.volume = muted ? 0 : getSpeechVolume();
      
      // Speak this chunk and await its completion
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

        const clearFallbackTimer = () => {
          if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = undefined;
          }
        };

        const settle = (action: () => void) => {
          if (settled) return;
          settled = true;
          clearFallbackTimer();
          action();
        };

        chunkUtterance.onend = () => {
          console.log(`[SEQUENCE] Chunk ${i + 1}/${chunks.length} completed`);
          settle(resolve);
        };

        chunkUtterance.onerror = (event) => {
          console.error(`[SEQUENCE] Error in chunk ${i + 1}/${chunks.length}:`, event.error);

          // For network errors or timeouts, we'll continue to the next chunk
          if (event.error === 'network' || event.error === 'interrupted') {
            settle(resolve); // Continue despite error
          } else if (event.error === 'canceled') {
            // Cancellation is often intentional
            settle(resolve);
          } else {
            settle(() => reject(new Error(`Speech error in chunk ${i + 1}: ${event.error}`)));
          }
        };

        if (muted) {
          const estimatedDuration = calculateSpeechDuration(chunk, chunkUtterance.rate);
          const fallbackDelay = Math.max(300, Math.min(estimatedDuration, 5000));
          fallbackTimer = setTimeout(() => {
            console.log(
              `[SEQUENCE] Fallback completion triggered for muted chunk ${i + 1}/${chunks.length} after ${fallbackDelay}ms`
            );
            settle(resolve);
          }, fallbackDelay);
        }

        // Start speaking this chunk
        try {
          window.speechSynthesis.speak(chunkUtterance);
        } catch (error) {
          console.error(`[SEQUENCE] Error starting chunk ${i + 1}/${chunks.length}:`, error);
          settle(() => reject(error as Error));
        }
      });
      
      // Mark this chunk as successful
      results.push({ success: true });
      if (onChunkComplete) onChunkComplete(i, chunks.length);
      
      // Check for pause after each chunk is completed
      if (pauseRequestedRef?.current && i < chunks.length - 1) {
        console.log(`[SEQUENCE] Pause requested after chunk ${i + 1}, stopping sequence`);
        break;
      }
      
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
