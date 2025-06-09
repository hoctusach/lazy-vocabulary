
/**
 * Enhanced speech settings with region-specific configurations
 */

export interface RegionSpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  addBreaks: boolean;
  breakDuration: string; // SSML break duration
  segmentPause: string; // Pause between word/meaning/example
}

export interface EnhancedSpeechConfig {
  US: RegionSpeechSettings;
  UK: RegionSpeechSettings;
}

// Enhanced speech configuration with region-specific settings
export const ENHANCED_SPEECH_CONFIG: EnhancedSpeechConfig = {
  US: {
    rate: 0.7,           // Slower for US voice (reduced from 0.8)
    pitch: 1.0,
    volume: 1.0,
    addBreaks: true,     // Add breaks between segments
    breakDuration: '500ms', // Break between sections
    segmentPause: '300ms'   // Shorter pause within segments
  },
  UK: {
    rate: 0.8,           // Keep UK voice at current speed
    pitch: 1.0,
    volume: 1.0,
    addBreaks: false,    // UK voice doesn't need breaks initially
    breakDuration: '300ms',
    segmentPause: '200ms'
  }
};

export const getRegionSpeechSettings = (region: 'US' | 'UK'): RegionSpeechSettings => {
  return ENHANCED_SPEECH_CONFIG[region];
};

export const getVoiceRegionFromStorage = (): 'US' | 'UK' => {
  try {
    const storedStates = localStorage.getItem('buttonStates');
    if (storedStates) {
      const parsedStates = JSON.parse(storedStates);
      return parsedStates.voiceRegion === 'UK' ? 'UK' : 'US';
    }
  } catch (error) {
    console.error('Error reading voice region from localStorage:', error);
  }
  return 'US'; // Default to US
};
