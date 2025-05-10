import { getSpeechRate } from './speechSettings';
import { getVoiceByRegion } from '../voiceUtils';
import { stopSpeaking } from './speechEngine';
import { calculateSpeechDuration } from '../durationUtils';
import { splitTextIntoChunks } from './textChunker';
import { speakChunksInSequence } from './chunkSequencer';
import { createSpeechMonitor, clearSpeechMonitor, SpeechMonitorRefs } from './speechMonitor';

interface SpeakWithVoiceParams {
  utterance: SpeechSynthesisUtterance;
  region: 'US' | 'UK';
  text: string;
  processedText: string;
  onComplete: () => void;
  onError: (e: Error) => void;
  pauseRequestedRef?: React.MutableRefObject<boolean>;
}

export async function speakWithVoice({
  utterance,
  region,
  text,
  processedText,
  onComplete,
  onError,
  pauseRequestedRef
}: SpeakWithVoiceParams) {
  console.log('[VOICE] Starting speakWithVoice for:', text.substring(0, 30));
  
  // First, ensure previous speech is completely stopped
  stopSpeaking();
  console.log('[VOICE] Previous speech stopped');
  
  // Give the DOM time to update and speech engine to reset, but keep it short
  const domUpdateDelay = 150; // Increased from 100ms to 150ms to ensure full engine reset
  console.log(`[VOICE] Waiting ${domUpdateDelay}ms for DOM updates`);
  await new Promise(resolve => setTimeout(resolve, domUpdateDelay));
  
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  const voice = getVoiceByRegion(region);
  
  // Split text into smaller chunks for better mobile compatibility
  const textChunks = splitTextIntoChunks(processedText);
  console.log(`[VOICE] Split text into ${textChunks.length} chunks`);
  
  // Estimate speech duration for monitoring
  const estimatedDuration = calculateSpeechDuration(text, getSpeechRate());
  
  // Set up monitoring for the speech process
  const monitorRefs: SpeechMonitorRefs = createSpeechMonitor({
    processedText,
    onComplete,
    estimatedDuration: estimatedDuration * 1.5 // Increase the estimated duration to ensure we wait long enough
  });
  
  try {
    // Speak all chunks in sequence
    const results = await speakChunksInSequence(textChunks, {
      langCode,
      voice,
      pauseRequestedRef,
      onChunkComplete: (index, total) => {
        console.log(`[VOICE] Completed chunk ${index + 1}/${total}`);
      },
      onError: (error, index) => {
        console.warn(`[VOICE] Error in chunk ${index + 1}, continuing:`, error);
      }
    });
    
    // Check if we had enough successful chunks to consider this a success
    const successfulChunks = results.filter(r => r.success).length;
    console.log(`[VOICE] ${successfulChunks}/${textChunks.length} chunks completed successfully`);
    
    // If we stopped because of a pause request, that's not an error
    if (pauseRequestedRef?.current && successfulChunks > 0) {
      console.log('[VOICE] Speech paused as requested after some chunks');
      clearSpeechMonitor(monitorRefs);
      onComplete();
      return;
    }
    
    if (successfulChunks === 0) {
      throw new Error('All speech chunks failed');
    } 
    else if (successfulChunks < textChunks.length / 2) {
      console.warn('[VOICE] Less than half of chunks successful, but continuing');
    }
    
    console.log('[VOICE] All chunks completed');
    clearSpeechMonitor(monitorRefs);
    onComplete();
    
  } catch (error) {
    console.error('[VOICE] Error in chunk sequence:', error);
    clearSpeechMonitor(monitorRefs);
    
    // If we encountered a fatal error
    onError(error as Error);
  }
}
