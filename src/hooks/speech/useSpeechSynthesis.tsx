import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoiceManager } from '@/hooks/useVoiceManager';
import { useVoiceSettings } from './useVoiceSettings';
import { synthesizeAudio } from '@/utils/speech/synthesisUtils';
import { stopSpeaking, resetSpeechEngine } from '@/utils/speech';
import { toast } from 'sonner';

export const useSpeechSynthesis = () => {
  const { isVoicesLoaded, selectVoiceByRegion } = useVoiceManager();
  const { voiceRegion, setVoiceRegion, isMuted, setIsMuted } = useVoiceSettings();
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [hasSpeechPermission, setHasSpeechPermission] = useState(true);
  
  // For keeping track of speaking state
  const isSpeakingRef = useRef(false);
  const speakingLockRef = useRef(false);
  const retryAttemptsRef = useRef(0);
  const maxRetryAttempts = 3;
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const remainingChunksRef = useRef<string[]>([]);
  
  // Function to reset speech state after errors
  const resetSpeechState = useCallback(() => {
    resetSpeechEngine();
    isSpeakingRef.current = false;
    speakingLockRef.current = false;
    activeUtterancesRef.current = [];
    console.log('Speech state reset after error');
  }, []);

  // Function to handle speech permissions
  const handleSpeechPermissionError = useCallback(() => {
    setHasSpeechPermission(false);
    setSpeechError('Speech requires user interaction. Please click anywhere or press Play.');
    toast.error('Speech requires user interaction', {
      description: 'Please click anywhere or press Play to enable speech.'
    });
    resetSpeechState();
  }, [resetSpeechState]);
  
  // Function to retry speech initialization
  const retrySpeechInitialization = useCallback(() => {
    setHasSpeechPermission(true);
    setSpeechError(null);
    retryAttemptsRef.current = 0;
    resetSpeechEngine();
    
    // If we have remaining chunks, retry speaking them
    if (remainingChunksRef.current.length > 0 && !isMuted) {
      const chunks = [...remainingChunksRef.current];
      remainingChunksRef.current = [];
      speakText(chunks.join(' ')).catch(console.error);
    }
    
    toast.success('Speech enabled', { 
      description: 'Speech synthesis has been re-enabled.'
    });
  }, [isMuted]);
  
  // Function to split text into smaller chunks
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
  
  // Function to stop current speech
  const stopSpeakingLocal = useCallback(() => {
    // Cancel any ongoing speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    activeUtterancesRef.current = [];
    isSpeakingRef.current = false;
    speakingLockRef.current = false;
    console.log('Speech stopped');
  }, []);
  
  // New function to pause current speech
  const pauseSpeakingLocal = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      console.log('Pausing speech');
      window.speechSynthesis.pause();
    }
  }, []);
  
  // New function to resume speech
  const resumeSpeakingLocal = useCallback(() => {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      console.log('Resuming speech');
      window.speechSynthesis.resume();
    }
  }, []);
  
  // Function to speak text, returns a Promise
  const speakText = useCallback((text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (isMuted || !text) {
        console.log("Speech is muted or text is empty");
        resolve('');
        return;
      }
      
      // If we don't have speech permission, return early
      if (!hasSpeechPermission && retryAttemptsRef.current >= maxRetryAttempts) {
        console.log("No speech permission and max retries reached");
        setSpeechError('Audio playback is unavailable. You can still practice silently.');
        resolve('');
        return;
      }
      
      // If we're already speaking and locked, queue this speak request
      if (speakingLockRef.current) {
        console.log("Speech already in progress, queuing request");
        // Resolve after a delay to allow current speech to finish
        setTimeout(() => {
          if (!isMuted) {
            speakText(text).then(resolve).catch(reject);
          } else {
            resolve('');
          }
        }, 800);
        return;
      }
      
      // Set lock to prevent overlapping speech
      speakingLockRef.current = true;
      
      // Stop any currently playing speech
      stopSpeakingLocal();
      
      try {
        setLastSpokenText(text);
        
        // Get the selected voice based on region
        const voice = selectVoiceByRegion(voiceRegion);
        
        if (!voice) {
          console.warn(`No ${voiceRegion} voice available, using default fallback`);
        }
        
        // Split text into smaller chunks
        const textChunks = splitTextIntoChunks(text);
        console.log(`Split text into ${textChunks.length} chunks`);
        remainingChunksRef.current = [...textChunks];
        
        // Set speaking flag
        isSpeakingRef.current = true;
        
        // Make sure UI gets updated with new text before speaking
        setTimeout(() => {
          speakChunksSequentially(textChunks, voice, 0)
            .then((result) => {
              console.log('All chunks speech synthesis completed:', result);
              retryAttemptsRef.current = 0; // Reset retry counter on success
              setHasSpeechPermission(true); // Speech worked, so we have permission
              setSpeechError(null); // Clear any error state
              
              setTimeout(() => {
                isSpeakingRef.current = false;
                speakingLockRef.current = false;
                resolve(result);
              }, 100);
            })
            .catch((error) => {
              console.error("Error in speech synthesis:", error);
              
              // Handle specific error types
              if (error.message?.includes('not-allowed')) {
                handleSpeechPermissionError();
              } else {
                // For other errors, increment retry counter
                retryAttemptsRef.current++;
                
                if (retryAttemptsRef.current >= maxRetryAttempts) {
                  setSpeechError('Audio playback is unavailable. You can still practice silently.');
                } else {
                  setSpeechError(`Speech error (attempt ${retryAttemptsRef.current}/${maxRetryAttempts})`);
                }
                
                resetSpeechState();
              }
              
              isSpeakingRef.current = false;
              speakingLockRef.current = false;
              reject(error);
            });
          
          console.log(`Generated speech for: "${text.substring(0, 20)}..."`);
        }, 150);
      } catch (error) {
        console.error("Error in speech synthesis:", error);
        resetSpeechState();
        retryAttemptsRef.current++;
        isSpeakingRef.current = false;
        speakingLockRef.current = false;
        reject(error);
      }
    });
  }, [isMuted, selectVoiceByRegion, voiceRegion, stopSpeakingLocal, hasSpeechPermission, handleSpeechPermissionError, resetSpeechState, splitTextIntoChunks]);
  
  // New function to speak chunks sequentially
  const speakChunksSequentially = useCallback((chunks: string[], voice: SpeechSynthesisVoice | null, startIndex: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (startIndex >= chunks.length) {
        console.log("All chunks completed");
        // All chunks have been spoken
        remainingChunksRef.current = [];
        resolve('completed');
        return;
      }
      
      // Update remaining chunks reference
      remainingChunksRef.current = chunks.slice(startIndex);
      
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
  
  // Function to toggle mute state
  const handleToggleMute = useCallback(() => {
    stopSpeakingLocal();
    setIsMuted(!isMuted);
    console.log(`Speech ${!isMuted ? 'muted' : 'unmuted'}`);
  }, [isMuted, setIsMuted, stopSpeakingLocal]);
  
  // Function to change voice region
  const handleChangeVoice = useCallback(() => {
    const newRegion = voiceRegion === 'US' ? 'UK' : 'US';
    setVoiceRegion(newRegion);
    console.log(`Voice changed to ${newRegion}`);
  }, [voiceRegion, setVoiceRegion]);
  
  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return {
    isMuted,
    voiceRegion,
    speakText,
    handleToggleMute,
    handleChangeVoice,
    isVoicesLoaded,
    isSpeakingRef,
    stopSpeaking: stopSpeakingLocal,
    pauseSpeaking: pauseSpeakingLocal,
    resumeSpeaking: resumeSpeakingLocal,
    speechError,
    hasSpeechPermission,
    retrySpeechInitialization
  };
};
