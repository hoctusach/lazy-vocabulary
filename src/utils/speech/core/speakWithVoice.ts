import { getSpeechRate, getSpeechPitch, getSpeechVolume } from './speechSettings';
import { getVoiceByRegion } from '../voiceUtils';
import { stopSpeaking, keepSpeechAlive, resetSpeechEngine } from './speechEngine';
import { forceResyncIfNeeded } from './speechText';
import { calculateSpeechDuration } from '../durationUtils';
import { createSpeechTimers, clearAllSpeechTimers, SpeechTimersRefs } from './speechTimers';

interface SpeakWithVoiceParams {
  utterance: SpeechSynthesisUtterance;
  region: 'US' | 'UK';
  text: string;
  processedText: string;
  onComplete: () => void;
  onError: (e: Error) => void;
}

// Helper function to split text into mobile-friendly chunks
function splitTextIntoChunks(text: string): string[] {
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

export async function speakWithVoice({
  utterance,
  region,
  text,
  processedText,
  onComplete,
  onError
}: SpeakWithVoiceParams) {
  console.log('[VOICE] Starting speakWithVoice for:', text.substring(0, 30));
  
  // First, ensure previous speech is completely stopped
  stopSpeaking();
  console.log('[VOICE] Previous speech stopped');
  
  // Give the DOM time to update and speech engine to reset, but keep it short
  const domUpdateDelay = 100; // Reduced from 200ms to 100ms
  console.log(`[VOICE] Waiting ${domUpdateDelay}ms for DOM updates`);
  await new Promise(resolve => setTimeout(resolve, domUpdateDelay));
  
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  const voice = getVoiceByRegion(region);
  
  // Split text into smaller chunks for better mobile compatibility
  const textChunks = splitTextIntoChunks(processedText);
  console.log(`[VOICE] Split text into ${textChunks.length} chunks`);
  
  // Keep track of which chunks were successful
  const chunkResults: { success: boolean, error?: string }[] = [];
  
  const timers: SpeechTimersRefs = createSpeechTimers();
  
  // Function to speak each chunk sequentially
  const speakChunksSequentially = async (index: number): Promise<void> => {
    // If we've spoken all chunks, we're done
    if (index >= textChunks.length) {
      console.log('[VOICE] All chunks completed successfully');
      clearAllSpeechTimers(timers);
      onComplete();
      return;
    }
    
    const chunk = textChunks[index];
    console.log(`[VOICE] Speaking chunk ${index + 1}/${textChunks.length}: "${chunk.substring(0, 20)}..."`);
    
    const chunkUtterance = new SpeechSynthesisUtterance(chunk);
    
    // Configure the utterance
    if (voice) {
      chunkUtterance.voice = voice;
      chunkUtterance.lang = langCode;
    } else {
      chunkUtterance.lang = langCode;
    }
    
    chunkUtterance.rate = getSpeechRate();
    chunkUtterance.pitch = getSpeechPitch();
    chunkUtterance.volume = getSpeechVolume();
    
    // Set up event handlers
    return new Promise<void>((resolveChunk, rejectChunk) => {
      chunkUtterance.onend = () => {
        console.log(`[VOICE] Chunk ${index + 1} completed`);
        chunkResults[index] = { success: true };
        resolveChunk();
      };
      
      chunkUtterance.onerror = (event) => {
        console.error(`[VOICE] Error in chunk ${index + 1}:`, event.error);
        chunkResults[index] = { success: false, error: event.error };
        
        // For network errors or timeouts, we'll try the next chunk
        if (event.error === 'network' || event.error === 'interrupted') {
          resolveChunk(); // Continue to next chunk despite error
        } else if (event.error === 'canceled') {
          // Cancellation is often intentional
          resolveChunk();
        } else {
          rejectChunk(new Error(`Speech error in chunk ${index + 1}: ${event.error}`));
        }
      };
      
      // Start speaking this chunk
      try {
        window.speechSynthesis.speak(chunkUtterance);
      } catch (error) {
        console.error(`[VOICE] Error starting chunk ${index + 1}:`, error);
        chunkResults[index] = { success: false, error: String(error) };
        rejectChunk(error);
      }
    })
    .then(() => speakChunksSequentially(index + 1))
    .catch((error) => {
      console.error(`[VOICE] Failed at chunk ${index + 1}, trying to continue:`, error);
      // Try to continue with the next chunk even if this one failed
      return speakChunksSequentially(index + 1);
    });
  };
  
  // Keep speech alive to prevent Chrome from cutting it off
  timers.keepAliveInterval = window.setInterval(() => {
    if (window.speechSynthesis.speaking) {
      console.log('[VOICE] Keeping speech alive');
      keepSpeechAlive();
    } else if (timers.keepAliveInterval !== null) {
      console.log('[VOICE] Speech not active, clearing keep-alive');
      clearInterval(timers.keepAliveInterval);
      timers.keepAliveInterval = null;
    }
  }, 5000);
  
  // Reduced frequency of sync checks to improve performance
  timers.syncCheckInterval = window.setInterval(() => {
    try {
      const currentWord = localStorage.getItem('currentDisplayedWord');
      if (currentWord) {
        forceResyncIfNeeded(currentWord, processedText, () => {
          console.log('[VOICE] Forced resync triggered');
          clearAllSpeechTimers(timers);
          onComplete();
        });
      }
    } catch (error) {
      console.error('[VOICE] Error in sync check:', error);
    }
  }, 1000);
  
  // Set a timeout for the entire speech operation
  const estimatedDuration = calculateSpeechDuration(text, getSpeechRate());
  const maxDuration = Math.min(Math.max(estimatedDuration * 2.5, 60000), 300000);
  
  timers.maxDurationTimeout = window.setTimeout(() => {
    if (window.speechSynthesis.speaking) {
      console.log('[VOICE] Max speech duration reached, stopping');
      window.speechSynthesis.cancel();
      clearAllSpeechTimers(timers);
      onComplete();
    }
  }, maxDuration);
  
  // Start speaking the first chunk
  try {
    await speakChunksSequentially(0);
  } catch (error) {
    console.error('[VOICE] Error in chunk sequence:', error);
    clearAllSpeechTimers(timers);
    
    // If at least half the chunks were successful, consider it a partial success
    const successfulChunks = chunkResults.filter(r => r.success).length;
    if (successfulChunks >= textChunks.length / 2) {
      console.log('[VOICE] Partial success, treating as complete');
      onComplete();
    } else {
      onError(error as Error);
    }
  }
}
