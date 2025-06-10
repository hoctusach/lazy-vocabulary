
export const getSpeechRate = (region?: 'US' | 'UK'): number => {
  // Slower rates for better comprehension
  const rates = {
    US: 0.75, // Reduced from default 1.0
    UK: 0.65  // Even slower for UK voices which tend to be faster
  };
  
  if (region && rates[region]) {
    return rates[region];
  }
  
  return 0.75; // Default slower rate
};

export const getSpeechPitch = (): number => {
  return 1.0; // Normal pitch
};

export const getSpeechVolume = (): number => {
  return 1.0; // Full volume
};

// Enhanced timing settings for different regions
export const getTimingSettings = (region: 'US' | 'UK' = 'US') => {
  return {
    US: {
      wordInterval: 5000,     // 5 seconds between words
      pauseBetweenSections: 800,  // Pause between word/meaning/example
      errorRetryDelay: 3000,
      resumeDelay: 300
    },
    UK: {
      wordInterval: 6000,     // 6 seconds for UK (they speak faster)
      pauseBetweenSections: 1000, // Longer pause for UK
      errorRetryDelay: 3500,
      resumeDelay: 400
    }
  }[region];
};

// Add new method to get voice region from localStorage
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
  return 'US'; // Default to US if not found or error
};
