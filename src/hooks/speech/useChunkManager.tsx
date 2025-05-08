
import { useState, useCallback } from 'react';

// Helper function to split text into smaller chunks for better speech synthesis reliability
export const useChunkManager = () => {
  const [remainingChunks, setRemainingChunks] = useState<string[]>([]);

  // Function to split text into smaller chunks based on natural sentence boundaries
  const splitTextIntoChunks = useCallback((text: string): string[] => {
    // First try to split by sentences (using periods, question marks, exclamation points)
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Process each sentence
    for (const sentence of sentences) {
      // If the sentence itself is too long, split it further
      if (sentence.length > 200) {
        // If we have anything in the current chunk, push it first
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        
        // Split long sentences by commas, semi-colons, or colons
        const sentenceParts = sentence.split(/(?<=[,;:])\s+/);
        
        for (const part of sentenceParts) {
          if (part.length > 200) {
            // For extremely long parts with no punctuation, split by word boundaries at around 200 chars
            let remaining = part;
            while (remaining.length > 0) {
              const chunk = remaining.substring(0, 200);
              // Find the last space within the first 200 characters
              const lastSpaceIndex = chunk.lastIndexOf(' ');
              
              if (lastSpaceIndex > 0 && remaining.length > 200) {
                chunks.push(remaining.substring(0, lastSpaceIndex));
                remaining = remaining.substring(lastSpaceIndex + 1);
              } else {
                chunks.push(remaining);
                remaining = '';
              }
            }
          } else if (currentChunk.length + part.length > 200) {
            chunks.push(currentChunk);
            currentChunk = part;
          } else {
            if (currentChunk) currentChunk += ' ';
            currentChunk += part;
          }
        }
      } else if (currentChunk.length + sentence.length > 200) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        if (currentChunk) currentChunk += ' ';
        currentChunk += sentence;
      }
    }
    
    // Add the last chunk if there's anything left
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }, []);

  // Managing the queue of chunks that need to be spoken
  const updateRemainingChunks = useCallback((chunks: string[]) => {
    setRemainingChunks(chunks);
  }, []);

  return {
    splitTextIntoChunks,
    remainingChunks,
    updateRemainingChunks
  };
};
