
export const getVoiceRegionFromStorage = (): 'US' | 'UK' | 'AU' => {
  try {
    const storedStates = localStorage.getItem('buttonStates');
      if (storedStates) {
        const parsedStates = JSON.parse(storedStates);
        if (parsedStates.voiceRegion === 'UK' || parsedStates.voiceRegion === 'AU') {
          return parsedStates.voiceRegion;
        }
        return 'UK';
      }
  } catch (error) {
    console.error('Error reading voice region from localStorage:', error);
  }
  return 'UK'; // Default to UK if not found or error
};

export const getSpeechRate = (): number => {
  const region = getVoiceRegionFromStorage();
  if (region === 'US' || region === 'AU') {
    return 0.6;
  }
  return 1.0;
};

export const getSpeechPitch = (): number => {
  return 1.0; // Normal pitch
};

export const getSpeechVolume = (): number => {
  return 1.0; // Full volume
};
