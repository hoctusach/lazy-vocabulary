
import { VocabularyWord } from '@/types/vocabulary';
import { audioUnlockService } from '@/services/audio/AudioUnlockService';

/**
 * Simple Speech Controller with proper audio unlock integration
 */
class SimpleSpeechController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isActive = false;

  async speak(word: VocabularyWord, region: 'US' | 'UK' | 'AU' = 'US'): Promise<boolean> {
    const speechId = Math.random().toString(36).substring(7);
    console.log(`[SIMPLE-SPEECH-${speechId}] Starting speech for: "${word.word}"`);

    try {
      // Ensure audio is unlocked first
      const isUnlocked = await audioUnlockService.unlock();
      if (!isUnlocked) {
        console.warn(`[SIMPLE-SPEECH-${speechId}] Audio not unlocked, cannot proceed`);
        return false;
      }

      // Stop any current speech
      this.stop();

      // Wait for voices to be available
      await this.ensureVoicesLoaded();

      // Find appropriate voice
      const voice = this.findVoice(region);
      
      // Create speech text
      const speechText = `${word.word}. ${word.meaning}`;
      
      console.log(`[SIMPLE-SPEECH-${speechId}] Speaking: "${speechText.substring(0, 50)}..."`);

      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(speechText);
        
        if (voice) {
          utterance.voice = voice;
        }
        
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          console.log(`[SIMPLE-SPEECH-${speechId}] ✓ Speech started`);
          this.isActive = true;
        };

        utterance.onend = () => {
          console.log(`[SIMPLE-SPEECH-${speechId}] ✓ Speech completed`);
          this.isActive = false;
          this.currentUtterance = null;
          resolve(true);
        };

        utterance.onerror = (event) => {
          console.error(`[SIMPLE-SPEECH-${speechId}] ✗ Speech error:`, event.error);
          this.isActive = false;
          this.currentUtterance = null;
          resolve(false);
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);

        // Fallback timeout
        setTimeout(() => {
          if (this.currentUtterance === utterance && utterance.onend) {
            console.log(`[SIMPLE-SPEECH-${speechId}] Fallback timeout triggered`);
            utterance.onend({} as SpeechSynthesisEvent);
          }
        }, 5000);
      });

    } catch (error) {
      console.error(`[SIMPLE-SPEECH-${speechId}] Error:`, error);
      return false;
    }
  }

  stop(): void {
    console.log('[SIMPLE-SPEECH] Stopping speech');
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.isActive = false;
  }

  isSpeaking(): boolean {
    return this.isActive;
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
