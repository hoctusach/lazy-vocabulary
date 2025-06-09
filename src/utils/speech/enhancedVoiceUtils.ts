import { VoiceSelection } from "@/hooks/vocabulary-playback/useVoiceSelection";

/**
 * Enhanced voice utilities with expanded US female voice options
 */

// Expanded US female voice options (prioritized by quality and naturalness)
const ENHANCED_US_FEMALE_VOICES = [
  "Samantha",                    // macOS premium voice
  "Google US English Female",    // Google voice
  "Microsoft Aria - English (US)", // Microsoft premium
  "Alex",                        // macOS default (unisex but sounds female)
  "Microsoft Zira Desktop",      // Microsoft Zira
  "English (US) Female",         // Generic identifier
  "Karen",                       // Another macOS voice
  "Vicki"                        // Additional macOS voice
];

// Enhanced UK voice options (keeping existing good options)
const ENHANCED_UK_FEMALE_VOICES = [
  "Google UK English Female",
  "Microsoft Susan Desktop", 
  "Daniel",  // Actually male but keeping for compatibility
  "Kate",
  "Susan",
  "Hazel",
  "English (UK) Female"
];

export interface EnhancedVoiceInfo {
  voice: SpeechSynthesisVoice;
  quality: 'premium' | 'standard' | 'basic';
  naturalness: number; // 1-5 scale
}

export const findEnhancedVoiceByRegion = (
  region: 'US' | 'UK', 
  gender: 'male' | 'female' = 'female'
): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis?.getVoices() || [];
  
  if (!voices || voices.length === 0) {
    console.warn('[ENHANCED-VOICE] No voices available');
    return null;
  }
  
  console.log(`[ENHANCED-VOICE] Searching for ${region} ${gender} voice among ${voices.length} voices`);
  
  const targetVoices = region === 'US' ? ENHANCED_US_FEMALE_VOICES : ENHANCED_UK_FEMALE_VOICES;
  
  // Try exact name matches first (highest priority)
  for (const voiceName of targetVoices) {
    const voice = voices.find(v => v.name === voiceName);
    if (voice) {
      console.log(`[ENHANCED-VOICE] ✓ Found exact match: ${voice.name} (${voice.lang})`);
      return voice;
    }
  }
  
  // Try partial name matches
  for (const voiceName of targetVoices) {
    const voice = voices.find(v => v.name.includes(voiceName));
    if (voice) {
      console.log(`[ENHANCED-VOICE] ✓ Found partial match: ${voice.name} (${voice.lang})`);
      return voice;
    }
  }
  
  // Fallback to language code with gender preference
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  let voice = voices.find(v => 
    v.lang === langCode && 
    (gender === 'female' ? 
      !v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('david') :
      v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david')
    )
  );
  
  if (voice) {
    console.log(`[ENHANCED-VOICE] ✓ Found by language and gender: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Fallback to any voice with correct language
  voice = voices.find(v => v.lang === langCode);
  if (voice) {
    console.log(`[ENHANCED-VOICE] ✓ Found by language: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  // Last resort - any English voice
  voice = voices.find(v => v.lang.startsWith('en'));
  if (voice) {
    console.log(`[ENHANCED-VOICE] ✓ Last resort English voice: ${voice.name} (${voice.lang})`);
    return voice;
  }
  
  console.log('[ENHANCED-VOICE] ✗ No suitable voice found');
  return null;
};

export const getEnhancedVoiceInfo = (voice: SpeechSynthesisVoice): EnhancedVoiceInfo => {
  // Determine quality based on voice name patterns
  let quality: 'premium' | 'standard' | 'basic' = 'basic';
  let naturalness = 1;
  
  if (voice.name.includes('Google') || voice.name.includes('Microsoft')) {
    quality = 'premium';
    naturalness = 4;
  } else if (voice.name.includes('Samantha') || voice.name.includes('Alex')) {
    quality = 'premium';
    naturalness = 5;
  } else if (voice.localService) {
    quality = 'standard';
    naturalness = 3;
  }
  
  return { voice, quality, naturalness };
};

export const getAvailableEnhancedVoices = (region: 'US' | 'UK'): EnhancedVoiceInfo[] => {
  const voices = window.speechSynthesis?.getVoices() || [];
  const langCode = region === 'US' ? 'en-US' : 'en-GB';
  
  return voices
    .filter(voice => voice.lang === langCode || voice.lang.startsWith('en'))
    .map(voice => getEnhancedVoiceInfo(voice))
    .sort((a, b) => b.naturalness - a.naturalness);
};

// Legacy compatibility
export const getVoiceByRegion = findEnhancedVoiceByRegion;
export const getVoiceBySelection = (voiceSelection: VoiceSelection): SpeechSynthesisVoice | null => {
  return findEnhancedVoiceByRegion(voiceSelection.region, voiceSelection.gender);
};

export const hasAvailableVoices = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    return window.speechSynthesis.getVoices().length > 0;
  } catch {
    return false;
  }
};
