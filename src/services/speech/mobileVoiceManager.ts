/**
 * Mobile-optimized voice manager with preloading and caching
 */

import { findBestMobileVoice, isMobileChrome, validateVoiceForRegion } from '@/utils/speech/mobileVoiceDetection';

export class MobileVoiceManager {
  private voicesCache: SpeechSynthesisVoice[] = [];
  private voiceMap: Map<string, SpeechSynthesisVoice> = new Map();
  private isInitialized = false;
  private initializationPromise: Promise<boolean> | null = null;
  
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }
  
  private async doInitialize(): Promise<boolean> {
    console.log('[MOBILE-VOICE-MANAGER] Initializing...');
    
    if (!window.speechSynthesis) {
      console.error('[MOBILE-VOICE-MANAGER] Speech synthesis not supported');
      return false;
    }
    
    try {
      // Load voices with multiple strategies
      await this.loadVoicesWithRetry();
      
      // Cache voices by region
      this.cacheVoicesByRegion();
      
      this.isInitialized = true;
      console.log(`[MOBILE-VOICE-MANAGER] Initialized with ${this.voicesCache.length} voices`);
      return true;
      
    } catch (error) {
      console.error('[MOBILE-VOICE-MANAGER] Initialization failed:', error);
      return false;
    }
  }
  
  private async loadVoicesWithRetry(): Promise<SpeechSynthesisVoice[]> {
    const maxAttempts = 5;
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      attempt++;
      console.log(`[MOBILE-VOICE-MANAGER] Load attempt ${attempt}/${maxAttempts}`);
      
      // Try direct access first
      let voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        console.log(`[MOBILE-VOICE-MANAGER] Voices loaded directly: ${voices.length}`);
        this.voicesCache = voices;
        return voices;
      }
      
      // Wait for voices changed event
      voices = await this.waitForVoicesChanged(1000 * attempt);
      
      if (voices.length > 0) {
        console.log(`[MOBILE-VOICE-MANAGER] Voices loaded via event: ${voices.length}`);
        this.voicesCache = voices;
        return voices;
      }
      
      // Mobile Chrome specific: trigger speech synthesis to load voices
      if (isMobileChrome() && attempt === 2) {
        await this.triggerSpeechToLoadVoices();
      }
    }
    
    console.warn('[MOBILE-VOICE-MANAGER] Failed to load voices after all attempts');
    return [];
  }
  
  private waitForVoicesChanged(timeout: number): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve([]);
      }, timeout);
      
      const handler = () => {
        clearTimeout(timeoutId);
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        const voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
      
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    });
  }
  
  private async triggerSpeechToLoadVoices(): Promise<void> {
    console.log('[MOBILE-VOICE-MANAGER] Triggering speech to load voices');
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      window.speechSynthesis.speak(utterance);
      
      // Fallback timeout
      setTimeout(() => resolve(), 1000);
    });
  }
  
  private cacheVoicesByRegion(): void {
    console.log('[MOBILE-VOICE-MANAGER] Caching voices by region');
    
    // Find and cache best voices for each region
    const usVoice = findBestMobileVoice(this.voicesCache, 'US');
    const ukVoice = findBestMobileVoice(this.voicesCache, 'UK');
    
    if (usVoice) {
      this.voiceMap.set('US', usVoice);
      console.log(`[MOBILE-VOICE-MANAGER] Cached US voice: ${usVoice.name}`);
    }
    
    if (ukVoice) {
      this.voiceMap.set('UK', ukVoice);
      console.log(`[MOBILE-VOICE-MANAGER] Cached UK voice: ${ukVoice.name}`);
    }
    
    // Validate cached voices
    this.validateCachedVoices();
  }
  
  private validateCachedVoices(): void {
    console.log('[MOBILE-VOICE-MANAGER] Validating cached voices');
    
    for (const [region, voice] of this.voiceMap.entries()) {
      const isValid = validateVoiceForRegion(voice, region as 'US' | 'UK');
      if (!isValid) {
        console.warn(`[MOBILE-VOICE-MANAGER] Invalid voice cached for ${region}: ${voice.name}`);
        // Keep it anyway, but log the issue
      }
    }
  }
  
  getVoiceForRegion(region: 'US' | 'UK'): SpeechSynthesisVoice | null {
    if (!this.isInitialized) {
      console.warn('[MOBILE-VOICE-MANAGER] Not initialized, cannot get voice');
      return null;
    }
    
    const cachedVoice = this.voiceMap.get(region);
    
    if (cachedVoice) {
      console.log(`[MOBILE-VOICE-MANAGER] Returning cached ${region} voice: ${cachedVoice.name}`);
      return cachedVoice;
    }
    
    // Fallback: search again
    console.log(`[MOBILE-VOICE-MANAGER] No cached voice for ${region}, searching again`);
    const voice = findBestMobileVoice(this.voicesCache, region);
    
    if (voice) {
      this.voiceMap.set(region, voice);
    }
    
    return voice;
  }
  
  getAllVoices(): SpeechSynthesisVoice[] {
    return [...this.voicesCache];
  }
  
  refreshVoices(): void {
    console.log('[MOBILE-VOICE-MANAGER] Refreshing voices');
    this.isInitialized = false;
    this.initializationPromise = null;
    this.voicesCache = [];
    this.voiceMap.clear();
  }
  
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      voiceCount: this.voicesCache.length,
      cachedRegions: Array.from(this.voiceMap.keys()),
      isMobileChrome: isMobileChrome(),
      voices: this.voicesCache.map(v => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService
      }))
    };
  }
}

// Singleton instance
export const mobileVoiceManager = new MobileVoiceManager();
