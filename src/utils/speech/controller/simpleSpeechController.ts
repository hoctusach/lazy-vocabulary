import { VocabularyWord } from '@/types/vocabulary';
import { audioUnlockService } from '@/services/audio/AudioUnlockService';

/**
 * Simple Speech Controller with enhanced audio unlock integration and robust state management
 */
class SimpleSpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;
  private isPausedState = false;
  private lastSpeakTime = 0;
  private readonly MIN_SPEAK_INTERVAL = 300; // Prevent rapid-fire calls

  async speak(word: VocabularyWord, region: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    const now = Date.now();
    const speechId = Math.random().toString(36).substring(7);
    
    console.log(`[SIMPLE-SPEECH-${speechId}] Starting speech for: "${word.word}"`);

    // Rate limiting
    if (now - this.lastSpeakTime < this.MIN_SPEAK_INTERVAL) {
      console.log(`[SIMPLE-SPEECH-${speechId}] ✗ Rate limited - too soon after last call`);
      return false;
    }
    this.lastSpeakTime = now;

    // Check for user gesture first
    if (!audioUnlockService.hasValidUserGesture()) {
      console.warn(`[SIMPLE-SPEECH-${speechId}] ✗ No user gesture detected`);
      return false;
    }

    try {
      // Ensure audio is unlocked
      const isUnlocked = await audioUnlockService.unlock();
      if (!isUnlocked) {
        console.warn(`[SIMPLE-SPEECH-${speechId}] ✗ Audio unlock failed`);
        return false;
      }

      console.log(`[SIMPLE-SPEECH-${speechId}] ✓ Audio is unlocked, proceeding with speech`);

      // Stop any current speech with proper delay
      if (this.isActive || this.currentUtterance) {
        console.log(`[SIMPLE-SPEECH-${speechId}] Stopping current speech`);
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 150)); // [FIX-APPLIED] Delay after cancel
      }

      // Wait for voices to be available
      await this.ensureVoicesLoaded();

      // Find appropriate voice with fallback
      const voice = this.findVoice(region);
      if (!voice) {
        console.warn(`[SIMPLE-SPEECH-${speechId}] ✗ No suitable voice found for region: ${region}`);
        // [FIX-APPLIED] Continue without voice rather than failing
      }
      
      // Create speech text
      const speechText = `${word.word}. ${word.meaning}`;
      
      console.log(`[SIMPLE-SPEECH-${speechId}] Speaking: "${speechText.substring(0, 50)}..."`);

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(speechText);
        
        if (voice) {
          utterance.voice = voice;
          console.log(`[SIMPLE-SPEECH-${speechId}] Using voice: ${voice.name}`);
        } else {
          console.log(`[SIMPLE-SPEECH-${speechId}] Using default voice`);
        }
        
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // [FIX-APPLIED] Enhanced state management
        utterance.onstart = () => {
          console.log(`[SIMPLE-SPEECH-${speechId}] ✓ Speech started successfully`);
          console.log(`[FIX-APPLIED] State sync - setting active: true, paused: false`);
          this.isActive = true;
          this.isPausedState = false;
        };

        utterance.onend = () => {
          console.log(`[SIMPLE-SPEECH-${speechId}] ✓ Speech completed`);
          console.log(`[FIX-APPLIED] State sync - setting active: false, paused: false`);
          this.isActive = false;
          this.currentUtterance = null;
          this.isPausedState = false;
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error(`[SIMPLE-SPEECH-${speechId}] ✗ Speech error:`, event.error);
          console.log(`[FIX-APPLIED] Error state sync - resetting all states`);
          this.isActive = false;
          this.currentUtterance = null;
          this.isPausedState = false;
          resolve(false);
        };

        // Store reference before speaking
        this.currentUtterance = utterance;
        
        // [FIX-APPLIED] Final state check before speaking
        if (!audioUnlockService.isUnlocked()) {
          console.warn(`[SIMPLE-SPEECH-${speechId}] ✗ Audio became locked before speaking`);
          resolve(false);
          return;
        }

        console.log(`[SIMPLE-SPEECH-${speechId}] ✓ Invoking speechSynthesis.speak()`);
        window.speechSynthesis.speak(utterance);

        // [FIX-APPLIED] Enhanced fallback timeout with better error detection
        setTimeout(() => {
          if (this.currentUtterance === utterance) {
            const synthState = {
              speaking: window.speechSynthesis.speaking,
              pending: window.speechSynthesis.pending,
              paused: window.speechSynthesis.paused
            };
            
            if (!this.isActive && !synthState.speaking) {
              console.warn(`[SIMPLE-SPEECH-${speechId}] ✗ Fallback timeout - speech never started. State:`, synthState);
              console.log(`[FIX-APPLIED] Timeout recovery - cleaning up state`);
              if (utterance.onend) {
                utterance.onend({} as SpeechSynthesisEvent);
              }
            }
          }
        }, 3000);
      });

    } catch (error) {
      console.error(`[SIMPLE-SPEECH-${speechId}] ✗ Exception:`, error);
      console.log(`[FIX-APPLIED] Exception recovery - resetting state`);
      this.isActive = false;
      this.currentUtterance = null;
      this.isPausedState = false;
      return false;
    }
  }

  stop(): void {
    console.log('[SIMPLE-SPEECH] Stopping speech');
    console.log(`[FIX-APPLIED] Stop called - current state: active=${this.isActive}, paused=${this.isPausedState}`);
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.isActive = false;
    this.isPausedState = false;
  }

  pause(): void {
    console.log('[SIMPLE-SPEECH] Pausing speech');
    if (this.isActive && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.isPausedState = true;
      console.log(`[FIX-APPLIED] Pause state sync - isPaused: true`);
    }
  }

  resume(): void {
    console.log('[SIMPLE-SPEECH] Resuming speech');
    if (this.isPausedState && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.isPausedState = false;
      console.log(`[FIX-APPLIED] Resume state sync - isPaused: false`);
    }
  }

  isSpeaking(): boolean {
    return this.isActive;
  }

  isPaused(): boolean {
    return this.isPausedState;
  }

  // [FIX-APPLIED] State guard to force synchronization
  getState() {
    const synthState = {
      speaking: window.speechSynthesis?.speaking || false,
      paused: window.speechSynthesis?.paused || false,
      pending: window.speechSynthesis?.pending || false
    };

    // Detect state mismatches and auto-correct
    if (this.isActive && !synthState.speaking && !synthState.paused && !synthState.pending) {
      console.warn('[FIX-APPLIED] State mismatch detected - correcting isActive to false');
      this.isActive = false;
    }

    if (this.isPausedState && !synthState.paused) {
      console.warn('[FIX-APPLIED] State mismatch detected - correcting isPaused to false');
      this.isPausedState = false;
    }

    return {
      isActive: this.isActive,
      isPaused: this.isPausedState,
      currentUtterance: this.currentUtterance,
      synthState,
      audioUnlocked: audioUnlockService.isUnlocked()
    };
  }

  private async ensureVoicesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve();
        return;
      }

      const onVoicesChanged = () => {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          resolve();
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      
      // Fallback timeout
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve();
      }, 2000);
    });
  }

  private findVoice(region: 'US' | 'UK' | 'AU'): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    
    const langMap = {
      'US': ['en-US'],
      'UK': ['en-GB'],
      'AU': ['en-AU']
    };

    const targetLangs = langMap[region];
    
    for (const lang of targetLangs) {
      const voice = voices.find(v => v.lang === lang);
      if (voice) {
        console.log(`[SIMPLE-SPEECH] Found voice for ${region}:`, voice.name);
        return voice;
      }
    }

    // Fallback to any English voice
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      console.log(`[SIMPLE-SPEECH] Using fallback English voice:`, englishVoice.name);
      return englishVoice;
    }

    console.log(`[SIMPLE-SPEECH] No suitable voice found for ${region}`);
    return null;
  }
}

export const simpleSpeechController = new SimpleSpeechController();
