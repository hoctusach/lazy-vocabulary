
import { loadVoicesAndWait } from './speechVoiceLoader';

// Enhanced speech function with comprehensive monitoring
export const speakWithRetry = async (
  utterance: SpeechSynthesisUtterance, 
  maxRetries: number = 2
): Promise<boolean> => {
  console.log('[ENGINE] === Starting Enhanced Speech Process ===');
  
  // Ensure voices are loaded
  const voices = await loadVoicesAndWait();
  console.log(`[ENGINE] Voice preparation complete: ${voices.length} voices available`);
  
  let attempts = 0;
  let success = false;
  
  while (attempts < maxRetries && !success) {
    attempts++;
    const attemptId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`[ENGINE-${attemptId}] Attempt ${attempts}/${maxRetries}`);
      
      if (attempts > 1) {
        // Clean up before retry
        if (window.speechSynthesis.speaking) {
          console.log(`[ENGINE-${attemptId}] Canceling previous speech before retry`);
          window.speechSynthesis.cancel();
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      console.log(`[ENGINE-${attemptId}] Initiating speech synthesis`);
      window.speechSynthesis.speak(utterance);
      
      // Enhanced speech validation with multiple checks
      const validationResult = await new Promise<boolean>((resolve, reject) => {
        let checkCount = 0;
        const maxChecks = 8;
        
        const validateSpeech = () => {
          checkCount++;
          console.log(`[ENGINE-${attemptId}] Validation check ${checkCount}/${maxChecks}`);
          
          if (window.speechSynthesis.speaking) {
            console.log(`[ENGINE-${attemptId}] ✓ Speech successfully validated`);
            resolve(true);
            return;
          }
          
          if (checkCount >= maxChecks) {
            console.warn(`[ENGINE-${attemptId}] ✗ Speech validation failed after ${maxChecks} checks`);
            reject(new Error('Speech validation timeout'));
            return;
          }
          
          // Continue checking
          setTimeout(validateSpeech, 100);
        };
        
        // Start validation after initial delay
        setTimeout(validateSpeech, 200);
      });
      
      if (validationResult) {
        success = true;
        console.log(`[ENGINE-${attemptId}] ✓ Speech successfully initiated`);
      }
      
      break; // Exit loop on success
      
    } catch (error) {
      console.error(`[ENGINE-${attemptId}] ✗ Attempt ${attempts} failed:`, error);
      
      if (attempts >= maxRetries) {
        console.error(`[ENGINE] ✗ All ${maxRetries} attempts failed`);
        return false;
      }
      
      // Wait before next attempt
      const delay = 300 * attempts;
      console.log(`[ENGINE-${attemptId}] Waiting ${delay}ms before retry`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  console.log(`[ENGINE] Speech process complete: ${success ? 'SUCCESS' : 'FAILED'}`);
  return success;
};
