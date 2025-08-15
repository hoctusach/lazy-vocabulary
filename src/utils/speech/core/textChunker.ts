
/**
 * Helper utilities for splitting text into mobile-friendly chunks
 */

// Helper function to split text into mobile-friendly chunks
export function splitTextIntoChunks(text: string): string[] {
  // Split by sentences first
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If this sentence would make the chunk too long, start a new chunk
    if (currentChunk.length + sentence.length > 200) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // If the sentence itself is too long, split it further
      if (sentence.length > 200) {
        const words = sentence.split(/\s+/);
        currentChunk = '';
        
        for (const word of words) {
          if (currentChunk.length + word.length + 1 > 200) {
            chunks.push(currentChunk);
            currentChunk = word;
          } else {
            if (currentChunk) currentChunk += ' ';
            currentChunk += word;
          }
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      if (currentChunk) currentChunk += ' ';
      currentChunk += sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Utility function to estimate the number of chunks needed for a text
export function estimateChunkCount(text: string): number {
  // Simple estimation: approximately one chunk per 200 characters
  return Math.ceil(text.length / 200);
}
