
/**
 * Enhanced voice detection specifically for mobile Chrome
 */

export interface VoiceCandidate {
  voice: SpeechSynthesisVoice;
  score: number;
  reason: string;
}

export interface MobileVoiceConfig {
  region: 'US' | 'UK';
  fallbackOrder: string[];
  mobileSpecific: boolean;
}

// Mobile-specific voice mappings based on common availability
const MOBILE_VOICE_MAPPING = {
  US: [
    'Google US English',
    'Microsoft David - English (United States)',
    'Samantha',
    'Alex',
    'en-US'
  ],
  UK: [
    'Google UK English Female',
    'Google UK English Male', 
    'Microsoft Hazel - English (Great Britain)',
    'Daniel',
    'Kate',
    'en-GB'
  ]
};

// Enhanced voice scoring for mobile Chrome
export const scoreVoiceForMobile = (
  voice: SpeechSynthesisVoice, 
  targetRegion: 'US' | 'UK'
): VoiceCandidate => {
  let score = 0;
  let reason = '';
  
  const targetLang = targetRegion === 'US' ? 'en-US' : 'en-GB';
  const voiceName = voice.name.toLowerCase();
  const voiceLang = voice.lang.toLowerCase();
  
  // Primary scoring: exact language match
  if (voiceLang === targetLang.toLowerCase()) {
    score += 100;
    reason += `exact-lang(${voice.lang}) `;
  }
  
  // Secondary scoring: language family match
  if (voiceLang.startsWith('en')) {
    score += 50;
    reason += `english-family `;
  }
  
  // Tertiary scoring: name-based detection
  const mobileVoices = MOBILE_VOICE_MAPPING[targetRegion];
  for (let i = 0; i < mobileVoices.length; i++) {
    const candidate = mobileVoices[i].toLowerCase();
    if (voiceName.includes(candidate) || candidate.includes(voiceName)) {
      score += (50 - i * 5); // Higher score for earlier matches
      reason += `name-match(${mobileVoices[i]}) `;
      break;
    }
  }
  
  // Bonus scoring for Google voices (commonly available on mobile)
  if (voiceName.includes('google')) {
    score += 20;
    reason += 'google-voice ';
  }
  
  // Bonus for local voices (typically higher quality)
  if (voice.localService) {
    score += 10;
    reason += 'local-service ';
  }
  
  // Penalty for very generic names
  if (voiceName === 'default' || voiceName === '') {
    score -= 30;
    reason += 'generic-name ';
  }
  
  return {
    voice,
    score,
    reason: reason.trim()
  };
};

export const findBestMobileVoice = (
  voices: SpeechSynthesisVoice[],
  targetRegion: 'US' | 'UK'
): SpeechSynthesisVoice | null => {
  console.log(`[MOBILE-VOICE] Finding best voice for ${targetRegion} from ${voices.length} voices`);
  
  if (voices.length === 0) {
    console.log('[MOBILE-VOICE] No voices available');
    return null;
  }
  
  // Score all voices
  const candidates = voices.map(voice => scoreVoiceForMobile(voice, targetRegion));
  
  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);
  
  // Log top candidates for debugging
  console.log('[MOBILE-VOICE] Top voice candidates:');
  candidates.slice(0, 5).forEach((candidate, index) => {
    console.log(`  ${index + 1}. ${candidate.voice.name} (${candidate.voice.lang}) - Score: ${candidate.score} - ${candidate.reason}`);
  });
  
  // Return the best candidate
  const bestVoice = candidates[0]?.voice || null;
  
  if (bestVoice) {
    console.log(`[MOBILE-VOICE] Selected voice: ${bestVoice.name} (${bestVoice.lang})`);
  } else {
    console.log('[MOBILE-VOICE] No suitable voice found');
  }
  
  return bestVoice;
};

export const isMobileChrome = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('chrome') && 
         (userAgent.includes('mobile') || userAgent.includes('android'));
};

export const validateVoiceForRegion = (
  voice: SpeechSynthesisVoice | null,
  expectedRegion: 'US' | 'UK'
): boolean => {
  if (!voice) return false;
  
  const expectedLang = expectedRegion === 'US' ? 'en-us' : 'en-gb';
  const actualLang = voice.lang.toLowerCase();
  
  // Check if the voice actually matches the expected region
  const isCorrectRegion = actualLang === expectedLang || 
                         actualLang.startsWith(expectedLang.substring(0, 2));
  
  console.log(`[VOICE-VALIDATION] Voice "${voice.name}" (${voice.lang}) for ${expectedRegion}: ${isCorrectRegion ? 'VALID' : 'INVALID'}`);
  
  return isCorrectRegion;
};
