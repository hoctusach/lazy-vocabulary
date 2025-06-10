
export const getVoiceRegionFromStorage = (): 'US' | 'UK' | 'AU' => {
  try {
    const storedStates = localStorage.getItem('buttonStates');
    if (storedStates) {
      const parsedStates = JSON.parse(storedStates);
      if (parsedStates.voiceRegion === 'UK') return 'UK';
      if (parsedStates.voiceRegion === 'AU') return 'AU';
      return 'US';
    }
  } catch (error) {
    console.error('Error reading voice region from localStorage:', error);
  }
  return 'US'; // Default to US if not found or error
};

export const getSpeechRate = (): number => {
  const region = getVoiceRegionFromStorage();
  return region === 'UK' ? 0.8 : 0.6;
};

export const getSpeechPitch = (): number => {
  return 1.0; // Normal pitch
};

export const getSpeechVolume = (): number => {
  return 1.0; // Full volume
};
