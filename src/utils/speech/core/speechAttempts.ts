
export const attemptSpeech = async (
  utterance: SpeechSynthesisUtterance,
  attempts: number = 0
): Promise<void> => {
  if (attempts >= 5) {
    console.error('Failed to start speech after multiple attempts');
    throw new Error('Failed to start speech');
  }
  
  try {
    if (attempts > 0) {
      window.speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    window.speechSynthesis.speak(utterance);
    
    await new Promise<void>((resolveStart, rejectStart) => {
      setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          resolveStart();
        } else if (attempts < 4) {
          console.warn(`Speech did not start, retrying`);
          rejectStart(new Error('Speech not started'));
        } else {
          // On last attempt, just proceed even if speech isn't detected
          console.warn('Final attempt: proceeding even though speech may not have started');
          resolveStart();
        }
      }, 600);
    });
  } catch (error) {
    console.error('Speech start error:', error);
    await new Promise(resolve => setTimeout(resolve, 500));
    return attemptSpeech(utterance, attempts + 1);
  }
};

// Helper function to split text into mobile-friendly chunks
export const splitTextIntoChunks = (text: string, maxChunkLength = 200): string[] => {
  // First try to split by sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Process each sentence
  for (const sentence of sentences) {
    // If the sentence itself is too long, split it by commas, etc
    if (sentence.length > maxChunkLength) {
      // If we have anything in current chunk, push it first
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // Split long sentences by punctuation
      const parts = sentence.split(/(?<=[,;:])\s+/);
      
      for (const part of parts) {
        if (part.length > maxChunkLength) {
          // For very long parts, split by words
          let remaining = part;
          while (remaining.length > 0) {
            const segment = remaining.substring(0, maxChunkLength);
            const lastSpaceIndex = segment.lastIndexOf(' ');
            
            if (lastSpaceIndex > 0 && remaining.length > maxChunkLength) {
              chunks.push(remaining.substring(0, lastSpaceIndex));
              remaining = remaining.substring(lastSpaceIndex + 1);
            } else {
              chunks.push(remaining);
              remaining = '';
            }
          }
        } else if (currentChunk.length + part.length > maxChunkLength) {
          chunks.push(currentChunk);
          currentChunk = part;
        } else {
          if (currentChunk) currentChunk += ' ';
          currentChunk += part;
        }
      }
    } else if (currentChunk.length + sentence.length > maxChunkLength) {
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
};
