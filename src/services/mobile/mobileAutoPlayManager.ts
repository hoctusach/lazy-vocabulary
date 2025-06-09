
import { VocabularyWord } from '@/types/vocabulary';
import { mobileSpeechController } from './mobileSpeechController';
import { mobileGestureDetector } from './mobileGestureDetector';

/**
 * Manages auto-play functionality specifically for mobile devices
 */
class MobileAutoPlayManager {
  private isAutoPlayActive = false;
  private currentWordIndex = 0;
  private wordList: VocabularyWord[] = [];
  private autoPlayInterval: number | null = null;
  private speechInProgress = false;

  startAutoPlay(
    wordList: VocabularyWord[],
    startIndex = 0,
    options: {
      voiceRegion?: 'US' | 'UK';
      onWordChange?: (word: VocabularyWord, index: number) => void;
      onComplete?: () => void;
      wordDisplayTime?: number;
    } = {}
  ) {
    console.log('[MOBILE-AUTOPLAY] Starting auto-play');
    
    this.wordList = wordList;
    this.currentWordIndex = startIndex;
    this.isAutoPlayActive = true;

    // Ensure we have gesture permission
    mobileGestureDetector.onGestureReady(() => {
      this.startPlaybackLoop(options);
    });
  }

  private startPlaybackLoop(options: {
    voiceRegion?: 'US' | 'UK';
    onWordChange?: (word: VocabularyWord, index: number) => void;
    onComplete?: () => void;
    wordDisplayTime?: number;
  }) {
    if (!this.isAutoPlayActive || this.currentWordIndex >= this.wordList.length) {
      options.onComplete?.();
      return;
    }

    const currentWord = this.wordList[this.currentWordIndex];
    console.log(`[MOBILE-AUTOPLAY] Playing word ${this.currentWordIndex + 1}/${this.wordList.length}: ${currentWord.word}`);

    // Notify about word change
    options.onWordChange?.(currentWord, this.currentWordIndex);

    // Create speech text
    const speechText = this.createSpeechText(currentWord);
    
    this.speechInProgress = true;

    // Get appropriate voice
    const voice = this.getVoiceForRegion(options.voiceRegion || 'US');

    // Speak the word
    mobileSpeechController.speak(speechText, {
      voice,
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0,
      onStart: () => {
        console.log(`[MOBILE-AUTOPLAY] ✓ Started speaking: ${currentWord.word}`);
      },
      onEnd: () => {
        console.log(`[MOBILE-AUTOPLAY] ✓ Finished speaking: ${currentWord.word}`);
        this.speechInProgress = false;
        this.scheduleNextWord(options);
      },
      onError: (error) => {
        console.error(`[MOBILE-AUTOPLAY] ✗ Error speaking: ${currentWord.word}`, error);
        this.speechInProgress = false;
        this.scheduleNextWord(options);
      }
    });
  }

  private scheduleNextWord(options: {
    voiceRegion?: 'US' | 'UK';
    onWordChange?: (word: VocabularyWord, index: number) => void;
    onComplete?: () => void;
    wordDisplayTime?: number;
  }) {
    if (!this.isAutoPlayActive) return;

    // Wait a bit before moving to next word
    const delay = options.wordDisplayTime || 3000;
    
    setTimeout(() => {
      if (!this.isAutoPlayActive) return;
      
      this.currentWordIndex++;
      this.startPlaybackLoop(options);
    }, delay);
  }

  private createSpeechText(word: VocabularyWord): string {
    // Create natural-sounding speech with proper pauses
    const parts = [
      word.word,
      word.meaning,
      word.example
    ].filter(part => part && part.trim());

    return parts.join('. ') + '.';
  }

  private getVoiceForRegion(region: 'US' | 'UK'): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    
    // Look for region-specific voices
    const regionVoices = voices.filter(voice => {
      if (region === 'US') {
        return voice.lang.includes('en-US') || voice.name.toLowerCase().includes('united states');
      } else {
        return voice.lang.includes('en-GB') || voice.name.toLowerCase().includes('british') || voice.name.toLowerCase().includes('uk');
      }
    });

    // Prefer female voices for better clarity
    const femaleVoice = regionVoices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('samantha') ||
      voice.name.toLowerCase().includes('sarah')
    );

    return femaleVoice || regionVoices[0] || voices[0] || null;
  }

  stopAutoPlay() {
    console.log('[MOBILE-AUTOPLAY] Stopping auto-play');
    this.isAutoPlayActive = false;
    
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }

    mobileSpeechController.stop();
    this.speechInProgress = false;
  }

  pauseAutoPlay() {
    console.log('[MOBILE-AUTOPLAY] Pausing auto-play');
    this.isAutoPlayActive = false;
    mobileSpeechController.stop();
  }

  resumeAutoPlay(options: {
    voiceRegion?: 'US' | 'UK';
    onWordChange?: (word: VocabularyWord, index: number) => void;
    onComplete?: () => void;
    wordDisplayTime?: number;
  } = {}) {
    console.log('[MOBILE-AUTOPLAY] Resuming auto-play');
    this.isAutoPlayActive = true;
    this.startPlaybackLoop(options);
  }

  getCurrentWordIndex(): number {
    return this.currentWordIndex;
  }

  setCurrentWordIndex(index: number) {
    this.currentWordIndex = Math.max(0, Math.min(index, this.wordList.length - 1));
  }

  isSpeechInProgress(): boolean {
    return this.speechInProgress;
  }
}

export const mobileAutoPlayManager = new MobileAutoPlayManager();
