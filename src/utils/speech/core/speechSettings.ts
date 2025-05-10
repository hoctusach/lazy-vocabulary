
export const getSpeechRate = (): number => {
  return 1.0; // Normal speed
};

export const getSpeechPitch = (): number => {
  return 1.0; // Normal pitch
};

export const getSpeechVolume = (): number => {
  return 1.0; // Full volume
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
